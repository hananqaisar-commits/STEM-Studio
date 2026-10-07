<div align="center">

# STEM Studio

### See the logic. Try the steps. Learn by doing.

An interactive computer science learning studio for exploring data structures, algorithms, and Linux concepts through visual explanations, code, and practice.

[Open STEM Studio](https://stem-studio-one.vercel.app/) · [Explore the features](#what-you-can-learn) · [Run it locally](#run-locally) · [API docs](#api-reference)

[![Frontend CI](https://img.shields.io/github/actions/workflow/status/hananqaisar-commits/STEM-Studio/frontend-ci.yml?branch=main&label=Frontend%20CI&logo=react)](https://github.com/hananqaisar-commits/STEM-Studio/actions/workflows/frontend-ci.yml)
[![Backend CI](https://img.shields.io/github/actions/workflow/status/hananqaisar-commits/STEM-Studio/backend-ci.yml?branch=main&label=Backend%20CI&logo=fastapi)](https://github.com/hananqaisar-commits/STEM-Studio/actions/workflows/backend-ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-6b5ce7.svg)](LICENSE)

</div>

---

## Learn by watching an idea work

Algorithms can be difficult to follow when they are presented as code alone. STEM Studio makes each operation visible: move through an execution step by step, see the data change, compare the logic with code, and check your understanding with a quiz.

The studio brings together **15 data structures and algorithms categories**, a Linux learning area, and **Octa**, a lesson-aware AI tutor that can use the current topic and visualizer state to shape its help.

## What you can learn

### Data structures and algorithms

Explore interactive lessons across:

- Sorting, arrays, strings, linked lists, stacks, and queues
- Binary search, hash maps, trees, heaps, and tries
- Graph traversal and shortest-path algorithms
- Recursion, greedy methods, backtracking, and dynamic programming
- Time and space complexity

Linked list lessons include **singly, doubly, circular, and doubly circular** structures.

### Linux fundamentals

- Browse grouped Linux command lessons with examples and explanations.
- Explore a virtual file system, directory tree, and simulated terminal.
- Try supported commands in the learning environment and observe the simulated file system change.

Commands run in the in-app simulator; they do not run on your computer's shell.

### Practice and personalized help

- Step through visualizations with play, pause, speed, and step controls.
- Compare examples in Python, C++, Java, Go, and pseudocode.
- Change supported inputs and observe how the algorithm responds.
- Practice with concept checks, guided questions, and challenge quizzes.
- Ask Octa about the active lesson or visualizer. When a language model is connected, Octa can propose supported in-app actions for your approval. Without a model connection, the tutor can use the app's built-in lesson guidance for supported topics.
- Sign in to use the learning workspace and save supported progress and sessions.

## How a lesson works

1. Choose a topic, such as bubble sort, linked lists, or Linux paths.
2. Run the example and follow each comparison, pointer change, or command.
3. Read the explanation beside the visualization and inspect the related code.
4. Predict the next result, then use a quiz to check your understanding.
5. Ask Octa a follow-up question or request an in-app action. Octa asks before applying supported controls.

## Run locally

### Requirements

- Node.js and npm
- Python 3.11 or newer
- Git

### 1. Start the API and database

The backend uses SQLite for a simple local setup. From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` for local development. Set the database URL and frontend origin:

```env
DATABASE_URL=sqlite:///./stem_studio.db
JWT_SECRET_KEY=replace-with-a-long-random-local-secret
CORS_ORIGINS=["http://localhost:5173"]
FRONTEND_URL=http://localhost:5173
```

Start the API from the `backend` directory:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is at `http://localhost:8000`; interactive API documentation is at [`http://localhost:8000/docs`](http://localhost:8000/docs).

### 2. Start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env
```

Set `VITE_API_BASE_URL=http://localhost:8000` in `frontend/.env`, then run:

```bash
npm run dev
```

Open [`http://localhost:5173`](http://localhost:5173). Google sign-in requires a Google OAuth client ID in `VITE_GOOGLE_CLIENT_ID`. Email delivery for password reset requires SMTP settings. Octa's model-generated answers require either a server-side DashScope key or a provider configured in the tutor settings; built-in offline guidance remains available for supported lessons.

### Production build

```bash
cd frontend
npm run build
```

The frontend build is written to `frontend/dist`.

## Technology

- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** SQLite for local development; PostgreSQL/Supabase and MySQL connection support
- **Tutor:** Octa can connect to DashScope, OpenAI-compatible providers, Anthropic, or a custom provider
- **Optional custom-code runner:** Judge0 configuration

## Search visibility and content strategy

STEM Studio includes descriptive page titles and descriptions, canonical links, social sharing metadata, structured data, a sitemap, and a `robots.txt` file. These help search engines understand the site; they do not guarantee rankings.

The strongest long-term search strategy is to publish genuinely useful lessons that answer a learner's question and let them verify the answer in the visualizer. For each public lesson, aim to:

1. Explain one clear concept with an original, accurate example and a working interactive demonstration.
2. Use a descriptive page title, one clear heading, accessible labels, and useful links to related lessons.
3. Make the canonical page available to visitors and crawlers, and list only preferred, publicly accessible URLs in the sitemap.
4. Keep lesson text and metadata consistent with what visitors see. Use structured data only for information that is visible and accurate.
5. Check indexing, search queries, and page experience in Google Search Console; inspect rendered pages when a route relies on JavaScript.

For this React single-page app, a useful next step for broader lesson discovery is to make selected lesson explanations available on public, crawlable routes and evaluate prerendering or server rendering for those pages. Keep account-only workspace features behind sign-in. Avoid hidden keyword text, doorway pages, fabricated ratings, and crawler-specific content; these mislead learners and can violate search policies.

Further reading: [Google Search Essentials](https://developers.google.com/search/docs/essentials), [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript), and [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

## API reference

When the backend is running, browse all available routes at [`/docs`](http://localhost:8000/docs). Key route groups include:

- `/api/auth` — account registration, login, Google sign-in, and session management
- `/api/progress` — quiz results, module progress, and saved sessions
- `/api/execute` — optional custom-code execution integration
- `/api/octa-tutor` — tutor responses and model connection checks
- `/api/health` and `/api/db-check` — service and database health

## Project layout

```text
backend/                 FastAPI app, database models, and API routes
frontend/src/components  Shared interface, layout, tutor, and learning controls
frontend/src/data        Lesson content, category definitions, and metadata
frontend/src/features    DSA visualizers, quizzes, and Linux learning modules
frontend/public          Site icons, robots.txt, sitemap, and static assets
```

## Contributing

Issues and pull requests are welcome. For a focused change, describe the learner problem it addresses, the affected lesson or flow, and how you verified the result. Please do not commit local `.env` files or API keys.

## Team

### Core Engineering Team

| Contributor | Role & Focus | GitHub Profile |
| :--- | :--- | :--- |
| **Hanan Qaisar** | Lead System Architect, Frontend Core, UI Engine & Auth | [@hananqaisar-commits](https://github.com/hananqaisar-commits) |
| **M. Aftab** | Visualizer Engine Specialist, Graph & Search Algorithms | [@Aftab-commits](https://github.com/Aftab-commits) |
| **Hassan Mustafa** | Backend Systems & Database Architecture Developer | [@Hassan-Mustafa](https://github.com/Hassan-Mustafa) |

## License

STEM Studio is distributed under the [MIT License](LICENSE).
