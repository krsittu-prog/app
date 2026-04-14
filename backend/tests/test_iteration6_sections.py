"""
Backend API Tests for Iteration 6: Course Section/Folder System
Tests: 1) Create/List/Update/Delete Sections, 2) Videos with section_id, 3) Materials with section_id
"""
import pytest
import requests
import uuid
import base64

BASE_URL = "https://gs-pinnacle-admin.preview.emergentagent.com"

class TestCourseSections:
    """Test course section/folder system"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code} {response.text}"
        return response.json()["token"]

    @pytest.fixture
    def test_course_id(self, admin_token):
        """Get first available course ID for testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        assert response.status_code == 200
        courses = response.json().get("courses", [])
        assert len(courses) > 0, "No courses available for testing"
        return courses[0]["id"]

    def test_create_section(self, admin_token, test_course_id):
        """Test POST /api/courses/{courseId}/sections - create section with title, order, is_locked"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        section_data = {
            "title": f"TEST_Section_{uuid.uuid4().hex[:8]}",
            "order": 1,
            "is_locked": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json=section_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("course_id") == test_course_id, f"course_id mismatch"
        assert data.get("title") == section_data["title"], f"Title mismatch"
        assert data.get("order") == section_data["order"], f"Order mismatch"
        assert data.get("is_locked") == section_data["is_locked"], f"is_locked mismatch"
        assert "created_at" in data, "Response missing 'created_at'"
        
        print(f"✓ Section created successfully: {data['id']}")
        print(f"  Title: {data['title']}")
        print(f"  Order: {data['order']}")
        print(f"  Locked: {data['is_locked']}")
        
        return data["id"]

    def test_create_section_requires_admin(self, test_course_id):
        """Test POST /api/courses/{courseId}/sections requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            json={"title": "Test Section", "order": 0, "is_locked": False}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Create section correctly requires admin authentication")

    def test_list_sections_with_nested_content(self, admin_token, test_course_id):
        """Test GET /api/courses/{courseId}/sections - returns sections with nested videos[] and materials[]"""
        response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}/sections")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sections" in data, "Response missing 'sections' field"
        assert isinstance(data["sections"], list), "sections should be a list"
        
        print(f"✓ Sections list endpoint working: {len(data['sections'])} sections")
        
        if len(data["sections"]) > 0:
            section = data["sections"][0]
            assert "id" in section, "Section missing 'id'"
            assert "title" in section, "Section missing 'title'"
            assert "order" in section, "Section missing 'order'"
            assert "is_locked" in section, "Section missing 'is_locked'"
            assert "videos" in section, "Section missing 'videos' array"
            assert "materials" in section, "Section missing 'materials' array"
            assert isinstance(section["videos"], list), "videos should be a list"
            assert isinstance(section["materials"], list), "materials should be a list"
            
            print(f"  Sample section: {section['title']}")
            print(f"    Videos: {len(section['videos'])}")
            print(f"    Materials: {len(section['materials'])}")
            print(f"    Locked: {section['is_locked']}")

    def test_update_section_toggle_lock(self, admin_token, test_course_id):
        """Test PUT /api/sections/{sectionId} - toggle is_locked"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First, create a section
        section_data = {
            "title": f"TEST_Lock_{uuid.uuid4().hex[:8]}",
            "order": 0,
            "is_locked": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json=section_data
        )
        assert create_response.status_code == 200
        section_id = create_response.json()["id"]
        
        # Toggle lock to True
        update_response = requests.put(
            f"{BASE_URL}/api/sections/{section_id}",
            headers=headers,
            json={"is_locked": True}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        data = update_response.json()
        assert data.get("is_locked") == True, f"Expected is_locked=True, got {data.get('is_locked')}"
        
        print(f"✓ Section lock toggled successfully: {section_id}")
        print(f"  is_locked: False → True")
        
        # Toggle back to False
        update_response2 = requests.put(
            f"{BASE_URL}/api/sections/{section_id}",
            headers=headers,
            json={"is_locked": False}
        )
        assert update_response2.status_code == 200
        assert update_response2.json().get("is_locked") == False
        print(f"  is_locked: True → False")
        
        return section_id

    def test_update_section_requires_admin(self):
        """Test PUT /api/sections/{sectionId} requires admin authentication"""
        fake_section_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/sections/{fake_section_id}",
            json={"is_locked": True}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Update section correctly requires admin authentication")

    def test_delete_section_and_content(self, admin_token, test_course_id):
        """Test DELETE /api/sections/{sectionId} - deletes section and its content"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Create a section
        section_data = {
            "title": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "order": 0,
            "is_locked": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json=section_data
        )
        assert create_response.status_code == 200
        section_id = create_response.json()["id"]
        
        # Add a video to this section
        video_data = {
            "title": "Test Video in Section",
            "url": "https://www.youtube.com/watch?v=test",
            "duration": 60,
            "order": 0,
            "section_id": section_id
        }
        
        video_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/videos",
            headers=headers,
            json=video_data
        )
        assert video_response.status_code == 200
        video_id = video_response.json()["id"]
        
        # Delete the section
        delete_response = requests.delete(
            f"{BASE_URL}/api/sections/{section_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, f"Expected success=True, got {data.get('success')}"
        
        print(f"✓ Section deleted successfully: {section_id}")
        print(f"  Associated video {video_id} should also be deleted")

    def test_delete_section_requires_admin(self):
        """Test DELETE /api/sections/{sectionId} requires admin authentication"""
        fake_section_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/sections/{fake_section_id}")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Delete section correctly requires admin authentication")

    def test_add_video_with_section_id(self, admin_token, test_course_id):
        """Test POST /api/courses/{courseId}/videos with section_id field"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First, create a section
        section_data = {
            "title": f"TEST_VideoSection_{uuid.uuid4().hex[:8]}",
            "order": 0,
            "is_locked": False
        }
        
        section_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json=section_data
        )
        assert section_response.status_code == 200
        section_id = section_response.json()["id"]
        
        # Add video with section_id
        video_data = {
            "title": f"TEST_Video_Section_{uuid.uuid4().hex[:8]}",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "duration": 180,
            "order": 0,
            "section_id": section_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/videos",
            headers=headers,
            json=video_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("section_id") == section_id, f"section_id mismatch: expected {section_id}, got {data.get('section_id')}"
        assert data.get("title") == video_data["title"], f"Title mismatch"
        
        print(f"✓ Video added with section_id successfully: {data['id']}")
        print(f"  Section ID: {section_id}")
        print(f"  Video Title: {data['title']}")
        
        # Verify it appears in section's videos array
        sections_response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}/sections")
        assert sections_response.status_code == 200
        sections = sections_response.json()["sections"]
        target_section = next((s for s in sections if s["id"] == section_id), None)
        assert target_section is not None, "Section not found"
        assert len(target_section["videos"]) > 0, "Section should have videos"
        assert any(v["id"] == data["id"] for v in target_section["videos"]), "Video not found in section's videos array"
        
        print(f"  ✓ Video appears in section's videos[] array")

    def test_add_material_with_section_id(self, admin_token, test_course_id):
        """Test POST /api/courses/{courseId}/materials with section_id field"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First, create a section
        section_data = {
            "title": f"TEST_MaterialSection_{uuid.uuid4().hex[:8]}",
            "order": 0,
            "is_locked": False
        }
        
        section_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json=section_data
        )
        assert section_response.status_code == 200
        section_id = section_response.json()["id"]
        
        # Add material with section_id
        mock_pdf = base64.b64encode(b"%PDF-1.4\nTest PDF").decode('utf-8')
        material_data = {
            "title": f"TEST_Material_Section_{uuid.uuid4().hex[:8]}",
            "file_data": mock_pdf,
            "filename": "test_section.pdf",
            "section_id": section_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/materials",
            headers=headers,
            json=material_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("section_id") == section_id, f"section_id mismatch: expected {section_id}, got {data.get('section_id')}"
        assert data.get("title") == material_data["title"], f"Title mismatch"
        
        print(f"✓ Material added with section_id successfully: {data['id']}")
        print(f"  Section ID: {section_id}")
        print(f"  Material Title: {data['title']}")
        
        # Verify it appears in section's materials array
        sections_response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}/sections")
        assert sections_response.status_code == 200
        sections = sections_response.json()["sections"]
        target_section = next((s for s in sections if s["id"] == section_id), None)
        assert target_section is not None, "Section not found"
        assert len(target_section["materials"]) > 0, "Section should have materials"
        assert any(m["id"] == data["id"] for m in target_section["materials"]), "Material not found in section's materials array"
        
        print(f"  ✓ Material appears in section's materials[] array")

    def test_sections_sorted_by_order(self, admin_token, test_course_id):
        """Test GET /api/courses/{courseId}/sections returns sections sorted by order"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Create sections with different orders
        section1 = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json={"title": f"TEST_Order_3_{uuid.uuid4().hex[:4]}", "order": 3, "is_locked": False}
        )
        section2 = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json={"title": f"TEST_Order_1_{uuid.uuid4().hex[:4]}", "order": 1, "is_locked": False}
        )
        section3 = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/sections",
            headers=headers,
            json={"title": f"TEST_Order_2_{uuid.uuid4().hex[:4]}", "order": 2, "is_locked": False}
        )
        
        # Get sections
        response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}/sections")
        assert response.status_code == 200
        
        sections = response.json()["sections"]
        # Check if sorted by order
        orders = [s["order"] for s in sections]
        assert orders == sorted(orders), f"Sections not sorted by order: {orders}"
        
        print(f"✓ Sections correctly sorted by order field")
        print(f"  Orders: {orders[:5]}...")  # Show first 5
