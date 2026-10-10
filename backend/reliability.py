"""
Reliability: Circuit Breaker, Exponential Backoff Retries & Resilience
Protects the platform against cascading failures, API timeouts, and network outages
when communicating with external services (e.g., Google Gemini AI, OAuth providers).
"""

import time
import asyncio
from enum import Enum
from typing import Callable, Any, Optional, Dict
from functools import wraps

from backend.logging_config import logger


class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal operations, requests allowed through
    OPEN = "OPEN"            # Service failing, immediately reject calls to prevent cascading degradation
    HALF_OPEN = "HALF_OPEN"  # Testing if upstream service has recovered


class CircuitBreaker:
    """
    Implements the Circuit Breaker pattern.
    If an external service fails `failure_threshold` times within `recovery_timeout` seconds,
    the circuit opens and prevents further calls for `recovery_timeout` seconds.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        success_threshold: int = 2
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self.state: CircuitState = CircuitState.CLOSED
        self.failure_count: int = 0
        self.success_count: int = 0
        self.last_state_change: float = time.time()

    def record_success(self):
        """Records a successful upstream call."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                self.last_state_change = time.time()
                logger.info(f"[CircuitBreaker:{self.name}] Recovered: State changed to CLOSED.")
        else:
            self.failure_count = 0

    def record_failure(self, exception: Exception):
        """Records a failure from the upstream call."""
        self.failure_count += 1
        logger.warning(f"[CircuitBreaker:{self.name}] Upstream error ({self.failure_count}/{self.failure_threshold}): {exception}")

        if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.last_state_change = time.time()
            logger.error(f"[CircuitBreaker:{self.name}] State changed to OPEN! Failing fast for {self.recovery_timeout}s.")
        elif self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.last_state_change = time.time()
            logger.error(f"[CircuitBreaker:{self.name}] Probe failed in HALF_OPEN. State returned to OPEN.")

    def allow_request(self) -> bool:
        """Determines if a request is permitted through the circuit."""
        now = time.time()
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            if now - self.last_state_change > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                self.last_state_change = now
                logger.info(f"[CircuitBreaker:{self.name}] Recovery timeout passed. State changed to HALF_OPEN (probing).")
                return True
            return False

        if self.state == CircuitState.HALF_OPEN:
            # Allow limited test requests through
            return True

        return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_state_change_seconds_ago": round(time.time() - self.last_state_change, 1)
        }


# Global breakers for external dependencies
gemini_circuit_breaker = CircuitBreaker("GoogleGeminiAPI", failure_threshold=4, recovery_timeout=45.0)
oauth_circuit_breaker = CircuitBreaker("OAuthProviders", failure_threshold=5, recovery_timeout=30.0)


def retry_with_backoff(
    retries: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """Decorator for exponential backoff retries on transient errors."""
    def decorator(func: Callable):
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            delay = initial_delay
            last_exc: Optional[BaseException] = None
            for attempt in range(1, retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt == retries:
                        break
                    logger.warning(f"Retry {attempt}/{retries} for {func.__name__} after error: {e}. Waiting {delay:.2f}s")
                    time.sleep(delay)
                    delay *= backoff_factor
            if last_exc is not None:
                raise last_exc
            raise RuntimeError(f"Retry execution failed for {func.__name__}")

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            delay = initial_delay
            last_exc: Optional[BaseException] = None
            for attempt in range(1, retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt == retries:
                        break
                    logger.warning(f"Async retry {attempt}/{retries} for {func.__name__} after error: {e}. Waiting {delay:.2f}s")
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
            if last_exc is not None:
                raise last_exc
            raise RuntimeError(f"Async retry execution failed for {func.__name__}")

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
