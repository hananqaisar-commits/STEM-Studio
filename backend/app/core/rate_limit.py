"""Bounded local and shared Redis-backed fixed-window rate limiting."""

from __future__ import annotations

import hashlib
import logging
import threading
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from redis import Redis
from redis.exceptions import RedisError

try:
    from backend.app.core.config import get_settings
except ModuleNotFoundError:
    from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_INCREMENT_WITH_TTL = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
"""
_MAX_LOCAL_KEYS = 8192
_redis_log_lock = threading.Lock()
_last_redis_log_at = 0.0


def log_redis_failure(operation: str) -> None:
    """Avoid flooding logs when Redis is continuously unavailable."""
    global _last_redis_log_at
    now = time.monotonic()
    with _redis_log_lock:
        if now - _last_redis_log_at < 30:
            return
        _last_redis_log_at = now
    logger.warning("Redis %s failed; using the configured fallback behavior", operation, exc_info=True)


@lru_cache(maxsize=1)
def get_redis_client() -> Redis:
    """Return a lazily connected client shared by this API process."""
    return Redis.from_url(
        settings.REDIS_URL,
        socket_connect_timeout=settings.REDIS_SOCKET_TIMEOUT_SECONDS,
        socket_timeout=settings.REDIS_SOCKET_TIMEOUT_SECONDS,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
        health_check_interval=30,
        decode_responses=False,
    )


@dataclass
class _Bucket:
    count: int
    reset_at: float


class RateLimiter:
    """Fixed-window limiter; Redis shares counters across API instances."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, _Bucket] = {}
        self._lock = threading.Lock()
        self._calls = 0

    def is_allowed(self, key: str) -> bool:
        if settings.REDIS_URL:
            try:
                redis_key = self._redis_key(key)
                count = int(get_redis_client().eval(
                    _INCREMENT_WITH_TTL,
                    1,
                    redis_key,
                    self.window_seconds,
                ))
                return count <= self.max_requests
            except RedisError:
                log_redis_failure("rate-limit request")
                if not settings.REDIS_RATE_LIMIT_FAIL_OPEN:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Rate limiting is temporarily unavailable. Please retry shortly.",
                        headers={"Retry-After": "1"},
                    )
                # Continue serving the request if Redis is unavailable. Local
                # limits still provide a best-effort guard until Redis recovers.

        return self._is_allowed_locally(key)

    def _redis_key(self, key: str) -> str:
        identity = f"{self.max_requests}:{self.window_seconds}:{key}".encode("utf-8")
        digest = hashlib.sha256(identity).hexdigest()
        return f"{settings.REDIS_KEY_PREFIX}:{digest}"

    def _is_allowed_locally(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                if len(self._buckets) >= _MAX_LOCAL_KEYS:
                    self._buckets = {
                        bucket_key: item
                        for bucket_key, item in self._buckets.items()
                        if now < item.reset_at
                    }
                    if len(self._buckets) >= _MAX_LOCAL_KEYS:
                        # Reject new identities instead of letting a Redis
                        # outage turn the local fallback into unbounded state.
                        return False
                bucket = _Bucket(count=0, reset_at=now + self.window_seconds)
                self._buckets[key] = bucket
            elif now >= bucket.reset_at:
                bucket = _Bucket(count=0, reset_at=now + self.window_seconds)
                self._buckets[key] = bucket

            if bucket.count >= self.max_requests:
                return False
            bucket.count += 1

            self._calls += 1
            if self._calls % 256 == 0 or len(self._buckets) > _MAX_LOCAL_KEYS:
                self._buckets = {
                    bucket_key: item
                    for bucket_key, item in self._buckets.items()
                    if now < item.reset_at
                }
            return True

    def raise_if_limited(self, key: str) -> None:
        try:
            allowed = self.is_allowed(key)
        except RedisError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Rate limiting is temporarily unavailable. Please retry shortly.",
                headers={"Retry-After": "1"},
            ) from exc

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again later.",
            )


def _default_key_extractor(request: Request) -> str:
    """Key by the connected client; only use forwarded IP when configured."""
    if settings.TRUST_X_FORWARDED_FOR:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
    else:
        client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}:{request.url.path}"


def rate_limit(
    max_requests: int,
    window_seconds: int,
    *,
    key_extractor: Callable[[Request], str] = _default_key_extractor,
) -> Callable[[Request], None]:
    """Build a FastAPI dependency that enforces a per-key request limit."""
    limiter = RateLimiter(max_requests=max_requests, window_seconds=window_seconds)

    def dependency(request: Request) -> None:
        limiter.raise_if_limited(key_extractor(request))

    return dependency


strict = rate_limit(5, 60)
standard = rate_limit(30, 60)
public = rate_limit(60, 60)
