<div align="center">

# STEM Studio

### High-Performance Interactive Algorithm & Data Structures Visualization Platform

[![Frontend CI](https://img.shields.io/github/actions/workflow/status/hananqaisar-commits/STEM-Studio/frontend-ci.yml?branch=main&label=Frontend%20CI&style=for-the-badge&logo=react)](https://github.com/hananqaisar-commits/STEM-Studio/actions/workflows/frontend-ci.yml)
[![Backend CI](https://img.shields.io/github/actions/workflow/status/hananqaisar-commits/STEM-Studio/backend-ci.yml?branch=main&label=Backend%20CI&style=for-the-badge&logo=fastapi)](https://github.com/hananqaisar-commits/STEM-Studio/actions/workflows/backend-ci.yml)
[![Python Version](https://img.shields.io/badge/Python-3.11%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![React Version](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>STEM Studio</b> is an enterprise-grade platform designed for step-by-step visualization, interactive debugging, and multi-language execution tracking of data structures and algorithms.
</p>

[Key Features](#key-features) • [System Architecture](#system-architecture) • [Getting Started](#getting-started) • [API Documentation](#api-documentation) • [Contributors](#contributors)

---

</div>

## Overview

STEM Studio bridges abstract theoretical computer science concepts and practical implementation through real-time state machine visualization, active line tracking, multi-language code snippets, and prediction quizzes. Engineered with a decoupled client-server model, it delivers instantaneous visual feedback while providing persistent user session management and analytics.

---

## Key Features

### 1. Algorithm Visualizer Engines
* **Sorting Algorithms**: Bubble Sort, Quick Sort, Merge Sort, Insertion Sort, Selection Sort with real-time pointer indicators and comparison counts.
* **Graph Traversal & Shortest Path**: Breadth-First Search (BFS), Depth-First Search (DFS), Dijkstra's Shortest Path, Prim's Minimum Spanning Tree (MST), and Kahn's Topological Sort.
* **Binary Search Variants**: Standard Binary Search, Lower/Upper Bounds, Rotated Array Search, and Peak Finding algorithms.
* **Tree Data Structures**: Binary Search Trees (BST) & Self-Balancing AVL Trees with step-by-step node rotation visualization.
* **Linked List Suite**: Singly, Doubly, Circular Linked Lists, and Floyd's Cycle Detection (Tortoise and Hare).
* **Linear Data Structures**: Dynamic Stacks, Queues, Circular Queues, and Priority Queues.

### 2. Interactive Execution & Code Debugger
* **Multi-Language Snippets**: Parallel code implementations in Python, C++, Java, JavaScript, Go, and Pseudocode.
* **Active Line Tracking**: Synchronized highlighting of pseudocode and algorithm execution steps.
* **Prediction Quizzes**: In-line decision checkpoint quizzes embedded into step execution to test comprehension.
* **Playback Controls**: Variable speed execution, step forward/backward, pause, and auto-play state machine controls.

### 3. Enterprise Authentication & Security
* **JSON Web Token (JWT)**: Secure user login, session validation, and refresh mechanics.
* **Database Compatibility**: Built-in support for MySQL 8+ (PyMySQL) and SQLite, with SSL parameter stripping and connection pooling.
* **CORS & Environment Control**: Production-hardened origin policies and environment validation endpoints (`/api/health`, `/api/db-check`).

---

## System Architecture

```
                                +-----------------------------------+
                                |            User Client            |
                                |     (React 19 + TypeScript)       |
                                +-----------------+-----------------+
                                                  |
                                            HTTPS | REST API
                                                  v
                                +-----------------+-----------------+
                                |          FastAPI Backend          |
                                |   (Routing, Auth, User Progress)  |
                                +-----------------+-----------------+
                                                  |
                                       SQLAlchemy | PyMySQL
                                                  v
                                +-----------------+-----------------+
                                |         MySQL / SQLite DB         |
                                |    (Users, Progress, Auth State)  |
                                +-----------------------------------+
```

---

## Repository Structure

```
STEM-Studio/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py          # Authentication endpoints
│   │   │   │   └── progress.py      # User progress tracking endpoints
│   │   │   └── schemas.py           # Pydantic data validation schemas
│   │   ├── core/
│   │   │   ├── config.py            # Environment configuration settings
│   │   │   └── security.py          # Password hashing & JWT generation
│   │   └── main.py                  # FastAPI application entry point
│   ├── infrastructure/
│   │   └── database/
│   │       ├── database.py          # SQLAlchemy engine & session factory
│   │       └── models.py            # Database tables schema definition
│   ├── tests/                       # Pytest automated integration test suite
│   └── requirements.txt             # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI controls, layout & navigation
│   │   ├── contexts/                # AuthContext & ThemeContext state
│   │   ├── features/                # Algorithm visualizers & code engines
│   │   ├── App.tsx                  # Client router & protected layout
│   │   └── main.tsx                 # React DOM entry point
│   ├── package.json                 # Frontend dependencies and scripts
│   └── tsconfig.json                # TypeScript project configuration
├── .github/
│   └── workflows/                   # GitHub Actions CI/CD pipelines
└── README.md                        # Documentation
```

---

## Getting Started

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **Python**: `v3.11` or higher
* **Git**: `v2.x`

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # On Linux/macOS
   python3 -m venv venv
   source venv/bin/venv

   # On Windows
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   APP_NAME="STEM Studio API"
   ENVIRONMENT="development"
   SECRET_KEY="your-super-secret-key-change-in-production"
   DATABASE_URL="sqlite:///./stem_studio.db"
   CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
   ```

5. **Launch Backend API Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The API server will run at `http://localhost:8000`. API Documentation is available at `http://localhost:8000/docs`.

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node modules**:
   ```bash
   npm ci
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_BASE_URL="http://localhost:8000"
   ```

4. **Launch Development Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## API Documentation

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | Public |
| `GET` | `/api/db-check` | Database connectivity diagnostics | Public |
| `POST` | `/api/auth/signup` | Register a new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user and issue JWT token | Public |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile | Authenticated |
| `GET` | `/api/progress` | Fetch user algorithm completion metrics | Authenticated |
| `POST` | `/api/progress/topic` | Record user progress for an algorithm | Authenticated |

---

## Testing & Quality Assurance

### Run Frontend Build & Type Checks
```bash
cd frontend
npm run build
npm run lint
```

### Run Backend Integration Tests
```bash
cd backend
PYTHONPATH=. pytest
```

---

## Contributors

We extend our sincere gratitude to everyone contributing to **STEM Studio**.

### Dynamic Contributors Grid
The grid below automatically updates whenever a new contributor merges a pull request into the repository:

<br/>

<div align="center">
  <a href="https://github.com/hananqaisar-commits/STEM-Studio/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=hananqaisar-commits/STEM-Studio" alt="STEM Studio Contributors Grid" />
  </a>
</div>

<br/>

### Core Engineering Team

<div align="center">

| Contributor | Role & Focus | GitHub Profile |
| :--- | :--- | :--- |
| **Hanan Qaisar** | Lead System Architect, Frontend Core, UI Engine & Auth | [@hananqaisar-commits](https://github.com/hananqaisar-commits) |
| **M. Aftab** | Visualizer Engine Specialist, Graph & Search Algorithms | [@Aftab-commits](https://github.com/Aftab-commits) |
| **Hassan Mustafa** | Backend Systems & Database Architecture Developer | [@Hassan-Mustafa](https://github.com/Hassan-Mustafa) |

</div>

<br/>

<div align="center">
  <sub>Built with precision for computer science education. Distributed under the MIT License.</sub>
</div>
