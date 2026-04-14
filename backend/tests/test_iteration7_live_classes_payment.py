"""
Iteration 7 Backend Tests - Live Classes & Payment Fixes
Tests:
- POST /api/payments/create-order (returns order_id, amount, key_id)
- POST /api/live-classes (create live class with title, course_id, scheduled_at, meeting_url)
- GET /api/live-classes (returns list with course_name enriched)
- PUT /api/live-classes/{id} (update status to 'live')
- DELETE /api/live-classes/{id}
- GET /api/materials/{id}/view (returns HTML with embedded PDF)
- Admin login verification
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    pytest.skip("EXPO_PUBLIC_BACKEND_URL not set", allow_module_level=True)

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "krsittu@gmail.com",
        "password": "Indra@4"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture
def course_id(api_client):
    """Get first course ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/courses")
    assert response.status_code == 200
    courses = response.json().get("courses", [])
    assert len(courses) > 0, "No courses found"
    return courses[0]["id"]

class TestAdminLogin:
    """Test admin login credentials"""
    
    def test_admin_login_success(self, api_client):
        """Admin can login with krsittu@gmail.com / Indra@4"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "admin", f"User role is {data['user']['role']}, expected admin"
        assert data["user"]["email"] == "krsittu@gmail.com"
        print("✓ Admin login successful with correct credentials")

class TestPaymentCreateOrder:
    """Test payment order creation endpoint"""
    
    def test_create_order_returns_required_fields(self, api_client, admin_token, course_id):
        """POST /api/payments/create-order returns order_id, amount, key_id"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        response = api_client.post(f"{BASE_URL}/api/payments/create-order", json={
            "course_id": course_id,
            "amount": 50000
        })
        assert response.status_code == 200, f"Create order failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "order_id" in data, "order_id missing in response"
        assert "amount" in data, "amount missing in response"
        assert "key_id" in data, "key_id missing in response"
        
        # Verify data types and values
        assert isinstance(data["order_id"], str), "order_id should be string"
        assert len(data["order_id"]) > 0, "order_id should not be empty"
        assert data["amount"] == 50000, f"amount should be 50000, got {data['amount']}"
        assert isinstance(data["key_id"], str), "key_id should be string"
        
        print(f"✓ Payment order created: order_id={data['order_id']}, amount={data['amount']}, key_id={data['key_id']}")

class TestLiveClasses:
    """Test live classes CRUD endpoints"""
    
    def test_create_live_class(self, api_client, admin_token, course_id):
        """POST /api/live-classes creates live class with all fields"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        response = api_client.post(f"{BASE_URL}/api/live-classes", json={
            "title": "TEST_Live_Class_Polity",
            "course_id": course_id,
            "scheduled_at": "2026-04-20T10:00:00Z",
            "meeting_url": "https://meet.google.com/test-meeting",
            "description": "Test live class for polity"
        })
        assert response.status_code == 200, f"Create live class failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "id missing in response"
        assert data["title"] == "TEST_Live_Class_Polity"
        assert data["course_id"] == course_id
        assert data["scheduled_at"] == "2026-04-20T10:00:00Z"
        assert data["meeting_url"] == "https://meet.google.com/test-meeting"
        assert data["description"] == "Test live class for polity"
        assert data["status"] == "scheduled", f"Default status should be 'scheduled', got {data['status']}"
        assert "created_at" in data
        
        print(f"✓ Live class created: id={data['id']}, title={data['title']}, status={data['status']}")
        return data["id"]
    
    def test_list_live_classes_with_course_name(self, api_client, admin_token, course_id):
        """GET /api/live-classes returns list with course_name enriched"""
        # First create a live class
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        create_response = api_client.post(f"{BASE_URL}/api/live-classes", json={
            "title": "TEST_Live_Class_History",
            "course_id": course_id,
            "scheduled_at": "2026-04-21T14:00:00Z",
            "meeting_url": "https://zoom.us/test-meeting"
        })
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Now fetch list
        response = api_client.get(f"{BASE_URL}/api/live-classes")
        assert response.status_code == 200, f"List live classes failed: {response.text}"
        data = response.json()
        
        assert "live_classes" in data, "live_classes key missing in response"
        assert isinstance(data["live_classes"], list), "live_classes should be a list"
        assert len(data["live_classes"]) > 0, "Should have at least one live class"
        
        # Find our created class
        our_class = next((lc for lc in data["live_classes"] if lc["id"] == created_id), None)
        assert our_class is not None, f"Created live class {created_id} not found in list"
        
        # Verify course_name is enriched
        assert "course_name" in our_class, "course_name missing in live class object"
        assert isinstance(our_class["course_name"], str), "course_name should be string"
        assert len(our_class["course_name"]) > 0, "course_name should not be empty"
        
        print(f"✓ Live classes list returned with course_name enriched: {our_class['course_name']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/live-classes/{created_id}")
    
    def test_update_live_class_status(self, api_client, admin_token, course_id):
        """PUT /api/live-classes/{id} can update status to 'live'"""
        # Create a live class first
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        create_response = api_client.post(f"{BASE_URL}/api/live-classes", json={
            "title": "TEST_Live_Class_Geography",
            "course_id": course_id,
            "scheduled_at": "2026-04-22T16:00:00Z",
            "meeting_url": "https://meet.google.com/geo-class"
        })
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Update status to 'live'
        update_response = api_client.put(f"{BASE_URL}/api/live-classes/{created_id}", json={
            "status": "live"
        })
        assert update_response.status_code == 200, f"Update live class failed: {update_response.text}"
        
        # Verify update by fetching list
        list_response = api_client.get(f"{BASE_URL}/api/live-classes")
        assert list_response.status_code == 200
        classes = list_response.json()["live_classes"]
        updated_class = next((lc for lc in classes if lc["id"] == created_id), None)
        assert updated_class is not None
        assert updated_class["status"] == "live", f"Status should be 'live', got {updated_class['status']}"
        
        print(f"✓ Live class status updated to 'live' successfully")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/live-classes/{created_id}")
    
    def test_delete_live_class(self, api_client, admin_token, course_id):
        """DELETE /api/live-classes/{id} deletes live class"""
        # Create a live class first
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        create_response = api_client.post(f"{BASE_URL}/api/live-classes", json={
            "title": "TEST_Live_Class_ToDelete",
            "course_id": course_id,
            "scheduled_at": "2026-04-23T18:00:00Z",
            "meeting_url": "https://meet.google.com/delete-test"
        })
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/live-classes/{created_id}")
        assert delete_response.status_code == 200, f"Delete live class failed: {delete_response.text}"
        
        # Verify deletion by checking list
        list_response = api_client.get(f"{BASE_URL}/api/live-classes")
        assert list_response.status_code == 200
        classes = list_response.json()["live_classes"]
        deleted_class = next((lc for lc in classes if lc["id"] == created_id), None)
        assert deleted_class is None, "Deleted live class should not appear in list"
        
        print(f"✓ Live class deleted successfully")

class TestMaterialView:
    """Test material view endpoint"""
    
    def test_material_view_returns_html(self, api_client, admin_token, course_id):
        """GET /api/materials/{id}/view returns HTML with embedded PDF"""
        # First create a test material
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Create a small test PDF (base64 encoded)
        test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF"
        test_pdf_b64 = base64.b64encode(test_pdf_content).decode('utf-8')
        
        create_response = api_client.post(f"{BASE_URL}/api/courses/{course_id}/materials", json={
            "title": "TEST_Material_View",
            "filename": "test_view.pdf",
            "file_data": test_pdf_b64,
            "section_id": ""
        })
        assert create_response.status_code == 200, f"Create material failed: {create_response.text}"
        material_id = create_response.json()["id"]
        
        # Now test the view endpoint
        view_response = api_client.get(f"{BASE_URL}/api/materials/{material_id}/view")
        assert view_response.status_code == 200, f"Material view failed: {view_response.text}"
        
        # Verify it's HTML
        assert view_response.headers.get("content-type") == "text/html; charset=utf-8", "Response should be HTML"
        html_content = view_response.text
        
        # Verify HTML structure
        assert "<!DOCTYPE html>" in html_content, "Should have DOCTYPE declaration"
        assert "<html>" in html_content, "Should have html tag"
        assert "<embed" in html_content or "<iframe" in html_content, "Should have embed or iframe for PDF"
        assert "data:application/pdf;base64," in html_content, "Should have base64 PDF data"
        assert test_pdf_b64[:50] in html_content, "Should contain the PDF base64 data"
        
        print(f"✓ Material view endpoint returns HTML with embedded PDF")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/materials/{material_id}")

class TestPaymentOrderIdStorage:
    """Test that payment order creation returns order_id for state storage"""
    
    def test_order_id_can_be_stored_in_state(self, api_client, admin_token, course_id):
        """Verify order_id is returned and can be used for verification"""
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Create order
        create_response = api_client.post(f"{BASE_URL}/api/payments/create-order", json={
            "course_id": course_id,
            "amount": 99900
        })
        assert create_response.status_code == 200
        order_data = create_response.json()
        
        # Simulate storing in state (frontend would do: setCurrentOrderId(order_data.order_id))
        stored_order_id = order_data["order_id"]
        
        # Verify we can use this order_id later (e.g., in verification)
        assert stored_order_id is not None
        assert isinstance(stored_order_id, str)
        assert len(stored_order_id) > 0
        
        # Verify the order was created in database
        # (In real scenario, frontend would use this stored_order_id in verify payment call)
        print(f"✓ Order ID can be stored in state: {stored_order_id}")
