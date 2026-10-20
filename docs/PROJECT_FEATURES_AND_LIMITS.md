# STEM Studio: feature map and current limits

**Audit basis:** source tree on branch `codex/production-scalability`, commit `4f132fb` (2026-10-20). This is a code and documentation review, not a live production inspection or a full manual QA pass. A frontend production build and `git diff --check` passed for the pushed changes. Backend integration tests and live service credentials were not checked in this review.

## What STEM Studio is

STEM Studio is a React/TypeScript single-page learning app with a FastAPI backend. Its main product is interactive DSA learning: choose a topic, provide or edit an input, run a visualizer, move through its steps, read the explanation and code, and use quizzes or the tutor for practice. The app also contains Linux command lessons and a virtual file-system simulator.

The frontend and backend deploy separately. Vercel can host the frontend; account persistence, AI answers, reset email, and pasted-code execution depend on the separately configured API and optional external providers.

## Learning modules

The central topic registry has 15 DSA categories and 112 named topic entries:

| Category | Topics in the central registry |
| --- | --- |
| Complexity Analysis | Foundations, asymptotic notation, simplification, loops, time/space complexity, cases, recursion/Master Theorem, amortized analysis, tradeoffs, operation references |
| Sorting | Bubble, Selection, Insertion, Merge, Quick, Heap, Shell, Counting, Radix, Bucket |
| Arrays | Linear Search, Kadane, Two Pointers, Sliding Window, Rotation, Prefix Sum |
| Strings | Palindrome, Anagram, Reversal, Frequency Count |
| Linked List | Singly, Reverse, Middle Node, Floyd Cycle Detection, Josephus, Doubly, Circular, Doubly Circular |
| Stack & Queue | 23 topics listed below |
| Binary Search | Classic, Lower Bound, Upper Bound, Rotated Array, Peak Element |
| Hash Maps | Two Sum, Duplicate Detection, Frequency Map, Subarray Sum |
| Trees | BST, AVL, Red-Black Tree, Binary Heap, Segment Tree, Trie |
| Graphs | BFS, DFS, Dijkstra, Bellman-Ford, Prim, Kruskal, A*, Topological Sort |
| Recursion | Factorial, Fibonacci, Power, Array Sum, Tower of Hanoi |
| Backtracking | Subsets, Permutations, N-Queens, Combination Sum |
| Greedy | Activity Selection, Fractional Knapsack, Job Scheduling, Huffman Coding |
| Dynamic Programming | Fibonacci, Coin Change, House Robber, 0/1 Knapsack, LCS, LIS, Edit Distance, Unique Paths |
| Trie | Insert, Search, Prefix Search, Word Dictionary, Autocomplete |

These are the registered learning topics, not a promise that every topic has identical controls, explanation depth, or pasted-code support. Individual pages own their visualizers and step generation, so coverage differs by category.

### Stack & Queue

The page has 23 selectable lessons: Stack Primitive, Queue Primitive, Valid Parentheses, Min Stack, Infix-to-Postfix, Postfix/RPN Evaluation, Daily Temperatures, Simplify Path, Remove Adjacent Duplicates, Basic Calculator, Decode String, Trapping Rain Water, Largest Rectangle, Queue via Two Stacks, Stack via Queues, Circular Queue, Circular Deque, Sliding Window Maximum, First Non-Repeating Character, Moving Average, Task Scheduler, Rotting Oranges, and Dota2 Senate.

Each lesson uses the page's operation-step engine to build a sequence of states for its specific data structure or algorithm. The renderer shows structures such as stacks, queues, windows, grids, timelines, or expression tokens. The current page also provides input/parameter controls, playback and step navigation, code/debug/trace panels, and quiz integration where configured. The recent pushed changes added/updated lesson explanations and snippets, expanded engine support and quiz adaptation, and made Stack & Queue text and Circular Deque SVG colors follow the shared light/dark theme.

### Linked Lists

The linked-list page has 21 actual selections: singly, doubly, circular, and doubly circular operations; reverse; middle node; Floyd cycle detection; Josephus; reverse a sublist; reverse either half; reverse from the middle; reverse complete groups of K; palindrome check; swap pairs; merge sort; add two number-lists; remove Nth from end; split in half; split into K parts; merge K sorted lists; and an LRU cache using a linked list and map.

Its visualizer records link/node states as steps for supported built-in algorithms. For example, reverse changes each node link in sequence, and the LRU view explains lookup, recency movement, hit/miss, and eviction. Inputs such as range bounds, K, cache capacity, and cache operations are provided for relevant lessons.

### Shared interaction patterns

- Visualizers generally provide run/playback and step controls, editable inputs, an algorithm/code view, and some form of quiz or explanation. Exact panels and controls vary across pages.
- A debugger/execution trace can display supplied trace data. It is not a universal source-level debugger for every algorithm and every programming language.
- Layout resizing, quiz panels, and responsive behavior have been implemented in parts of the app, but should be checked per page and viewport. A successful TypeScript/Vite build does not establish that every mobile layout is visually correct.

## Pasted-code execution

The backend has a registry of **92 problem contracts in 14 DSA categories** and wrappers for C, C++, Java, Python, Go, and C#. It accepts method/class submissions that match a registered problem contract, creates a harness with the expected arguments/data structures, sends it to Judge0, and returns the result and any captured trace events. It supports explicit `visualizeStep`/`visualize_step` events; selected linked-list submissions also have source-adapted trace support.

It does **not** compile arbitrary pasted snippets in every category without a registered contract. A user must select a supported problem and provide the expected method/class shape. Generic automatic conversion of arbitrary source code into a faithful visual trace is not implemented. Built-in visualizations and execution of the user's pasted source are separate paths; most built-in visualizers are generated from the app's own algorithm step engines.

Live execution requires `JUDGE0_URL` and the Judge0 API key/auth-header settings on the backend host. If those are missing, the API intentionally returns a configuration error. Never put the Judge0 key in a frontend `VITE_*` variable.

## Accounts, database, and saved work

The API implements signup, username-or-email/password login, optional Google login, access and rotating refresh tokens, logout, email verification, password reset, current-user lookup, and account deletion. Usernames and emails are normalized and unique. Password policy requires at least 8 characters with uppercase, lowercase, and a digit. Account deletion requires a recent sign-in and removes owned records through configured database relationships.

Quiz attempts, module progress, saved sessions, tutor learning-profile data, and account/session records are backed by the configured SQL database. SQLite is convenient for local development; production persistence requires a durable hosted database configuration. The source repository does not prove which database or secrets are currently configured in Vercel or the API host.

Important email limitation: when SMTP credentials are missing, signup auto-verifies accounts so local/demo accounts can sign in. That means email verification is **not a production guarantee** until SMTP and a verified sender domain are configured. Password reset email also requires SMTP. Google login requires the frontend OAuth client ID and matching provider configuration.

### “Active learners” number

The landing page gets this value from `/api/stats/platform`. The API counts all user rows in the database and caches the response in Redis for the configured short TTL (default 30 seconds). It represents **stored accounts**, not currently online or recently active learners. The UI label should be renamed to “registered learners” or backed by a genuine activity definition before presenting it as live activity.

## Octa tutor

Octa has AI Concept Mode and Interactive Step Mode. The client sends supported page/topic information, and on visualizer pages it can send the active state/step context. The backend can use a configured provider (DashScope, OpenAI-compatible providers, Anthropic, or a custom endpoint) or built-in fallback explanations for supported lessons. Provider connection/status and a tutor learning profile/feedback API are present.

The learning profile uses saved user feedback and learning signals as context for later answers. This is prompt-time personalization; it does not train or fine-tune model weights. The tutor should not infer a learner's personality or mood from sparse quiz history.

Octa can propose a limited set of supported in-app actions, such as navigation, theme changes, and available visualization controls. The user must approve a proposal before it runs, and the proposal is cancelled if the page context changes. It cannot arbitrarily operate every control on the site, read hidden account/backend data, access the laptop, or execute host OS commands. The API has review submission/listing, but no owner-query inbox/contact workflow was found in the current route set.

Live model-generated answers require a provider key/configuration. Without one, only supported built-in fallback guidance is available; this should not be described as unrestricted ChatGPT-equivalent responses.

## Linux learning area

The Linux section has 13 grouped command lessons and a virtual file-system lesson with a simulated directory tree, terminal history, a supported command interpreter, permissions/ownership demonstrations, and Nano/Vim-style editor flows. Commands mutate the app's virtual state and can be stepped backward/forward through its history.

This is a **simulator**, not a shell on the user's computer or a remote Linux server. Unsupported commands return a simulator message. The host cannot expose user files or run arbitrary system commands. Windows and macOS sections and Digital Logic Design are marked unavailable/coming soon.

## Deployment and scaling

The repository includes Redis-backed shared rate limiting, configurable SQL connection pools, readiness and health routes, cached public platform stats, a Dockerfile, and an optional Compose deployment with two FastAPI instances, private Redis, and HAProxy load balancing. The frontend remains separately deployable. The Compose example is a starting architecture; it requires its own database, secrets, network/TLS edge, monitoring, and deployment operation.

There is a k6 read-only load-test script and a staged runbook. The runbook records a small local direct-endpoint smoke (800 requests from 20 concurrent clients; about 799 requests/second, p95 about 70 ms) but explicitly says it did not include the full ASGI/network/Redis/HAProxy/Postgres/production path. The **45,000 and 200,000 virtual-user runs were not performed**, so there is no supported production throughput or availability claim. Those numbers are concurrent virtual users, not accounts or requests per second.

Redis is optional in simple/local mode. Without a shared Redis service, rate limits are process-local and cannot coordinate between API replicas. The included stack configures Redis, but it is not automatically deployed just because the frontend is on Vercel.

## Known gaps and best next fixes

1. **Correct topic counts in the catalog.** The central registry has six tree topics and eight graph topics while `DSA_CATEGORIES` says four and five. The linked-list dropdown has 21 actual items while its category count says eight. Use one source of truth for hub counts, topic dropdowns, quizzes, and code-run coverage.
2. **Fix public review moderation.** `/api/stats/reviews` says submissions are for moderation, but the create route currently saves `approved=True`, which makes them immediately visible. Add a real moderation/authorization step or change the UI and contract intentionally.
3. **Clarify account-count semantics.** Rename “active learners” to “registered learners” or define and calculate activity using real session/activity timestamps.
4. **Make support/reporting a real workflow.** There is no owner-query inbox route in the current API; add authenticated submission, persistence, and an owner-facing review flow if learners need to report issues.
5. **Close the execution gap.** Document exact supported code signatures per problem in the editor and expand source-to-visual traces only with per-algorithm adapters and reliable mapping tests. Do not imply all snippets work in all categories.
6. **Validate the learning flows end to end.** Add/test representative desktop/mobile flows for signup/login/refresh, each visualizer family, quiz persistence, Octa action approval, and paste-code success/error states. Backend and frontend builds alone do not exercise these product paths.
7. **Run safe staging load tests.** Start with smoke and low VU stages, collect API/HAProxy/Redis/database resource metrics, then do 45k before considering 200k with distributed generators. No capacity target should be announced before those runs.
8. **Verify deployed settings.** Confirm the hosted database, CORS/frontend origin, SMTP, Google OAuth, Octa provider, Judge0, Redis, TLS, backups, and monitoring independently in their respective hosting consoles.

## Where the main implementation lives

- `frontend/src/App.tsx` — routes and gated dashboard pages.
- `frontend/src/data/categories.ts`, `categoryTopics.ts`, and `theoryContent.ts` — module/topic catalog and lesson text.
- `frontend/src/features/*` — module-specific controls, engines, and visual renderers.
- `frontend/src/components/tutor/`, `frontend/src/hooks/useOctaTutor.ts`, `backend/app/api/routes/octa_tutor.py` — tutor UI, context/actions, provider calls, profile and feedback.
- `backend/app/api/routes/auth.py`, `progress.py`, `stats.py` — authentication, saved learning data, platform count/reviews.
- `backend/app/services/custom_code/` and `frontend/src/data/customCode/stubs.json` — pasted-code contracts, harness, runner integration.
- `frontend/src/features/os/commands/` and `frontend/src/features/os/filesystem/` — Linux lessons and VFS simulator.
- `backend/app/core/config.py`, `docker-compose.scale.yml`, `deploy/scalability/`, `docs/performance/scalability-runbook.md` — backend settings, optional Redis/HAProxy topology, load-test guide.
