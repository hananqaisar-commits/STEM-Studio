# Audit implementation status

**Updated:** 2026-10-20  
**Branch:** `codex/production-scalability`  
**Scope:** Product-side findings and learning/UX suggestions from the attached audit. The report below distinguishes repository changes from deployment checks that need hosted-service access.

## Trust, privacy, and data accuracy

| Audit item | Status | Current behavior |
| --- | --- | --- |
| Public reviews were auto-approved despite a moderation promise | Implemented | New reviews are stored pending. Only a provisioned, MFA-verified owner session can view the pending queue, approve, or reject them. Public review reads expose approved reviews only. |
| Learner signup blocked on email verification/provider outages | Fixed | Learner email verification is disabled by default. New regular accounts are immediately usable, and existing unverified learner accounts can sign in without changing their email-verification record. Owner sign-in still requires a verified account and MFA. `EMAIL_VERIFICATION_REQUIRED=true` opts into inbox verification when email delivery is configured. |
| Topic counts differed across dropdown, cards, and progress percentages | Implemented | `frontend/src/data/topicCatalog.json` is the shared list of topic IDs and ordering. The topic dropdown, category-card counts, and backend progress denominators derive from it. The Docker image includes this same JSON file for the progress API. The DSA catalog has 125 topic IDs, including 21 linked-list, 6 tree, and 8 graph topics. |
| “Active learners” counted every stored user row | Implemented | The API field and landing-page label are now `registered_learners` / “registered learners.” It counts database accounts, including accounts that may not be currently online; it is not an activity metric. |
| Learner support reports had no authenticated owner inbox | Implemented, provisioning required | Signed-in learners can submit bug reports, questions, or ideas. The API persists them and provides a private owner inbox, replies, status changes, and a user-side request history. Inbox access requires an MFA-verified owner session. The dashboard refreshes the inbox every 30 seconds. |
| Owner had no all-user in-app broadcast or unread navbar count | Implemented, provisioning required | A provisioned, MFA-verified owner can publish an announcement from the Owner Control Center to the snapshot of active accounts. Recipient membership and read receipts are persisted; each learner's bell displays the exact unread total and refreshes every 30 seconds/on tab focus. This does not send email or push notifications. |
| BYOK provider keys persisted in local storage | Implemented | Keys are stored in `sessionStorage`, migrated out of old `localStorage` on read, cleared on logout/account deletion, and disclosed as being sent to the backend for requests. A tab session on a shared computer is still sensitive; users should avoid configuring a key there. |
| Theme followed only one browser | Implemented for signed-in accounts | Theme remains available locally for guests. Signed-in changes are stored in the new `user_preferences` table and loaded on another device. Startup `create_all` creates the new table; a deployment restart is needed before the API can serve it. |

## Learning workflows

| Audit item | Status | Current behavior and limit |
| --- | --- | --- |
| Saved progress endpoints were not used by the frontend | Implemented | Finishing all quiz checkpoints records topic completion. Dashboard “Continue where you left off” loads module progress and saved sessions. Sorting and Array visualizers can save the current input and step; their dashboard cards restore that snapshot. Other saved-session records still open their topic without restoring page-specific state. |
| Code execution support was hard to discover | Implemented | Visualizer headers show a per-topic `supported` or `coming soon` badge based on the registered custom-code stub contracts. The badge does not promise that an arbitrary code shape or unsupported language will run. |
| Circular Queue/Deque capacities were fixed | Implemented | Capacity can be adjusted from 2 to 12 in both lessons. Existing elements are kept in queue order, and the minimum capacity follows current occupancy. |
| Quiz cadence used a fixed checkpoint density and fixed timer | Implemented | Concept and Guided modes keep all core checkpoints and sample reinforcement checkpoints to target densities (25% / 50% where possible). Challenge mode includes every checkpoint; only Challenge mode is timed, with a 20–45 second question-based limit. |
| Free-text “explain why” practice was absent | Implemented | Each quiz checkpoint has an optional explanation field. Octa grades against that checkpoint’s expected reasoning only when a live model provider returns a model answer. Offline fallback text is not presented as a grade. The text/grade is session-only and is not stored as a formal quiz score. |
| Spaced-repetition reminders were absent | Implemented | The backend schedules reviewed topics from the latest five quiz attempts: one day below 60% accuracy, three days below 80%, and seven days otherwise. The dashboard shows up to five due topics ordered by lowest recent accuracy, with accuracy and interval details, and links each topic directly. No email/push reminder is sent. |
| Command palette was absent | Implemented | `Ctrl+K` / `⌘K` opens global topic search from the navbar. Arrow keys and Enter navigate results; Escape closes it. Search results show difficulty and an estimated study time. |
| Printable category cheat sheets were absent | Implemented | Dashboard sheet builder reuses existing theory/reference content and offers browser Print / Save as PDF. Topics without theory data show their catalog grouping rather than invented complexity claims. |
| Onboarding tour was absent | Implemented | A first-visit, dismissible four-step guide introduces topic search, step playback, quizzes, and Octa. It is stored as completed in this browser. |
| Difficulty and time estimates were absent | Implemented | Search results show a difficulty tag and estimated minutes for each topic. Explicit estimates exist for linked-list problems; the remaining estimates are derived from category/group metadata and are guidance, not promises of completion time. |
| Side-by-side algorithm race was absent | Implemented for Sorting | Bubble/Quick and other sorting algorithms share one input and advance on one normalized progress control. Each lane shows its own local step and visible comparisons/swaps/writes. |
| Operation counters were absent | Partial | Sorting shows trace-marker counts for comparisons, swaps, and writes on every step. Other algorithm families do not yet emit a shared, reliable operation-event schema, so they do not show the counters. The Sorting counts represent generated trace events, not machine instructions. |

## Staging and hosted-service checks

| Audit item | Status | What remains |
| --- | --- | --- |
| Run 45,000 and 200,000 virtual-user load tests | Not run | There is no staging target or access to its resource dashboards in this workspace. The existing runbook keeps write-heavy flows and paid tutor calls out of the load test. Run 45k first with distributed k6 generators and server-side metrics; run 200k only if the 45k stage is healthy. No users/second or availability claim is supported yet. |
| Verify production database, email provider/domain, OAuth, Judge0, Redis, TLS, backups, and monitoring | Not verifiable here | The repository has no hosting-console credentials. Check each API/Vercel provider’s environment and service dashboards after deploying. `backend/.env` is a local development file and is not evidence of production configuration. |
| Activate owner support/review inbox and broadcasts | Manual provisioning required | Configure the owner MFA encryption key and secure cookies, apply the owner migration, then run `backend/scripts/create_owner.sh` on the trusted backend host. There is no default or public owner signup. `SUPPORT_OWNER_EMAILS` no longer grants access. Bulk email is not enabled and requires an opted-in subscriber list, unsubscribe support, and a bulk email provider. |
| Enable production signup verification | Manual configuration | Configure the Resend API key, verified sender/domain DNS, and the public HTTPS `FRONTEND_URL`; keep `DEBUG=false` and `ALLOW_UNVERIFIED_SIGNUP=false`, then redeploy the API. No provider credentials or DNS were configured here. See `docs/email-delivery-setup.md`. |

## Local verification recorded for this revision

- `python -m compileall -q backend/app backend/infrastructure/database` succeeded.
- `git diff --check` succeeded.
- The frontend production build was started; its result is recorded in the task completion report after the final revision.
- No automated test suite was run.
- No production/staging service was changed, and no load traffic was sent.
