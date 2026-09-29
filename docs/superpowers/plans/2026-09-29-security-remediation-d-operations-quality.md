# Security Remediation D - Operations and Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make authentication fail closed globally, preserve alert snapshots under failure/concurrency, harden PostgreSQL functions/indexes, restore strict TypeScript, and close all project gates.

**Architecture:** Register `JwtAuthGuard` as an application guard with explicit `@Public()` health/auth routes, compute alert snapshots inside one advisory-locked transaction, and apply forward-only database hardening migrations. Finish by removing dynamic Prisma typing and running the complete API/web/database/browser verification matrix.

**Tech Stack:** NestJS APP_GUARD, Prisma/PostgreSQL transactions and advisory locks, TypeScript strict mode, Jest/Supertest, Vitest, Cypress, Docker Compose test database.

**Spec:** `docs/superpowers/specs/2026-09-29-security-remediation-design.md`

## Global Constraints

- Authentication defaults to required; only deliberate routes carry `@Public()`.
- Role and Client ownership guards remain as defense in depth after the global guard.
- Alert snapshot replacement is atomic and serialized across application instances.
- Errors/logs include operational counts/IDs only, never Client names or clinical values.
- Historical migrations are immutable; function hardening uses a new forward-only migration.
- No duplicate/unused index is added merely to silence an advisor.
- `strict: true`/`noImplicitAny: true` are restored without `any`, blanket casts, or suppressions.
- Production migration/deployment remains outside this branch.

## Review Focus

- A newly added controller without guards must still return 401 by default; Task 1 proves this.
- If alert calculation fails after reading data, the prior snapshot must remain byte-for-byte intact; Task 2 proves this.
- Two cron instances must not interleave delete/create operations; Task 2 proves advisory-lock serialization.
- Function `search_path` must be fixed without converting functions to `SECURITY DEFINER` or editing history; Task 3 proves this.
- Strict-mode fixes must preserve public DTO validation and Prisma-generated types rather than hiding errors with casts; Task 5 reviews this.

---

### Task 1: Register global authentication with explicit public routes

**Files:**
- Modify: `api/src/app.module.ts`
- Modify: `api/app.controller.ts`
- Modify: `api/src/modules/auth/auth.controller.ts`
- Create: `api/src/common/guards/jwt-auth.guard.spec.ts`
- Create: `api/src/app.module.spec.ts`
- Create: `api/test/global-auth.e2e-spec.ts`

**Interfaces:**
- Adds `JwtAuthGuard` as `APP_GUARD` alongside `ThrottlerGuard`.
- Marks only `/`, `/ping`, `/auth/login`, `/auth/register`, `/auth/csrf`, `/auth/refresh`, and `/auth/logout` public according to their independent credential/CSRF contracts.

- [ ] **Step 1: Write failing global-guard tests**

Add a fixture controller with no local `@UseGuards` and assert 401. Assert `@Public()` bypasses JWT only, throttling still applies, and existing role/client guards continue to run after authentication.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand common/guards/jwt-auth.guard.spec.ts app.module.spec.ts`

Run: `npm.cmd run test:e2e -- --runInBand global-auth.e2e-spec.ts`

Expected: FAIL because JWT is not an APP_GUARD.

- [ ] **Step 3: Register the guard and annotate public endpoints**

Do not remove service ownership checks or role guards. Replace the remaining raw `AuthGuard('jwt')` use with the project guard where appropriate.

- [ ] **Step 4: Run global auth and full API unit tests**

Run: `npm.cmd test -- --runInBand`

Run: `npm.cmd run test:e2e -- --runInBand global-auth.e2e-spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit fail-closed authentication**

```bash
git add api/src/app.module.ts api/app.controller.ts api/src/modules/auth/auth.controller.ts api/src/common/guards/jwt-auth.guard.spec.ts api/src/app.module.spec.ts api/test/global-auth.e2e-spec.ts
git commit -m "fix: require authentication globally"
```

### Task 2: Make alert snapshot generation atomic and single-writer

**Files:**
- Create: `api/src/modules/alerts/alerts.cron.service.spec.ts`
- Modify: `api/src/modules/alerts/alerts.cron.service.ts`
- Modify: `api/src/modules/alerts/alerts.controller.ts`
- Modify: `api/src/modules/alerts/alerts.module.ts`
- Create: `api/test/alerts-cron.e2e-spec.ts`

**Interfaces:**
- Produces `generateDailyAlerts(now = new Date()): Promise<{ generated: number; skipped: boolean }>`.
- Uses one constant 64-bit advisory lock key with `pg_advisory_xact_lock` inside the snapshot transaction.
- Reads Client-owned `DailyTracking` scoped by `professionalId/clientId` and writes `PatientAlert.clientId` from Delivery A; new snapshots leave legacy `patientId` null.

- [ ] **Step 1: Write failing unit/E2E concurrency tests**

Assert calculation failure never calls delete, create failure rolls back delete, two concurrent calls serialize, and logs contain only generated/skipped counts. Seed a prior snapshot and compare it after forced failure.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/alerts/alerts.cron.service.spec.ts`

Run: `npm.cmd run test:e2e -- --runInBand alerts-cron.e2e-spec.ts`

Expected: FAIL because current code deletes first and has no lock/transaction.

- [ ] **Step 3: Implement calculate-then-replace transaction**

Resolve all required tracking/client data before deletion, acquire the transaction-scoped advisory lock, recompute/verify the complete Client-owned snapshot, then `deleteMany/createMany` within the same transaction. Update the dashboard query to include the owned `client`, never legacy `patient`. If the lock strategy intentionally blocks, test blocking; if switched to `pg_try_advisory_xact_lock`, return `skipped: true` explicitly.

- [ ] **Step 4: Run alert tests and API build**

Run: `npm.cmd test -- --runInBand modules/alerts`

Run: `npm.cmd run test:e2e -- --runInBand alerts-cron.e2e-spec.ts`

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 5: Commit cron hardening**

```bash
git add api/src/modules/alerts api/test/alerts-cron.e2e-spec.ts
git commit -m "fix: replace alert snapshots atomically"
```

### Task 3: Fix mutable PostgreSQL function search paths forward-only

**Files:**
- Create: `api/prisma/migrations/20260929130000_harden_recipe_function_search_paths/migration.sql`
- Modify: `api/test/database-security.e2e-spec.ts`
- Modify: `api/src/infra/database/rls-hardening.spec.ts`

**Interfaces:**
- Alters exactly `public.prevent_recipe_version_mutation()`, `public.publish_recipe_version_snapshot()`, and `public.protect_published_recipe_ingredients()` to `SET search_path = pg_catalog, public`.
- Does not change owner, volatility, language, arguments, return type, or security mode.

- [ ] **Step 1: Add failing database assertions**

Query `pg_proc.proconfig` and `prosecdef`; assert each function has the exact search path and remains `SECURITY INVOKER` (`prosecdef = false`). Assert the historical recipe migration file hash/content is unchanged by implementation.

- [ ] **Step 2: Run database security tests to verify failure**

Run: `npm.cmd run test:e2e -- --runInBand database-security.e2e-spec.ts`

Expected: FAIL because the functions have no fixed search path.

- [ ] **Step 3: Add the forward-only ALTER FUNCTION migration**

Use the exact no-argument signatures and no `CREATE OR REPLACE FUNCTION`. Do not edit `20260921193053_add_versioned_recipe_bank/migration.sql`.

- [ ] **Step 4: Deploy only to isolated PostgreSQL and rerun tests**

Run: `npx.cmd prisma migrate deploy`

Run: `npm.cmd run test:e2e -- --runInBand database-security.e2e-spec.ts`

Expected: PASS in the port-5434 test database.

- [ ] **Step 5: Commit function hardening**

```bash
git add api/prisma/migrations/20260929130000_harden_recipe_function_search_paths/migration.sql api/test/database-security.e2e-spec.ts api/src/infra/database/rls-hardening.spec.ts
git commit -m "fix: pin recipe function search paths"
```

### Task 4: Add only query-backed missing foreign-key indexes

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/20260929133000_index_client_owned_foreign_keys/migration.sql`
- Create: `api/test/client-owned-indexes.e2e-spec.ts`
- Modify: `api/src/infra/database/rls-hardening.spec.ts`

**Interfaces:**
- Produces composite indexes matching actual predicates/order: creator+Client+active for plans, creator+Client+date for records, professional+Client+completedAt for tracking, and professional+time/status for goals/orders where used.

- [ ] **Step 1: Write failing index coverage tests**

Enumerate foreign keys on application tables and map each hot query in services to an expected leading index. Assert no duplicate index has the same ordered column list and no new single-column index is redundant with a composite prefix.

- [ ] **Step 2: Run the isolated database test to verify failure**

Run: `npm.cmd run test:e2e -- --runInBand client-owned-indexes.e2e-spec.ts`

Expected: FAIL with the currently uncovered FK/query predicates.

- [ ] **Step 3: Add Prisma index declarations and SQL**

Create only indexes justified by service queries or FK maintenance. Keep migration names/definitions synchronized with Prisma; do not blindly reproduce all advisor suggestions.

- [ ] **Step 4: Validate migration and query plans**

Run: `npx.cmd prisma validate`

Run: `npx.cmd prisma migrate deploy`

Run: `npm.cmd run test:e2e -- --runInBand client-owned-indexes.e2e-spec.ts`

Expected: PASS; representative `EXPLAIN` plans can use the intended indexes as row counts grow.

- [ ] **Step 5: Commit indexes**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/20260929133000_index_client_owned_foreign_keys/migration.sql api/test/client-owned-indexes.e2e-spec.ts api/src/infra/database/rls-hardening.spec.ts
git commit -m "perf: index client owned clinical queries"
```

### Task 5: Restore strict API type safety without suppressions

**Files:**
- Modify: `api/tsconfig.json`
- Modify: `api/src/infra/database/prisma.service.ts`
- Modify: `api/src/common/types/auth-user.ts`
- Modify: `api/src/modules/foods/foods.service.ts`
- Modify: `api/src/modules/users/users.service.ts`
- Modify: any additional controller/service reported by `tsc` after the earlier deliveries
- Create: `api/src/strict-type-contracts.spec.ts`

**Interfaces:**
- Sets `strict: true`, `noImplicitAny: true`, `strictBindCallApply: true`, and `noFallthroughCasesInSwitch: true`.
- Removes `[x: string]: any` from `PrismaService`.
- Uses `AuthenticatedRequest = Request & { user: AuthUser }` or a typed decorator consistently.

- [ ] **Step 1: Add the failing strict configuration contract**

Parse `tsconfig.json` and assert required flags; statically assert `PrismaService` has no index signature and clinical DTO/service files contain no explicit `any`.

- [ ] **Step 2: Enable strict mode and capture compiler failures**

Run: `npx.cmd tsc --noEmit --incremental false`

Expected: FAIL with the concrete files that require typing.

- [ ] **Step 3: Fix compiler errors at their sources**

Add DTOs/types, narrow `unknown`, type Prisma transaction clients and request users, and correct nullability. Do not add `@ts-ignore`, `as any`, blanket ESLint disable comments, or restore the Prisma index signature.

- [ ] **Step 4: Run strict typecheck, lint, tests, and build**

Run: `npx.cmd tsc --noEmit --incremental false`

Run: `npm.cmd run lint -- --no-fix`

Run: `npm.cmd test -- --runInBand`

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 5: Commit type hardening**

```bash
git add api/tsconfig.json api/src/infra/database/prisma.service.ts api/src/common/types/auth-user.ts api/src/modules/foods/foods.service.ts api/src/modules/users/users.service.ts api/src/strict-type-contracts.spec.ts
# Add any additional compiler-fixed file explicitly after reviewing `git diff --name-only`; never stage the whole source tree blindly.
git commit -m "refactor: restore strict api typing"
```

### Task 6: Run the complete isolated security gate and update documentation

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `docs/TASKS.md`
- Modify: `docs/agents/CODEX_STATUS.md`
- Create: `docs/runbooks/security-remediation-verification.md`

**Interfaces:**
- Produces a reproducible local verification runbook and final mapping from findings 1-15 to tests/commits.

- [ ] **Step 1: Run database/schema gates**

Run against isolated PostgreSQL only:

```bash
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
npx.cmd prisma generate
npm.cmd run test:e2e -- --runInBand
```

Expected: migrations applied once, status current, all API E2E tests PASS.

- [ ] **Step 2: Run complete API gates**

Run:

```bash
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint -- --no-fix
npm.cmd test -- --runInBand
npm.cmd run build
npm.cmd audit --omit=dev
```

Expected: PASS and no high/critical runtime advisory.

- [ ] **Step 3: Run complete frontend gates**

Run:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd audit --omit=dev
```

Expected: PASS.

- [ ] **Step 4: Run the focused and full browser suites**

Run the new ownership, persistence/XSS, and session specs first, then the existing configured Cypress suite. Verify desktop/mobile only where layout behavior is involved; do not create redundant screenshots.

- [ ] **Step 5: Review Supabase advisors without deploying**

Using the current Supabase skill/runbook, review the isolated schema for security/function/FK findings. Record counts and SQL evidence without applying anything to production.

- [ ] **Step 6: Update docs/status and commit final verification**

Document the Client ownership model, session lifecycle, cookie/CSP requirements, migration order, rollback, exact test evidence, residual risks, and production steps not performed. Mark task 4.8 complete only if every finding has a regression test and all required gates pass.

```bash
git add docs/SECURITY.md docs/ARCHITECTURE.md README.md docs/TASKS.md docs/agents/CODEX_STATUS.md docs/runbooks/security-remediation-verification.md
git commit -m "docs: record security remediation verification"
```
