"""
Unit Tests for Backend Data Models (Photo 2: test/unit)
"""

import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.models import (
    StudentProfile,
    LoginRequest,
    WebhookPayload,
    ChatMessage,
    ChatRequest
)
from pydantic import ValidationError


def test_student_profile_defaults():
    profile = StudentProfile()
    assert profile.cgpa == 7.8
    assert profile.backlogs == 0
    assert profile.coding == 7.0
    assert profile.communication == 7.0


def test_login_request_validation():
    # Valid login request
    req = LoginRequest(username="testuser", email="test@pathfinder.ai")
    assert req.username == "testuser"
    assert req.honeypot is None

    # Empty username should raise validation error
    failed = False
    try:
        LoginRequest(username="")
    except ValidationError:
        failed = True
    assert failed is True


def test_webhook_payload():
    payload = WebhookPayload(event="placement.created", data={"student_id": "123"})
    assert payload.event == "placement.created"
    assert payload.data["student_id"] == "123"


if __name__ == "__main__":
    test_student_profile_defaults()
    test_login_request_validation()
    test_webhook_payload()
    print("All model unit tests passed successfully!")
