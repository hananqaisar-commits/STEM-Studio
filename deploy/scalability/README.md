# Scalable API deployment template

This Compose stack is a self-hosted starting point for horizontal API scaling. It runs Redis for shared rate limits, one schema-migration job, any number of API containers, and HAProxy to health-check and balance across discovered API replicas.

## Start a local or staging stack

1. Copy `deploy/scalability/.env.example` to `deploy/scalability/.env`.
2. Set a persistent PostgreSQL URL, a long random JWT secret, a Redis password, the exact HTTPS frontend origin, and SMTP credentials. Keep `.env` private.
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

## SMTP troubleshooting

Verification mail is queued after account creation and retried automatically. Render/container logs now record a safe failure category without the recipient address, message, token, or SMTP password:

- `authentication_rejected`: check `SMTP_USER` and the provider app password.
- `sender_rejected`: make `EMAILS_FROM_EMAIL` an address the authenticated sender is allowed to use.
- `tls_error`, `connection_timeout`, `host_resolution_error`, or `connection_error`: check the host, port, TLS mode, and whether the deployment host permits SMTP egress.
- `provider_temporary_rejection`: the provider asked the service to retry; the outbox backs off and tries again.
- `provider_rejection` or `recipient_rejected`: check the provider's sender policy and the destination address.

For Gmail, use `smtp.gmail.com`, port 587 with STARTTLS (`SMTP_TLS=true`, `SMTP_USE_SSL=false`) or port 465 with implicit TLS (`SMTP_USE_SSL=true`). Use a Google App Password, not the normal account password. The backend strips display spaces from the App Password. Gmail is suitable for low-volume testing; production transactional or broadcast traffic needs a provider and plan whose sending limits match demand.
