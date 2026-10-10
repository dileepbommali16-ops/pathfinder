"""
Performance & Scalability: In-Memory TTL & LRU Caching System
Provides high-throughput thread-safe caching for database queries,
expensive cohort aggregations, and AI prompt results.
"""

import time
import threading
from typing import Any, Dict, Optional, Callable
from functools import wraps
import hashlib
import json

from backend.logging_config import logger


class CacheEntry:
    """Stores a single cache value with expiration timestamp and access tracking."""
    def __init__(self, value: Any, ttl_seconds: float):
        self.value = value
        self.expires_at = time.time() + ttl_seconds
        self.last_accessed = time.time()

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class InMemoryCache:
    """Thread-safe LRU/TTL in-memory cache."""
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._store: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        self.hits: int = 0
        self.misses: int = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self.misses += 1
                return None
            if entry.is_expired():
                del self._store[key]
                self.misses += 1
                return None
            entry.last_accessed = time.time()
            self.hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: float = 300) -> None:
        with self._lock:
            # Enforce max size via LRU eviction if full
            if len(self._store) >= self.max_size and key not in self._store:
                self._evict_lru()
            self._store[key] = CacheEntry(value, ttl_seconds)

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def clear_prefix(self, prefix: str) -> int:
        """Removes all keys starting with prefix."""
        with self._lock:
            to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in to_remove:
                del self._store[k]
            return len(to_remove)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def _evict_lru(self) -> None:
        """Evicts oldest accessed or expired entries."""
        # 1. Clean expired entries first
        now = time.time()
        expired = [k for k, v in self._store.items() if now > v.expires_at]
        for k in expired:
            del self._store[k]

        # 2. If still full, remove least recently accessed
        if len(self._store) >= self.max_size and self._store:
            oldest_key = min(self._store, key=lambda k: self._store[k].last_accessed)
            del self._store[oldest_key]

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests) if total_requests > 0 else 0.0
            return {
                "size": len(self._store),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate_pct": round(hit_rate * 100.0, 2),
            }


# Global application cache instance
cache = InMemoryCache(max_size=2000)


def cached(ttl_seconds: float = 300, key_prefix: str = "cache"):
    """
    Decorator to cache function return values with a time-to-live.
    Keys are deterministic hashes of positional and keyword arguments.
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Build deterministic key
                args_repr = f"{args}_{sorted(kwargs.items())}"
                key_hash = hashlib.sha256(args_repr.encode()).hexdigest()[:16]
                cache_key = f"{key_prefix}:{func.__name__}:{key_hash}"

                cached_val = cache.get(cache_key)
                if cached_val is not None:
                    return cached_val

                result = func(*args, **kwargs)
                cache.set(cache_key, result, ttl_seconds=ttl_seconds)
                return result
            except Exception as e:
                # If caching fails for any reason, don't crash execution
                logger.debug(f"Cache bypass for {func.__name__}: {e}")
                return func(*args, **kwargs)

        return wrapper
    return decorator
