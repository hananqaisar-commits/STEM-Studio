from fastapi import HTTPException

from backend.app.core import rate_limit as limiter_module


class FakeRedis:
    def __init__(self):
        self.counts = {}

    def eval(self, _script, _key_count, key, _window):
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]


def test_local_limiter_rejects_after_limit(monkeypatch):
    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", "")
    limiter = limiter_module.RateLimiter(max_requests=2, window_seconds=60)

    assert limiter.is_allowed("client-a:/test") is True
    assert limiter.is_allowed("client-a:/test") is True
    assert limiter.is_allowed("client-a:/test") is False


def test_local_fallback_caps_new_client_keys(monkeypatch):
    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", "")
    monkeypatch.setattr(limiter_module, "_MAX_LOCAL_KEYS", 1)
    limiter = limiter_module.RateLimiter(max_requests=10, window_seconds=60)

    assert limiter.is_allowed("client-a:/test") is True
    assert limiter.is_allowed("client-b:/test") is False
    assert len(limiter._buckets) == 1


def test_redis_limiter_shares_counters_between_instances(monkeypatch):
    shared_redis = FakeRedis()
    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", "redis://test/0")
    monkeypatch.setattr(limiter_module, "get_redis_client", lambda: shared_redis)
    first_instance = limiter_module.RateLimiter(max_requests=2, window_seconds=60)
    second_instance = limiter_module.RateLimiter(max_requests=2, window_seconds=60)

    assert first_instance.is_allowed("client-a:/test") is True
    assert second_instance.is_allowed("client-a:/test") is True
    assert first_instance.is_allowed("client-a:/test") is False


def test_closed_redis_failure_returns_service_unavailable(monkeypatch):
    class BrokenRedis:
        def eval(self, *_args):
            raise limiter_module.RedisError("unavailable")

    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", "redis://test/0")
    monkeypatch.setattr(limiter_module.settings, "REDIS_RATE_LIMIT_FAIL_OPEN", False)
    monkeypatch.setattr(limiter_module, "get_redis_client", lambda: BrokenRedis())

    try:
        limiter_module.RateLimiter(2, 60).raise_if_limited("client-a:/test")
    except HTTPException as exc:
        assert exc.status_code == 503
    else:
        raise AssertionError("An unavailable required Redis backend must fail closed")
