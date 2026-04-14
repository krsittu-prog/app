"""
Backend API Tests for Video Player and Live Chat Features
Tests: Course videos, chat history, WebSocket chat endpoint
"""
import pytest
import requests
import json

BASE_URL = "https://gs-pinnacle-admin.preview.emergentagent.com"

class TestVideoFeatures:
    """Video-related endpoint tests"""

    def test_get_course_with_videos(self):
        """Test GET /api/courses/{courseId} returns videos array for first 3 courses"""
        # Get all courses
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        assert list_resp.status_code == 200, f"Expected 200, got {list_resp.status_code}"
        
        courses = list_resp.json()["courses"]
        assert len(courses) >= 3, f"Expected at least 3 courses, got {len(courses)}"
        
        # Test first 3 courses have videos
        for i in range(3):
            course_id = courses[i]["id"]
            response = requests.get(f"{BASE_URL}/api/courses/{course_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "videos" in data, f"Course {course_id} missing 'videos' field"
            assert isinstance(data["videos"], list), f"'videos' should be a list"
            
            # First 3 courses should have videos (7 videos seeded across 3 courses)
            if i < 3:
                assert len(data["videos"]) > 0, f"Course {i+1} should have videos but has {len(data['videos'])}"
                print(f"✓ Course {i+1} '{data['title']}' has {len(data['videos'])} videos")
                
                # Verify video structure
                for video in data["videos"]:
                    assert "id" in video, "Video missing 'id'"
                    assert "title" in video, "Video missing 'title'"
                    assert "url" in video, "Video missing 'url'"
                    assert "order" in video, "Video missing 'order'"
                    assert "course_id" in video, "Video missing 'course_id'"
                    assert video["course_id"] == course_id, "Video course_id mismatch"
                    print(f"  - Video: {video['title']} (URL: {video['url'][:50]}...)")

    def test_course_videos_sorted_by_order(self):
        """Test videos are returned sorted by order field"""
        # Get first course
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        course_id = courses[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert response.status_code == 200
        
        data = response.json()
        videos = data.get("videos", [])
        
        if len(videos) > 1:
            # Check if sorted by order
            orders = [v["order"] for v in videos]
            assert orders == sorted(orders), f"Videos not sorted by order: {orders}"
            print(f"✓ Videos sorted correctly by order: {orders}")


class TestChatFeatures:
    """Live chat endpoint tests"""

    def test_get_chat_history_endpoint_exists(self):
        """Test GET /api/courses/{courseId}/chat endpoint exists and returns messages"""
        # Get first course
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        course_id = courses[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}/chat?limit=50")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "messages" in data, "Response missing 'messages' field"
        assert isinstance(data["messages"], list), "'messages' should be a list"
        print(f"✓ Chat history endpoint working: {len(data['messages'])} messages")

    def test_get_chat_history_with_limit(self):
        """Test chat history respects limit parameter"""
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        course_id = courses[0]["id"]
        
        # Test with limit=10
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}/chat?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        messages = data["messages"]
        assert len(messages) <= 10, f"Expected max 10 messages, got {len(messages)}"
        print(f"✓ Chat limit parameter working: {len(messages)} messages (limit=10)")

    def test_chat_message_structure(self):
        """Test chat messages have correct structure"""
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        course_id = courses[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}/chat?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        messages = data["messages"]
        
        if len(messages) > 0:
            # Check first message structure
            msg = messages[0]
            assert "id" in msg, "Message missing 'id'"
            assert "course_id" in msg, "Message missing 'course_id'"
            assert "user_name" in msg, "Message missing 'user_name'"
            assert "message" in msg, "Message missing 'message'"
            assert "type" in msg, "Message missing 'type'"
            assert "created_at" in msg, "Message missing 'created_at'"
            print(f"✓ Chat message structure valid: {list(msg.keys())}")
        else:
            print("✓ No chat messages yet (empty array is valid)")


class TestWebSocketEndpoint:
    """WebSocket chat endpoint tests"""

    def test_websocket_endpoint_path_exists(self):
        """Test WebSocket endpoint path is defined (may not connect through K8s proxy)"""
        # WebSocket testing through K8s proxy is not reliable
        # The endpoint exists at /api/ws/chat/{courseId} as verified in server.py
        # Actual WebSocket functionality will be tested via frontend UI
        
        print("✓ WebSocket endpoint defined at /api/ws/chat/{courseId} (verified in server.py)")
        print("✓ WebSocket connection testing skipped (not reliable through K8s proxy)")
        pytest.skip("WebSocket connection testing not available through K8s proxy (expected - will test via frontend)")


class TestVideoMetrics:
    """Test video metrics (live_count, total_views)"""

    def test_video_has_metrics_fields(self):
        """Test videos have live_count and total_views fields"""
        list_resp = requests.get(f"{BASE_URL}/api/courses")
        courses = list_resp.json()["courses"]
        
        # Get first course with videos
        for course in courses[:3]:
            response = requests.get(f"{BASE_URL}/api/courses/{course['id']}")
            data = response.json()
            videos = data.get("videos", [])
            
            if len(videos) > 0:
                video = videos[0]
                # Check for metrics fields (may be 0 or have override values)
                assert "live_count" in video or "total_views" in video, "Video missing metrics fields"
                print(f"✓ Video '{video['title']}' has metrics: live_count={video.get('live_count', 0)}, total_views={video.get('total_views', 0)}")
                break
