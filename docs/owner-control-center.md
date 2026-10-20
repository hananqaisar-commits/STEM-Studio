# Owner Control Center security and setup

## Access model

Owner access is not granted by the login choice, a client supplied role, email allowlist, hidden route, or frontend state. Public signup does not accept a role. The database stores a singleton `owner_accounts` anchor for the one provisioned owner, in addition to the `owner` role. The backend issues owner cookies only after it verifies all of the following:

- The password matches a database account with the `owner` role.
- The account is enabled and verified.
- A six-digit TOTP code is valid and has not already been used in its time window.
- A server-side `UserSession` and MFA grant are created for the session.

Every owner API request rechecks the database role, enabled/verified status, MFA enrollment, session revocation state, and session expiry. Owner access tokens are short lived and only held in Secure/HttpOnly cookies. Unsafe owner requests require a double-submit CSRF token and an allowed `Origin`. Sensitive mutations also require a recent password + TOTP verification. Suspension, role removal, session revocation, or MFA disablement closes access on the next API request.

This closes the application level privilege escalation paths that were present in the old email allowlist. It cannot guarantee literal zero risk: the production host, database credentials, deployment secrets, browser, and owner device remain trust boundaries. Keep the application database credentials private and restricted, use HTTPS, and protect the authenticator and recovery URI.

## Production setup

1. Set a stable `JWT_SECRET_KEY` on the backend host. Production startup rejects a missing key, the example placeholder, wildcard CORS, and non-HTTPS CORS origins.
2. Generate a Fernet key once and store it as `OWNER_MFA_ENCRYPTION_KEY` in the backend secret manager:

   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

   Do not regenerate this key during ordinary deploys. Rotating it requires re-enrolling owner MFA credentials.
3. Configure exact frontend origins in `CORS_ORIGINS`. If the UI and API are on different sites, set `OWNER_COOKIE_SAMESITE=none` and `OWNER_COOKIE_SECURE=true`; both must be served over HTTPS. Prefer custom UI/API subdomains under the same site where possible because browser third-party-cookie restrictions can block cross-site owner cookies.
4. Ensure the base application tables exist, then run the owner security migration from the repository root:

   ```bash
   backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
   ```

5. On the trusted backend host, run the provisioning launcher interactively. It applies pending Alembic migrations before prompting:

   ```bash
   bash backend/scripts/create_owner.sh
   ```

   It prompts for username, email, a hidden password, and confirmation. It refuses a second owner, checks uniqueness, writes the owner record and encrypted TOTP credential transactionally, and prints the one-time authenticator setup URI to that terminal. Add it to an authenticator app immediately; treat the terminal output as a secret and do not paste it into chat or application logs.
6. Open `/login`, choose **Sign in as Owner**, and enter the provisioned email address, password, and current authenticator code. Owner sessions expire after at most eight hours; sensitive actions require another password + TOTP verification every ten minutes.

The one-time provisioning and MFA recovery commands are intentionally not HTTP endpoints. To recover a lost authenticator while retaining the password, run `backend/.venv/bin/python -m backend.app.cli reset-owner-mfa` on the trusted host; it verifies the owner password, rotates the encrypted TOTP secret, and revokes every owner session. If the owner password is also lost or the recovery record is damaged, use a separately reviewed break-glass procedure with direct deployment/database operator access. There is no public owner signup or public role recovery endpoint.

## Current owner controls

- User list with pagination, username/email search, enabled/verified status and active session counts.
- Suspend/restore non-owner accounts; suspension revokes that user's active sessions.
- Revoke a non-owner account's active sessions.
- Publish in-app announcements to active verified accounts.
- View and respond to support tickets and moderate submitted reviews.
- Review the administrative audit event stream.

User suspension and session revocation are logged with actor, target, action, timestamp, outcome, and non-secret context. Owner accounts cannot be deleted or suspended in user management. Account password hashes use the project's bcrypt configuration; provisioning rejects passwords over bcrypt's 72-byte input limit.

## Not implemented in this delivery

The existing product has no subscription/payment model or feature entitlement registry. Plan/pricing/discount management, per-user feature overrides, targeted direct messages, owner MFA enrollment/recovery UI, and payment-provider synchronization are not represented as complete controls. No payment state is fabricated. Bulk email is also separate and remains unavailable without a consent-aware email provider. The current administrative audit log is application-level, not a tamper-proof external log sink; production should export it to a restricted monitoring/logging service.

## Security checks

Use backend tests to confirm that anonymous requests, regular bearer sessions, inactive users, non-owner accounts, invalid/replayed TOTP codes, and revoked owner sessions cannot access owner APIs. Frontend route checks are only a usability layer; authorization is enforced by backend dependencies for every owner route.
