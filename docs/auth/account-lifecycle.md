# Account persistence and authentication lifecycle

## Findings

- The application uses its configured SQL database and has no in-memory fallback or account-cleanup job. Registration commits the user and its verification record in one transaction. The local configuration uses a PostgreSQL URL; production records were not queried.
- The account table has unique email and username constraints. Signup and Google sign-in normalize email addresses to lowercase before insertion. Registration now maps a concurrent uniqueness conflict to HTTP 409 instead of returning an unhandled database error.
- JWT/session expiration does not delete a user row. The configured defaults are a 15-minute access token, a 7-day refresh session, and an optional 30-day remembered session. Refresh credentials are hashed in `user_sessions`; rotated tokens are single-use and replay revokes active sessions.
- There was a client-side session-loss path: all simultaneous 401 responses could independently rotate the same refresh token, and the backend's replay protection then revoked sessions. The frontend now shares refresh work across concurrent requests and uses the browser Web Locks API across tabs where available. It preserves stored credentials on network, throttling, and server failures, and retries one transient profile-load failure.
- Before this change, the profile bootstrap cleared tokens for every error, including temporary network/server failures. These paths can make a persisted account look signed out, but without deployment logs the reported 15–20-minute event cannot be conclusively tied to one of them.
- Platform `registered_learners` is the count of all rows in `users`; it is not a live-presence metric. Signup, Google account creation, and account deletion invalidate the short-lived Redis cache. The public landing page reads this count and refreshes it every minute; it hides the count if the API is unavailable rather than displaying a guess.

## Account deletion

The authenticated user can request deletion from Settings → Account. The request requires the literal confirmation `DELETE` and an access token issued by a sign-in within the configured 10-minute window. The server derives the account identity from the bearer token and commits the deletion transaction before returning success. SQLAlchemy cascades remove the user's sessions, verification/reset tokens, learning progress, quiz attempts, streak, saved sessions, login-attempt records, and role associations. Shared reviews are not user-owned and are not deleted. The frontend clears both token stores after a successful response.

## Email configuration not completed

The SMTP sender is present, but no provider credentials or sender-domain DNS were configured or exercised. No real email was sent. The no-SMTP path reports non-delivery without printing verification or reset links (which contain bearer secrets). Signup now returns HTTP 503 when SMTP is absent, except when both `DEBUG=true` and the explicitly opt-in `ALLOW_UNVERIFIED_SIGNUP=true` are set for local development. The repository example leaves that flag false. Resend-verification and actual verified-email delivery still depend on the email setup the project owner deferred.

For deployment, configure these server-side variables with actual values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_TLS`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAILS_FROM_EMAIL`, `EMAILS_FROM_NAME`, and an HTTPS `FRONTEND_URL`. Verify sender-domain SPF/DKIM and publish an appropriate DMARC policy with the chosen provider. Keep secrets out of the frontend and source control. Token lifetimes can be adjusted with `EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS` (24-hour default) and `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` (20-minute default).

## Persistence and deployment

Use the same durable PostgreSQL/MySQL service for every API instance. Do not point replicas at separate local SQLite files. For container recreation, retain the external database or its managed persistent volume; Redis is for shared rate limits/cache and is not the account store. This revision adds `support_tickets` and `user_preferences` tables; the app's startup `create_all` creates missing tables, but production deployment still needs a backup and a restart/redeploy before those routes are used. No existing table columns are altered by these additions.

## Support and review ownership

Signed-in learners can create support tickets and read their own request history. Accounts whose email is listed in the backend's comma-separated `SUPPORT_OWNER_EMAILS` can list/reply/resolve tickets and moderate pending reviews. Set the allowlist in the API host environment and restart/redeploy the API to activate the owner controls. The production owner address was not configured or validated here.

## Verification performed

The actual SMTP provider, sender-domain DNS, deployed database durability, support-owner allowlist, and production multi-instance behavior require owner-provided infrastructure and credentials and were not tested here. `python -m compileall -q backend/app backend/infrastructure/database` passed for the current revision; the automated test suite was not run during this audit implementation.
