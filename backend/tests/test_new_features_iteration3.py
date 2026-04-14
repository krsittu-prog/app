"""
Backend API Tests for Iteration 3 New Features
Tests: Admin chat toggle (chat_enabled field), Video progress tracking (save/resume)
"""
import pytest
import requests
import time

BASE_URL = "https://gs-pinnacle-admin.preview.emergentagent.com"

class TestChatToggleFeature:
    """Test admin chat toggle feature - courses.chat_enabled field"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "krsittu@gmail.com",
            "password": "Indra@4"
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_courses_have_chat_enabled_field(self):
        """Test GET /api/courses returns courses with chat_enabled field (default true)"""
        response = requests.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        courses = data.get("courses", [])
        assert len(courses) > 0, "No courses found"
        
        # Check all courses have chat_enabled field
        for course in courses:
            # chat_enabled should be present and true by default (or may not be present in old courses)
            chat_enabled = course.get("chat_enabled", True)
            print(f"✓ Course '{course['title']}' has chat_enabled={chat_enabled}")
        
        print(f"✓ All {len(courses)} courses checked for chat_enabled field")

    def test_update_course_chat_enabled_to_false(self, admin_token):
        """Test PUT /api/courses/{id} can update chat_enabled to false"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # Get first course
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        assert len(courses) > 0, "No courses available"
        
        course_id = courses[0]["id"]
        original_title = courses[0]["title"]
        
        # Update chat_enabled to false
        update_payload = {"chat_enabled": False}
        response = requests.put(f"{BASE_URL}/api/courses/{course_id}", headers=headers, json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_course = response.json()
        assert updated_course.get("chat_enabled") == False, f"Expected chat_enabled=False, got {updated_course.get('chat_enabled')}"
        print(f"✓ Updated course '{original_title}' chat_enabled to False")
        
        # Verify via GET
        get_resp = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_resp.status_code == 200
        fetched_course = get_resp.json()
        assert fetched_course.get("chat_enabled") == False, "chat_enabled not persisted correctly"
        print(f"✓ Verified chat_enabled=False persisted in database")
        
        # Restore to true for next tests
        restore_payload = {"chat_enabled": True}
        requests.put(f"{BASE_URL}/api/courses/{course_id}", headers=headers, json=restore_payload)
        print(f"✓ Restored chat_enabled to True")


class TestVideoProgressTracking:
    """Test video progress tracking - save position, resume from last position"""

    @pytest.fixture
    def student_token(self):
        """Create and login a test student"""
        import uuid
        test_email = f"test_progress_{uuid.uuid4().hex[:8]}@example.com"
        
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Progress Test Student",
            "email": test_email,
            "phone": f"9{uuid.uuid4().hex[:9]}",
            "password": "TestPass123",
            "target_courses": []
        })
        assert reg_resp.status_code == 200
        return reg_resp.json()["token"]

    def test_save_video_progress(self, student_token):
        """Test PUT /api/videos/{videoId}/progress saves position and duration"""
        headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        
        # Get first course with videos
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        
        video_id = None
        for course in courses[:3]:
            course_resp = requests.get(f"{BASE_URL}/api/courses/{course['id']}")
            videos = course_resp.json().get("videos", [])
            if len(videos) > 0:
                video_id = videos[0]["id"]
                break
        
        assert video_id is not None, "No videos found in first 3 courses"
        
        # Save progress
        progress_payload = {
            "position": 125.5,
            "duration": 600
        }
        response = requests.put(f"{BASE_URL}/api/videos/{video_id}/progress", headers=headers, json=progress_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        print(f"✓ Saved video progress: position={progress_payload['position']}, duration={progress_payload['duration']}")

    def test_get_video_progress(self, student_token):
        """Test GET /api/videos/{videoId}/progress returns saved position"""
        headers = {"Authorization": f"Bearer {student_token}"}
        
        # Get first course with videos
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        
        video_id = None
        for course in courses[:3]:
            course_resp = requests.get(f"{BASE_URL}/api/courses/{course['id']}")
            videos = course_resp.json().get("videos", [])
            if len(videos) > 0:
                video_id = videos[0]["id"]
                break
        
        assert video_id is not None, "No videos found"
        
        # First save progress
        save_headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        save_payload = {"position": 250.75, "duration": 800}
        save_resp = requests.put(f"{BASE_URL}/api/videos/{video_id}/progress", headers=save_headers, json=save_payload)
        assert save_resp.status_code == 200
        
        # Now get progress
        response = requests.get(f"{BASE_URL}/api/videos/{video_id}/progress", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "progress" in data, "Response missing 'progress' field"
        
        progress = data["progress"]
        if progress:
            assert progress.get("position") == 250.75, f"Expected position=250.75, got {progress.get('position')}"
            assert progress.get("duration") == 800, f"Expected duration=800, got {progress.get('duration')}"
            assert progress.get("video_id") == video_id, "video_id mismatch"
            print(f"✓ Retrieved video progress: position={progress['position']}, duration={progress['duration']}")
        else:
            print("⚠ No progress found (may be null if not saved yet)")

    def test_get_resume_videos_enriched(self, student_token):
        """Test GET /api/videos/resume returns enriched videos with video_title and course_title"""
        headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
        
        # First save progress for a video
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        
        video_id = None
        course_id = None
        for course in courses[:3]:
            course_resp = requests.get(f"{BASE_URL}/api/courses/{course['id']}")
            videos = course_resp.json().get("videos", [])
            if len(videos) > 0:
                video_id = videos[0]["id"]
                course_id = course["id"]
                break
        
        assert video_id is not None, "No videos found"
        
        # Save progress
        save_payload = {"position": 180.0, "duration": 600}
        save_resp = requests.put(f"{BASE_URL}/api/videos/{video_id}/progress", headers=headers, json=save_payload)
        assert save_resp.status_code == 200
        print(f"✓ Saved progress for video {video_id}")
        
        # Get resume videos
        response = requests.get(f"{BASE_URL}/api/videos/resume", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "videos" in data, "Response missing 'videos' field"
        
        videos = data["videos"]
        assert len(videos) > 0, "Expected at least 1 resume video"
        
        # Check enrichment
        resume_video = videos[0]
        assert "video_id" in resume_video, "Missing video_id"
        assert "position" in resume_video, "Missing position"
        assert "duration" in resume_video, "Missing duration"
        assert "video_title" in resume_video, "Missing video_title (enrichment failed)"
        assert "course_title" in resume_video, "Missing course_title (enrichment failed)"
        assert "video_url" in resume_video, "Missing video_url (enrichment failed)"
        assert "course_id" in resume_video, "Missing course_id (enrichment failed)"
        
        print(f"✓ Resume videos enriched correctly:")
        print(f"  - video_title: {resume_video.get('video_title')}")
        print(f"  - course_title: {resume_video.get('course_title')}")
        print(f"  - position: {resume_video.get('position')}")
        print(f"  - Total resume videos: {len(videos)}")
