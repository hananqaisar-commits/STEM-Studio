# Account persistence and authentication lifecycle

## Findings

- The application uses its configured SQL database and has no in-memory fallback or account-cleanup job. Registration commits the user and its verification record in one transaction. The local configuration uses a PostgreSQL URL; production records were not queried.
- The account table has unique email and username constraints. Signup and Google sign-in normalize email addresses to lowercase before insertion. Registration now maps a concurrent uniqueness conflict to HTTP 409 instead of returning an unhandled database error.
- JWT/session expiration does not delete a user row. The configured defaults are a 15-minute access token, a 7-day refresh session, and an optional 30-day remembered session. Refresh credentials are hashed in `user_sessions`; rotated tokens are single-use and replay revokes active sessions.
- There was a client-side session-loss path: all simultaneous 401 responses could independently rotate the same refresh token, and the backend's replay protection then revoked sessions. The frontend now shares refresh work across concurrent requests and uses the browser Web Locks API across tabs where available. It preserves stored credentials on network, throttling, and server failures, and retries one transient profile-load failure.
- Before this change, the profile bootstrap cleared tokens for every error, including temporary network/server failures. These paths can make a persisted account look signed out, but without deployment logs the reported 15–20-minute event cannot be conclusively tied to one of them.
- Platform `active_learners` is the count of all rows in `users`, as requested. Signup, Google account creation, and account deletion invalidate the short-lived Redis cache. The public landing page reads this count and refreshes it every minute; it hides the count if the API is unavailable rather than displaying a guess.

## Account deletion

The authenticated user can request deletion from Settings → Account. The request requires the literal confirmation `DELETE` and an access token issued by a sign-in within the configured 10-minute window. The server derives the account identity from the bearer token and commits the deletion transaction before returning success. SQLAlchemy cascades remove the user's sessions, verification/reset tokens, learning progress, quiz attempts, streak, saved sessions, login-attempt records, and role associations. Shared reviews are not user-owned and are not deleted. The frontend clears both token stores after a successful response.

## Email configuration not completed

The SMTP sender is present, but no provider credentials or sender-domain DNS were configured or exercised. No real email was sent. The no-SMTP path now reports non-delivery without printing verification or reset links (which contain bearer secrets). The application still has a local/demo behavior that auto-verifies signup when SMTP credentials are absent; this must not be treated as production email verification. Resend-verification and verified-email-only production policy remain dependent on the email setup the project owner deferred.

For deployment, configure these server-side variables with actual values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_TLS`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAILS_FROM_EMAIL`, `EMAILS_FROM_NAME`, and an HTTPS `FRONTEND_URL`. Verify sender-domain SPF/DKIM and publish an appropriate DMARC policy with the chosen provider. Keep secrets out of the frontend and source control. Token lifetimes can be adjusted with `EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS` (24-hour default) and `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` (20-minute default).

## Persistence and deployment

Use the same durable PostgreSQL/MySQL service for every API instance. Do not point replicas at separate local SQLite files. For container recreation, retain the external database or its managed persistent volume; Redis is for shared rate limits/cache and is not the account store. Database schema changes in this work are limited to configuration and existing tables, so no data migration is required.

## Verification performed

`backend/tests/test_account_lifecycle.py` uses isolated temporary SQLite databases. It covers normalized duplicate signup, database-engine restart and expired access-token persistence, account-count semantics, refresh rotation/replay, password reset/session revocation, deletion cascades/re-authentication, and the no-SMTP token-log safeguard. The actual SMTP provider, sender-domain DNS, deployed database durability, and production multi-instance behavior require owner-provided infrastructure and credentials and were not tested here.
