# Whalepath

> **Whalepath** – paper‑trading analytics platform (backend + frontend) focused on testing and error handling.

## Table of Contents
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [CI / CD](#ci--cd)
- [Architecture Overview](#architecture-overview)

## Quick Start
```bash
# Clone the repo and cd into the project root
git clone <repo-url> .

# Install dependencies (backend & frontend)
npm ci               # installs root dev tools (if any)
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..

# Build and run with Docker
docker compose up --build -d

# Verify health endpoint
curl http://localhost:3000/health
# => { "status": "ok" }
```
The backend listens on port **3000**. The frontend dev server runs on **5173** (see `frontend/package.json`).

## Project Structure
```
├─ backend/                # Express API, services, cache, etc.
│   ├─ src/                # TypeScript source
│   ├─ tests/              # Jest tests (unit, integration, e2e)
│   ├─ Dockerfile          # Multi‑stage build for production
│   └─ tsconfig.json
├─ frontend/               # React app with Vite
│   ├─ src/                # React components & hooks
│   ├─ tests/              # Jest + React Testing Library & Playwright
│   └─ playwright.config.ts
├─ docker-compose.yml      # Backend, Postgres, Redis services
├─ .github/workflows/ci.yml# GitHub Actions CI pipeline
├─ .husky/pre-commit       # Lint‑staged hook
├─ docs/
│   ├─ PROJECT_RULES.md   # Governance & coding standards
│   └─ TESTING.md         # How to run each test suite
└─ README.md               # You are reading it!
```

## Environment Variables
Create a `.env` file in `backend/` (or set the vars in your shell). The backend reads them via `src/config/env.ts`.
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for Express | `3000` |
| `REDIS_HOST` | Redis host (service name) | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `POSTGRES_HOST` | Postgres host | `postgres` |
| `POSTGRES_PORT` | Postgres port | `5432` |
| `POSTGRES_USER` | DB user | `postgres` |
| `POSTGRES_PASSWORD` | DB password | `postgres` |
| `POSTGRES_DB` | Database name | `whalepath` |
| `NODE_ENV` | `production` or `development` | `development` |

Additional provider‑specific keys (e.g., API tokens) are documented in `docs/PROJECT_RULES.md`.

## Running the Application
### Development
```bash
# Backend (watch mode)
cd backend && npm run dev

# Frontend (Vite dev server)
cd frontend && npm run dev
```
### Production (Docker)
```bash
docker compose up --build -d   # builds backend image and starts all services
```
The health endpoint is exposed at `http://localhost:3000/health`.

## Testing
All test commands are defined in the respective `package.json`s.
- **Backend**: `npm run lint`, `npm run typecheck`, `npm run test:coverage`
- **Frontend unit**: `npm test`
- **Frontend UI**: `npm run test:ui`
- **Full flow**: see `docs/TESTING.md` for details.

## CI / CD
The CI workflow (`.github/workflows/ci.yml`) runs on every push/PR and performs:
1. Lint & type‑check (backend & frontend)
2. Jest tests with coverage
3. Playwright UI tests
4. Builds the backend Docker image

If any step fails, the workflow aborts and the PR cannot be merged.

## Architecture Overview
- **Express API** (`backend/src/app.ts`) exposes REST endpoints and a health check.
- **Cache layer** implements a hierarchical cache (memory + Redis) with TTLs, de‑duplication and stale‑while‑revalidate logic.
- **Providers** fetch market data, feed the sanitizers, and store raw payloads.
- **Sanitizers** validate and normalise data using Zod schemas.
- **Volatility** module analyses price data and emits events for the kill‑switch.
- **Frontend** visualises the pipeline results and includes responsive & accessibility tests.

---
*Keep this README up‑to‑date as the project evolves.*

