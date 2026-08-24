# PROJECT DEVELOPMENT RULES

## 1. Stack
- **Backend:** Python
- **Frontend:** React
- **Version Control:** Git + GitHub
- Do not introduce another framework/library without approval.

## 2. Branches
- `main`  → production/stable
- `dev`   → integration
- `feature/*` → individual work
- `fix/*` → bug fixes
- Never push directly to `main` or `dev`.
- All changes go through Pull Requests.

## 3. Feature Workflow
`feature` → PR → `dev` → testing → PR → `main`
- One feature/task = one focused branch.
- Keep Pull Requests small and focused.

## 4. Python Environment
- Every developer must use their own virtual environment (`.venv`).
- Never commit `.venv`.
- Never share `.venv` through Git.
- **Workflow Rule:** Every developer will work in a virtual environment. The exact same dependency versions must be added to the `requirements.txt` file. Whenever code is pushed to GitHub, every team member will pull/merge, install all dependencies from the `requirements.txt` file, and test the code to ensure nothing is broken before starting their own work.

## 5. Python Dependencies
- `requirements.txt` is the single shared dependency list.
- New Python dependency → install locally → update `requirements.txt` → commit both code + dependency change.
- Keep dependency versions controlled and reproducible.
- Do not add unnecessary packages.

## 6. React Dependencies
- `package.json` defines frontend dependencies.
- `package-lock.json` must be committed.
- Always use the project's existing package manager.
- New dependency → update both `package.json` and `package-lock.json`.
- Use `npm ci` for clean/reproducible installs in CI.
- Do not independently change React/tool versions.

## 7. Environment Variables
- `.env` → local only, NEVER commit
- `.env.example` → commit, placeholders only
- Backend secrets stay server-side.
- Never put real secrets/API private keys in React environment variables.
- Never commit passwords, API keys, tokens, or cloud credentials.

## 8. Testing
- New functionality must have appropriate tests.
- Bug fixes should include a regression test where practical.
- Do not consider a feature complete only because it runs locally.

## 9. CI
- CI is configured in `.github/workflows/`.
- CI automatically runs build/lint/tests.
- CI is not the same thing as tests; CI is the automation that runs the checks.
- Required CI checks must pass before merging.

## 10. Code Changes
- Inspect existing code before modifying it.
- Reuse existing architecture and dependencies.
- Do not rewrite unrelated code.
- Do not introduce unnecessary abstractions.
- Keep changes minimal and focused.

## 11. AI Rules
- AI must follow the existing project architecture.
- AI must not invent dependency versions or project conventions.
- AI must inspect `requirements.txt`, `package.json`, lock files, `.env.example`, and relevant source code before making related changes.
- Never expose or commit secrets like environment files and tokens etc.

## 12. Commits
**Use:**
- `feat:` add authentication
- `fix:` handle invalid login
- `test:` add authentication tests
- `refactor:` simplify auth service
- `chore:` update dependencies
- `docs:` update documentation

**Avoid:**
- `update`, `changes`, `final`, `stuff`, `work`

## 13. Merge Rules
```text
feature/*
   ↓
PR → dev
   ↓
CI ✅ + Review
   ↓
dev
   ↓
PR → main
   ↓
CI ✅ + Review
   ↓
main
```
## 14. Critical Production & Database Rules (Non-Negotiable Safety Checklist)
- **Database Engine & Dialect Isolation (`backend/infrastructure/database/database.py`)**:
  - Never hardcode MySQL SSL arguments (`connect_args={"ssl": ...}`) globally. SQLite (`sqlite:///...`) MUST NOT receive MySQL SSL kwargs, or it will crash with `TypeError`.
  - Remote Cloud Databases (Aiven / Render / Supabase): Remote MySQL requires `ssl.SSLContext` (`check_hostname = False`, `verify_mode = ssl.CERT_NONE`) passed to PyMySQL.
  - Connection pooling (`pool_size`, `max_overflow`) applies to MySQL/Postgres only. SQLite uses `check_same_thread=False`.
- **Database Initialization & Exception Reporting (`backend/app/main.py`)**:
  - Never silently swallow database connection or table creation errors in `init_db_tables()`. Always log full tracebacks (`traceback.format_exc()`) so database failures are immediately visible in server deployment logs.
  - Keep `/api/health` and `/api/db-check` active for diagnostic verification.
- **Database URL Formatting (`backend/app/core/config.py`)**:
  - Automatically convert `mysql://` to `mysql+pymysql://` and `postgres://` to `postgresql://`. Strip query params like `ssl-mode`/`ssl_mode` incompatible with PyMySQL.
- **Frontend Core Components & Types (`frontend/src/`)**:
  - Do not break shared component interfaces (`PlayPauseButton`, `ExplanationPanel`) used across visualizer pages.
  - Always verify `npm run build` (`tsc -b && vite build`) passes with zero errors before pushing to `dev` or `main`.

---

# Architecture Reference

```text
architecture:system-studio/
│
├── frontend/                              # React + TypeScript
│   ├── src/
│   │   │
│   │   ├── components/                    # Shared UI components
│   │   │   ├── primitives/                # Visualization primitives
│   │   │   │   ├── Bar.tsx
│   │   │   │   ├── CircleNode.tsx
│   │   │   │   ├── Line.tsx
│   │   │   │   └── Arrow.tsx
│   │   │   │
│   │   │   ├── controls/
│   │   │   │   ├── PlayPauseButton.tsx
│   │   │   │   ├── StepControls.tsx
│   │   │   │   └── SpeedSlider.tsx
│   │   │   │
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       ├── TopicMenu.tsx
│   │   │       └── ExplanationPanel.tsx
│   │   │
│   │   ├── features/                      # Algorithm-specific modules
│   │   │   │
│   │   │   ├── sorting/
│   │   │   │   ├── SortingPage.tsx
│   │   │   │   ├── SortingRenderer.tsx
│   │   │   │   └── algorithms/
│   │   │   │       ├── bubbleSort.ts
│   │   │   │       ├── selectionSort.ts
│   │   │   │       ├── insertionSort.ts
│   │   │   │       ├── mergeSort.ts
│   │   │   │       ├── quickSort.ts
│   │   │   │       ├── heapSort.ts
│   │   │   │       └── shellSort.ts
│   │   │   │
│   │   │   ├── stackQueue/
│   │   │   │   ├── StackQueuePage.tsx
│   │   │   │   ├── StackQueueRenderer.tsx
│   │   │   │   └── algorithms/
│   │   │   │       ├── stack.ts
│   │   │   │       ├── queue.ts
│   │   │   │       ├── circularQueue.ts
│   │   │   │       └── priorityQueue.ts
│   │   │   │
│   │   │   ├── linkedList/
│   │   │   │   ├── LinkedListPage.tsx
│   │   │   │   ├── LinkedListRenderer.tsx
│   │   │   │   └── algorithms/
│   │   │   │       ├── singlyLinkedList.ts
│   │   │   │       ├── doublyLinkedList.ts
│   │   │   │       └── circularLinkedList.ts
│   │   │   │
│   │   │   ├── graph/
│   │   │   │   ├── GraphPage.tsx
│   │   │   │   ├── GraphRenderer.tsx
│   │   │   │   └── algorithms/
│   │   │   │       ├── bfs.ts
│   │   │   │       ├── dfs.ts
│   │   │   │       ├── dijkstra.ts
│   │   │   │       ├── bellmanFord.ts
│   │   │   │       ├── floydWarshall.ts
│   │   │   │       ├── prim.ts
│   │   │   │       └── kruskal.ts
│   │   │   │
│   │   │   ├── bst/
│   │   │   │   ├── BSTPage.tsx
│   │   │   │   ├── BSTRenderer.tsx
│   │   │   │   └── algorithms/
│   │   │   │       ├── insert.ts
│   │   │   │       ├── search.ts
│   │   │   │       ├── delete.ts
│   │   │   │       ├── inorder.ts
│   │   │   │       ├── preorder.ts
│   │   │   │       └── postorder.ts
│   │   │   │
│   │   │   └── binarySearch/
│   │   │       ├── BinarySearchPage.tsx
│   │   │       ├── BinarySearchRenderer.tsx
│   │   │       └── algorithms/
│   │   │           ├── binarySearch.ts
│   │   │           ├── lowerBound.ts
│   │   │           ├── upperBound.ts
│   │   │           └── searchRotatedArray.ts
│   │   │
│   │   ├── engine/                        # Shared visualization engine
│   │   │   ├── types/
│   │   │   │   ├── Step.ts
│   │   │   │   ├── AlgorithmState.ts
│   │   │   │   └── ExecutionResult.ts
│   │   │   ├── player/
│   │   │   │   └── StepPlayer.ts
│   │   │   └── contracts/
│   │   │       └── Algorithm.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── SignUp.tsx
│   │   │   ├── SignIn.tsx
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── hooks/
│   │   │   └── useStepPlayer.ts
│   │   │
│   │   ├── api/
│   │   │   └── apiClient.ts
│   │   │
│   │   ├── types/
│   │   │   └── api.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── .env.example
│
│
├── backend/                               # Python + FastAPI
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── algorithms.py
│   │   │       ├── sessions.py
│   │   │       ├── progress.py
│   │   │       ├── planner.py
│   │   │       └── health.py
│   │   │
│   │   ├── application/
│   │   │   ├── services/
│   │   │   │   ├── session_service.py
│   │   │   │   ├── progress_service.py
│   │   │   │   └── planner_service.py
│   │   │   └── dto/
│   │   │
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── interfaces/
│   │   │   └── exceptions/
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   ├── database.py
│   │   │   │   ├── models.py
│   │   │   │   └── repositories/
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── planner.py
│   │   │   │   ├── openrouter.py
│   │   │   │   ├── gemini.py
│   │   │   │   └── ollama.py
│   │   │   │
│   │   │   └── external/
│   │   │
│   │   └── core/
│   │       ├── config.py
│   │       ├── security.py
│   │       └── logging.py
│   │
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   │
│   ├── requirements.txt
│   └── .env.example
│
│
├── database/
│   ├── schema.sql
│   └── migrations/
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
│
├── .gitignore
├── .env.example
└── README.md
```
