"""
Backend API Tests for Iteration 4 New Features
Tests: 1) Forgot Password (OTP-based reset), 2) Push Notifications (token registration + sending), 3) PDF Upload (answer_pdf_base64)
"""
import pytest
import requests
import uuid
import base64

BASE_URL = "https://gs-pinnacle-admin.preview.emergentagent.com"

class TestForgotPasswordFeature:
    """Test forgot password flow - OTP email + password reset"""

    def test_forgot_password_sends_otp(self):
        """Test POST /api/auth/forgot-password sends OTP email and returns success"""
        # Use admin email (we know it exists)
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "krsittu@gmail.com"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data.get('success')}"
        assert "message" in data, "Response missing 'message' field"
        assert "otp" in data["message"].lower() or "sent" in data["message"].lower(), "Message doesn't mention OTP/sent"
        print(f"✓ Forgot password OTP sent successfully: {data['message']}")

    def test_forgot_password_nonexistent_email(self):
        """Test POST /api/auth/forgot-password with non-existent email returns 404"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"
        })
        assert response.status_code == 404, f"Expected 404 for non-existent email, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Error response missing 'detail' field"
        assert "no account" in data["detail"].lower() or "not found" in data["detail"].lower(), "Error message unclear"
        print(f"✓ Correctly returns 404 for non-existent email: {data['detail']}")

    def test_reset_password_with_invalid_otp(self):
        """Test POST /api/auth/reset-password with invalid OTP returns 400"""
        # First, send OTP
        email = "krsittu@gmail.com"
        send_resp = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert send_resp.status_code == 200
        
        # NOTE: In real testing, we'd need to extract OTP from email or backend logs
        # The OTP is logged in backend logs, so we can't programmatically get it here
        # We'll test the endpoint structure and error handling instead
        
        # Test with invalid OTP (should fail)
        invalid_resp = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": email,
            "otp": "000000",  # Invalid OTP
            "new_password": "NewTestPass123"
        })
        assert invalid_resp.status_code == 400, f"Expected 400 for invalid OTP, got {invalid_resp.status_code}"
        
        error_data = invalid_resp.json()
        assert "detail" in error_data, "Error response missing 'detail'"
        assert "invalid" in error_data["detail"].lower() or "expired" in error_data["detail"].lower(), "Error message unclear"
        print(f"✓ Correctly rejects invalid OTP: {error_data['detail']}")
        print("  Note: Password length validation (min 6 chars) is checked in backend after OTP validation")


class TestPushNotificationFeature:
    """Test push notification registration and sending"""

    @pytest.fixture
    def student_token(self):
        """Create and login a test student"""
        test_email = f"test_push_{uuid.uuid4().hex[:8]}@example.com"
        
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Push Test Student",
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

    def test_register_push_token(self, student_token):
        """Test POST /api/push-token registers push token for user"""
        headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        
        # Register a mock Expo push token
        mock_token = f"ExponentPushToken[{uuid.uuid4().hex[:22]}]"
        response = requests.post(f"{BASE_URL}/api/push-token", headers=headers, json={
            "token": mock_token,
            "platform": "ios"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data.get('success')}"
        print(f"✓ Push token registered successfully: {mock_token[:30]}...")

    def test_register_push_token_requires_auth(self):
        """Test POST /api/push-token requires authentication"""
        response = requests.post(f"{BASE_URL}/api/push-token", json={
            "token": "ExponentPushToken[test]",
            "platform": "android"
        })
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Push token registration correctly requires authentication")

    def test_create_announcement_sends_push(self, admin_token):
        """Test POST /api/announcements creates announcement and sends push to all"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/api/announcements", headers=headers, json={
            "title": "Test Announcement",
            "message": "This is a test announcement for push notification testing"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("title") == "Test Announcement", "Title mismatch"
        assert data.get("message") == "This is a test announcement for push notification testing", "Message mismatch"
        assert "created_at" in data, "Response missing 'created_at' field"
        print(f"✓ Announcement created successfully: {data['id']}")
        print("  Note: Push notification sent to all registered users (logged in backend)")

    def test_get_announcements(self):
        """Test GET /api/announcements returns list of announcements"""
        response = requests.get(f"{BASE_URL}/api/announcements")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "announcements" in data, "Response missing 'announcements' field"
        announcements = data["announcements"]
        assert isinstance(announcements, list), "Announcements should be a list"
        
        if len(announcements) > 0:
            first = announcements[0]
            assert "id" in first, "Announcement missing 'id'"
            assert "title" in first, "Announcement missing 'title'"
            assert "message" in first, "Announcement missing 'message'"
            assert "created_at" in first, "Announcement missing 'created_at'"
            print(f"✓ Retrieved {len(announcements)} announcements")
            print(f"  Latest: {first['title']}")
        else:
            print("✓ Announcements endpoint working (empty list)")


class TestPDFUploadFeature:
    """Test PDF answer sheet upload via answer_pdf_base64 field"""

    @pytest.fixture
    def student_token(self):
        """Create and login a test student"""
        test_email = f"test_pdf_{uuid.uuid4().hex[:8]}@example.com"
        
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "PDF Test Student",
            "email": test_email,
            "phone": f"9{uuid.uuid4().hex[:9]}",
            "password": "TestPass123",
            "target_courses": []
        })
        assert reg_resp.status_code == 200
        return reg_resp.json()["token"]

    def test_submit_test_with_pdf_base64(self, student_token):
        """Test POST /api/tests/{testId}/submit with answer_pdf_base64 field works"""
        headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        
        # Get available tests
        tests_resp = requests.get(f"{BASE_URL}/api/tests", headers=headers)
        assert tests_resp.status_code == 200
        tests = tests_resp.json().get("tests", [])
        assert len(tests) > 0, "No tests available for testing"
        
        test_id = tests[0]["id"]
        
        # Create a small mock PDF in base64
        # PDF header: %PDF-1.4
        mock_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Answer) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000317 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n408\n%%EOF"
        pdf_base64 = base64.b64encode(mock_pdf_content).decode('utf-8')
        
        # Submit test with PDF
        response = requests.post(f"{BASE_URL}/api/tests/{test_id}/submit", headers=headers, json={
            "answer_url": "",
            "answer_pdf_base64": pdf_base64,
            "answer_filename": "test_answer.pdf"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("test_id") == test_id, "test_id mismatch"
        assert data.get("answer_filename") == "test_answer.pdf", "answer_filename mismatch"
        assert data.get("status") == "submitted", "Status should be 'submitted'"
        assert "submitted_at" in data, "Response missing 'submitted_at'"
        # answer_pdf_base64 should be excluded from response (too large)
        assert "answer_pdf_base64" not in data, "answer_pdf_base64 should be excluded from response"
        print(f"✓ Test submitted with PDF successfully: {data['id']}")
        print(f"  Test ID: {test_id}")
        print(f"  Filename: {data['answer_filename']}")
        print(f"  Status: {data['status']}")

    def test_submit_test_with_empty_pdf_still_works(self, student_token):
        """Test POST /api/tests/{testId}/submit with empty answer_pdf_base64 (backward compatibility)"""
        headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        
        # Get available tests
        tests_resp = requests.get(f"{BASE_URL}/api/tests", headers=headers)
        tests = tests_resp.json().get("tests", [])
        assert len(tests) > 0
        
        test_id = tests[0]["id"]
        
        # Submit with empty PDF (old behavior with answer_url)
        response = requests.post(f"{BASE_URL}/api/tests/{test_id}/submit", headers=headers, json={
            "answer_url": "https://example.com/answer.pdf",
            "answer_pdf_base64": "",
            "answer_filename": ""
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "submitted", "Status should be 'submitted'"
        assert data.get("answer_url") == "https://example.com/answer.pdf", "answer_url should be preserved"
        print(f"✓ Backward compatibility maintained: can submit with answer_url instead of PDF")
