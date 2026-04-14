"""
Backend API Tests for GS Pinnacle IAS EdTech Platform
Tests: Auth (login, register, OTP), Courses, Admin (analytics, students, CMS), Support Tickets, Chat
"""
import pytest
import requests
import os

# Use public URL for testing
BASE_URL = "https://gs-pinnacle-admin.preview.emergentagent.com"

class TestAuth:
    """Authentication endpoint tests"""

    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token missing in response"
        assert "user" in data, "User missing in response"
        assert data["user"]["email"] == "krsittu@gmail.com"
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['email']}")

    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong password correctly rejected")

    def test_student_registration(self):
        """Test student registration flow"""
        import uuid
        test_email = f"test_student_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Student",
            "email": test_email,
            "phone": f"9{uuid.uuid4().hex[:9]}",
            "password": "TestPass123",
            "target_courses": ["Prelims", "Mains"]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "student"
        assert data["user"]["target_courses"] == ["Prelims", "Mains"]
        print(f"✓ Student registration successful: {test_email}")

    def test_duplicate_email_registration(self):
        """Test duplicate email registration fails"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Duplicate",
            "email": "krsittu@gmail.com",
            "phone": "9999999999",
            "password": "Test123",
            "target_courses": []
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Duplicate email correctly rejected")

    def test_send_email_otp(self):
        """Test OTP send for email"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "type": "email",
            "identifier": "test@example.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Email OTP sent: {data.get('message')}")

    def test_send_phone_otp(self):
        """Test OTP send for phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "type": "phone",
            "identifier": "9876543210"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Phone OTP sent: {data.get('message')}")


class TestCourses:
    """Course CRUD and listing tests"""

    def test_list_all_courses(self):
        """Test listing all courses"""
        response = requests.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "courses" in data
        assert len(data["courses"]) == 6, f"Expected 6 seeded courses, got {len(data['courses'])}"
        print(f"✓ Listed {len(data['courses'])} courses")

    def test_filter_courses_by_type_live(self):
        """Test filtering courses by type=live"""
        response = requests.get(f"{BASE_URL}/api/courses?type=live")
        assert response.status_code == 200
        
        data = response.json()
        assert "courses" in data
        live_courses = data["courses"]
        assert all(c["type"] == "live" for c in live_courses), "Not all courses are live type"
        print(f"✓ Filtered {len(live_courses)} live courses")

    def test_filter_courses_by_type_free(self):
        """Test filtering courses by type=free"""
        response = requests.get(f"{BASE_URL}/api/courses?type=free")
        assert response.status_code == 200
        
        data = response.json()
        free_courses = data["courses"]
        assert len(free_courses) >= 1, "Expected at least 1 free course"
        assert all(c["type"] == "free" for c in free_courses)
        print(f"✓ Filtered {len(free_courses)} free courses")

    def test_get_course_by_id(self):
        """Test getting single course with videos"""
        # First get all courses
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        assert len(courses) > 0, "No courses available"
        
        course_id = courses[0]["id"]
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == course_id
        assert "title" in data
        assert "videos" in data
        print(f"✓ Retrieved course: {data['title']}")

    def test_get_nonexistent_course(self):
        """Test getting non-existent course returns 404"""
        response = requests.get(f"{BASE_URL}/api/courses/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent course correctly returns 404")


class TestAdmin:
    """Admin-only endpoint tests"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_admin_analytics(self, admin_token):
        """Test admin analytics endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_students" in data
        assert "total_courses" in data
        assert "total_revenue" in data
        assert "open_tickets" in data
        assert data["total_courses"] == 6, f"Expected 6 courses, got {data['total_courses']}"
        print(f"✓ Analytics: {data['total_students']} students, {data['total_courses']} courses, ₹{data['total_revenue']} revenue")

    def test_admin_students_list(self, admin_token):
        """Test admin students list endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/students", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "students" in data
        print(f"✓ Listed {len(data['students'])} students")

    def test_admin_analytics_without_auth(self):
        """Test admin analytics without auth token fails"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin analytics correctly requires auth")

    def test_create_course_as_admin(self, admin_token):
        """Test creating a new course as admin"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        import uuid
        course_data = {
            "title": f"TEST_Course_{uuid.uuid4().hex[:6]}",
            "description": "Test course for automated testing",
            "category": "Test",
            "type": "recorded",
            "price": 999,
            "thumbnail": "",
            "instructor": "Test Instructor",
            "features": ["Feature 1", "Feature 2"]
        }
        
        response = requests.post(f"{BASE_URL}/api/courses", headers=headers, json=course_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == course_data["title"]
        assert "id" in data
        course_id = data["id"]
        print(f"✓ Created course: {data['title']} (ID: {course_id})")
        
        # Verify course was created by fetching it
        get_resp = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == course_data["title"]
        print(f"✓ Verified course creation via GET")

    def test_delete_course_as_admin(self, admin_token):
        """Test deleting a course as admin"""
        # First create a test course
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        import uuid
        course_data = {
            "title": f"TEST_ToDelete_{uuid.uuid4().hex[:6]}",
            "description": "Course to be deleted",
            "category": "Test",
            "type": "recorded",
            "price": 0,
            "thumbnail": "",
            "instructor": "Test",
            "features": []
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/courses", headers=headers, json=course_data)
        assert create_resp.status_code == 200
        course_id = create_resp.json()["id"]
        
        # Now delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=headers)
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        
        data = delete_resp.json()
        assert data["success"] == True
        print(f"✓ Deleted course: {course_id}")
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_resp.status_code == 404
        print(f"✓ Verified course deletion (404 on GET)")


class TestCMS:
    """CMS content management tests"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_get_cms_content(self):
        """Test getting CMS content (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/cms")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "content" in data
        content = data["content"]
        assert "hero_title" in content
        assert content["hero_title"] == "GS Pinnacle IAS"
        print(f"✓ CMS content retrieved: {len(content)} keys")

    def test_update_cms_as_admin(self, admin_token):
        """Test updating CMS content as admin"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Update banner_text
        response = requests.put(
            f"{BASE_URL}/api/cms/banner_text",
            headers=headers,
            json={"value": "TEST_Updated Banner Text"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        print("✓ CMS content updated")
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/cms")
        assert get_resp.status_code == 200
        assert get_resp.json()["content"]["banner_text"] == "TEST_Updated Banner Text"
        print("✓ Verified CMS update via GET")


class TestSupport:
    """Support ticket tests"""

    @pytest.fixture
    def student_token(self):
        """Create and login a test student"""
        import uuid
        test_email = f"test_support_{uuid.uuid4().hex[:8]}@example.com"
        
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Support Test Student",
            "email": test_email,
            "phone": f"9{uuid.uuid4().hex[:9]}",
            "password": "TestPass123",
            "target_courses": []
        })
        assert reg_resp.status_code == 200
        return reg_resp.json()["token"]

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_create_ticket_as_student(self, student_token):
        """Test creating a support ticket as student"""
        headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/tickets", headers=headers, json={
            "subject": "TEST_Ticket Subject",
            "message": "This is a test support ticket",
            "category": "Technical"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["subject"] == "TEST_Ticket Subject"
        assert data["status"] == "open"
        assert "id" in data
        print(f"✓ Created ticket: {data['subject']} (ID: {data['id']})")

    def test_list_tickets_as_admin(self, admin_token):
        """Test admin can list all tickets"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/tickets", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data
        print(f"✓ Admin listed {len(data['tickets'])} tickets")


class TestChat:
    """AI Chatbot tests"""

    def test_chat_endpoint(self):
        """Test AI chat endpoint"""
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "message": "What courses do you offer?",
            "session_id": ""
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert len(data["response"]) > 0
        print(f"✓ Chat response received: {data['response'][:100]}...")


class TestTests:
    """Test portal tests"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture
    def student_token(self):
        """Create and login a test student"""
        import uuid
        test_email = f"test_tests_{uuid.uuid4().hex[:8]}@example.com"
        
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Portal Student",
            "email": test_email,
            "phone": f"9{uuid.uuid4().hex[:9]}",
            "password": "TestPass123",
            "target_courses": []
        })
        assert reg_resp.status_code == 200
        return reg_resp.json()["token"]

    def test_list_tests_as_student(self, student_token):
        """Test listing tests as student"""
        headers = {"Authorization": f"Bearer {student_token}"}
        
        response = requests.get(f"{BASE_URL}/api/tests", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tests" in data
        assert len(data["tests"]) >= 1, "Expected at least 1 seeded test"
        print(f"✓ Listed {len(data['tests'])} tests")
