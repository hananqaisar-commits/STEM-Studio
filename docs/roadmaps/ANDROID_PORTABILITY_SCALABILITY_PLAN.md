# STEM Studio portability and scalability plan

## Product outcome

Ship one STEM Studio product that works as a responsive web app/PWA and as an Android app on phones, tablets, Chromebooks, and desktop-sized windows. Learners create an account once, stay signed in between launches on a trusted device, and can revoke sessions or delete their account from Settings. Every learning control remains visible, named, and operable with touch, mouse, keyboard, and assistive technology.

## Current repository baseline

- The UI is a React 19 + TypeScript + Vite single-page app. The API is FastAPI with SQLAlchemy and a separately deployed database/service configuration.
- The web app already has a PWA manifest, the happy Octa app mascot, an existing account/preferences settings flow, and an optional API-generated Octa explanation setting.
- `Android-version-branch` now includes a Capacitor Android shell. Native auth tokens use Android secure storage and web sessions retain browser storage. The Android build must point at a deployed HTTPS API origin; a device's `localhost` is the device itself.
- Remembered auth uses secure, rotating refresh credentials with a finite server expiry. The Android app should keep a learner signed in across ordinary app/device restarts while the server can revoke sessions and the user can log out. Do not replace that with a permanent, non-revocable token.
- The repository does not define a production API hostname. Android Studio/Android SDK are not installed in the current workspace, so a signed APK/AAB and physical-device verification still require the release environment.

## Target architecture

```text
Responsive React/Vite UI
  ├── Browser + installable PWA
  └── Capacitor Android container (same routes and UI)
           │ HTTPS, exact CORS origins
           ▼
Stateless FastAPI API ── PostgreSQL (durable system of record)
  ├── Octa provider adapter / quotas / timeouts
  ├── Redis (shared rate limits, short-lived cache, coordination)
  ├── Background workers (email, exports, scheduled work)
  └── Object storage + CDN (profile photos and future media)
```

Keep the visualizer and learning logic in platform-neutral React modules. Use Capacitor plugins only behind small adapters for native storage, share/open links, safe-area/status-bar behavior, and future push notifications. Keep the backend stateless so horizontal API replicas share Postgres, Redis, and object storage instead of process-local state.

## Delivery roadmap

### 1. Responsive app shell and interaction quality

- Define a small breakpoint set for phone portrait, phone landscape, tablet, and desktop; use dynamic viewport units and safe-area insets where the device reserves screen edges.
- Keep primary actions in compact, wrapping toolbars. For long operation sets, use responsive 3-column controls on narrow screens, clear labels, and expandable advanced controls where needed. Never hide an action behind hover-only UI.
- Give interactive targets at least 44 CSS px where layout allows, visible focus states, accessible names, disabled explanations, and sufficient contrast.
- Give algorithm visualizers a readable mobile viewport (usually at least 420–440 CSS px tall); use local horizontal scrolling for large node graphs rather than shrinking labels and nodes until they cannot be read.
- Validate graph, tree, sorting, linked-list, stack/queue, backtracking, tutor, settings, authentication, and account dialogs at 320, 360, 390, 768, 1024, and 1440 CSS px, including landscape and enlarged text.

### 2. Android container and device integration

- Build the web assets with Vite, sync them into Capacitor, and keep the existing happy Octa as the launcher/adaptive icon.
- Store native refresh credentials with Android Keystore-backed secure storage. Keep access tokens in memory where possible, rotate refresh tokens, clear credentials on logout/revocation, and provide a visible “Keep me signed in” choice for shared devices.
- Use the real HTTPS API origin in the Android production build. With current Capacitor Android defaults, allow the exact `https://localhost` WebView origin alongside the real web origin in `CORS_ORIGINS`; never open production CORS to `*` with credentials.
- Configure Android app links/deep links, status/navigation bar appearance, back navigation, keyboard resize, offline/retry states, and Android permission prompts only when a feature needs them.
- Generate a signed Android App Bundle from a protected release key. Keep signing secrets and provider credentials out of source control and frontend `VITE_*` variables.

### 3. Accounts, preferences, and data durability

- Treat the account as the learner's one-time identity. Support persistent sign-in on the learner's own device, session/device management, logout from this device, logout all devices, password recovery, account export/deletion, and clear confirmation for destructive actions.
- Store profile name, language, theme, accessibility preferences, learning level, explanation style, and Octa learning prompt through a validated account-preferences API so they follow the learner across devices. Keep an explicit guest/local mode if account creation should not block public lessons.
- Make language selection searchable and broad using stable locale tags, default to English, and allow a custom language name for languages outside the built-in catalog. State clearly which parts of the UI are translated; a preference alone does not translate lesson content.
- Store uploaded avatars in object storage with content-type/size validation and a replace/delete path; keep only a stable asset URL and metadata in the user record instead of large base64 blobs.
- Keep learner progress and saved sessions versioned, owned by the account, paginated, and protected by server-side authorization. Plan migrations before schema changes.

### 4. Octa and API-generated explanations

- Keep the setting that enables/disables API-generated explanations, and show a clear built-in/offline explanation when disabled or when the provider is unavailable.
- Route production model calls through the backend provider adapter. Keep server provider secrets in a secret manager; if user-supplied keys remain supported, clearly explain storage and provide replace/delete controls. Do not ship provider keys in the app bundle.
- Add bounded request timeouts, retries only for safe transient failures, streaming where it improves perceived latency, per-account/IP quotas, request-size limits, provider health state, and fallback behavior.
- Add request IDs and privacy-safe usage/error metrics. Avoid logging learner prompts, source code, tokens, API keys, or personal data by default.
- Verify native Google sign-in separately. Browser Google Identity Services may reject embedded WebViews; production Android OAuth needs a supported native Credential Manager/OAuth flow and matching Android OAuth client configuration.

### 5. Production scaling and operations

- Use PostgreSQL for production persistence, managed backups, tested restore procedures, connection pooling, and indexed query plans for learner/progress paths.
- Share rate-limit/session coordination through Redis when API replicas run. Use bounded queues for non-interactive email/export work and keep model generation off critical startup paths.
- Put static web assets and public media behind a CDN. Add image size/type validation, caching headers, API pagination, compression, and request limits.
- Add `/health/live` and `/health/ready` semantics, structured redacted logs, error tracking, latency/error dashboards, alerts, and deployment rollback steps.
- Define and monitor practical service objectives: sign-in availability, API p95 latency, visualizer startup/interaction responsiveness, tutor timeout/fallback rate, and crash-free Android sessions.

### 6. Release gates

- Frontend production build and lint pass; backend static checks and CI pass; database migrations apply and rollback safely.
- Security review covers authentication/session revocation, CORS/CSRF, secrets, account deletion, upload validation, rate limits, authorization ownership, dependency vulnerabilities, and logs.
- Manual device review covers low-width Android phones, a tablet, desktop browser, Android keyboard/opened dialogs, orientation changes, offline/reconnect, slow network, sign-in persistence, logout, and an expired/revoked session.
- Produce a signed AAB, verify the launcher icon and app label, confirm Play privacy/data-safety declarations, and retain a tested rollback/release note.

## Current Android commands

From `frontend/`, copy `.env.android.example` to `.env.production.local`, replace the placeholder with the deployed FastAPI HTTPS origin, then run:

```bash
npm ci
npm run android:sync
npm run android:open
```

`android:sync` rejects a missing, insecure, or placeholder API origin. Add the Android WebView origin `https://localhost` to the backend's exact `CORS_ORIGINS` allowlist. Android Studio and the SDK are required to build/run the native project or emulator. Do not commit `.env.production.local` or signing credentials.

## Reusable implementation prompt

```text
You are the senior product, frontend, mobile, backend, security, and platform engineer for this STEM Studio repository. Improve the existing app incrementally; first inspect the codebase, current branch, README, environment examples, API routes, auth/session behavior, responsive styles, deployment files, CI, and existing Octa assets. Preserve working features and the current visualizer logic. Do not invent deployment hostnames, credentials, provider keys, or claims that were not verified.

GOAL
Deliver a production-minded, scalable STEM Studio that runs well as a web app/PWA and an Android app on phones, tablets, Chromebooks, and desktop windows. Keep one shared learning experience and route business logic through the existing FastAPI API. Use the existing happy Octa image as the Android launcher identity unless a clearly better original Octa icon can be created and validated in this repository.

MOBILE PRODUCT REQUIREMENTS
- Make every screen responsive at 320, 360, 390, 768, 1024, and 1440 CSS px, in portrait/landscape, with safe-area insets and dynamic viewport sizing.
- Make every visible button work. Do not rely on hover-only controls. Use accessible labels, keyboard focus, disabled explanations, adequate contrast, and roughly 44px touch targets.
- Fix the algorithm toolbar problem: compact action groups into responsive columns (at least 3 columns for dense phone controls), keep all important actions discoverable, and move only advanced/rare actions into an explicitly labeled expandable group.
- Give visualizers a usable mobile height and legible nodes, code, axes, and labels. Prefer a scrollable canvas region for large datasets over shrinking all content. Make canvas expand/fullscreen, rotate, close, and back actions work without trapping the user.
- Check settings, profile/photo, auth, tutor, dialogs, menus, keyboard input, charts/canvases, empty/loading/error/offline states, and small-device text wrapping.

ANDROID AND ACCOUNT REQUIREMENTS
- Use Capacitor around the existing Vite app unless repository evidence gives a concrete reason to choose another native stack. Commit only the native project/source and safe configuration; never commit local build output, secrets, keystores, or production env files.
- Keep a learner signed in across ordinary Android app/device restarts after account creation on a trusted device. Store refresh credentials in Android Keystore-backed secure storage, keep access credentials short-lived, rotate/revoke refresh sessions, support logout from this device and all devices, and preserve an opt-out for shared devices. Never create permanent, non-revocable tokens.
- Verify native Google sign-in separately from browser sign-in; use a supported Android Credential Manager/OAuth flow with the correct Android client ID rather than assuming Google Identity Services works in an embedded WebView.
- Keep profile name, avatar, preferred language, theme, accessibility choices, learning level, preferred explanation style, and Octa learning prompt synchronized by authenticated API across devices. Use validated image uploads/object storage rather than large base64 profile blobs for production.
- Keep account deletion explicit and confirmed; revoke sessions, delete/anonymize owned data according to a documented retention policy, and communicate what is removed.
- Use the existing Octa mascot for launcher/adaptive icons. Make app label, package identifier, Android back behavior, keyboard resize, status/navigation bars, deep links, and release signing configuration deliberate.

BACKEND, AI, SECURITY, AND SCALE
- Keep the FastAPI API stateless across replicas. Use PostgreSQL as production source of truth, shared Redis for cross-replica rate limits/coordination/cache where justified, object storage/CDN for media, and bounded background jobs for email/exports.
- Keep AI provider credentials on the server or in a managed secrets service. Never embed API secrets in the APK, frontend source, `VITE_*` values, logs, or git. If bring-your-own-key is supported, explain where it is stored and provide replace/delete controls.
- Preserve the user-controlled API-generated Octa answer toggle. When on, request grounded answers through the configured provider/API with bounded latency, safe timeouts, provider quotas, privacy-safe metrics, and clear loading/error states. When off or unavailable, retain the built-in explanation fallback. Do not silently claim a model-generated answer when fallback content was used.
- Enforce exact production CORS origins, CSRF protections for cookie-based owner flows, server-side object ownership checks, input/image validation, request limits, dependency hygiene, secure headers, and redacted structured logs.
- Add practical health/readiness, monitoring, backup/restore, migration, rollback, and connection-pooling guidance. Document scaling assumptions and measurable objectives rather than adding infrastructure without evidence.

WORK METHOD AND DELIVERABLES
1. Inventory the project and report a concise baseline and actual blockers before editing. Reuse existing responsive styles, API endpoints, settings, and mascot assets.
2. Write/update a phased portability/scalability roadmap with current state, architecture, implementation phases, release gates, environment setup, and clearly labeled remaining external prerequisites.
3. Implement the highest-impact mobile usability and secure Android-shell changes in small, reviewable edits. Wire real buttons and settings to real app/API behavior; do not ship decorative dead controls or fake successful account/API states.
4. Add safe Android build/sync/run commands and fail fast if the required production HTTPS API origin is missing or is still a placeholder. Document exact CORS and Android Studio/SDK requirements without guessing the API host.
5. Verify with production frontend build, lint/static checks and repository CI commands that are available; review dependency audit results and changed diffs. Do not report hardware/emulator validation unless it actually ran. Do not publish/sign/release or change production data.
6. Finish with a summary of changed files, verification evidence, known limitations, and copy/paste build/release steps.

ACCEPTANCE
- No horizontal page overflow at target widths; all primary actions are visible, named, keyboard/touch operable, and not clipped.
- Visualizer content stays readable and usefully sized on a small phone; large datasets scroll locally.
- A remembered Android session survives normal app restart using secure native storage, and logout/revocation actually clears access.
- Preferences persist across sessions/devices through authenticated server state where account-backed; app defaults to English.
- Octa API mode can be turned on/off by the learner, fallback is honest and usable, and no provider secret is present in client bundle.
- Android shell uses the Octa icon, production HTTPS API configuration, exact CORS guidance, and reproducible commands.
- Documentation clearly distinguishes implemented behavior, tested behavior, and external release prerequisites.
```
