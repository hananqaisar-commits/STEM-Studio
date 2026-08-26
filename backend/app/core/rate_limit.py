"""
Lightweight in-memory rate limiter for FastAPI dependencies.

Production deployments should replace this with a Redis-backed limiter
(e.g. slowapi) so that limits survive process restarts and work behind
load balancers.
"""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

from fastapi import HTTPException, Request, status


@dataclass
class _Bucket:
    count: int
    reset_at: datetime


class RateLimiter:
    """Fixed-window rate limiter keyed by arbitrary string."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self._buckets: dict[str, _Bucket] = defaultdict(
            lambda: _Bucket(count=0, reset_at=datetime.now(timezone.utc) + self.window)
        )

    def is_allowed(self, key: str) -> bool:
        now = datetime.now(timezone.utc)
        bucket = self._buckets[key]
        if now >= bucket.reset_at:
            bucket.count = 0
            bucket.reset_at = now + self.window
        if bucket.count >= self.max_requests:
            return False
        bucket.count += 1
        return True

    def raise_if_limited(self, key: str) -> None:
        if not self.is_allowed(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again later.",
            )


def _default_key_extractor(request: Request) -> str:
    """Key by client IP with a fallback to the request path."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}:{request.url.path}"


def rate_limit(
    max_requests: int,
    window_seconds: int,
    *,
    key_extractor: Callable[[Request], str] = _default_key_extractor,
) -> Callable[[Request], None]:
    """
    Build a FastAPI dependency that enforces a per-key request limit.

    Example:
        @router.post("/login")
        def login(..., _rate: None = Depends(rate_limit(5, 60))):
            ...
    """
    limiter = RateLimiter(max_requests=max_requests, window_seconds=window_seconds)

    def dependency(request: Request) -> None:
        key = key_extractor(request)
        limiter.raise_if_limited(key)

    return dependency


# Pre-configured limiters commonly used across the API.
strict = rate_limit(5, 60)       # 5 requests/minute  — login / forgot-password
standard = rate_limit(30, 60)    # 30 requests/minute — general authenticated
public = rate_limit(60, 60)      # 60 requests/minute — public read endpoints
