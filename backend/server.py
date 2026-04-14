from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, bcrypt, secrets, httpx, smtplib, json, uuid, razorpay
import jwt as pyjwt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

# Config
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'gs_pinnacle')]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"
MSG91_AUTH_KEY = os.environ.get('MSG91_AUTH_KEY', '')
MSG91_SENDER_ID = os.environ.get('MSG91_SENDER_ID', 'GSPIN')
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
EMAIL_ADDRESS = os.environ.get('EMAIL_ADDRESS', '')
EMAIL_APP_PASSWORD = os.environ.get('EMAIL_APP_PASSWORD', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'krsittu@gmail.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Indra@4')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ WEBSOCKET CHAT MANAGER ============
class ChatManager:
    def __init__(self):
        self.rooms: dict = {}

    async def connect(self, ws: WebSocket, room: str, user_info: dict):
        await ws.accept()
        if room not in self.rooms:
            self.rooms[room] = []
        self.rooms[room].append((ws, user_info))

    def disconnect(self, ws: WebSocket, room: str):
        if room in self.rooms:
            self.rooms[room] = [(w, u) for w, u in self.rooms[room] if w != ws]
            if not self.rooms[room]:
                del self.rooms[room]

    def get_online_count(self, room: str) -> int:
        return len(self.rooms.get(room, []))

    async def broadcast(self, message: dict, room: str):
        if room not in self.rooms:
            return
        dead = []
        for ws, _ in self.rooms[room]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, room)

chat_manager = ChatManager()

# ============ HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_teacher_or_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Teacher or admin access required")
    return user

def send_email(to_email: str, subject: str, body: str) -> bool:
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return False

async def send_sms_otp(phone: str, otp: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            resp = await http_client.post(
                "https://control.msg91.com/api/v5/otp",
                params={
                    "authkey": MSG91_AUTH_KEY,
                    "mobile": f"91{phone}",
                    "otp": otp,
                    "sender": MSG91_SENDER_ID,
                }
            )
            logger.info(f"MSG91 response: {resp.status_code} {resp.text}")
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"SMS send error: {e}")
        return False

# ============ MODELS ============
class RegisterModel(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    target_courses: List[str] = []

class LoginModel(BaseModel):
    email: str
    password: str

class OTPSendModel(BaseModel):
    type: str
    identifier: str

class OTPVerifyModel(BaseModel):
    identifier: str
    otp: str

class CourseModel(BaseModel):
    title: str
    description: str
    category: str
    type: str
    price: float = 0
    thumbnail: str = ""
    instructor: str = ""
    features: List[str] = []

class VideoModel(BaseModel):
    title: str
    url: str
    duration: int = 0
    order: int = 0

class TestModel(BaseModel):
    title: str
    course_id: str = ""
    question_paper_url: str = ""

class SubmitTestModel(BaseModel):
    answer_url: str

class EvaluateModel(BaseModel):
    score: float
    feedback: str = ""
    evaluated_url: str = ""

class TicketModel(BaseModel):
    subject: str
    message: str
    category: str

class TicketResponseModel(BaseModel):
    response: str
    status: str = "open"

class ChatModel(BaseModel):
    message: str
    session_id: str = ""

class CMSModel(BaseModel):
    value: str

class CreateOrderModel(BaseModel):
    course_id: str
    amount: int

class VerifyPaymentModel(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    course_id: str

class VideoProgressModel(BaseModel):
    position: float
    duration: float

class VideoMetricsModel(BaseModel):
    live_count: int = 0
    total_views: int = 0

class TeacherModel(BaseModel):
    name: str
    email: str
    password: str
    assigned_batches: List[str] = []

# ============ AUTH ROUTES ============
@api_router.post("/auth/register")
async def register(data: RegisterModel):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    existing_phone = await db.users.find_one({"phone": data.phone})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": data.name,
        "email": data.email.lower(),
        "phone": data.phone,
        "password_hash": hash_password(data.password),
        "role": "student",
        "target_courses": data.target_courses,
        "phone_verified": False,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user_id, data.email.lower(), "student")
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(data: LoginModel):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"], user["role"])
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": user}

@api_router.post("/auth/send-otp")
async def send_otp(data: OTPSendModel):
    otp = str(secrets.randbelow(900000) + 100000)
    await db.otp_records.insert_one({
        "id": str(uuid.uuid4()),
        "identifier": data.identifier,
        "otp": otp,
        "type": data.type,
        "verified": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    success = False
    if data.type == "phone":
        success = await send_sms_otp(data.identifier, otp)
    elif data.type == "email":
        success = send_email(
            data.identifier,
            "GS Pinnacle IAS - Verification OTP",
            f"Your OTP for verification is: {otp}\n\nValid for 10 minutes.\n\n- GS Pinnacle IAS Team"
        )
    logger.info(f"OTP for {data.type} {data.identifier}: {otp}")
    return {"success": True, "message": f"OTP sent to your {data.type}", "delivered": success}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerifyModel):
    record = await db.otp_records.find_one(
        {"identifier": data.identifier, "otp": data.otp, "verified": False},
        sort=[("_id", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    expiry = record.get("expires_at")
    if isinstance(expiry, datetime) and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry and expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")
    await db.otp_records.update_one({"_id": record["_id"]}, {"$set": {"verified": True}})
    otp_type = record.get("type")
    if otp_type == "phone":
        await db.users.update_one({"phone": data.identifier}, {"$set": {"phone_verified": True}})
    elif otp_type == "email":
        await db.users.update_one({"email": data.identifier}, {"$set": {"email_verified": True}})
    return {"success": True, "message": f"{otp_type} verified successfully"}

# ============ COURSE ROUTES ============
@api_router.get("/courses")
async def list_courses(type: Optional[str] = None, category: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    courses = await db.courses.find(query, {"_id": 0}).to_list(100)
    if search:
        search_lower = search.lower()
        courses = [c for c in courses if search_lower in c.get("title", "").lower() or search_lower in c.get("description", "").lower()]
    return {"courses": courses}

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    videos = await db.videos.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(100)
    for v in videos:
        if v.get("live_count_override") is not None:
            v["live_count"] = v["live_count_override"]
        if v.get("total_views_override") is not None:
            v["total_views"] = v["total_views_override"]
    course["videos"] = videos
    return course

@api_router.post("/courses")
async def create_course(data: CourseModel, request: Request):
    await require_admin(request)
    course = {
        "id": str(uuid.uuid4()),
        **data.dict(),
        "students_enrolled": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course)
    course.pop("_id", None)
    return course

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    body.pop("_id", None)
    body.pop("id", None)
    await db.courses.update_one({"id": course_id}, {"$set": body})
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return course

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, request: Request):
    await require_admin(request)
    await db.courses.delete_one({"id": course_id})
    return {"success": True}

# ============ VIDEO ROUTES ============
@api_router.post("/courses/{course_id}/videos")
async def add_video(course_id: str, data: VideoModel, request: Request):
    await require_admin(request)
    video = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        **data.dict(),
        "live_count": 0,
        "total_views": 0,
        "live_count_override": None,
        "total_views_override": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.videos.insert_one(video)
    video.pop("_id", None)
    return video

@api_router.put("/videos/{video_id}/progress")
async def update_video_progress(video_id: str, data: VideoProgressModel, request: Request):
    user = await get_current_user(request)
    await db.video_progress.update_one(
        {"user_id": user["id"], "video_id": video_id},
        {"$set": {
            "user_id": user["id"],
            "video_id": video_id,
            "position": data.position,
            "duration": data.duration,
            "last_watched": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}

@api_router.get("/videos/resume")
async def get_resume_videos(request: Request):
    user = await get_current_user(request)
    progress = await db.video_progress.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("last_watched", -1).to_list(5)
    return {"videos": progress}

@api_router.put("/videos/{video_id}/metrics")
async def override_video_metrics(video_id: str, data: VideoMetricsModel, request: Request):
    await require_admin(request)
    updates = {}
    if data.live_count is not None:
        updates["live_count_override"] = data.live_count
    if data.total_views is not None:
        updates["total_views_override"] = data.total_views
    await db.videos.update_one({"id": video_id}, {"$set": updates})
    return {"success": True}

# ============ ENROLLMENT & PAYMENT ============
@api_router.post("/payments/create-order")
async def create_payment_order(data: CreateOrderModel, request: Request):
    user = await get_current_user(request)
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment not configured")
    receipt_id = f"rcpt_{str(uuid.uuid4())[:8]}"
    order = razorpay_client.order.create({
        "amount": data.amount,
        "currency": "INR",
        "payment_capture": 1,
        "receipt": receipt_id
    })
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "course_id": data.course_id,
        "order_id": order["id"],
        "amount": data.amount,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"order_id": order["id"], "amount": data.amount, "key_id": RAZORPAY_KEY_ID}

@api_router.post("/payments/verify")
async def verify_payment(data: VerifyPaymentModel, request: Request):
    user = await get_current_user(request)
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": data.order_id,
            "razorpay_payment_id": data.payment_id,
            "razorpay_signature": data.signature
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    await db.payments.update_one(
        {"order_id": data.order_id},
        {"$set": {"payment_id": data.payment_id, "status": "paid"}}
    )
    await db.enrollments.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "course_id": data.course_id,
        "payment_id": data.payment_id,
        "enrolled_at": datetime.now(timezone.utc).isoformat()
    })
    await db.courses.update_one({"id": data.course_id}, {"$inc": {"students_enrolled": 1}})
    # Send receipt email
    course = await db.courses.find_one({"id": data.course_id}, {"_id": 0})
    course_title = course.get("title", "Course") if course else "Course"
    send_email(
        user.get("email", ""),
        "GS Pinnacle IAS - Payment Receipt",
        f"Dear {user.get('name', 'Student')},\n\nYour payment for '{course_title}' has been received.\n\nOrder ID: {data.order_id}\nPayment ID: {data.payment_id}\nAmount: ₹{data.amount / 100}\n\nYou now have full access to the course.\n\n- GS Pinnacle IAS Team"
    )
    return {"success": True, "message": "Payment verified and enrolled"}

@api_router.get("/enrollments/my")
async def my_enrollments(request: Request):
    user = await get_current_user(request)
    enrollments = await db.enrollments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    course_ids = [e["course_id"] for e in enrollments]
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(100)
    return {"enrollments": enrollments, "courses": courses}

@api_router.get("/payments/my")
async def my_payments(request: Request):
    user = await get_current_user(request)
    payments = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return {"payments": payments}

# ============ TEST PORTAL ============
@api_router.get("/tests")
async def list_tests(request: Request):
    await get_current_user(request)
    tests = await db.tests.find({}, {"_id": 0}).to_list(100)
    return {"tests": tests}

@api_router.post("/tests")
async def create_test(data: TestModel, request: Request):
    await require_teacher_or_admin(request)
    test = {
        "id": str(uuid.uuid4()),
        **data.dict(),
        "submissions_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tests.insert_one(test)
    test.pop("_id", None)
    return test

@api_router.post("/tests/{test_id}/submit")
async def submit_test(test_id: str, data: SubmitTestModel, request: Request):
    user = await get_current_user(request)
    submission = {
        "id": str(uuid.uuid4()),
        "test_id": test_id,
        "student_id": user["id"],
        "student_name": user.get("name", ""),
        "student_email": user.get("email", ""),
        "answer_url": data.answer_url,
        "score": None,
        "feedback": "",
        "evaluated_url": "",
        "status": "submitted",
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.test_submissions.insert_one(submission)
    await db.tests.update_one({"id": test_id}, {"$inc": {"submissions_count": 1}})
    submission.pop("_id", None)
    return submission

@api_router.get("/tests/{test_id}/submissions")
async def get_test_submissions(test_id: str, request: Request):
    await require_teacher_or_admin(request)
    submissions = await db.test_submissions.find({"test_id": test_id}, {"_id": 0}).to_list(100)
    return {"submissions": submissions}

@api_router.put("/tests/submissions/{submission_id}/evaluate")
async def evaluate_submission(submission_id: str, data: EvaluateModel, request: Request):
    evaluator = await require_teacher_or_admin(request)
    await db.test_submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "score": data.score,
            "feedback": data.feedback,
            "evaluated_url": data.evaluated_url,
            "status": "evaluated",
            "evaluator_name": evaluator.get("name", ""),
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True}

@api_router.get("/tests/my-submissions")
async def my_submissions(request: Request):
    user = await get_current_user(request)
    submissions = await db.test_submissions.find({"student_id": user["id"]}, {"_id": 0}).to_list(100)
    return {"submissions": submissions}

# ============ SUPPORT/TICKETS ============
@api_router.post("/tickets")
async def create_ticket(data: TicketModel, request: Request):
    user = await get_current_user(request)
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        **data.dict(),
        "status": "open",
        "responses": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return ticket

@api_router.get("/tickets")
async def list_tickets(request: Request):
    user = await get_current_user(request)
    if user.get("role") == "admin":
        tickets = await db.tickets.find({}, {"_id": 0}).to_list(100)
    else:
        tickets = await db.tickets.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return {"tickets": tickets}

@api_router.put("/tickets/{ticket_id}")
async def respond_ticket(ticket_id: str, data: TicketResponseModel, request: Request):
    await require_admin(request)
    response_entry = {
        "message": data.response,
        "from": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"responses": response_entry}, "$set": {"status": data.status}}
    )
    return {"success": True}

# ============ AI CHATBOT ============
@api_router.post("/chat")
async def chat_endpoint(data: ChatModel):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        session_id = data.session_id or str(uuid.uuid4())
        chat_instance = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""You are the GS Pinnacle IAS virtual assistant. Help students with:
- Course information and recommendations for UPSC preparation
- Admission process and fees
- Study material and preparation strategy queries
- General UPSC/Civil Services preparation guidance
Be helpful, professional, and encouraging. Answer in Hindi or English based on the student's language. Keep responses concise and actionable."""
        )
        chat_instance.with_model("openai", "gpt-4o-mini")
        user_msg = UserMessage(text=data.message)
        response = await chat_instance.send_message(user_msg)
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "message": data.message,
            "response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "I'm sorry, I'm having trouble right now. Please try again later or contact us at info@gspinnacle.com", "session_id": data.session_id}

# ============ CMS ============
@api_router.get("/cms")
async def get_cms():
    content = await db.cms_content.find({}, {"_id": 0}).to_list(100)
    return {"content": {item["key"]: item["value"] for item in content}}

@api_router.put("/cms/{key}")
async def update_cms(key: str, data: CMSModel, request: Request):
    await require_admin(request)
    await db.cms_content.update_one(
        {"key": key},
        {"$set": {"key": key, "value": data.value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}

# ============ ADMIN ============
@api_router.get("/admin/students")
async def list_students(request: Request):
    await require_admin(request)
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"students": students}

@api_router.get("/admin/analytics")
async def admin_analytics(request: Request):
    await require_admin(request)
    total_students = await db.users.count_documents({"role": "student"})
    total_courses = await db.courses.count_documents({})
    total_enrollments = await db.enrollments.count_documents({})
    total_revenue = 0
    payments = await db.payments.find({"status": "paid"}, {"_id": 0, "amount": 1}).to_list(10000)
    for p in payments:
        total_revenue += p.get("amount", 0)
    open_tickets = await db.tickets.count_documents({"status": "open"})
    total_tests = await db.tests.count_documents({})
    pending_evaluations = await db.test_submissions.count_documents({"status": "submitted"})
    return {
        "total_students": total_students,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "total_revenue": total_revenue / 100,
        "open_tickets": open_tickets,
        "total_tests": total_tests,
        "pending_evaluations": pending_evaluations
    }

@api_router.post("/admin/teachers")
async def create_teacher(data: TeacherModel, request: Request):
    await require_admin(request)
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    teacher = {
        "id": user_id,
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "role": "teacher",
        "phone": "",
        "target_courses": [],
        "assigned_batches": data.assigned_batches,
        "phone_verified": True,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(teacher)
    teacher.pop("_id", None)
    teacher.pop("password_hash", None)
    return teacher

@api_router.get("/admin/teachers")
async def list_teachers(request: Request):
    await require_admin(request)
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"teachers": teachers}

# ============ STARTUP ============
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("phone")
    await db.otp_records.create_index("identifier")
    await db.courses.create_index("type")
    await db.enrollments.create_index("user_id")
    await db.video_progress.create_index([("user_id", 1), ("video_id", 1)])

    # Seed admin
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": ADMIN_EMAIL,
            "phone": "",
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "target_courses": [],
            "phone_verified": True,
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, admin.get("password_hash", "")):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logger.info("Admin password updated")

    # Seed CMS defaults
    cms_defaults = {
        "hero_title": "GS Pinnacle IAS",
        "hero_subtitle": "Your Gateway to Civil Services Success",
        "hero_description": "Join India's most trusted IAS coaching platform with expert faculty and comprehensive study material.",
        "banner_text": "New UPSC 2026 Batch Starting Soon! Enroll Now",
        "contact_phone": "+91 9876543210",
        "contact_email": "info@gspinnacle.com",
        "about_text": "GS Pinnacle IAS is a premier coaching institute for UPSC Civil Services preparation."
    }
    for key, value in cms_defaults.items():
        exists = await db.cms_content.find_one({"key": key})
        if not exists:
            await db.cms_content.insert_one({"key": key, "value": value, "updated_at": datetime.now(timezone.utc).isoformat()})

    # Seed sample courses
    existing_courses = await db.courses.count_documents({})
    if existing_courses == 0:
        sample_courses = [
            {
                "id": str(uuid.uuid4()),
                "title": "UPSC Prelims Foundation 2026",
                "description": "Comprehensive course covering all subjects for UPSC Prelims examination. Includes complete GS Paper 1 and CSAT preparation with test series.",
                "category": "Prelims",
                "type": "live",
                "price": 15999,
                "thumbnail": "",
                "instructor": "Dr. GS Kumar",
                "features": ["200+ Hours of Live Classes", "Complete Study Material", "Weekly Test Series", "Doubt Resolution Sessions"],
                "students_enrolled": 1245,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "GS Mains Answer Writing",
                "description": "Master the art of answer writing for UPSC Mains examination. Learn structured approach, diagram integration, and time management.",
                "category": "Mains",
                "type": "recorded",
                "price": 8999,
                "thumbnail": "",
                "instructor": "Prof. Sharma",
                "features": ["120+ Hours of Content", "Daily Answer Practice", "Personal Evaluation", "Model Answers Bank"],
                "students_enrolled": 856,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Current Affairs Monthly Digest",
                "description": "Stay updated with monthly current affairs compilation. Covers national, international, economy, science & tech topics.",
                "category": "Current Affairs",
                "type": "free",
                "price": 0,
                "thumbnail": "",
                "instructor": "Team GS Pinnacle",
                "features": ["Monthly PDF Notes", "MCQ Practice Tests", "Video Summaries"],
                "students_enrolled": 5432,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Indian History - Ancient to Modern",
                "description": "Complete Indian History course from Indus Valley Civilization to Post-Independence era. Specially designed for UPSC.",
                "category": "History",
                "type": "recorded",
                "price": 5999,
                "thumbnail": "",
                "instructor": "Dr. Meena Kumari",
                "features": ["80+ Hours of Lectures", "Timeline Charts", "Map-Based Questions", "Previous Year Analysis"],
                "students_enrolled": 678,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "CSAT Paper 2 Complete Strategy",
                "description": "Comprehensive strategy and practice for CSAT Paper 2. Covers reasoning, aptitude, comprehension, and decision making.",
                "category": "CSAT",
                "type": "live",
                "price": 3999,
                "thumbnail": "",
                "instructor": "Prof. R.K. Singh",
                "features": ["50+ Hours of Classes", "Math Shortcuts & Tricks", "Reading Comprehension", "15 Full Mock Tests"],
                "students_enrolled": 432,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Geography Optional Batch",
                "description": "Complete Geography Optional preparation for UPSC Mains. Paper 1 and Paper 2 covered with map work and answer writing.",
                "category": "Optional",
                "type": "live",
                "price": 12999,
                "thumbnail": "",
                "instructor": "Dr. Anand Mishra",
                "features": ["150+ Hours", "Map Practice", "Answer Writing Sessions", "Previous Year Solutions"],
                "students_enrolled": 321,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        for course in sample_courses:
            await db.courses.insert_one(course)
        logger.info("Sample courses seeded")

    # Seed sample test
    existing_tests = await db.tests.count_documents({})
    if existing_tests == 0:
        await db.tests.insert_one({
            "id": str(uuid.uuid4()),
            "title": "GS Paper 1 - Practice Test 1",
            "course_id": "",
            "question_paper_url": "",
            "submissions_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Sample test seeded")

    logger.info("GS Pinnacle IAS Backend startup complete")

# ============ WEBSOCKET LIVE CHAT ============
@app.websocket("/api/ws/chat/{course_id}")
async def ws_chat(websocket: WebSocket, course_id: str):
    user_name = websocket.query_params.get("name", "Anonymous")
    user_id = websocket.query_params.get("user_id", "")
    user_role = websocket.query_params.get("role", "student")

    await chat_manager.connect(websocket, course_id, {"name": user_name, "id": user_id})
    online = chat_manager.get_online_count(course_id)
    await chat_manager.broadcast({
        "type": "system",
        "message": f"{user_name} joined the chat",
        "online_count": online,
        "created_at": datetime.now(timezone.utc).isoformat()
    }, course_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            message = {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "user_id": user_id,
                "user_name": user_name,
                "user_role": user_role,
                "message": msg_data.get("message", ""),
                "type": "chat",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.course_chat.insert_one(message)
            message.pop("_id", None)
            message["online_count"] = chat_manager.get_online_count(course_id)
            await chat_manager.broadcast(message, course_id)
    except WebSocketDisconnect:
        chat_manager.disconnect(websocket, course_id)
        online = chat_manager.get_online_count(course_id)
        await chat_manager.broadcast({
            "type": "system",
            "message": f"{user_name} left the chat",
            "online_count": online,
            "created_at": datetime.now(timezone.utc).isoformat()
        }, course_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        chat_manager.disconnect(websocket, course_id)

# ============ CHAT HISTORY REST ============
@api_router.get("/courses/{course_id}/chat")
async def get_chat_history(course_id: str, limit: int = 50):
    messages = await db.course_chat.find(
        {"course_id": course_id, "type": "chat"}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    messages.reverse()
    return {"messages": messages}

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
