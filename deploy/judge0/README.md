# Hosted Judge0 for STEM Studio

The Vercel deployment serves the browser app. It must not run user programs. The signed-in browser sends a code request to the FastAPI backend; the backend validates and rate-limits the request, then calls Judge0 server-to-server.

```text
Learner browser -> Vercel frontend -> FastAPI API -> private/authenticated Judge0
```

Do not install Judge0 on learners' laptops, deploy it as a Vercel function, or call Judge0 directly from frontend code. The Judge0 URL and token are backend secrets.

## Recommended production topology

Use a managed Judge0-compatible service only if it supports the submissions API and a server-side authentication header. Otherwise, use a dedicated Linux VM in a cloud account for the official Judge0 Community Edition. For a self-hosted service, the VM needs Docker Compose and the Linux isolation facilities required by Judge0. Keep Judge0's Postgres and Redis on its private Compose network; expose only its HTTPS API through a reverse proxy or load balancer.

Judge0's published self-host procedure targets Linux and recommends Ubuntu 22.04. Use Judge0 CE v1.13.1 or a later security-fixed release; releases through v1.13.0 had critical sandbox security issues. Judge0 requires special isolation support, so don't assume a generic serverless/container host can run it safely. Follow the [official release deployment instructions](https://github.com/judge0/judge0/releases) for the selected release.

### Network and sandbox controls

- Prefer private networking between the API and Judge0. If the API is on another platform, expose Judge0 only through HTTPS, restrict inbound traffic to the API host's egress IPs where practical, and require the Judge0 auth token on every request.
- Do not publish Judge0's Postgres or Redis ports to the internet. Keep the direct Judge0 port private behind the HTTPS proxy.
- Set unique, randomly generated `POSTGRES_PASSWORD` and `REDIS_PASSWORD` values in Judge0's server-side secret configuration.
- Configure `AUTHN_HEADER=X-Auth-Token` and `AUTHN_TOKEN` in `judge0.conf`. Put the same token in the FastAPI secret `JUDGE0_API_KEY`.
- Set `ENABLE_NETWORK=false` and `ALLOW_ENABLE_NETWORK=false` in Judge0. User programs should not be able to reach databases, cloud metadata endpoints, or other services from the sandbox. Judge0 documents a critical sandbox escape involving network access in affected versions; keep the instance patched and network-disabled ([security advisory](https://github.com/judge0/judge0/security/advisories/GHSA-q7vg-26pg-v5hr)).
- Terminate TLS at the reverse proxy/load balancer, rotate the Judge0 token if it is exposed, and never put the token in Vercel `VITE_*` variables or browser requests.

## Backend environment

Set these as runtime environment variables/secrets on the FastAPI deployment, then redeploy or restart it:

```env
JUDGE0_URL=https://judge0.example.com
JUDGE0_API_KEY=<the same secret as Judge0 AUTHN_TOKEN>
JUDGE0_AUTH_HEADER=X-Auth-Token
JUDGE0_TIMEOUT_SECONDS=20
JUDGE0_RATE_LIMIT_PER_MINUTE=20
```

`JUDGE0_URL` is the base URL only; STEM Studio appends `/submissions`. `JUDGE0_API_KEY` stays on the API host. If deploying with `docker-compose.scale.yml`, provide the same values in the deployment's secret `.env` file. The custom-code endpoint now requires a valid STEM Studio access token and applies per-account and per-IP limits before sending source code to Judge0.

The Vercel frontend needs only its normal `VITE_API_BASE_URL` pointing at FastAPI. It does not need a Judge0 URL or credential. CORS applies to browser-to-FastAPI traffic; the API-to-Judge0 request is server-to-server.

## If the FastAPI backend is on Render

Set the four variables above in the backend web service's Environment settings, not in the Vercel project. Keep the Judge0 VM and API in nearby regions. Render services communicate privately with services in the same Render region/workspace; for a Judge0 VM outside Render, use a private link/VPN if available, or use HTTPS with the API service's outbound IP ranges allowlisted. Prefer a dedicated outbound IP over a broad shared range for strict firewall rules ([Render private networking](https://render.com/docs/private-network), [outbound IPs](https://render.com/docs/outbound-ip-addresses)).

The repository does not contain cloud-provider credentials or a Judge0 host URL, so these resources and runtime secrets must be created in the hosting dashboards. Once the service is deployed, verify its `/authenticate` endpoint from the API host with the configured header, then sign in to STEM Studio and run a small C++ and Python snippet from the debugger. Do not treat a successful Judge0 health check as proof of end-to-end app execution.

## Operations

- Watch Judge0 queue depth, worker utilization, execution latency, timeouts, and 4xx/5xx responses. Scale Judge0 workers/VM capacity from measured concurrent submissions; active website sessions alone are not a capacity measure.
- Keep the backend's Redis-backed submission limits enabled across API replicas. Set `REDIS_RATE_LIMIT_FAIL_OPEN=false` in production so a Redis outage does not silently remove the shared quota.
- Keep `JUDGE0_TIMEOUT_SECONDS` below the API host's request timeout. If user volume or submission latency grows, move code execution to a queued asynchronous job flow rather than extending the web request indefinitely.
- Test authentication failures, compile errors, runtime errors, timeouts, and sandbox network denial after initial deployment and after Judge0 upgrades.
