from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, bcrypt, secrets, httpx, smtplib, json, uuid, razorpay, shutil, base64
import jwt as pyjwt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

# Config
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db = None
client = None
use_mock_db = False

try:
    from pymongo import MongoClient
    # Try to connect with synchronous client first to test connection
    test_client = MongoClient(mongo_url, serverSelectionTimeoutMS=2000, connectTimeoutMS=2000)
    test_client.admin.command('ping')
    test_client.close()
    
    # If successful, create async client
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'gs_pinnacle')]
    logger = logging.getLogger(__name__)
    logger.info(f"✅ Connected to MongoDB: {mongo_url}")
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ MongoDB connection failed: {str(e)[:100]}")
    logger.info("✅ Using in-memory mock database instead")
    use_mock_db = True
    
    # ========== IN-MEMORY MOCK DATABASE ==========
    class MockCollection:
        def __init__(self):
            self.data = []
        
        async def find_one(self, query, projection=None):
            for doc in self.data:
                match = all(doc.get(k) == v for k, v in query.items())
                if match:
                    result = dict(doc)
                    if projection:
                        result = {k: result.get(k) for k in projection if k in result or projection[k] != 0}
                    return result
            return None
        
        def find(self, query=None, projection=None):
            query = query or {}
            results = []
            for doc in self.data:
                if not query or all(doc.get(k) == v for k, v in query.items()):
                    result = dict(doc)
                    if projection:
                        result = {k: result.get(k) for k in projection if k in result or projection[k] != 0}
                    results.append(result)
            return MockCursorWrapper(results)
        
        async def insert_one(self, doc):
            self.data.append(doc)
            return {"insertedId": doc.get("_id", doc.get("id"))}
        
        async def update_one(self, query, update):
            for doc in self.data:
                if all(doc.get(k) == v for k, v in query.items()):
                    if "$set" in update:
                        doc.update(update["$set"])
                    return {"modifiedCount": 1}
            return {"modifiedCount": 0}
        
        async def delete_one(self, query):
            for i, doc in enumerate(self.data):
                if all(doc.get(k) == v for k, v in query.items()):
                    self.data.pop(i)
                    return {"deletedCount": 1}
            return {"deletedCount": 0}
        
        async def count_documents(self, query=None):
            query = query or {}
            count = 0
            for doc in self.data:
                if not query or all(doc.get(k) == v for k, v in query.items()):
                    count += 1
            return count
        
        async def create_index(self, *args, **kwargs):
            """Mock - do nothing"""
            return "mock_index"
    
    class MockCursorWrapper:
        def __init__(self, data):
            self.data = data
        
        async def to_list(self, size):
            return self.data[:size] if size else self.data
        
        def sort(self, key, direction):
            """Mock sort - return self"""
            return self
    
    class MockDB:
        def __init__(self):
            self.users = MockCollection()
            self.courses = MockCollection()
            self.enrollments = MockCollection()
            self.otp_records = MockCollection()
            self.tests = MockCollection()
            self.test_submissions = MockCollection()
            self.chat_rooms = MockCollection()
            self.transactions = MockCollection()
            self.content_blocks = MockCollection()
            self.announcements = MockCollection()
            self.video_progress = MockCollection()
            self.push_tokens = MockCollection()
            self.cms_content = MockCollection()
            self.tickets = MockCollection()
            self.course_chat = MockCollection()
        
        async def init_demo_data(self):
            """Initialize with demo user"""
            admin_hash = hash_password("admin123")
            await self.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": "admin@gspinnacle.com",
                "name": "Admin User",
                "phone": "9999999999",
                "password_hash": admin_hash,
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            student_hash = hash_password("student123")
            await self.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": "student@gspinnacle.com",
                "name": "Student User",
                "phone": "8888888888",
                "password_hash": student_hash,
                "role": "student",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    db = MockDB()
    
    # Initialize demo data - will be done in startup event

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
    try:
        result = bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
        logger.info(f"verify_password: plain='{plain}', hashed_prefix='{hashed[:20]}...' if hashed else 'None', result={result}")
        return result
    except Exception as e:
        logger.error(f"verify_password error: {str(e)}, plain_type={type(plain)}, hashed_type={type(hashed)}")
        return False

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
    chat_enabled: bool = True

class VideoModel(BaseModel):
    title: str
    url: str
    duration: int = 0
    order: int = 0
    section_id: str = ""

class TestModel(BaseModel):
    title: str
    course_id: str = ""
    question_paper_url: str = ""

class SubmitTestModel(BaseModel):
    answer_url: str = ""
    answer_pdf_base64: str = ""
    answer_filename: str = ""

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

class ForgotPasswordModel(BaseModel):
    email: str

class ResetPasswordModel(BaseModel):
    email: str
    otp: str
    new_password: str

class PushTokenModel(BaseModel):
    token: str
    platform: str = "unknown"

class AnnouncementModel(BaseModel):
    title: str
    message: str

class LiveClassModel(BaseModel):
    title: str
    course_id: str
    scheduled_at: str
    meeting_url: str = ""
    description: str = ""

class SectionModel(BaseModel):
    title: str
    order: int = 0
    is_locked: bool = False

class SectionUpdateModel(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None
    is_locked: Optional[bool] = None

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
    try:
        user = await db.users.find_one({"email": data.email.lower()})
        logger.info(f"Login attempt: {data.email.lower()}, User found: {user is not None}, User keys: {list(user.keys()) if user else 'N/A'}")
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        password_hash = user.get("password_hash", "")
        logger.info(f"Password hash present: {bool(password_hash)}, Hash length: {len(password_hash) if password_hash else 0}")
        password_match = verify_password(data.password, password_hash) if password_hash else False
        logger.info(f"Password match: {password_match}")
        if not password_match:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_token(user["id"], user["email"], user["role"])
        user.pop("password_hash", None)
        return {"token": token, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

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

# ============ FORGOT PASSWORD ============
@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordModel):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
    otp = str(secrets.randbelow(900000) + 100000)
    await db.otp_records.insert_one({
        "id": str(uuid.uuid4()),
        "identifier": data.email.lower(),
        "otp": otp,
        "type": "password_reset",
        "verified": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    success = send_email(
        data.email.lower(),
        "GS Pinnacle IAS - Password Reset OTP",
        f"Your password reset OTP is: {otp}\n\nThis OTP is valid for 10 minutes.\nIf you didn't request this, please ignore.\n\n- GS Pinnacle IAS Team"
    )
    logger.info(f"Password reset OTP for {data.email}: {otp}")
    return {"success": True, "message": "Password reset OTP sent to your email", "delivered": success}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordModel):
    record = await db.otp_records.find_one(
        {"identifier": data.email.lower(), "otp": data.otp, "type": "password_reset", "verified": False},
        sort=[("_id", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    expiry = record.get("expires_at")
    if isinstance(expiry, datetime) and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry and expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.otp_records.update_one({"_id": record["_id"]}, {"$set": {"verified": True}})
    await db.users.update_one(
        {"email": data.email.lower()},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    return {"success": True, "message": "Password reset successfully"}

# ============ PUSH NOTIFICATIONS ============
@api_router.post("/push-token")
async def register_push_token(data: PushTokenModel, request: Request):
    user = await get_current_user(request)
    await db.push_tokens.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "token": data.token, "platform": data.platform, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}

async def send_push_notification(user_id: str, title: str, body: str, data: dict = {}):
    """Send push notification to a specific user via Expo Push API"""
    token_doc = await db.push_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token_doc or not token_doc.get("token"):
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            resp = await http_client.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": token_doc["token"],
                    "title": title,
                    "body": body,
                    "data": data,
                    "sound": "default",
                },
                headers={"Content-Type": "application/json"}
            )
            logger.info(f"Push notification sent to {user_id}: {resp.status_code}")
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return False

async def send_push_to_all(title: str, body: str, data: dict = {}):
    """Send push notification to all registered users"""
    tokens = await db.push_tokens.find({}, {"_id": 0}).to_list(10000)
    push_tokens = [t["token"] for t in tokens if t.get("token")]
    if not push_tokens:
        return
    messages = [{"to": t, "title": title, "body": body, "data": data, "sound": "default"} for t in push_tokens]
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            await http_client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json"}
            )
    except Exception as e:
        logger.error(f"Bulk push error: {e}")

# ============ ANNOUNCEMENTS ============
@api_router.post("/announcements")
async def create_announcement(data: AnnouncementModel, request: Request):
    await require_admin(request)
    announcement = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.announcements.insert_one(announcement)
    announcement.pop("_id", None)
    # Send push to all users
    await send_push_to_all(f"📢 {data.title}", data.message, {"type": "announcement"})
    return announcement

@api_router.get("/announcements")
async def list_announcements():
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"announcements": announcements}

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
    materials = await db.course_materials.find({"course_id": course_id}, {"_id": 0, "file_data": 0}).sort("created_at", -1).to_list(100)
    course["materials"] = materials
    return course

@api_router.post("/courses")
async def create_course(data: CourseModel, request: Request):
    await require_admin(request)
    course = {
        "id": str(uuid.uuid4()),
        **data.dict(),
        "students_enrolled": 0,
        "chat_enabled": data.chat_enabled,
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
    await db.course_sections.delete_many({"course_id": course_id})
    await db.videos.delete_many({"course_id": course_id})
    await db.course_materials.delete_many({"course_id": course_id})
    return {"success": True}

# ============ COURSE SECTIONS (FOLDERS) ============
@api_router.post("/courses/{course_id}/sections")
async def create_section(course_id: str, data: SectionModel, request: Request):
    await require_admin(request)
    section = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "title": data.title,
        "order": data.order,
        "is_locked": data.is_locked,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.course_sections.insert_one(section)
    section.pop("_id", None)
    return section

@api_router.get("/courses/{course_id}/sections")
async def list_sections(course_id: str):
    sections = await db.course_sections.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(100)
    for s in sections:
        s["videos"] = await db.videos.find({"course_id": course_id, "section_id": s["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
        s["materials"] = await db.course_materials.find({"course_id": course_id, "section_id": s["id"]}, {"_id": 0, "file_data": 0}).to_list(100)
    return {"sections": sections}

@api_router.put("/sections/{section_id}")
async def update_section(section_id: str, data: SectionUpdateModel, request: Request):
    await require_admin(request)
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if updates:
        await db.course_sections.update_one({"id": section_id}, {"$set": updates})
    section = await db.course_sections.find_one({"id": section_id}, {"_id": 0})
    return section

@api_router.delete("/sections/{section_id}")
async def delete_section(section_id: str, request: Request):
    await require_admin(request)
    await db.course_sections.delete_one({"id": section_id})
    await db.videos.delete_many({"section_id": section_id})
    await db.course_materials.delete_many({"section_id": section_id})
    return {"success": True}

# ============ VIDEO ROUTES ============
@api_router.post("/courses/{course_id}/videos")
async def add_video(course_id: str, data: VideoModel, request: Request):
    await require_admin(request)
    video = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "section_id": data.section_id,
        "title": data.title,
        "url": data.url,
        "duration": data.duration,
        "order": data.order,
        "live_count": 0,
        "total_views": 0,
        "live_count_override": None,
        "total_views_override": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.videos.insert_one(video)
    video.pop("_id", None)
    return video

@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, request: Request):
    await require_admin(request)
    await db.videos.delete_one({"id": video_id})
    return {"success": True}

# ============ COURSE MATERIALS (PDF) ============
class MaterialUploadModel(BaseModel):
    title: str
    file_data: str
    filename: str
    section_id: str = ""

@api_router.post("/courses/{course_id}/materials")
async def upload_material(course_id: str, data: MaterialUploadModel, request: Request):
    await require_admin(request)
    material = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "section_id": data.section_id,
        "title": data.title,
        "filename": data.filename,
        "file_data": data.file_data,
        "file_size": len(data.file_data) * 3 // 4,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.course_materials.insert_one(material)
    material.pop("_id", None)
    material.pop("file_data", None)
    return material

@api_router.get("/courses/{course_id}/materials")
async def list_materials(course_id: str):
    materials = await db.course_materials.find({"course_id": course_id}, {"_id": 0, "file_data": 0}).sort("created_at", -1).to_list(100)
    return {"materials": materials}

@api_router.get("/materials/{material_id}/download")
async def download_material(material_id: str):
    material = await db.course_materials.find_one({"id": material_id}, {"_id": 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    import base64
    pdf_bytes = base64.b64decode(material["file_data"])
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{material.get("filename", "material.pdf")}"'})

@api_router.get("/materials/{material_id}/view")
async def view_material(material_id: str):
    """Serve PDF in an HTML viewer page"""
    material = await db.course_materials.find_one({"id": material_id}, {"_id": 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    import base64
    b64data = material["file_data"]
    html = f"""<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{material.get('title','PDF')}</title>
<style>*{{margin:0;padding:0}}body{{background:#f1f5f9}}iframe,embed{{width:100%;height:100vh;border:none}}</style>
</head><body>
<embed src="data:application/pdf;base64,{b64data}" type="application/pdf" width="100%" height="100%">
</body></html>"""
    return Response(content=html, media_type="text/html")

# ============ VIDEO FILE UPLOAD ============
UPLOAD_DIR = Path(__file__).parent / "uploads" / "videos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@api_router.post("/upload/video")
async def upload_video_file(request: Request, file: UploadFile = File(...), title: str = Form(""), section_id: str = Form(""), course_id: str = Form("")):
    await require_admin(request)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'mp4'
    save_name = f"{file_id}.{ext}"
    save_path = UPLOAD_DIR / save_name
    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)
    file_size = len(content)
    video_url = f"/api/uploads/videos/{save_name}"
    video = {
        "id": file_id,
        "course_id": course_id,
        "section_id": section_id,
        "title": title or file.filename,
        "url": video_url,
        "duration": 0,
        "order": 0,
        "live_count": 0,
        "total_views": 0,
        "live_count_override": None,
        "total_views_override": None,
        "file_size": file_size,
        "is_uploaded": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.videos.insert_one(video)
    video.pop("_id", None)
    return video

@api_router.get("/uploads/videos/{filename}")
async def serve_video(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(str(file_path), media_type="video/mp4")

@api_router.delete("/materials/{material_id}")
async def delete_material(material_id: str, request: Request):
    await require_admin(request)
    await db.course_materials.delete_one({"id": material_id})
    return {"success": True}

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
    # Enrich with video and course info
    for p in progress:
        video = await db.videos.find_one({"id": p.get("video_id")}, {"_id": 0})
        if video:
            p["video_title"] = video.get("title", "")
            p["video_url"] = video.get("url", "")
            p["course_id"] = video.get("course_id", "")
            course = await db.courses.find_one({"id": video.get("course_id")}, {"_id": 0})
            if course:
                p["course_title"] = course.get("title", "")
    return {"videos": progress}

@api_router.get("/videos/{video_id}/progress")
async def get_video_progress(video_id: str, request: Request):
    user = await get_current_user(request)
    progress = await db.video_progress.find_one(
        {"user_id": user["id"], "video_id": video_id}, {"_id": 0}
    )
    return {"progress": progress}

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
        "answer_pdf_base64": data.answer_pdf_base64,
        "answer_filename": data.answer_filename or "answer.pdf",
        "score": None,
        "feedback": "",
        "evaluated_url": "",
        "status": "submitted",
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.test_submissions.insert_one(submission)
    await db.tests.update_one({"id": test_id}, {"$inc": {"submissions_count": 1}})
    submission.pop("_id", None)
    submission.pop("answer_pdf_base64", None)
    return submission

@api_router.get("/tests/{test_id}/submissions")
async def get_test_submissions(test_id: str, request: Request):
    await require_teacher_or_admin(request)
    # Exclude base64 PDF data from list response to reduce payload size
    submissions = await db.test_submissions.find({"test_id": test_id}, {"_id": 0, "answer_pdf_base64": 0}).to_list(100)
    return {"submissions": submissions}

@api_router.get("/tests/submissions/{submission_id}/pdf")
async def get_submission_pdf(submission_id: str, request: Request):
    """Download submitted PDF for admin/teacher to view"""
    await require_teacher_or_admin(request)
    submission = await db.test_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if not submission.get("answer_pdf_base64"):
        raise HTTPException(status_code=404, detail="PDF not found in submission")
    
    try:
        pdf_bytes = base64.b64decode(submission["answer_pdf_base64"])
        filename = submission.get("answer_filename", "answer.pdf")
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{filename}"'})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode PDF: {str(e)}")

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
    # Send push notification to student
    submission = await db.test_submissions.find_one({"id": submission_id}, {"_id": 0})
    if submission:
        await send_push_notification(
            submission.get("student_id", ""),
            "📝 Test Evaluated!",
            f"Your test has been evaluated. Score: {data.score}. {data.feedback[:50] if data.feedback else ''}",
            {"type": "evaluation", "submission_id": submission_id}
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
    # Send push notification to ticket creator
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if ticket:
        await send_push_notification(
            ticket.get("user_id", ""),
            "🎫 Ticket Update",
            f"Your ticket '{ticket.get('subject', '')}' has a new response.",
            {"type": "ticket_response", "ticket_id": ticket_id}
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


# ============ LIVE CLASSES ============
@api_router.post("/live-classes")
async def create_live_class(data: LiveClassModel, request: Request):
    await require_admin(request)
    live_class = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "course_id": data.course_id,
        "scheduled_at": data.scheduled_at,
        "meeting_url": data.meeting_url,
        "description": data.description,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.live_classes.insert_one(live_class)
    live_class.pop("_id", None)
    course = await db.courses.find_one({"id": data.course_id}, {"_id": 0})
    course_name = course.get("title", "Course") if course else "Course"
    await send_push_to_all(
        "🔴 Live Class Scheduled!",
        f"{data.title} - {course_name}\nScheduled: {data.scheduled_at}",
        {"type": "live_class", "live_class_id": live_class["id"]}
    )
    return live_class

@api_router.get("/live-classes")
async def list_live_classes(course_id: Optional[str] = None):
    query = {}
    if course_id:
        query["course_id"] = course_id
    classes = await db.live_classes.find(query, {"_id": 0}).sort("scheduled_at", -1).to_list(50)
    for c in classes:
        course = await db.courses.find_one({"id": c.get("course_id")}, {"_id": 0})
        c["course_name"] = course.get("title", "") if course else ""
    return {"live_classes": classes}

@api_router.put("/live-classes/{class_id}")
async def update_live_class(class_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    body.pop("_id", None)
    body.pop("id", None)
    await db.live_classes.update_one({"id": class_id}, {"$set": body})
    if body.get("status") == "live":
        lc = await db.live_classes.find_one({"id": class_id}, {"_id": 0})
        if lc:
            await send_push_to_all("🔴 LIVE NOW!", f"{lc.get('title', 'Live Class')} is starting now!", {"type": "live_class_started", "live_class_id": class_id, "meeting_url": lc.get("meeting_url", "")})
    return {"success": True}

@api_router.delete("/live-classes/{class_id}")
async def delete_live_class(class_id: str, request: Request):
    await require_admin(request)
    await db.live_classes.delete_one({"id": class_id})
    return {"success": True}

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

    # Seed demo users (for mock database)
    demo_admin = await db.users.find_one({"email": "admin@gspinnacle.com"})
    logger.info(f"Demo admin from DB: {demo_admin}")
    if not demo_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin User",
            "email": "admin@gspinnacle.com",
            "phone": "9999999999",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "target_courses": [],
            "phone_verified": True,
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Demo admin seeded: admin@gspinnacle.com / admin123")

    demo_student = await db.users.find_one({"email": "student@gspinnacle.com"})
    if not demo_student:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Student User",
            "email": "student@gspinnacle.com",
            "phone": "8888888888",
            "password_hash": hash_password("student123"),
            "role": "student",
            "target_courses": [],
            "phone_verified": True,
            "email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Demo student seeded: student@gspinnacle.com / student123")

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
    if hasattr(client, 'close'):
        client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
