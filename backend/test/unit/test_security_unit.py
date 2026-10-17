import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import unittest
import time
from backend.security import (
    sanitize_user_input,
    check_bot_protection,
    verify_webhook_signature,
    validate_private_storage_access,
    validate_resume_upload,
    SlidingWindowRateLimiter
)
from fastapi import HTTPException


def test_sanitize_user_input_strips_scripts():
    xss_payload = "<script>alert('pwned')</script>Hello World"
    cleaned = sanitize_user_input(xss_payload)
    assert "<script>" not in cleaned
    assert "alert" not in cleaned
    assert "Hello World" in cleaned


def test_sanitize_user_input_strips_iframes():
    payload = "<iframe src='malicious.com'></iframe>Real Content"
    cleaned = sanitize_user_input(payload)
    assert "<iframe" not in cleaned
    assert "Real Content" in cleaned


def test_check_bot_protection():
    # Human submission: empty honeypot
    assert check_bot_protection("") is True
    assert check_bot_protection(None) is True
    
    # Bot submission: populated honeypot
    assert check_bot_protection("spambot_filled_this") is False
    assert check_bot_protection("   ") is True


def test_verify_webhook_signature():
    secret = "test_webhook_secret_key"
    payload = b'{"event":"placement.updated","student_id":"123"}'
    
    import hmac
    import hashlib
    valid_sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    
    # Valid signature
    assert verify_webhook_signature(payload, f"sha256={valid_sig}", secret) is True
    assert verify_webhook_signature(payload, valid_sig, secret) is True
    
    # Tampered payload / signature
    assert verify_webhook_signature(payload, "sha256=invalidhash123", secret) is False
    assert verify_webhook_signature(b'tampered payload', f"sha256={valid_sig}", secret) is False
    assert verify_webhook_signature(payload, None, secret) is False


def test_validate_private_storage_access():
    # User accessing own resource
    assert validate_private_storage_access("usr_alice", "usr_alice", is_admin=False) is True
    
    # User attempting to access another user's resource
    assert validate_private_storage_access("usr_bob", "usr_alice", is_admin=False) is False
    
    # Admin accessing any resource
    assert validate_private_storage_access("usr_admin", "usr_alice", is_admin=True) is True


def test_sliding_window_rate_limiter():
    limiter = SlidingWindowRateLimiter()
    key = "test_user_key"
    
    # 5 requests allowed
    for _ in range(5):
        allowed, rem = limiter.check(key, max_requests=5, window_seconds=10)
        assert allowed is True
        
    # 6th request rejected
    allowed, rem = limiter.check(key, max_requests=5, window_seconds=10)
    assert allowed is False
    assert rem == 0


def test_validate_resume_upload_magic_bytes():
    # Valid PDF magic bytes
    validate_resume_upload("resume.pdf", b"%PDF-1.4 sample content")
    
    # Invalid extension
    raised_exe = False
    try:
        validate_resume_upload("virus.exe", b"MZ\x90executable")
    except HTTPException:
        raised_exe = True
    assert raised_exe is True
        
    # Forged PDF extension with fake content
    raised_fake = False
    try:
        validate_resume_upload("fake.pdf", b"<html>not a pdf</html>")
    except HTTPException:
        raised_fake = True
    assert raised_fake is True


if __name__ == "__main__":
    test_sanitize_user_input_strips_scripts()
    test_sanitize_user_input_strips_iframes()
    test_check_bot_protection()
    test_verify_webhook_signature()
    test_validate_private_storage_access()
    test_sliding_window_rate_limiter()
    test_validate_resume_upload_magic_bytes()
    print("All unit tests passed successfully!")
