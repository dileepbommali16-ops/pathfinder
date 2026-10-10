"""
Backend Fundamentals: Structured Logging & Correlation ID Tracking
Provides standardized logging formats, request tracing, and correlation ID tracking
across all backend modules, API handlers, and cloud environments.
"""

import sys
import logging
import uuid
from contextvars import ContextVar
from typing import Optional

# Context variable holding the correlation / request ID for the current async task
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="system")


def get_current_request_id() -> str:
    """Returns the current request ID or 'system' if outside an HTTP request."""
    return request_id_ctx.get()


def set_current_request_id(req_id: Optional[str] = None) -> str:
    """Sets the current request ID."""
    rid = req_id or str(uuid.uuid4())[:8]
    request_id_ctx.set(rid)
    return rid


class StructuredLogFormatter(logging.Formatter):
    """Formats log records with timestamp, level, correlation ID, and message."""

    def format(self, record: logging.LogRecord) -> str:
        req_id = get_current_request_id()
        time_str = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        prefix = f"{time_str} [{record.levelname:<5}] [Req:{req_id}] [{record.name}]:"
        message = record.getMessage()
        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
            message = f"{message}\n{record.exc_text}"
        return f"{prefix} {message}"


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Configures root and application loggers with structured output."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicate output
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(StructuredLogFormatter())
    root_logger.addHandler(console_handler)

    # Disable overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logger = logging.getLogger("pathfinder")
    logger.setLevel(level)
    return logger


logger = logging.getLogger("pathfinder")
