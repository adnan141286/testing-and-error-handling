# Testing Guide

This document explains how to run the different test suites for the **Whalepath** project.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Backend Tests](#backend-tests)
- [Frontend Unit Tests](#frontend-unit-tests)
- [Frontend UI Tests (Playwright)](#frontend-ui-tests-playwright)
- [End‑to‑End Tests](#end-to-end-tests)
- [Coverage](#coverage)
- [Running with Docker Compose](#running-with-docker-compose)

## Prerequisites
- **Node.js** v20 (or the version specified in `.nvmrc` if present).
- **npm** (comes with Node).
- **Docker Desktop** (for integration tests that depend on Postgres & Redis).
- **Playwright browsers** – installed via `npm run playwright:install` (the CI does this automatically).

## Backend Tests
```bash
cd backend
npm ci               # install dependencies
npm run lint          # ESLint
npm run typecheck     # TypeScript type‑check
npm run test          # unit + integration tests (Jest)
npm run test:coverage # Jest with coverage report
```
The coverage report is generated under `backend/coverage`. All statements/branches/lines must be ≥ 85 %.

## Frontend Unit Tests
```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test             # Jest + React Testing Library
```

## Frontend UI Tests (Playwright)
```bash
cd frontend
npm run test:ui      # runs the Playwright specs
```
The tests run across four viewports defined in `playwright.config.ts`.

## End‑to‑End Tests
The backend **e2e** pipeline test lives in `backend/tests/e2e/pipeline.test.ts` and can be executed with:
```bash
cd backend
npm run test:e2e
```
It covers the full data flow, including error handling scenarios.

## Coverage
The unified coverage command for the backend is:
```bash
npm run test:coverage
```
It prints a table like:
```
--------------------------|---------|----------|---------|---------
File                      | % Stmts | % Branch | % Funcs | % Lines
--------------------------|---------|----------|---------|---------
All files                 |   97.3 |    96.1 |   98.5 |   97.3
--------------------------|---------|----------|---------|---------
```
If any metric falls below **85 %**, add more tests until the threshold is met.

## Running with Docker Compose
The project can be started locally with Docker:
```bash
docker compose up --build
```
After the containers are healthy, verify the backend health endpoint:
```bash
curl http://localhost:3000/health
```
You should receive a JSON payload like `{ "status": "ok" }`.

For CI you can run the same command inside the workflow before executing the test steps.

---
*This guide is version‑controlled in `docs/TESTING.md`. Keep it updated when test scripts change.*

