# Security Remediation A - Ownership and Clinical Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate active clinical flows from legacy `User` identifiers to professional-owned `Client` records and close cross-tenant authorization gaps.

**Architecture:** Add nullable `clientId` relations without deleting legacy columns, centralize authorization in `ClientAccessService`, and expose only Client-based contracts for new writes. Each service receives the complete `AuthUser`, proves ownership before resource queries, and scopes mutations by both Client and creator.

**Tech Stack:** NestJS 11, Prisma 7.10, PostgreSQL 16, class-validator, Jest/Supertest, Next.js 16, React 19, TanStack Query, Vitest/Cypress.

**Spec:** `docs/superpowers/specs/2026-09-29-security-remediation-design.md`

## Global Constraints

- `Client.id` is the only browser-supplied clinical subject identifier for new contracts.
- Every clinical read/write/delete calls `ClientAccessService.getOwnedClient(user, clientId)` before querying the resource.
- Cross-tenant access returns `404`; `ADMIN` receives no implicit clinical access.
- Existing `userId`/`patientId` columns become nullable historical fields; new writes leave them null.
- Backfill only rows with exactly one provable Client/creator match; ambiguous rows remain `clientId = NULL`.
- Protected files `api/prisma/schema.prisma` and versioned migrations are authorized for this remediation.
- No migration or deployment is applied to production.

## Review Focus

- A legacy row with two possible Clients must remain unassigned and absent from professional endpoints; Task 1 pins this in PostgreSQL.
- A professional using another account's valid `clientId` must receive `404` before any resource mutation; Tasks 2-7 test this.
- A plan creation failure after deactivation must preserve the previous active plan; Tasks 3 and 4 test rollback.
- Payloads containing `userId`, `patientId`, `creatorId`, or `professionalId` must fail validation; Tasks 3-7 test the public DTO boundary.
- Templates must remain professional-owned without requiring a Client; Tasks 3 and 4 retain and test template behavior separately.

---

### Task 1: Add the transitional Client-owned schema and conservative migration

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/20260929120000_add_client_owned_clinical_resources/migration.sql`
- Create: `api/test/client-owned-schema.e2e-spec.ts`

**Interfaces:**
- Produces nullable `clientId` relations on `Workout`, `RehabPlan`, `PhysioAssessment`, `Anamnesis`, `SupplementPlan`, `LabExam`, `ConsultationNote`, `DailyTracking`, and `PatientAlert`.
- Produces `PhysioAssessment.creatorId`, `DailyTracking.professionalId`, `ClientGoal`, and `LabOrder`.
- Preserves nullable legacy IDs and adds reverse relations on `Client`/`User` for generated Prisma types.

- [x] **Step 1: Write the failing migration contract test**

Create PostgreSQL fixtures for one uniquely attributable row and one ambiguous row per ownership pattern. Assert that the unique row receives the expected `clientId`, the ambiguous row remains null, all new foreign keys are restrictive/cascade only as specified, and `ClientGoal.clientId` is unique.

- [x] **Step 2: Run the schema test to verify it fails**

Run: `npm.cmd run test:e2e -- --runInBand client-owned-schema.e2e-spec.ts`

Expected: FAIL because the migration/models do not exist.

- [x] **Step 3: Implement the additive Prisma schema and SQL migration**

Use these exact ownership fields:

```ts
clientId: string | null
creatorId: string // existing resources, plus PhysioAssessment
professionalId: string | null // DailyTracking transition
```

Define `ClientGoalCategory` from the five frontend categories and `ClientGoalStatus` from the five frontend statuses. Define one `ClientGoal` per Client and append-only `LabOrder` records with `markers String[]`. Add query-driven indexes, but do not drop any historical column/table.

- [x] **Step 4: Validate generation and the migration contract**

Run: `npx.cmd prisma validate`

Run: `npx.cmd prisma generate`

Run: `npm.cmd run test:e2e -- --runInBand client-owned-schema.e2e-spec.ts`

Expected: all commands PASS; ambiguous fixtures remain unassigned.

- [x] **Step 5: Commit the schema unit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/20260929120000_add_client_owned_clinical_resources/migration.sql api/test/client-owned-schema.e2e-spec.ts
git commit -m "feat: add client-owned clinical schema"
```

### Task 2: Move overview and user profile boundaries to Client ownership

**Files:**
- Create: `api/src/modules/clients/client-overview.service.ts`
- Create: `api/src/modules/clients/client-overview.service.spec.ts`
- Modify: `api/src/modules/clients/clients.controller.ts`
- Modify: `api/src/modules/clients/clients.module.ts`
- Modify: `api/src/modules/users/users.controller.ts`
- Modify: `api/src/modules/users/users.service.ts`
- Create: `api/src/modules/users/users.controller.spec.ts`
- Modify: `web/hooks/features/usePatientOverview.ts`
- Modify: `web/lib/query-keys.ts`
- Modify: `web/app/clientes/[id]/visao-360/page.tsx`
- Create: `web/hooks/features/usePatientOverview.test.tsx`

**Interfaces:**
- Produces `ClientOverviewService.getOverview(user: AuthUser, clientId: string): Promise<ClientOverview>`.
- Produces `GET /clients/:clientId/overview`.
- Restricts `GET/PATCH /users/:id` to `req.user.sub === id`; removes clinical overview and professional patient CRUD from `UsersController`.

- [x] **Step 1: Write failing API boundary tests**

Assert own Client overview succeeds, another professional's Client returns `404`, `ADMIN` is rejected before aggregate queries, and `/users/:id` rejects a different user regardless of professional role.

- [x] **Step 2: Run focused API tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/clients/client-overview.service.spec.ts modules/users/users.controller.spec.ts`

Expected: FAIL because overview is still User-based and profile routes trust role booleans.

- [x] **Step 3: Implement the Client overview contract**

Call `getOwnedClient` first, then query every aggregate by `clientId`; when a model has `creatorId`, include `creatorId: user.sub`. Return no unmigrated `patientId` row. Remove `/users/:id/overview` and legacy professional patient management routes rather than aliasing them.

- [x] **Step 4: Move the frontend request and verify it**

Change the hook to request `/clients/${clientId}/overview`, rename query-key parameters from patient/user to client, and remove the `/membros` link from the Client page. Add a hook test asserting the exact URL and no `User.id` lookup.

Run: `npm.cmd test -- hooks/features/usePatientOverview.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit the overview boundary**

```bash
git add api/src/modules/clients api/src/modules/users web/hooks/features/usePatientOverview.ts web/hooks/features/usePatientOverview.test.tsx web/lib/query-keys.ts web/app/clientes/[id]/visao-360/page.tsx
git commit -m "fix: scope clinical overview to owned clients"
```

### Task 3: Make workout activation atomic and Client-owned

**Files:**
- Create: `api/src/modules/workouts/workouts.service.spec.ts`
- Create: `api/src/modules/workouts/workouts.controller.spec.ts`
- Modify: `api/src/modules/workouts/dto/create-workout.dto.ts`
- Modify: `api/src/modules/workouts/workouts.service.ts`
- Modify: `api/src/modules/workouts/workouts.controller.ts`
- Modify: `api/src/modules/workouts/workouts.module.ts`
- Modify: `web/app/clientes/[id]/novo-treino/page.tsx`
- Modify: `web/app/treinos/page.tsx`
- Modify: `web/components/sport-selector.tsx`
- Create: `web/app/clientes/[id]/novo-treino/workout-client-contract.test.tsx`

**Interfaces:**
- Produces `create(user: AuthUser, dto: CreateWorkoutDto)` where DTO contains `clientId`, never `userId`.
- Produces `findActive(user: AuthUser, clientId: string)`, `remove(user, id)`, `saveAsTemplate(user, id)`, and professional-owned `listTemplates(user)`.
- Produces `GET /workouts/client/:clientId/active`.

- [x] **Step 1: Write failing service and DTO tests**

Assert ownership is resolved before `$transaction`, deactivation uses `{ clientId, creatorId: user.sub, isActive: true }`, create and nested children share the transaction, a create error rolls back deactivation, and forbidden internal ID fields produce HTTP 400.

- [x] **Step 2: Run focused workout tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/workouts`

Expected: FAIL on cross-tenant, transaction, and DTO assertions.

- [x] **Step 3: Implement the transactional service**

Use `this.prisma.$transaction(async (tx) => ...)` after `getOwnedClient`. New records write `clientId`, `creatorId`, and `userId: null`. Resource mutations first load by `{ id, creatorId: user.sub }`, then verify any attached Client is owned.

- [x] **Step 4: Update and test the Client pages**

Send `{ clientId: params.id }`, request `/workouts/client/${params.id}/active`, and route from list rows via `workout.clientId`. Test that no payload contains `userId`.

Run: `npm.cmd test -- app/clientes/[id]/novo-treino/workout-client-contract.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit workouts**

```bash
git add api/src/modules/workouts web/app/clientes/[id]/novo-treino web/app/treinos/page.tsx web/components/sport-selector.tsx
git commit -m "fix: bind workouts to owned clients"
```

### Task 4: Make rehabilitation atomic and Client-owned

**Files:**
- Create: `api/src/modules/rehab-plans/rehab-plans.service.spec.ts`
- Create: `api/src/modules/rehab-plans/rehab-plans.controller.spec.ts`
- Modify: `api/src/modules/rehab-plans/dto/create-rehab-plan.dto.ts`
- Modify: `api/src/modules/rehab-plans/rehab-plans.service.ts`
- Modify: `api/src/modules/rehab-plans/rehab-plans.controller.ts`
- Modify: `api/src/modules/rehab-plans/rehab-plans.module.ts`
- Modify: `web/hooks/features/useFisio.ts`
- Modify: `web/app/clientes/[id]/nova-reabilitacao/page.tsx`
- Create: `web/hooks/features/useFisio.test.tsx`

**Interfaces:**
- Mirrors the Task 3 ownership/transaction contract for `RehabPlan`.
- Produces `GET /rehab-plans/client/:clientId/active` and DTO `clientId: UUID`.

- [x] **Step 1: Write failing ownership and rollback tests**

Assert cross-tenant requests stop before plan queries, deactivation is creator/client scoped, nested session creation is transactional, and a nested failure retains the previous active plan.

- [x] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/rehab-plans`

Expected: FAIL.

- [x] **Step 3: Implement the Client-owned rehabilitation contract**

Adopt `AuthUser`, `ClientAccessService`, transactional create, nullable legacy IDs, and creator-scoped templates exactly as in workouts.

- [x] **Step 4: Update frontend requests and tests**

Replace `/rehab-plans/user/:id/active` with `/rehab-plans/client/:id/active`; send only `clientId` and validated plan fields.

Run: `npm.cmd test -- hooks/features/useFisio.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit rehabilitation**

```bash
git add api/src/modules/rehab-plans web/hooks/features/useFisio.ts web/hooks/features/useFisio.test.tsx web/app/clientes/[id]/nova-reabilitacao/page.tsx
git commit -m "fix: bind rehab plans to owned clients"
```

### Task 5: Correct physiotherapy persistence and authorization

**Files:**
- Create: `api/src/modules/physio-assessments/physio-assessments.service.spec.ts`
- Create: `api/src/modules/physio-assessments/physio-assessments.controller.spec.ts`
- Modify: `api/src/modules/physio-assessments/dto/create-physio-assessment.dto.ts`
- Modify: `api/src/modules/physio-assessments/physio-assessments.service.ts`
- Modify: `api/src/modules/physio-assessments/physio-assessments.controller.ts`
- Modify: `api/src/modules/physio-assessments/physio-assessments.module.ts`
- Modify: `web/components/PhysioAssessmentModal.tsx`
- Create: `web/components/PhysioAssessmentModal.test.tsx`

**Interfaces:**
- Produces `create(user: AuthUser, dto: CreatePhysioAssessmentDto)` with `clientId`.
- Uses only `prisma.physioAssessment`; every list/read/delete filter includes owned `clientId` and `creatorId`.

- [x] **Step 1: Write failing model and ownership tests**

Assert `physicalAssessment` is never called, `creatorId` comes from JWT, cross-tenant create/list/delete returns `404`, and internal ID fields are rejected.

- [x] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/physio-assessments`

Expected: FAIL because the service currently uses the wrong Prisma delegate and no requester.

- [x] **Step 3: Implement and expose Client-based routes**

Use `POST /physio-assessments`, `GET /physio-assessments/client/:clientId`, and `DELETE /physio-assessments/:id`; derive creator from `request.user`.

- [x] **Step 4: Update modal payload and verify**

Send `clientId` and clinical fields only.

Run: `npm.cmd test -- components/PhysioAssessmentModal.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit physiotherapy**

```bash
git add api/src/modules/physio-assessments web/components/PhysioAssessmentModal.tsx web/components/PhysioAssessmentModal.test.tsx
git commit -m "fix: secure physiotherapy assessments"
```

### Task 6: Migrate anamneses and consultation notes to Client ownership

**Files:**
- Create: `api/src/modules/anamneses/anamneses.service.spec.ts`
- Modify: `api/src/modules/anamneses/dto/create-anamnesis.dto.ts`
- Modify: `api/src/modules/anamneses/anamneses.service.ts`
- Modify: `api/src/modules/anamneses/anamneses.controller.ts`
- Modify: `api/src/modules/anamneses/anamneses.module.ts`
- Create: `api/src/modules/consultation-notes/consultation-notes.service.spec.ts`
- Modify: `api/src/modules/consultation-notes/dto/create-consultation-note.dto.ts`
- Modify: `api/src/modules/consultation-notes/consultation-notes.service.ts`
- Modify: `api/src/modules/consultation-notes/consultation-notes.controller.ts`
- Modify: `api/src/modules/consultation-notes/consultation-notes.module.ts`
- Modify: `web/app/clientes/[id]/nova-anamnese/page.tsx`

**Interfaces:**
- Produces list/create routes keyed by `clientId`; note update/delete also require the authenticated creator and owned Client.

- [x] **Step 1: Write failing cross-tenant and DTO tests**

Cover create/list/update/delete, `ADMIN`, unknown Client, another professional's note ID, and forbidden legacy fields.

- [x] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/anamneses modules/consultation-notes`

Expected: FAIL.

- [x] **Step 3: Implement owned services and routes**

Call `getOwnedClient` before resource access; write `clientId`, JWT `creatorId`, and null legacy IDs. Use `updateMany/deleteMany` or a verified unique row so the final mutation remains creator/client scoped.

- [x] **Step 4: Update the anamnese page and verify the payload**

Send `clientId: params.id`; remove `patientId`.

Run: `npm.cmd test -- app/clientes/[id]/nova-anamnese`

Expected: PASS.

- [x] **Step 5: Commit records and notes**

```bash
git add api/src/modules/anamneses api/src/modules/consultation-notes web/app/clientes/[id]/nova-anamnese/page.tsx
git commit -m "fix: secure client anamneses and notes"
```

### Task 7: Migrate supplements and laboratory exams to Client ownership

**Files:**
- Create: `api/src/modules/supplements/supplements.service.spec.ts`
- Modify: `api/src/modules/supplements/dto/create-supplement.dto.ts`
- Create: `api/src/modules/supplements/dto/create-supplement-item.dto.ts`
- Modify: `api/src/modules/supplements/supplements.service.ts`
- Modify: `api/src/modules/supplements/supplements.controller.ts`
- Modify: `api/src/modules/supplements/supplements.module.ts`
- Create: `api/src/modules/lab-exams/lab-exams.service.spec.ts`
- Modify: `api/src/modules/lab-exams/dto/create-lab-exam.dto.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.service.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.controller.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.module.ts`
- Modify: `web/hooks/features/useSuplementos.ts`
- Modify: `web/hooks/features/useLabExams.ts`
- Create: `web/hooks/features/useSuplementos.test.tsx`
- Create: `web/hooks/features/useLabExams.test.tsx`

**Interfaces:**
- Produces typed nested supplement items with length/array bounds.
- Produces `/supplements/client/:clientId/active` and `/lab-exams/client/:clientId`; both derive creator from JWT.

- [x] **Step 1: Write failing validation and ownership tests**

Assert nested invalid items fail, array bounds apply, `any` is absent from public/service contracts, Client B is inaccessible, and new writes leave `patientId` null.

- [x] **Step 2: Run focused API tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/supplements modules/lab-exams`

Expected: FAIL.

- [x] **Step 3: Implement typed owned services**

Use DTO classes with `@ValidateNested`, `@Type`, `@ArrayMaxSize`, UUID validation, numeric bounds, and string lengths. Scope reads by `{ clientId, creatorId: user.sub }`.

- [x] **Step 4: Update frontend hooks and verify URLs/payloads**

Remove `/users/:id` lookups, use Client endpoints, and send `clientId` only.

Run: `npm.cmd test -- hooks/features/useSuplementos.test.tsx hooks/features/useLabExams.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit supplements and exams**

```bash
git add api/src/modules/supplements api/src/modules/lab-exams web/hooks/features/useSuplementos.ts web/hooks/features/useSuplementos.test.tsx web/hooks/features/useLabExams.ts web/hooks/features/useLabExams.test.tsx
git commit -m "fix: secure supplements and lab exams"
```

### Task 8: Retire unreachable PATIENT-only runtime code

**Files:**
- Delete: `api/src/modules/consents/`
- Delete: `api/src/modules/health-check-ins/`
- Delete: `api/src/modules/meal-logs/`
- Delete: `api/src/modules/workout-logs/`
- Delete: `api/src/modules/agenda/`
- Delete: `api/src/modules/metrics/`
- Delete: `api/src/common/patient-access/`
- Modify: `api/src/app.module.ts`
- Delete: `web/hooks/features/useAgenda.ts`
- Delete: `web/types/agenda.ts`
- Delete: `web/components/ConsistencyBadge.tsx`
- Delete: `web/components/features/agenda/AgendaProgress.tsx`
- Delete: `web/components/features/agenda/AgendaTaskCard.tsx`
- Delete: `web/components/features/agenda/AgendaTaskDialog.tsx`
- Delete: `web/components/features/agenda/ConsentSharingCard.tsx`
- Delete: `web/components/features/agenda/ConsentStatus.tsx`
- Delete: `web/components/features/agenda/PatientAgendaSummary.tsx`
- Create: `api/src/app.module.spec.ts`

**Interfaces:**
- Produces no patient-login endpoints; historical Prisma models/tables remain untouched.

- [x] **Step 1: Write a failing runtime-surface test**

Assert `AppModule` has no PATIENT-only modules/controllers and repository imports contain no calls to `/consents`, `/health-check-ins`, `/meal-logs`, `/workout-logs`, legacy `/agenda`, or `/metrics`.

- [x] **Step 2: Run the test and consumer search**

Run: `npm.cmd test -- --runInBand app.module.spec.ts`

Run: `rg -n "consents|health-check-ins|meal-logs|workout-logs|PatientAccessService|/agenda/patient|/metrics/|ConsentSharingCard|ConsentStatus|PatientAgendaSummary|ConsistencyBadge" api/src web`

Expected: the test/search identifies only the dead runtime code listed above.

- [x] **Step 3: Remove the unreachable runtime surface**

Delete controllers/services/modules/DTOs/specs and unused frontend presentation types. Remove `AgendaModule` and `MetricsModule` imports from `AppModule`. Do not drop database tables or migrate historical rows; `AppointmentsModule` remains the supported professional agenda.

- [x] **Step 4: Verify API/web compilation**

Run: `npm.cmd run build` in `api`.

Run: `npm.cmd run typecheck` in `web`.

Expected: PASS with no remaining imports.

- [x] **Step 5: Commit the retired surface**

```bash
git add -A api/src/modules/consents api/src/modules/health-check-ins api/src/modules/meal-logs api/src/modules/workout-logs api/src/modules/agenda api/src/modules/metrics api/src/common/patient-access api/src/app.module.ts api/src/app.module.spec.ts web/hooks/features/useAgenda.ts web/types/agenda.ts web/components/ConsistencyBadge.tsx web/components/features/agenda/AgendaProgress.tsx web/components/features/agenda/AgendaTaskCard.tsx web/components/features/agenda/AgendaTaskDialog.tsx web/components/features/agenda/ConsentSharingCard.tsx web/components/features/agenda/ConsentStatus.tsx web/components/features/agenda/PatientAgendaSummary.tsx
git commit -m "refactor: retire patient-only runtime modules"
```

### Task 9: Prove cross-tenant isolation end to end

**Files:**
- Create: `api/test/client-owned-clinical-resources.e2e-spec.ts`
- Create: `web/cypress/e2e/client-owned-clinical-resources.cy.ts`
- Modify: `web/package.json`

**Interfaces:**
- Consumes every Client-based endpoint from Tasks 2-7.
- Produces one reusable A/B professional isolation fixture for later plans.

- [x] **Step 1: Write the API E2E matrix**

For each domain, create as Professional A on Client A, verify A can read it, verify Professional B receives `404` for read/update/delete, and verify no B mutation changed A's row. Include `ADMIN` denial and legacy-field validation.

- [x] **Step 2: Run the matrix against isolated PostgreSQL**

Run: `npm.cmd run test:e2e -- --runInBand client-owned-clinical-resources.e2e-spec.ts`

Expected: PASS.

- [x] **Step 3: Add the browser journey**

Cover Client pages for workout, rehab, physio, anamnese, supplements, lab exams, and overview. Assert every intercepted request carries `clientId` and never `userId`/`patientId`.

- [x] **Step 4: Run focused frontend gates**

Run: `npm.cmd run build`

Run: `npx.cmd cypress run --browser electron --spec cypress/e2e/client-owned-clinical-resources.cy.ts`

Expected: PASS.

- [x] **Step 5: Commit delivery A verification**

```bash
git add api/test/client-owned-clinical-resources.e2e-spec.ts web/cypress/e2e/client-owned-clinical-resources.cy.ts web/package.json
git commit -m "test: prove client-owned clinical isolation"
```
