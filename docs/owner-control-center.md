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

1. Set `DATABASE_URL` to the same durable managed PostgreSQL database used to provision the owner. Production startup rejects SQLite, local database hosts, a missing stable `JWT_SECRET_KEY`, the example placeholder, wildcard CORS, and non-HTTPS CORS origins. The owner row and login request must reach this same database.
2. Generate a Fernet key once and store it as `OWNER_MFA_ENCRYPTION_KEY` in the backend secret manager:

   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

   Do not regenerate this key during ordinary deploys. Rotating it requires re-enrolling owner MFA credentials.
3. Configure exact frontend origins in `CORS_ORIGINS`. If the UI and API are on different sites, set `OWNER_COOKIE_SAMESITE=none` and `OWNER_COOKIE_SECURE=true`; both must be served over HTTPS. Prefer custom UI/API subdomains under the same site where possible because browser third-party-cookie restrictions can block cross-site owner cookies.
4. Apply database migrations from the repository root when preparing a deployment or provisioning an owner:

   ```bash
   backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
   ```

5. On the trusted backend host, run the provisioning launcher interactively. It applies pending Alembic migrations before prompting:

   ```bash
   bash backend/scripts/create_owner.sh
   ```

   It prompts for username, email, a hidden password, and confirmation. It refuses a second owner, checks uniqueness, writes the owner record and encrypted TOTP credential transactionally, and prints the one-time authenticator setup key to that terminal. Add it manually as a time-based code with 6 digits and a 30-second interval; treat the terminal output as a secret and do not paste it into chat or application logs. The API also applies pending additive migrations during startup after creating any missing metadata tables, so existing deployments receive column migrations before serving requests.
6. Open `/login`, choose **Sign in as Owner**, and enter the provisioned email address, password, and current authenticator code. Owner sessions expire after at most eight hours; sensitive actions require another password + TOTP verification every ten minutes.

The one-time provisioning and recovery commands are intentionally not HTTP endpoints. To diagnose owner login against the backend's currently configured database, run `python -m backend.app.cli diagnose-owner` in that host's Shell; it reports only the database engine and pass/fail checks, never the hash or TOTP secret. If its password check fails, run `python -m backend.app.cli reset-owner-password`; it accepts the new password through hidden prompts, rotates the bcrypt hash, and revokes current owner sessions. To recover a lost authenticator while retaining the password, run `python -m backend.app.cli reset-owner-mfa`; it verifies the owner password, rotates the encrypted TOTP secret, revokes every owner session, and prints a one-time manual authenticator setup key. Run these only in the backend host Shell after confirming it uses the persistent database. There is no public owner signup or public role recovery endpoint.

## Current owner controls

- Search, filter, and paginate accounts; see each user's profile, account status, owner email-verification state (learner verification is not required), sessions, progress, quiz attempts, visualizer saves, support tickets, Octa response preferences, and recent sign-in outcomes.
- Suspend or restore non-owner accounts. Suspension immediately revokes their active sessions. Owners can also revoke a learner's sessions without suspending the account.
- Permanently delete a learner after recent MFA, a typed username confirmation, and a second browser confirmation. The deletion cascades through the learner's account data; an audit event remains without retaining the account's credentials.
- Set each registered module as free, premium, enabled, or disabled. Grant or revoke an individual learner's module access, with an optional expiry. Premium controls are manual entitlements; they do not represent a payment.
- Publish in-app announcements to active accounts. The navbar badge reads the exact unread count and the inbox refreshes periodically, when opened, and when the window regains focus.
- Optionally email a general announcement or service notice to active accounts. Product updates and promotions are emailed only to active accounts who opted in. Each email is sent privately to one recipient, and provider-accepted/failed counts appear in the broadcast history; provider acceptance does not guarantee inbox placement. The shared delivery provider and sender are configured in the backend; see [email setup](email-delivery-setup.md).
- Learners can change promotional email consent in **Settings → Account**. New accounts default to opted out.
- View and respond to support tickets, moderate submitted reviews, and review administrative audit events.

Sensitive changes, account deletion, feature changes, broadcasts, and session actions require recent owner MFA and are logged with actor, target, action, timestamp, outcome, and non-secret context. Owner accounts cannot be changed through learner management. Password hashes, refresh tokens, MFA secrets, and other authentication credentials are never returned in the user detail view.

## Boundaries and remaining integration work

There is no subscription/payment provider or plan, pricing, discount, invoice, or refund system. The premium switch and per-user overrides control the learning modules only; they never create a paid subscription or report a payment. Optional owner email is queued durably and sent through the configured email provider, one recipient per message. It is not a high-volume marketing platform; a large campaign needs a contracted provider plan, bounce/complaint webhooks, unsubscribe handling, and suppression management. The app does not expose recipient email addresses in the broadcast screen. The audit log is application-level, not a tamper-proof external log sink; production should export it to a restricted monitoring service.

Feature policies are checked by the module route, progress-writing endpoints, custom-code execution, and Octa tutor. Some visualizer calculations run entirely in the browser, so client-side content bundles cannot be made secret from a determined browser user. The backend still enforces access on the protected operations listed above. The owner panel does not expose authentication secrets or allow promoting another account to owner.

## Security checks

Use backend tests to confirm that anonymous requests, regular bearer sessions, inactive users, non-owner accounts, invalid/replayed TOTP codes, and revoked owner sessions cannot access owner APIs. Frontend route checks are only a usability layer; authorization is enforced by backend dependencies for every owner route.
