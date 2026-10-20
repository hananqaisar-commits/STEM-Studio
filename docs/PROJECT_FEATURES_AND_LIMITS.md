# STEM Studio: feature map and current limits

**Audit basis:** source tree on branch `codex/production-scalability` (2026-10-20). This is a source-code review, not a live production inspection or a full manual QA pass. The frontend production build, Python compilation, and `git diff --check` passed for this revision. Automated tests and live service credentials were not checked in this review. See [the audit implementation status](audit-implementation-status.md) for each finding and what still requires owner action.

## What STEM Studio is

STEM Studio is a React/TypeScript single-page learning app with a FastAPI backend. Its main product is interactive DSA learning: choose a topic, provide or edit an input, run a visualizer, move through its steps, read the explanation and code, and use quizzes or the tutor for practice. The app also contains Linux command lessons and a virtual file-system simulator.

The frontend and backend deploy separately. Vercel can host the frontend; account persistence, AI answers, reset email, and pasted-code execution depend on the separately configured API and optional external providers.

## Learning modules

The shared topic catalog has 15 DSA categories and 125 named topic entries:

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

The same `topicCatalog.json` supplies navigation options, category-card topic counts, and backend progress denominators. Linked List has 21 topics, Trees 6, and Graphs 8. Matching catalog entries do not imply that every lesson has identical controls, explanation depth, or pasted-code support; page engines and runner contracts still differ.

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

The backend has a registry of **92 problem contracts in 14 DSA categories** and wrappers for C, C++, Java, Python, Go, and C#. Counts by category are sorting 10, arrays 6, strings 4, linked lists 6, stack/queue 22, binary search 5, hash maps 4, BST/tree 4, graph 5, recursion 5, backtracking 4, greedy 4, DP 8, and trie 5. There are no Linux/complexity contracts, and many built-in lessons (including several newer linked-list problems) do not have a matching runner contract. It accepts method/class submissions that match a registered problem contract, creates a harness with the expected arguments/data structures, sends it to Judge0, and returns the result and any captured trace events. It supports explicit `visualizeStep`/`visualize_step` events; selected linked-list submissions also have source-adapted trace support.

It does **not** compile arbitrary pasted snippets in every category without a registered contract. A user must select a supported problem and provide the expected method/class shape. Generic automatic conversion of arbitrary source code into a faithful visual trace is not implemented. Built-in visualizations and execution of the user's pasted source are separate paths; most built-in visualizers are generated from the app's own algorithm step engines.

Live execution requires `JUDGE0_URL` and the Judge0 API key/auth-header settings on the backend host. If those are missing, the API intentionally returns a configuration error. Never put the Judge0 key in a frontend `VITE_*` variable.

## Accounts, database, and saved work

The API implements signup, username-or-email/password login, optional Google login, access and rotating refresh tokens, logout, email verification, password reset, current-user lookup, and account deletion. Usernames and emails are normalized and unique. Password policy requires at least 8 characters with uppercase, lowercase, and a digit. Account deletion requires a recent sign-in and removes owned records through configured database relationships.

The backend has database models/routes for quiz attempts, module completion, saved sessions, tutor learning-profile data, accounts, support tickets, account preferences, owner announcements, notification audiences/read receipts, and sessions. Quiz completion writes per-topic completion; the dashboard calls progress, saved-session, and review-schedule APIs. Saved-session cards reopen the saved topic, but do not restore the exact input dataset or playback step. SQLite is convenient for local development; production persistence requires a durable hosted database configuration. The source repository does not prove which database or secrets are currently configured in Vercel or the API host.

Signup requires SMTP in production. The no-SMTP bypass is allowed only when both `DEBUG=true` and `ALLOW_UNVERIFIED_SIGNUP=true`; the repository example keeps the flag false. Password reset and verification email also require working SMTP. Google login requires the frontend OAuth client ID and matching provider configuration.

### “Active learners” number

The landing page gets this value from `/api/stats/platform`. The API counts all user rows in the database and caches the response in Redis for the configured short TTL (default 30 seconds). It represents **registered accounts**, not currently online or recently active learners. The UI label is “registered learners.”

### Owner announcements and navbar notifications

An owner account can publish an announcement from the dashboard support area. The owner address must be included in the backend's comma-separated `SUPPORT_OWNER_EMAILS` setting. Before publication, the UI previews the title, body, message type, and recipient count. Publishing snapshots all accounts that are active and verified at that moment into `announcement_recipients`; accounts created later or verified later do not receive that old announcement. Broadcasts are stored once with recipient/read-receipt rows, and a learner can mark one or all as read. The navbar bell shows the exact unread count from the API (the badge displays `99+` above 99), refreshes every 30 seconds, and refreshes again when the browser tab regains focus. This is in-app delivery; it does not send email, push notifications, or messages to currently signed-out devices.

Bulk promotional email is intentionally separate. A compliant email campaign needs an opt-in subscriber audience, unsubscribe handling, a verified sender/domain, and a bulk email provider. The current SMTP account flow is for account verification/password reset and is not a bulk campaign system. No email is sent when an owner publishes an in-app announcement.

## Octa tutor

Octa has AI Concept Mode and Interactive Step Mode. The client sends supported page/topic information, and on visualizer pages it can send the active state/step context. The backend can use a configured provider (DashScope, OpenAI-compatible providers, Anthropic, or a custom endpoint) or built-in fallback explanations for supported lessons. Provider connection/status and a tutor learning profile/feedback API are present.

The learning profile uses saved user feedback and learning signals as context for later answers. This is prompt-time personalization; it does not train or fine-tune model weights. The tutor should not infer a learner's personality or mood from sparse quiz history. Its status indicator distinguishes API ready (green), provider limit reached (orange), key missing (red), unavailable (neutral), and checking; this reports provider state, not answer accuracy.

Octa can propose a limited set of supported in-app actions, such as navigation, theme changes, and available visualization controls. The user must approve a proposal before it runs, and the proposal is cancelled if the page context changes. It cannot arbitrarily operate every control on the site, read hidden account/backend data, access the laptop, or execute host OS commands. Signed-in users can submit support reports from the dashboard; the owner inbox and review moderation queue require the owner's email to be configured in `SUPPORT_OWNER_EMAILS` on the API.

Live model-generated answers require a provider key/configuration. Without one, only supported built-in fallback guidance is available; this should not be described as unrestricted ChatGPT-equivalent responses.

## Linux learning area

The Linux section has 13 grouped command lessons and a virtual file-system lesson with a simulated directory tree, terminal history, a supported command interpreter, permissions/ownership demonstrations, and Nano/Vim-style editor flows. Commands mutate the app's virtual state and can be stepped backward/forward through its history.

This is a **simulator**, not a shell on the user's computer or a remote Linux server. Unsupported commands return a simulator message. The host cannot expose user files or run arbitrary system commands. Windows and macOS sections and Digital Logic Design are marked unavailable/coming soon.

## Deployment and scaling

The repository includes Redis-backed shared rate limiting, configurable SQL connection pools, readiness and health routes, cached public platform stats, a Dockerfile, and an optional Compose deployment with two FastAPI instances, private Redis, and HAProxy load balancing. The frontend remains separately deployable. The Compose example is a starting architecture; it requires its own database, secrets, network/TLS edge, monitoring, and deployment operation.

There is a k6 read-only load-test script and a staged runbook. The runbook records a small local direct-endpoint smoke (800 requests from 20 concurrent clients; about 799 requests/second, p95 about 70 ms) but explicitly says it did not include the full ASGI/network/Redis/HAProxy/Postgres/production path. The **45,000 and 200,000 virtual-user runs were not performed**, so there is no supported production throughput or availability claim. Those numbers are concurrent virtual users, not accounts or requests per second.

Redis is optional in simple/local mode. Without a shared Redis service, rate limits are process-local and cannot coordinate between API replicas. The included stack configures Redis, but it is not automatically deployed just because the frontend is on Vercel.

## Remaining gaps and owner actions

1. **Production/staging verification:** no 45k or 200k virtual-user run was performed, and no capacity or availability target is supported. Run the staged k6 plan with distributed generators and API, proxy, Redis, and database metrics before making a throughput claim.
2. **Hosted configuration:** verify the production database, SMTP, Google OAuth, Judge0, Redis, TLS, backups, monitoring, and frontend/API CORS in their hosting consoles. This workspace cannot inspect those provider dashboards.
3. **Owner inbox, review queue, and broadcast tool:** set `SUPPORT_OWNER_EMAILS` on the backend and restart/redeploy the API. The allowlist determines which account can operate these controls. Broadcasts reach the active, verified account snapshot through the app's navbar inbox; no bulk email provider is connected.
4. **Production signup email:** configure an SMTP provider, verified sender domain, SPF/DKIM/DMARC, and HTTPS `FRONTEND_URL`; keep `DEBUG=false` and `ALLOW_UNVERIFIED_SIGNUP=false`. No email provider or DNS setup was accessed here.
5. **Pasted-code coverage:** the badges identify registered custom-code stub contracts, not arbitrary code support. There are 92 runner contracts across 14 categories; some newer lessons still lack matching contracts. Extend coverage per problem and keep signatures explicit.
6. **Saved-session fidelity:** the dashboard can reopen a saved topic but does not yet restore its exact dataset and playback position.
7. **Operation metrics:** the new comparison/swap/write event counters and synchronized algorithm race apply to Sorting. Other visualizer engines need a shared event schema before they can show reliable comparable counts.
8. **Spaced repetition delivery:** due dates are calculated from quiz history and shown on the dashboard. There is no email, push, or browser notification reminder.
9. **Manual interaction QA:** the changes compiled, but every mobile/desktop flow and API-backed action has not been manually exercised against staging.

## Where the main implementation lives

- `frontend/src/App.tsx` — routes and gated dashboard pages.
- `frontend/src/data/categories.ts`, `categoryTopics.ts`, and `theoryContent.ts` — module/topic catalog and lesson text.
- `frontend/src/features/*` — module-specific controls, engines, and visual renderers.
- `frontend/src/components/tutor/`, `frontend/src/hooks/useOctaTutor.ts`, `backend/app/api/routes/octa_tutor.py` — tutor UI, context/actions, provider calls, profile and feedback.
- `backend/app/api/routes/auth.py`, `progress.py`, `stats.py`, `notifications.py` — authentication, saved learning data, platform count/reviews, owner broadcasts, and per-user notification inboxes.
- `backend/app/services/custom_code/` and `frontend/src/data/customCode/stubs.json` — pasted-code contracts, harness, runner integration.
- `frontend/src/features/os/commands/` and `frontend/src/features/os/filesystem/` — Linux lessons and VFS simulator.
- `backend/app/core/config.py`, `docker-compose.scale.yml`, `deploy/scalability/`, `docs/performance/scalability-runbook.md` — backend settings, optional Redis/HAProxy topology, load-test guide.

## Detailed feature-by-feature guide

This section describes what a learner can do on each page, the information the learner supplies, what the step sequence represents, and the supporting panels. It documents the code that exists; it is not a claim that every route or deployment has been manually tested.

### Getting into the studio

| Screen | What the learner does | What it includes |
| --- | --- | --- |
| `/` | Reads the public landing page and enters the studio or creates an account. A signed-in learner is sent to `/dashboard`. | Marketing overview, module entry points, platform account count, and public review area. The account count is described under “Active learners” below. |
| `/signup` | Enters first name, last name, username, email, password, and password confirmation, or chooses Google when configured. | Username/email uniqueness checks, password checks, and account creation through the API. Username and email are normalized case-insensitively. Password policy is at least 8 characters with uppercase, lowercase, and a digit. |
| `/login` | Enters either username or email plus password; optionally selects Remember me or Google login. | The API verifies the stored password hash and issues access and refresh tokens. Remember me changes the refresh-session lifetime. The frontend coordinates refreshes and retains credentials through temporary API failures. |
| `/forgot-password`, `/reset-password` | Requests a reset link, then chooses a new password using the token in that link. | Requires a working API and configured SMTP for the link to reach the learner. A reset token expires according to backend configuration (default 20 minutes). |
| `/dashboard` | Chooses DSA or Operating Systems and opens module/category hubs. | Topic cards and the application navigation shell. Interactive DSA pages and the Linux lesson/simulator pages are account-gated; after signing in the requested destination can be restored. |
| Settings modal | Changes appearance, configures Octa, and can request account deletion. | Light/dark theme is stored locally and synced to the signed-in account through `user_preferences`. AI settings include DashScope, OpenAI, OpenRouter, Anthropic, or custom OpenAI-compatible provider; API key, base URL, and model fields; a connection test; save and reset. A learner-provided AI key is stored in `sessionStorage`, migrated out of legacy local storage, and sent to the backend with tutor requests. Account deletion calls the API, requires recent authentication, and removes owned progress/session data according to database relationships. This is destructive and irreversible from the product UI. |

The normal account flow is: browser submits credentials to FastAPI, FastAPI checks the database, and the browser stores/refreshes the issued session credentials. With Remember me, browser tokens are kept in local storage; otherwise they use session storage. Each protected API route verifies the access token and loads the current database user. Defaults are 15 minutes for access tokens, 7 days for refresh tokens, and 30 days for Remember me; backend settings can change these. Refresh tokens are one-use and rotated; concurrent browser refreshes are coordinated. The account, quiz records, progress, and saved sessions survive browser restarts only if the configured database is durable and reachable. A local SQLite file is not a hosted backup.

### Common visualizer controls and panels

Controls vary by page, but these are the shared patterns a learner will encounter:

1. **Choose a lesson.** Search or select the algorithm/problem from the page's topic selector. Some routes accept a `?topic=...` link and select the requested entry.
2. **Set the input.** Enter a list, string, graph, tree value, expression, or problem parameter. A page may also provide sample, random, empty/reset, and live insert/delete controls. The exact accepted format is shown near that input and is listed below for each module.
3. **Build or run.** Many pages generate a sequence of immutable visual states from the current input when the learner selects the corresponding operation button. A few pages update the sequence as the input is edited. Changing a dataset or algorithm normally resets the playback position.
4. **Read the current step.** The canvas highlights the active item/pointer/edge/cell and changes the surrounding data structure to match the current recorded step. The explanation panel describes the current operation. This is a visual trace of the app's built-in step engine unless the learner explicitly uses the pasted-code runner.
5. **Control the trace.** The shared player supports play/pause, reset, one-step backward/forward, and timeline seeking where that page exposes the control. The player speed is bounded from 0.25× to 4×. The draggable floating playback controller is constrained to its visualizer workspace on the pages that use that controller.
6. **Adjust the workspace.** Several pages have resizable panel splitters, fullscreen canvas, and hide/show debugger actions. The exact splitter and card arrangement differs between modules and screen sizes; a build alone does not confirm responsive usability.
7. **Learn or check understanding.** Theory/explanation panels, a code panel, execution/debug trace, and Quiz Dock are available on pages that wire them in. A code listing in a page's debugger is instructional source; it does not prove that the listing is the program executed by the built-in step engine.

Light and dark themes are app-wide and the selected theme is stored under the browser key `app-theme`. Theme rendering uses shared CSS tokens, although any individual hard-coded renderer color should still be checked separately. The browser theme preference is not a backend account preference and may not follow the learner to another device.

### DSA module reference

#### Complexity Analysis

This is primarily a reading/reference lesson rather than a data-structure operation visualizer. Its 12 registered topics are:

- **Why complexity analysis:** explains how to compare resource growth independently of a particular machine's speed.
- **Asymptotic notations:** introduces Big O, Big Ω, and Big Θ as upper, lower, and tight growth bounds.
- **Simplification rules:** reduces expressions by dropping constants and lower-order terms and retaining dominant growth.
- **Analyzing loops:** works through loop counts and common nested/halving patterns.
- **Time complexity classes:** compares constant, logarithmic, linear, linearithmic, polynomial, and exponential growth.
- **Space complexity:** distinguishes input storage from extra/auxiliary memory.
- **Best, average, and worst cases:** compares operation counts across different inputs of the same size.
- **Recursion and Master Theorem:** relates recurrence forms to recursive work and divide-and-conquer growth.
- **Amortized analysis:** explains average cost across an operation sequence, such as occasional dynamic-array resizing.
- **Time-space tradeoffs:** discusses using memory to reduce repeated work, and the reverse tradeoff.
- **Data-structure operations:** reference material for operation costs across common structures.
- **Algorithm complexity reference:** lookup-oriented comparison material.

Use the topic navigation and theory sections to read/jump between concepts. This page does not have the same per-operation animated trace as sorting or linked lists. The central navigation has 12 entries; the page's rendered material should be reconciled with that count if the catalog is later expanded.

#### Sorting Algorithms (10)

The learner selects one algorithm, enters comma-separated numbers (up to 30), chooses a random, ascending, or descending pattern, and can change dataset size from 5 to 30. The input field applies valid data as it is typed; the live sequence control can append, insert at an index, or remove values. The canvas shows bars and per-step comparisons, swaps, range/partition, or bucket/count state depending on the algorithm. The page also exposes play/step/seek/reset, speed, fullscreen, Quiz Dock, debugger visibility, code/trace panels, and optional custom-code entry.

| Algorithm | What each trace teaches |
| --- | --- |
| Bubble sort | Compares neighboring values, swaps an out-of-order pair, and shows the largest remaining value moving to the sorted end after a pass. |
| Selection sort | Scans the unsorted suffix for its minimum, marks the candidate, then swaps it into the next fixed position. |
| Insertion sort | Holds a key, shifts larger sorted-prefix values right, and inserts the key into the gap. |
| Merge sort | Splits ranges into smaller halves, then merges sorted ranges while comparing their front values. |
| Quick sort | Selects a pivot, compares/repositions values around it, and recurses on the resulting partitions. |
| Heap sort | Builds a heap, exposes the root extreme, swaps it to the end, and sifts down the remaining heap. |
| Shell sort | Uses decreasing gaps to compare and shift distant elements before the final gap-1 pass. |
| Counting sort | Counts occurrences by value, then uses those counts to place values in sorted order. |
| Radix sort | Groups values by one digit position at a time, preserving stable order between digit passes. |
| Bucket sort | Distributes values into ranges/buckets, sorts the buckets, and collects them into the result. |

The input controls are shared across the normal and fullscreen canvas so the two toolbars use the same dataset. Algorithm-specific animation semantics come from each implementation's step generator.

#### Arrays (6)

Inputs are numeric arrays, capped at 30 values. The learner can type comma-separated numbers, append/insert/remove via the live sequence editor, change size (5–30), and generate random, sorted, or descending data. Some algorithms expose an additional target, target sum, window length, or number of rotations. The visualizer marks indices and the current range/window.

- **Linear search:** checks one index at a time against a target; stops on a match or after the final element.
- **Kadane's algorithm:** updates the best subarray ending at each index and the best global sum; helpful for seeing why a negative running prefix can be discarded.
- **Two pointers:** moves left/right indices to test candidate pairs against a target sum. The intended two-pointer technique assumes ordered input; use a suitable sorted dataset for the conventional explanation.
- **Sliding window:** advances a fixed-size range and updates its running state instead of recomputing every subarray.
- **Array rotation:** rotates the array right by the chosen count using the reversal method; the current page exposes a count, not a left/right direction selector.
- **Prefix sum:** builds cumulative totals so a range total can be derived from prefix values.

#### Strings (4)

The page accepts a primary string and, for anagram checking, a second string. It provides sample/random input, clear, and a character-entry control that appends characters to the selected input. The canvas highlights the active character/index and its comparison/count state.

- **Palindrome check:** compares symmetric characters while moving inward and reports whether they match.
- **Anagram check:** compares character-frequency requirements between two strings; its sample is `listen` and `silent`.
- **String reversal:** swaps/places characters from opposite ends until the sequence is reversed.
- **Frequency count:** increments and displays counts as characters are scanned.

#### Linked Lists (21 selectable lessons)

The learner can build a list from values separated by spaces, commas, or semicolons. Values that parse as numbers become numeric nodes; other tokens remain strings. The base list controls build, insert at head, insert at tail, delete head, empty/sample/randomize, reverse, find middle, and run Floyd cycle detection. A position-operation disclosure adds eight actions: insert at a 0-based index, insert in middle, insert before/after the first matching target, delete at an index, delete middle, and delete the node before/after the first matching target. For an even list, “middle” means left-middle. Insertions/deletions are recorded as animation steps so a new node is shown being linked into place before it joins the main row.

The structure selector changes the pointer illustration among singly, doubly, circular, and doubly circular forms. A singly list has `next`; a doubly list has `prev` and `next`; a circular list links tail to head; a doubly circular list links tail to head and head back to tail. Josephus uses a circular list. The algorithm-specific controls are:

- **Singly Linked List:** performs basic forward-list operations with head/tail, pointer links, and node order.
- **Reverse Linked List:** moves `current` through the list and changes each node's `next` link toward the previous node; it exposes `previous`, `current`, and saved `next` roles before final head/tail alignment.
- **Find Middle Node:** advances slow by one and fast by two links until fast reaches the end; shows both cursors and the selected center.
- **Cycle Detection (Floyd):** the run action builds a circular test input from the current list values, then moves tortoise/hare cursors and shows their meeting point and cycle entry.
- **Josephus Problem:** accepts the circle values and positive step size `k`; counts around the ring, removes every kth participant, and leaves the survivor.
- **Reverse Sublist (L–R):** uses inclusive 1-based left/right bounds; preserves the prefix and suffix and reverses only nodes in the selected segment.
- **Reverse a Half:** selects first or second half. The even/odd midpoint rule is displayed in the page helper so the chosen segment is unambiguous.
- **Reverse from Middle:** reverses from the chosen midpoint to the tail; even-sized lists use the upper middle.
- **Reverse in K Groups:** accepts group size `k`; reverses every complete k-node group and leaves a short final group in original order.
- **Palindrome Check:** reverses the second half, compares symmetric values, then restores the original list so the check does not leave mutated data.
- **Swap Nodes in Pairs:** rewires adjacent links in place; node values do not get exchanged.
- **Merge Sort a List:** repeatedly splits and stably merges linked runs, visualizing comparisons and changed next links; implementation is bottom-up and O(n log n).
- **Add Two Numbers:** treats each list as reverse-order digits, adds pairwise with carry, and creates result digits.
- **Remove Nth from End:** keeps a fixed gap between two pointers; when the lead pointer reaches the end, removes the target node, including the head edge case.
- **Split into Two Halves:** finds the split, cuts the connecting link, and renders two independent lists; if length is odd, the first receives the extra/middle node.
- **Split into K Parts:** input `k` controls the number of consecutive parts; part sizes differ by at most one, and earlier parts receive extra nodes.
- **Merge K Sorted Lists:** accepts 2–8 sorted input lists (up to 8 total) and repeatedly selects the smallest current head for the merged result. Input lists must already be sorted.
- **LRU Cache:** capacity is 1–20; operations are `get(key)` and `put(key,value)` separated by semicolons/newlines, with at most 24 operations. The map provides key lookup while the doubly linked list stores recency order; a hit moves a node to most-recent, and a full insertion evicts least-recent.
- **Doubly Linked List:** demonstrates forward/backward links and supports the common insert/delete operations.
- **Circular Linked List:** demonstrates tail-to-head closure and circular traversal termination.
- **Doubly Circular Linked List:** demonstrates both reciprocal ring links and bidirectional traversal.

The built-in trace is generated by the frontend algorithms. Pasted linked-list code is a separate feature and only some registered functions have source-adapted pointer traces.

#### Stack & Queue (23 selectable lessons)

The page has two primitives plus 21 named classic problems; its subtitle currently says “21 problems” while the selector has 23 total entries including the primitives. Each problem has its own renderer: vertical stack, linear/circular queue, expression token lanes, histogram bars, character stream, task timeline, or BFS grid. Dataset buttons include empty, sample, and random where meaningful. The main input and operation-specific controls are shared between the page and fullscreen view. Playback and Quiz Dock use recorded operation states.

| Lesson | Input and operation | What the learner sees |
| --- | --- | --- |
| Stack Primitive (LIFO) | Comma-separated values; Build Stack, Push, Pop, Peek, Pop All. | Values enter/leave at the top; the canvas labels top and shows the vertical stack. |
| Queue Primitive (FIFO) | Comma-separated values; Build Queue, Enqueue, Dequeue. | Values enter at rear and leave from front, preserving first-in-first-out order. |
| Valid Parentheses | Bracket string such as `({[]})`; Evaluate String. | Current bracket, open-bracket stack, matching pop, and invalid/mismatched state. |
| Min Stack O(1) | Numeric values such as `3, 1, 5`; Push Value. | Main stack and auxiliary minimum stack, showing how the current minimum can be retrieved without scanning. |
| Infix to Postfix | Tokens/operands with `+ - * / ^` and parentheses; Convert to Postfix. Unary operators are not supported. | Current token, operator stack, precedence/parenthesis decisions, and output lane. |
| Evaluate RPN / Postfix | Space-separated postfix tokens, e.g. `3 4 + 2 *`; Evaluate Postfix. | Operand stack, operand pops, operator application, and result push. |
| Daily Temperatures | Comma-separated temperatures; Compute Warmer Days. | Monotonic unresolved-index stack and days-until-warmer answers as a warmer value resolves earlier days. |
| Simplify Path | Slash-separated path such as `/a/./b/../../c/`; Simplify Path. | Path segments and stack behavior for normal folders, `.`, and `..`. |
| Remove Adjacent Duplicates | String such as `abbaca`; Remove Duplicates. | Character stream and stack; adjacent equal characters cancel in pairs. |
| Basic Calculator | Non-negative integers, `+`, `-`, spaces, and parentheses, e.g. `2-(3+4)`; Evaluate Expression. | Token scan, saved signs/partial totals across parentheses, and current result. Other operators are outside this input contract. |
| Decode String Pattern | `k[substring]` pattern such as `3[a2[c]]`; Decode String. Nested groups are supported. | Count/string stacks, bracket boundaries, and expansion of each nested substring. |
| Trapping Rain Water | Comma-separated bar heights; Compute Trapped Water. | Histogram bars, boundary/stack state, and water contribution accumulated between bars. |
| Largest Rectangle in Histogram | Comma-separated heights; Compute Max Area. | Monotonic stack and each popped bar's candidate width/area. |
| Queue using 2 Stacks | One value per enqueue action; Enqueue In-Stack / Dequeue Out-Stack. | Input stack, transfer to output stack when needed, and FIFO front behavior. |
| Stack using Queues | One value per push; Push (Drain) / Pop. | Queue rotation that places the newest value at the removable front, implementing LIFO. |
| Circular Ring Queue | One value; Enqueue Slot / Dequeue Slot. Capacity is adjustable from 2 to 12 while preserving queue order. | Ring slots, each index, FRONT and REAR; wraparound reuses freed slots. |
| Design Circular Deque | Value plus Insert Front, Insert Last, Delete Front, Delete Last. Capacity is adjustable from 2 to 12 while preserving elements. | Ring storage with both ends usable and front/rear movements, including wraparound and full/empty conditions. |
| Sliding Window Maximum | Comma-separated numbers and window size `k` (1–20); Compute Window Max. | Current window, deque of candidate indices, expired indices removed from the front, smaller candidates removed from the back, and max per window. |
| First Non-Repeating Character in a Stream | Character stream such as `aabc`; Process Stream. | Incoming character, frequency counts, queue of unresolved candidates, and the first current non-repeating character after each input, rendered as text in both light and dark themes. |
| Moving Average Data Stream | Comma-separated numeric stream and window size `k` (1–20); Stream Averages. | Queue of the last k values, sum adjustment when old values leave, and average after each number. |
| Task Scheduler CPU Queue | Task labels such as `A, A, A, B, B, B` and cooldown `n` (0–20); Run Scheduler. | Remaining task frequencies, ready/cooling work, idle slots, and the CPU timeline as repeated tasks cool down. |
| Rotting Oranges BFS Grid | Rows separated by semicolons; cells must be 0 empty, 1 fresh, or 2 rotten; Run BFS Rot. | Grid minute by minute; all adjacent fresh cells reached in one minute become rotten as a BFS layer. |
| Dota2 Senate Round-Robin | R/D sequence such as `RDDR`; Run Election. | Two queues of senator indices; each active senator bans the next opposing senator and re-enters in a later round if eligible. |

Input-specific validation and how empty/full/invalid states are displayed are implemented per algorithm. Do not interpret “23 selectable lessons” as 23 distinct code-runner contracts; the pasted-code registry is separate.

#### Binary Search (5)

The default sorted array is `[4,8,15,23,42,56,77,89,94]`; the page accepts a numeric array and target where needed, and offers presets/validation. It uses a sorted numeric array for standard/bounds operations, a once-rotated sorted array for rotated search, and a numeric array for peak finding. Presets and input validation make the precondition visible; the user must not treat unsorted input as valid for classic/lower/upper-bound search.

- **Classic binary search:** compares the middle element to the target and discards the half that cannot contain it; shows `low`, `mid`, and `high`.
- **Lower bound:** narrows to the first position with value `>= target`, including insertion position if no equal value exists.
- **Upper bound:** narrows to the first position with value `> target`, useful for finding the range after duplicates.
- **Rotated sorted array:** detects which half is sorted and chooses the half that can contain the target; input validation checks the rotated-sorted shape (at most one descent).
- **Find peak element:** follows the slope direction using binary search and returns a local peak, rather than requiring a globally greatest value.

#### Hash Maps (4) and table playground

The algorithm view accepts a numeric array and, when required, a target. Built-in defaults are Two Sum `[2,7,11,15]` with target 9; duplicate detection `[3,1,4,1,5,9,2,6]`; frequency map `[1,2,2,3,3,3,4,4,4,4]`; subarray sum `[1,4,20,3,10,5]` with target 33. The step view renders the current value, map/set entries, and result state.

- **Two Sum:** checks whether the complement of each value has already appeared in a map; returns the matching pair of indices/values.
- **Duplicate Detect:** records seen values and stops/reports when a value repeats.
- **Frequency Map:** increments a value's counter as the array is traversed.
- **Subarray Sum:** stores prior prefix-sum-to-index values and returns the first contiguous range found whose sum matches the target; this implementation does not enumerate every matching range.

The separate **Hash Table Playground** is a direct table lesson rather than one of those four algorithm traces. It accepts text keys and values, lets the learner choose 5, 7, or 11 buckets and separate chaining or linear probing, and supports insert/update, search, delete, a collision sample, and clear. It shows the computed sum-of-character-codes hash, home bucket, visited slots, entry count, load factor, and insert-collision count. This is a teaching hash function, not the implementation used by real language maps. Changing bucket count or collision strategy starts a fresh table. The page has an Algorithms/Table switch; do not assume playground edits are saved to the learner account.

#### Trees (6)

The tree page selects a structure and an operation; it accepts numeric values for BST/AVL/heap/red-black/segment tree and words for trie. The BST starts from a sample tree and inserts 45 by default; AVL starts with an insert of 30; the heap sample is `[90,75,60,40,55,20]` and inserts 85 into a max-heap; trie starts with sample words; segment tree uses `[1,3,5,7,9,11]` with a default query range 1–4 and point update index 2 to 6. Sample, random, empty, and build-from-scratch controls are available where applicable. Each operation generates a trace and the canvas draws nodes/edges; Red-Black nodes use red/black node fills. The six options are:

- **BST:** insert values by comparison, search down one branch, delete with leaf/one-child/two-child handling, and run inorder/preorder/postorder traversal. The traversal panels expose visit order.
- **AVL tree:** insert and calculate height/balance changes, then show LL, RR, LR, or RL rotation steps when needed to restore balance.
- **Red-Black tree:** insert with parent/uncle/grandparent fixups; display node colors, recoloring, and rotations. The root and parent-color rules are the educational focus.
- **Binary heap:** choose min-heap or max-heap, insert with sift-up, or extract the root and sift-down; the tree and backing array reflect complete-tree order.
- **Segment tree:** build from an input array, query an inclusive range, or update one index. The tree nodes show stored segment aggregates; query/update traversal highlights covered/visited ranges.
- **Trie:** insert words or search for a word using character edges and terminal markers. Defaults include `cat, car, dog`; separate prefix/word dictionary/autocomplete modes exist in the dedicated Trie category.

The page's actual tree selector has six entries while its category card and progress denominator currently say four. Segment tree operations take array/range/index/value inputs; trie operations use string input.

#### Graphs (8)

The graph editor uses a preset graph, or the learner can add/remove up to 12 nodes, add/remove edges, set an edge weight, and choose directed/weighted interpretation. Start and destination nodes are selectable. Sample, empty, reset, and randomize-weights controls are available. The graph canvas marks visited/frontier/path/selected-edge states and the step explanation describes the active queue, stack, relaxation, or edge choice. A* has a separate editable grid with start/goal/blocked cells.

- **BFS:** uses a FIFO frontier queue to visit reachable nodes level by level.
- **DFS:** follows one branch deeply using a call/explicit stack and records backtracking.
- **Dijkstra:** greedily extracts the smallest known distance and relaxes outgoing edges; requires nonnegative weights.
- **Bellman–Ford:** repeats edge-relaxation passes and checks for a further improvement indicating a reachable negative cycle.
- **Prim MST:** grows one minimum spanning tree from a start component by selecting the cheapest crossing edge.
- **Kruskal MST:** sorts edges and uses disjoint-set connectivity to skip edges that would create a cycle.
- **A* Pathfinding:** scores grid cells by `f = g + h`, where `g` is travel cost and `h` the heuristic estimate, to find a path around blocked cells.
- **Kahn Topological Sort:** counts indegrees, queues zero-indegree nodes, removes them and reduces neighbor indegrees; a cycle prevents a full ordering.

The central registry has eight graph topics while the category/progress counts say five. Algorithm prerequisites matter: for example, a negative edge invalidates Dijkstra's guarantee.

#### Recursion (5)

Inputs are bounded to keep recursion trees readable: factorial and Fibonacci use a range slider (defaults 5; maxima 8 and 6 respectively), power defaults to `2^4` with bounded base/exponent fields, array sum defaults to `[3,7,2,5,1]` (at most 8 values), and Hanoi defaults to 3 disks (1–5). Random, sample, and empty controls are available. The canvas focuses on calls, base cases, returns, and the call stack; Tower of Hanoi uses a peg/disks board.

- **Factorial:** calls `n * factorial(n-1)` until the base case, then unwinds returned products.
- **Fibonacci:** shows repeated `fib(n-1)` / `fib(n-2)` calls and their return tree; the simple recursive version intentionally illustrates repeated work.
- **Power:** recursively reduces the exponent and returns the product; complexity shown by this lesson follows its implementation's recursion strategy.
- **Array Sum:** recursively processes the remaining suffix and adds the current element on return.
- **Tower of Hanoi:** recursively moves `n-1` disks aside, moves the largest disk, and moves the smaller stack to the destination; each animated move obeys the top-disk rule.

#### Backtracking (4)

Defaults are `[1,2,3]` for subsets and permutations, a 4×4 board for N-Queens, and candidates `[2,3,6,7]` with target 7 for Combination Sum. The visualizer shows a partial candidate, a decision/choice branch, and undo/backtrack when a branch cannot or need not continue. Combination Sum permits reusing a candidate; the candidates should be positive for this implementation's decreasing-remainder search.

- **Subsets:** include/exclude decisions generate subset combinations.
- **Permutations:** choose an unused element at each position and backtrack to try alternatives.
- **N-Queens:** places one queen per row, checks column/diagonal conflicts, and removes a queen when a branch is invalid.
- **Combination Sum:** explores candidate choices toward a target, records valid combinations, and abandons over-target branches. The exact input contract (candidate list/target and reuse behavior) is on the page's form; it is not a generic arbitrary-input compiler.

#### Greedy (4)

The page accepts activity pairs (default `(1,4) (3,5) (0,6) (5,7) (3,9) (5,9) (6,10) (8,11)`), weight/value pairs for fractional knapsack (default `(10,60) (20,100) (30,120)` and capacity 50), deadline/profit pairs for job scheduling (default `(2,100) (1,19) (2,27) (1,25) (3,15)`), or text for Huffman coding (default `aabbbcccc`). It traces the locally selected candidate, acceptance/rejection, and accumulated objective. Correctness depends on each problem's greedy-choice assumptions.

- **Activity Selection:** sorts/selects compatible activities, typically choosing the earliest finishing next activity.
- **Fractional Knapsack:** orders by value/weight ratio and takes whole or fractional portions until capacity is filled.
- **Job Scheduling:** chooses jobs into available deadline slots while tracking profit/slot occupancy.
- **Huffman Coding:** repeatedly combines the two least-frequent nodes into a prefix-code tree and derives bit paths.

#### Dynamic Programming (8)

Inputs have sample defaults: Fibonacci `n=8`; coin denominations `[1,5,10,25]`, amount 30; houses `[2,7,9,3,1]`; knapsack weights `[2,3,4,5]`, values `[3,4,5,6]`, capacity 8; LCS strings `AGGTAB`/`GXTXAYB`; LIS `[10,9,2,5,3,7,101,18]`; edit distance `horse`/`ros`; unique-path grid 3×4. The learner supplies a scalar, array, string pair, capacity, coin set, or grid dimensions depending on the lesson. The visualizer reveals subproblem states and table/array values as they are calculated; it is intended to show how stored solutions avoid repeated work.

- **Fibonacci DP:** fills/reuses earlier sequence values instead of recomputing the recursive tree.
- **Coin Change:** updates minimum-coin or count states from coin denominations and a target amount; the displayed recurrence explains which variant the active lesson implements.
- **House Robber:** compares skipping the current house with taking it plus the best non-adjacent prefix.
- **0/1 Knapsack:** fills capacity/value states while each item can be taken at most once.
- **Longest Common Subsequence:** fills a two-string table; matching characters extend the diagonal, otherwise it takes the best neighboring state.
- **Longest Increasing Subsequence:** tracks candidate increasing subsequences/lengths and updates them for each value.
- **Edit Distance:** fills a two-string table using insert, delete, match, and replace transitions.
- **Unique Paths:** fills a grid table by combining paths from the top and left; the current lesson uses an unobstructed grid.

#### Trie (5)

This dedicated page focuses on prefix-tree operations over words and prefixes. The visible node graph stores characters and terminal-word markers; the path from root to a terminal node spells a stored word.

- **Trie Insert:** creates any missing character nodes and marks the final node terminal.
- **Trie Search:** follows every character and succeeds only if the final node marks a complete word.
- **Prefix Search:** follows the prefix and lists/counts words below that node.
- **Word Dictionary:** searches with the supported `.` single-character wildcard (sample query `h.l.`); wildcard branching can visit more than one child.
- **Autocomplete:** finds the prefix node and enumerates completions below it.

### Quiz, code panels, and Octa

#### Quiz Dock

The Quiz Dock is a page panel with an **Observation mode** (quiz off) plus three quiz modes:

- **Concept Mode:** standalone multiple-choice questions (the UI describes 10–15 questions). It tests terms/rules without interrupting playback at each step.
- **Flow Mode:** starts the visual trace and pauses at generated prediction checkpoints. The learner chooses an answer; the panel reports whether it is correct and then allows execution to continue. In intensive mode questions have a content-adjusted 20–45 second response window; other cadence modes are untimed. Cadence controls determine how often checkpoints appear; checkpoints are generated only where the page has a quiz adapter.
- **Revision Mode:** focuses on weak concepts available from past results/profile data. If no history exists, the amount of personalization is limited.

Flow checkpoints use cadence-based selection: core questions are retained and reinforcement checkpoints are sampled to the chosen density; intensive mode keeps every checkpoint and uses a question-adjusted 20–45 second timer. The timer is disabled in the untimed modes. Quiz panels also offer optional free-text reasoning feedback from Octa when a live model is available; the response is not saved as a formal quiz grade. At the end, the report summarizes answers, accuracy, streak, weak points, and advice. Fresh input can enable a transfer challenge. Quiz attempts and streaks are written for authenticated users through the backend; completed quizzes mark the algorithm as complete. Saved-session cards reopen their topic but do not hydrate the exact dataset or step. Not every module has equally rich quiz question coverage.

#### Code debugger and pasted-code runner

There are two different things called “code” in the experience:

1. **Instructional code panel:** shows language variants/reference snippets for the selected algorithm. It can be used to relate a highlighted trace step to a source line. It may show Python, C++, Java, JavaScript, Go, or pseudocode on selected modules; availability differs by module.
2. **Pasted-code runner:** accepts a user method/class for one of the backend's registered harness problems. There are 92 contracts in 14 categories, with C, C++, Java, Python, Go, and C# selected as supported runner languages. The harness constructs expected input nodes/arrays/grids/operation sequences, invokes the expected method, and returns output. Some adapters emit `visualizeStep` events; some selected linked-list functions can have source-adapted pointer traces.

For pasted code, the learner must choose a supported problem, use the expected signature/class contract, and provide code in a supported language. The problem contract, not a generic LeetCode parser, determines how arguments and return values are built. Arbitrary free-form snippets in every category are not guaranteed to compile or generate a faithful execution visualization. The runner submits to Judge0; if `JUDGE0_URL` and the required auth settings are absent on the backend, it returns a configuration error. A locally running Judge0 on the developer laptop does not serve the deployed website.

#### Octa Tutor

Octa appears as a tutor widget. It has **AI Concept Mode** for natural-language explanations and **Interactive Step Mode** for the active visualizer frame. The frontend sends route/topic, current step, and relevant algorithm/input context when available. It can also receive user feedback and context for later responses.

Within the supported integration, Octa can propose navigation to a page/topic; theme change; play, pause, step-forward, reset, and speed adjustment; supported numeric input changes; debugger/fullscreen toggles; quiz launch; and a bounded set of VFS simulator commands. For actions, the UI asks the user to approve the proposal. An action becomes invalid if the page context changes or the target control is no longer available. The tutor cannot silently submit an owner support query, manipulate every control, access hidden records, or execute Linux commands on the host machine.

Learning adaptation stores feedback/signals and uses them as prompt context. It does not train model weights, and it cannot reliably infer personality, mood, or a complete learning style from a small number of interactions. Live AI responses require a provider key/endpoint/model configuration on the API. If no provider is configured or a provider is unavailable, only the supported deterministic fallback content can answer. Provider status indicators report configuration/availability; they do not guarantee answer correctness.

### Linux learning and simulator

#### Linux command reference

`/dashboard/os/commands` contains a searchable, filterable command catalog divided into these 13 groups. A command card has a short purpose, theory, syntax, examples, and copy-to-clipboard actions; cards can be expanded/collapsed, and the page has expand/collapse-all controls. Selecting Linux Core opens guided concept sequences with next/previous step navigation and commands to review.

| Group | Topics/commands represented |
| --- | --- |
| Path Concepts | Absolute vs relative paths, `.`, `..`, and `~`. |
| Navigation | `pwd`, `cd`, `ls`. |
| File & Directory Operations | `mkdir`, `rmdir`, `touch`, `cp`, `mv`, `rm`. |
| Search & Lookup | `find`, `whereis`, `grep`, `sed`, `awk`. |
| Text Editors | `nano`, `vim`, and Vim Normal, Insert, and Command-line modes. |
| User Management | `useradd`/`adduser`, `userdel`, `passwd`, `usermod`, `who`/`whoami`/`id`, `su`/`sudo`. |
| Group Management | `groupadd`/`groupdel`/`groupmod`, `usermod -aG`, `gpasswd`, `/etc/passwd`, `/etc/group`. |
| Permissions & Ownership | `chmod`, `chown`/`chgrp`, `umask`, SetUID, SetGID, sticky bit. |
| Process Management | `ps`, `top`/`htop`, `nice`/`renice`, job control, `kill`/`killall`/`pkill`. |
| Package Management | `apt` and `apt-fast`/`aria2`. |
| Network Commands | `ping`, `curl`/`wget`, `ip a`/`ifconfig`, `ss`/`netstat`, `ssh`/`scp`. |
| System Commands | `uname`, `df -h`/`du -h`, `uptime`, `systemctl`. |
| Scheduling Jobs | `cron` and `crontab`. |

The Linux Core guide adds four guided topics: **UFW firewall** (inspect rules, allow SSH/ports, enable/check, remove temporary rules); **share files over Wi‑Fi** (choose a directory, inspect LAN IP, run a temporary Python HTTP server, and stop it); **permissions** (read `ls -l`, use symbolic/numeric `chmod`, inspect/change ownership); and **processes/services** (inspect processes, check/control `systemd`, read journal logs). The cards explain the command and relevant cautions. These are commands for the learner to review and run on their own Linux machine; the course does not run them there.

#### Virtual File System (VFS)

`/dashboard/os/filesystem` is a stateful **in-memory simulation** with a virtual directory tree and terminal. The supported interpreter models a bounded command set such as `pwd`, `cd`, `ls`, `mkdir`, `touch`, `cat`, `nano`, `vim`, `useradd`, `chmod`, `chown`, `chgrp`, `rm`, `cp`, `mv`, `echo`, `export`, user/group inspection and mutation, `find`, `grep`, `sed`, `awk`, `wc`, `head`, `tail`, `apt`, `ssh`, `tree`, `curl`, `ping`, `diff`, and `uname`. The virtual state includes paths/files/directories and, for supported operations, permissions, ownership, users/groups, and editor contents. The UI shows terminal output, a tree renderer, and history/step explanations; Nano/Vim open simulated editor flows. Octa may propose supported VFS commands after learner approval.

It is not a real Bash interpreter: shell scripts, arbitrary binaries, system services, network requests, and the host laptop's files are not executed/accessed. A command existing in the course reference does not necessarily mean the VFS implements its real Linux behavior. Windows, macOS, and Digital Logic Design are listed but unavailable/coming soon.

### Saved learning data and public counts

For signed-in users, the API can store quiz attempts, correct/incorrect outcomes, streaks, completed-algorithm IDs, module completion percentages, saved sessions/datasets, and tutor learning-profile signals. The dashboard loads module progress, saved sessions, and review due dates; quiz completion marks the current topic complete. The saved-session UI reopens the saved topic but does not restore its dataset or playback step. Theme is synced to the account; some UI state remains browser-local.

The landing-page **“registered learners”** number calls `/api/stats/platform`, counts all `User` records, and may be cached for 30 seconds in Redis. It means registered accounts in the configured database, not current online users. The value can only be current with respect to the API's database and cache. New reviews remain pending until an account allowlisted in `SUPPORT_OWNER_EMAILS` approves them; the public review read returns approved reviews only.

### Service and deployment dependency map

| Feature | Required runtime/configuration | If missing |
| --- | --- | --- |
| Public landing and built-in frontend traces | Frontend deployment | The site or its client-side experience cannot load. |
| Signup, login, account count, progress, saved sessions | Reachable FastAPI API and configured database | Authenticated API actions fail; stored-account totals/progress cannot be read/written. |
| Durable accounts/progress | Persistent database on backend host, with migrations/backups | Ephemeral/local storage can be lost or isolated from deployed users. |
| Shared rate limit/cache/load-balanced API | Redis URL and deployed Redis; optional HAProxy/Compose topology | Redis-backed limits/cache degrade to process-local or bypass behavior depending on setting; multiple replicas will not share local state. |
| Password reset and real email verification | SMTP credentials, valid sender/domain, public HTTPS frontend URL | Production signup returns 503 without SMTP; reset emails are unavailable. Local unverified signup requires both `DEBUG=true` and `ALLOW_UNVERIFIED_SIGNUP=true`. |
| Google sign-in | Frontend Google client ID and matching backend/provider configuration | Google button/verification cannot complete. |
| AI-generated tutor answer | Either a server-side default provider key or a learner-configured provider/base URL/model/API key and network access | Deterministic fallback only for supported content; no general live model answer. The learner-configured key is stored in session storage and passed to the API with the request. |
| Pasted-code execution | Hosted Judge0 URL and its auth token/header settings on backend | Execution reports that the sandbox service is not configured/unavailable. |
| 45k/200k load claim | Staging deployment, distributed k6 generators, full observability | No verified capacity claim. The small local direct-endpoint smoke is not end-to-end capacity evidence. |

### Implementation map by learner task

- **Open or search a lesson:** `frontend/src/App.tsx`, `frontend/src/data/categories.ts`, and `frontend/src/data/categoryTopics.ts`.
- **Change algorithm input and render operation steps:** `frontend/src/features/<module>/` and that module's `algorithms/` or engine files.
- **Playback, panel resizing, quiz, and code trace:** `frontend/src/hooks/useStepPlayer.ts`, `frontend/src/components/layout/`, `frontend/src/components/quiz/`, and `frontend/src/components/debugger/`.
- **Account and saved-learning APIs:** `backend/app/api/routes/auth.py`, `progress.py`, and `stats.py`; frontend API clients live under `frontend/src/api/`.
- **Tutor prompts/actions/profile:** `frontend/src/components/tutor/`, `frontend/src/hooks/useOctaTutor.ts`, and `backend/app/api/routes/octa_tutor.py`.
- **Snippet contracts and sandbox dispatch:** `frontend/src/data/customCode/stubs.json`, `backend/app/services/custom_code/`, and `backend/app/api/routes/execute.py`.
- **Linux command reference, guided lessons, VFS:** `frontend/src/data/linuxCommandsData.ts`, `linuxCoreLessons.ts`, and `frontend/src/features/os/`.
- **Redis, database pools, containers, proxy and load guide:** `backend/app/core/config.py`, `docker-compose.scale.yml`, `deploy/scalability/`, and `docs/performance/scalability-runbook.md`.
