# Whalepath - Project Rules & Guidelines

## 1. Overview
- **Project Name:** Whalepath
- **Description:** Blockchain wallet analytics platform (paper trading only).
- **Current Module:** Testing and Error Handling Module.

---

## 2. Technology Stack

### Backend
- **Runtime:** Node 20
- **Framework:** Express
- **Language:** TypeScript (strict mode enabled)
- **Caching & State:** `ioredis` (with in-memory fallback for testing and offline resilience)
- **Database:** `pg` (PostgreSQL client)
- **WebSockets:** `ws`
- **Validation & Schemas:** `zod`
- **Logging:** `pino`
- **Testing Framework:** Jest + `ts-jest`
- **Integration & Mocking:** Supertest, `nock`
- **Property-based Testing:** `fast-check`

### Frontend
- **Framework:** Next.js
- **Unit & Component Testing:** React Testing Library
- **End-to-End & Acceptance Testing:** Playwright
- **Accessibility Testing:** `@axe-core/playwright`

---

## 3. Core Development Rules

1. **Zero `any`:**
   - Never use `any`.
   - Prefer `unknown`, generics, or strict union/discriminated types.
   - Use strict type guards or `zod` validation when handling untyped external inputs.

2. **Zero ESLint Errors:**
   - All code must pass ESLint with zero errors and zero warnings.
   - Run `npm run lint` before committing or finalizing any task.

3. **Prettier Formatting:**
   - Single quotes (`'`)
   - 2 spaces indentation
   - Semicolons required (`true`)
   - Print width: 100 columns (`printWidth: 100`)

4. **File Length Limit:**
   - All files must be kept under 200 lines of code.
   - If a file approaches or exceeds 200 lines, decompose it into modular subcomponents or utility functions.

5. **Documentation (JSDoc):**
   - JSDoc annotations are required on all public functions, methods, classes, and exported interfaces.
   - Document parameter descriptions, return values, and thrown error conditions.

6. **Named Exports Only:**
   - Use explicit named exports across all files.
   - Do NOT use default exports (`export default`).

7. **Dependency Injection (DI):**
   - Construct classes and factory functions using dependency injection.
   - Pass dependencies (services, database pools, cache clients, loggers) into constructors or factories to facilitate isolated unit testing and mock substitution.

8. **Configuration & Secrets Management:**
   - No hardcoded secrets, API keys, credentials, ports, or URLs anywhere in code.
   - All configuration values must be loaded and validated via `env.ts` using `zod`.

9. **No Incomplete Tests or Technical Debt:**
   - No `TODO` comments or stubbed implementations in committed code.
   - No skipped tests (`test.skip`, `it.skip`, `describe.skip`, `fit`, `fdescribe`, `xit`).
   - All tests must be active, deterministic, and pass consistently.

---

## 4. Directory & Folder Layout

```text
├── docs/
│   └── PROJECT_RULES.md
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── cache/
│   │   │   ├── providers/
│   │   │   └── resilience/
│   │   ├── sanitizers/
│   │   ├── volatility/
│   │   ├── routes/
│   │   └── utils/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       ├── e2e/
│       └── fixtures/
└── frontend/
    └── tests/
        ├── components/
        └── e2e/
```

---

## 5. Testing & Quality Requirements
- **Coverage Threshold:** Minimum 85% coverage across all metrics (branches, functions, lines, statements).
- **TypeScript Compilation:** `npm run typecheck` (`tsc --noEmit`) must succeed with zero errors.
- **Continuous Compliance:** Every subsequent task must adhere strictly to these rules.

