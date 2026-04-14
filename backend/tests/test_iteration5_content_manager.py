"""
Backend API Tests for Iteration 5: Course Content Manager
Tests: 1) Add/Delete Videos, 2) Upload/List/Delete PDF Materials, 3) Course endpoint returns videos[] and materials[]
"""
import pytest
import requests
import uuid
import base64

BASE_URL = "https://gs-pinnacle-admin.preview.emergentagent.com"

class TestCourseContentManager:
    """Test course content management - videos and materials"""

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

    def test_add_video_to_course(self, admin_token, test_course_id):
        """Test POST /api/courses/{courseId}/videos - add video with title, url, duration"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        video_data = {
            "title": f"TEST_Video_{uuid.uuid4().hex[:8]}",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "duration": 180,
            "order": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/videos",
            headers=headers,
            json=video_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("course_id") == test_course_id, f"course_id mismatch: expected {test_course_id}, got {data.get('course_id')}"
        assert data.get("title") == video_data["title"], f"Title mismatch: expected {video_data['title']}, got {data.get('title')}"
        assert data.get("url") == video_data["url"], f"URL mismatch"
        assert data.get("duration") == video_data["duration"], f"Duration mismatch"
        assert "created_at" in data, "Response missing 'created_at'"
        assert "live_count" in data, "Response missing 'live_count'"
        assert "total_views" in data, "Response missing 'total_views'"
        
        print(f"✓ Video added successfully: {data['id']}")
        print(f"  Title: {data['title']}")
        print(f"  URL: {data['url']}")
        print(f"  Duration: {data['duration']}s")
        
        # Store video_id for cleanup
        return data["id"]

    def test_add_video_requires_admin(self, test_course_id):
        """Test POST /api/courses/{courseId}/videos requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/videos",
            json={"title": "Test", "url": "https://example.com", "duration": 100}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Add video correctly requires admin authentication")

    def test_get_course_returns_videos_array(self, admin_token, test_course_id):
        """Test GET /api/courses/{courseId} returns course with videos[] array"""
        response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "videos" in data, "Response missing 'videos' field"
        assert isinstance(data["videos"], list), "videos should be a list"
        
        print(f"✓ Course endpoint returns videos array: {len(data['videos'])} videos")
        
        if len(data["videos"]) > 0:
            video = data["videos"][0]
            assert "id" in video, "Video missing 'id'"
            assert "title" in video, "Video missing 'title'"
            assert "url" in video, "Video missing 'url'"
            assert "duration" in video, "Video missing 'duration'"
            print(f"  Sample video: {video['title']}")

    def test_delete_video(self, admin_token, test_course_id):
        """Test DELETE /api/videos/{videoId} - delete a video"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First, add a video to delete
        video_data = {
            "title": f"TEST_DELETE_Video_{uuid.uuid4().hex[:8]}",
            "url": "https://www.youtube.com/watch?v=test",
            "duration": 60
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/videos",
            headers=headers,
            json=video_data
        )
        assert add_response.status_code == 200
        video_id = add_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/videos/{video_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, f"Expected success=True, got {data.get('success')}"
        
        print(f"✓ Video deleted successfully: {video_id}")

    def test_delete_video_requires_admin(self):
        """Test DELETE /api/videos/{videoId} requires admin authentication"""
        fake_video_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/videos/{fake_video_id}")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Delete video correctly requires admin authentication")

    def test_upload_pdf_material(self, admin_token, test_course_id):
        """Test POST /api/courses/{courseId}/materials - upload PDF with title and base64 data"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Create a small mock PDF in base64
        mock_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n%%EOF"
        pdf_base64 = base64.b64encode(mock_pdf_content).decode('utf-8')
        
        material_data = {
            "title": f"TEST_Material_{uuid.uuid4().hex[:8]}",
            "file_data": pdf_base64,
            "filename": "test_material.pdf"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/materials",
            headers=headers,
            json=material_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing 'id' field"
        assert data.get("course_id") == test_course_id, f"course_id mismatch"
        assert data.get("title") == material_data["title"], f"Title mismatch"
        assert data.get("filename") == material_data["filename"], f"Filename mismatch"
        assert "file_size" in data, "Response missing 'file_size'"
        assert "created_at" in data, "Response missing 'created_at'"
        # file_data should be excluded from response (too large)
        assert "file_data" not in data, "file_data should be excluded from response"
        
        print(f"✓ PDF material uploaded successfully: {data['id']}")
        print(f"  Title: {data['title']}")
        print(f"  Filename: {data['filename']}")
        print(f"  Size: {data['file_size']} bytes")
        
        return data["id"]

    def test_upload_material_requires_admin(self, test_course_id):
        """Test POST /api/courses/{courseId}/materials requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/materials",
            json={"title": "Test", "file_data": "base64data", "filename": "test.pdf"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Upload material correctly requires admin authentication")

    def test_list_course_materials(self, admin_token, test_course_id):
        """Test GET /api/courses/{courseId}/materials - list materials without file_data field"""
        response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}/materials")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "materials" in data, "Response missing 'materials' field"
        assert isinstance(data["materials"], list), "materials should be a list"
        
        print(f"✓ Materials list endpoint working: {len(data['materials'])} materials")
        
        if len(data["materials"]) > 0:
            material = data["materials"][0]
            assert "id" in material, "Material missing 'id'"
            assert "title" in material, "Material missing 'title'"
            assert "filename" in material, "Material missing 'filename'"
            assert "file_size" in material, "Material missing 'file_size'"
            # file_data should NOT be in list response
            assert "file_data" not in material, "file_data should be excluded from list response"
            print(f"  Sample material: {material['title']} ({material['filename']})")

    def test_get_course_returns_materials_array(self, admin_token, test_course_id):
        """Test GET /api/courses/{courseId} returns course with materials[] array"""
        response = requests.get(f"{BASE_URL}/api/courses/{test_course_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "materials" in data, "Response missing 'materials' field"
        assert isinstance(data["materials"], list), "materials should be a list"
        
        print(f"✓ Course endpoint returns materials array: {len(data['materials'])} materials")
        
        if len(data["materials"]) > 0:
            material = data["materials"][0]
            assert "id" in material, "Material missing 'id'"
            assert "title" in material, "Material missing 'title'"
            assert "filename" in material, "Material missing 'filename'"
            # file_data should NOT be in course response
            assert "file_data" not in material, "file_data should be excluded from course response"
            print(f"  Sample material: {material['title']}")

    def test_delete_material(self, admin_token, test_course_id):
        """Test DELETE /api/materials/{materialId} - delete a material"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First, upload a material to delete
        mock_pdf = base64.b64encode(b"%PDF-1.4\ntest").decode('utf-8')
        material_data = {
            "title": f"TEST_DELETE_Material_{uuid.uuid4().hex[:8]}",
            "file_data": mock_pdf,
            "filename": "delete_test.pdf"
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/materials",
            headers=headers,
            json=material_data
        )
        assert add_response.status_code == 200
        material_id = add_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/materials/{material_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, f"Expected success=True, got {data.get('success')}"
        
        print(f"✓ Material deleted successfully: {material_id}")

    def test_delete_material_requires_admin(self):
        """Test DELETE /api/materials/{materialId} requires admin authentication"""
        fake_material_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/materials/{fake_material_id}")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Delete material correctly requires admin authentication")

    def test_download_material(self, admin_token, test_course_id):
        """Test GET /api/materials/{materialId}/download - download PDF file"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First, upload a material
        mock_pdf_content = b"%PDF-1.4\nTest PDF Content"
        pdf_base64 = base64.b64encode(mock_pdf_content).decode('utf-8')
        
        material_data = {
            "title": f"TEST_Download_{uuid.uuid4().hex[:8]}",
            "file_data": pdf_base64,
            "filename": "download_test.pdf"
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/courses/{test_course_id}/materials",
            headers=headers,
            json=material_data
        )
        assert add_response.status_code == 200
        material_id = add_response.json()["id"]
        
        # Now download it
        download_response = requests.get(f"{BASE_URL}/api/materials/{material_id}/download")
        assert download_response.status_code == 200, f"Expected 200, got {download_response.status_code}"
        assert download_response.headers.get("content-type") == "application/pdf", "Content-Type should be application/pdf"
        assert "attachment" in download_response.headers.get("content-disposition", "").lower(), "Should have attachment disposition"
        
        # Verify content
        downloaded_content = download_response.content
        assert downloaded_content == mock_pdf_content, "Downloaded content doesn't match uploaded content"
        
        print(f"✓ Material download working: {material_id}")
        print(f"  Content-Type: {download_response.headers.get('content-type')}")
        print(f"  Size: {len(downloaded_content)} bytes")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/materials/{material_id}", headers=headers)
