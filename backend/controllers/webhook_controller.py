"""
Backend Architecture: Webhook Controller (Photo 2)
Receives external webhook payloads, performs cryptographic HMAC signature validation, and returns response.
"""

import os
import json
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status

from backend.security import verify_webhook_signature
from backend.logging_config import logger

DEFAULT_WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "pathfinder_webhook_secret_key_2026")


async def handle_webhook_event(
    request: Request,
    signature_header: Optional[str],
    secret: str = DEFAULT_WEBHOOK_SECRET
) -> Dict[str, Any]:
    """Validates signature and processes inbound webhook event."""
    raw_body = await request.body()

    if not signature_header:
        logger.warning("[WEBHOOK SECURITY 401] Inbound webhook rejected: Missing cryptographic signature header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing X-Webhook-Signature header."
        )

    is_valid = verify_webhook_signature(
        payload_bytes=raw_body,
        signature_header=signature_header,
        secret=secret
    )

    if not is_valid:
        logger.warning("[WEBHOOK SECURITY 403] Inbound webhook rejected: Signature verification failed.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid HMAC webhook signature."
        )

    try:
        payload_dict = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        event_name = payload_dict.get("event", "generic_event")
    except Exception:
        event_name = "raw_event"

    logger.info(f"[WEBHOOK CONTROLLER] Verified event '{event_name}' received.")
    return {
        "success": True,
        "event": event_name,
        "verified": True,
        "message": "Webhook signature verified and payload processed successfully."
    }
