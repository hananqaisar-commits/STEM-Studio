# Scalable API deployment template

This Compose stack is a self-hosted starting point for horizontal API scaling. It runs Redis for shared rate limits, one schema-migration job, any number of API containers, and HAProxy to health-check and balance across discovered API replicas.

## Start a local or staging stack

1. Copy `deploy/scalability/.env.example` to `deploy/scalability/.env`.
2. Set a persistent PostgreSQL URL, a long random JWT secret, a Redis password, the exact HTTPS frontend origin, and transactional email provider credentials. Keep `.env` private.
3. From the repository root, run:

   ```bash
   docker compose -f docker-compose.scale.yml --env-file deploy/scalability/.env up -d --build --scale api=2
   ```

4. The API is available through HAProxy on port 8080 by default. Increase or decrease the API replica count with `--scale api=N`.
5. HAProxy checks `/api/ready`, removes unhealthy replicas, rediscovers container IPs through Docker DNS, reuses upstream connections, and applies bounded connection queues.

This template exposes plain HTTP for local/staging use. Terminate HTTPS at a trusted cloud ingress or configure TLS on a production edge before accepting public traffic. Do not expose the internal API containers or Redis directly.

## Database and worker sizing

Each API worker has its own SQLAlchemy pool. Estimate the maximum application-side database connections as:

`API replicas × workers per replica × (DB_POOL_SIZE + DB_MAX_OVERFLOW)`

Keep that number within the managed database's client-connection budget. A large user count alone does not determine capacity; CPU, request mix, database query cost, cache hit rate, email-provider limits, and peak concurrency matter.

Run the one-shot `migrate` service before serving replicas. The stack sets `AUTO_MIGRATE_ON_STARTUP=false` on API containers to prevent migration races. Each API replica runs a database-backed verification-email worker; rows are claimed with row locks, retried with exponential backoff, and shared safely across replicas. The verification token is encrypted at rest using a key derived from the stable `JWT_SECRET_KEY`; rotating that secret can make queued email tokens unreadable, so let pending jobs drain before a planned rotation.

## Production capacity limits

This template is not a claim that one machine or one HAProxy process can serve millions of concurrent users. HAProxy's configured connection limit is 50,000 per instance, and the Compose stack runs on the capacity of its host. Millions of registered users, millions of concurrent connections, and millions of requests per second are different targets.

For large production traffic, run multiple API and load-balancer instances across hosts or zones, use a managed edge/load balancer with TLS and autoscaling, a managed highly available Redis service, and a PostgreSQL plan sized for measured query and connection load. Add CDN caching for public static content, database read replicas only for read-heavy queries that tolerate replication lag, and queue-based workers for bulk mail and other long tasks. Benchmark with representative traffic and monitor p95/p99 latency, error rate, database pool wait, CPU, memory, Redis latency, and provider delivery rate before choosing replica counts.

The current Vercel + Render deployment does not automatically use this Compose stack. Deploying this template requires a server/container platform and the environment values above. Keep all production secrets in the host's secret manager, not in this repository.

## Email provider troubleshooting

Verification mail is queued after account creation and retried automatically. The default provider is Resend over HTTPS. Render/container logs record a safe failure category without the recipient address, message, token, or provider secret:

- `provider_timeout` or `provider_connection_error`: check backend network access to `api.resend.com` over HTTPS and retry after a transient outage.
- `provider_temporary_rejection`: the provider requested a retry, commonly due to a rate or temporary service limit; the outbox backs off and tries again.
- `provider_rejection`: check that the key is valid, the sending domain is verified, and `EMAILS_FROM_EMAIL` uses that verified domain.
- `authentication_rejected`: for the optional SMTP path, check `SMTP_USER` and the provider password.
- `sender_rejected`: for SMTP, make `EMAILS_FROM_EMAIL` an address the authenticated sender may use.
- `tls_error`, `connection_timeout`, `host_resolution_error`, or `connection_error`: for SMTP, check the host, port, TLS mode, and whether the deployment host permits SMTP egress.
- `recipient_rejected`: for SMTP, check the destination address and provider response.

On Render Free, use the HTTPS API path: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and a verified `EMAILS_FROM_EMAIL`. Render Free blocks outbound SMTP ports 25, 465, and 587. On another host that permits SMTP, select `EMAIL_PROVIDER=smtp`; Gmail requires an App Password rather than the account password. See [the full email setup guide](../../docs/email-delivery-setup.md).
