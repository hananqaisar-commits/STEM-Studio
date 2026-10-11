# STEM Studio scalability and load-test runbook

## Current architecture and evidence

- The browser app is a React/Vite SPA deployed separately from the FastAPI API. The API and database are configured through environment variables; the local setup uses SQLite, and the documented production shape uses PostgreSQL/Supabase.
- Access and refresh tokens are JWTs, so API instances do not need sticky sessions.
- SQLAlchemy's non-ephemeral connection pool was fixed at 3 connections plus 2 overflow connections per process. Supabase and other listed managed hosts use `NullPool`, which avoids an extra client pool in front of a transaction pooler.
- Rate-limit counters were process-local. Multiple workers or replicas therefore had independent limits, and the in-memory dictionary retained keys until accessed again.
- `/api/health` is a process liveness route; it does not check the database. `/api/ready` now performs a minimal `SELECT 1` and returns 503 when the database is unavailable.
- The repo had no backend container, Redis service, reverse proxy, or repeatable load-test suite. The production frontend remains separately deployable (for example, on Vercel); the new Compose stack is an API ingress option, not a frontend migration.

## Changes made

- Added a Redis fixed-window rate-limit store with an atomic increment-plus-expiry Lua operation. Redis keys are hashed, expire automatically, and contain no raw client IP. With `REDIS_URL` unset, the local fallback is lock-protected and prunes expired keys.
- Redis outage behavior is configurable. `REDIS_RATE_LIMIT_FAIL_OPEN=true` preserves API availability and falls back to per-process limits; this is best-effort abuse protection during an outage. Set it to `false` where strict shared enforcement is required; requests to limited routes then return 503 if Redis is unavailable.
- Added configurable SQLAlchemy pool settings. The upper bound is per worker process: `instances × workers × (DB_POOL_SIZE + DB_MAX_OVERFLOW)`. Keep that budget below the database/provider limit, leaving room for migrations and admin connections.
- Cached the public platform counters for a short configurable interval (`PLATFORM_STATS_CACHE_SECONDS`, default 30s); its previous request path performed a full user count and a review aggregate on every read. Redis errors fall back to the database so cache availability does not become a hard dependency for this endpoint.
- Added an API Dockerfile, two API instances, private authenticated Redis, and a HAProxy `leastconn` load balancer in `docker-compose.scale.yml`. HAProxy actively checks `/api/ready`; API ports and Redis are not published to the host. HAProxy overwrites forwarded client-IP headers, and Uvicorn only trusts the fixed proxy IP.
- Added a k6 read-only journey covering readiness, public platform stats/reviews, liveness, and optional authenticated progress reads. Writes, signups, login loops, and tutor/model calls are intentionally excluded so tests do not create rows or incur provider charges.

## Local or staging setup

1. Prepare a dedicated PostgreSQL database for the test/deployment. Do not point the stack at a production database for exploratory testing.
2. Copy `deploy/scalability/.env.example` to `deploy/scalability/.env`; set `DATABASE_URL`, a unique `JWT_SECRET_KEY`, a strong hex `REDIS_PASSWORD`, and the correct frontend origins.
3. Validate and start the stack:

   ```sh
   docker compose --env-file deploy/scalability/.env -f docker-compose.scale.yml config
   docker compose --env-file deploy/scalability/.env -f docker-compose.scale.yml up --build -d
   curl --fail http://127.0.0.1:8080/api/ready
   ```

4. In a staging environment, place TLS termination and any CDN/WAF in front of HAProxy. The included Compose ingress listens on plain HTTP and is intended for local/staging or a private network behind a TLS edge. Restrict network access to the API and Redis containers.
5. Run small stages first and inspect app, HAProxy, Redis, and database CPU/memory/connection usage before raising the cap. Stop if error rate exceeds 1%, p95 exceeds 1s, p99 exceeds 2.5s, readiness fails, or any service/database hits its operational limit.

## k6 stages

The script defaults to 20 VUs, at most 50 VUs, and a local target. It refuses non-local targets unless explicitly allowed and refuses over 1,000 VUs unless `ALLOW_HIGH_LOAD=true`. A run also requires `TARGET_USERS <= MAX_USERS <= 200000`.

Example progression (review each output and service metrics before launching the next command):

```sh
BASE_URL=http://127.0.0.1:8080 TARGET_USERS=20 MAX_USERS=50 \
  k6 run --summary-export=artifacts/loadtest/smoke.json scripts/loadtest/k6-stem-studio.js

BASE_URL=https://staging.example TARGET_USERS=500 MAX_USERS=500 ALLOW_EXTERNAL_TARGET=true \
  k6 run --summary-export=artifacts/loadtest/500-vus.json scripts/loadtest/k6-stem-studio.js

BASE_URL=https://staging.example TARGET_USERS=45000 MAX_USERS=45000 \
  ALLOW_EXTERNAL_TARGET=true ALLOW_HIGH_LOAD=true RAMP_STAGE_DURATION=5m HOLD_DURATION=10m \
  k6 run --summary-export=artifacts/loadtest/45k-vus.json scripts/loadtest/k6-stem-studio.js

# Run this only after the 45k run stayed within the stop limits and the next
# generator tier, target budget, and operator coverage have been reviewed.
BASE_URL=https://staging.example TARGET_USERS=200000 MAX_USERS=200000 \
  ALLOW_EXTERNAL_TARGET=true ALLOW_HIGH_LOAD=true RAMP_STAGE_DURATION=10m HOLD_DURATION=15m \
  k6 run --summary-export=artifacts/loadtest/200k-vus.json scripts/loadtest/k6-stem-studio.js
```

`TARGET_USERS` means concurrent virtual users, not registered accounts, daily active users, or a request count. Each VU makes one read request and waits 2–5 seconds per iteration by default. Raise generator capacity and tune think time to match observed real-user behavior. A 200k-VU run normally needs multiple distributed load generators and a target environment sized for the resulting request rate; a single developer workstation is not a representative generator.

The script exports request count/rate, failed requests, checks, and latency distributions including p50/p90/p95/p99. It cannot observe server CPU, memory, database connection saturation, or Redis memory on its own. Capture those on the target host/provider during every stage (for Compose, use `docker compose ... stats` in a separate terminal) and include them in the report. The script aborts on its configured error/latency thresholds; the operator must also stop it if resource or readiness limits are reached.

## Verification report — 2026-10-11

### Local checks completed

- A temporary SQLite endpoint/query smoke ran 800 calls from 20 concurrent clients against liveness, readiness, platform stats, and latest reviews. All 800 succeeded. It took 1.001 seconds (about 799 calls/second); measured p50 was 6.8 ms, p95 69.6 ms, p99 118.0 ms, and max 146.2 ms.
- This was an in-process direct endpoint/query check. It did not include ASGI middleware, TCP, Redis, HAProxy, a PostgreSQL service, or production data. Treat these numbers only as a local code-path smoke result, not a capacity benchmark.
- The rate-limit unit tests passed (4 tests), k6 JavaScript syntax validation passed, Compose YAML parsed, and `git diff --check` passed.

### Not measured

- The 45,000- and 200,000-VU tests were not run. This workspace has no k6 executable, no usable Docker daemon or Compose plugin, no running Redis/HAProxy stack, and no supplied staging target or resource-monitor access. The browser's localhost page is not evidence that a production-like backend is available.
- The full backend test suite did not finish in this environment; only the focused rate-limit tests above are reported as passed.
- No production capacity, availability percentage, or “99%/100% performance” claim can be made from these checks. The 200,000-VU run should only follow a successful 45,000-VU run on a dedicated staging environment with distributed generators and target-side monitoring.

## Deployment notes and limits

- Keep the API and Redis private. Only the load balancer should be publicly reachable; terminate TLS at a managed ingress or configure certificates before public deployment.
- Set `REDIS_RATE_LIMIT_FAIL_OPEN` according to the security/availability trade-off. The default allows local fallback during Redis outages; that means limits are no longer global while Redis is down.
- The Compose stack sets one Uvicorn worker per API container and a small pool. Increase replicas, workers, or pool values only after measuring throughput and checking the database connection budget.
- Supabase URLs matching the existing `supabase` detection continue to use `NullPool`; configure Supabase's pooler and its connection mode appropriately. Per-process QueuePool tuning applies to other non-ephemeral SQLAlchemy targets.
- This does not add a CDN, autoscaling controller, database read replica, durable queue, or application cache. No measured bottleneck currently justifies those services, and Redis here is used only for shared rate-limit counters.
- Do not apply `TRUST_X_FORWARDED_FOR=true` unless a trusted edge overwrites the header and Uvicorn only accepts proxy headers from that edge. The supplied HAProxy/Compose configuration enforces this for its private network.
