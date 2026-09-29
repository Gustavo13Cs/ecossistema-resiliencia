# Security Remediation B - Frontend Persistence and XSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist goals, lab exams, and lab orders in the owned API, remove clinical browser storage/fail-open behavior, and make printed documents/CSP resistant to script injection.

**Architecture:** Build thin Client-owned API modules over the schema introduced by Delivery A, expose them through TanStack Query, and treat server failures as explicit UI errors. Centralize HTML escaping/document construction in one utility and generate a per-request CSP nonce in the Next.js proxy without inline print scripts.

**Tech Stack:** NestJS, Prisma, class-validator, Jest, Next.js 16 proxy, React 19, TanStack Query, Vitest, Cypress.

**Spec:** `docs/superpowers/specs/2026-09-29-security-remediation-design.md`

## Global Constraints

- No clinical goal, exam, order, PDF metadata, or fallback entity may be stored in `localStorage`/`sessionStorage`.
- API failure never creates a local clinical record and never emits a success toast.
- Synthetic seed exams/goals/adherence must not be presented or persisted as real Client data.
- Dynamic printable values are escaped once by a shared builder; generated documents contain no `<script>`.
- Production `script-src` contains a request nonce and excludes both `'unsafe-inline'` and `'unsafe-eval'`.
- Every API operation consumes `AuthUser` and proves Client ownership before resource access.

## Review Focus

- An offline/500 response during create must leave query caches unchanged and surface an error; Tasks 3 and 4 test this.
- Malicious values in title, Client name, markers, indication, preparation, and notes must render as text; Task 5 tests all classes.
- An empty account must show an honest empty state, not generated clinical examples; Tasks 3 and 4 test this.
- Two professionals must never list each other's goals/orders through aggregate endpoints; Tasks 1 and 2 test query scope.
- Development CSP may use tooling allowances, but production must never regain inline script execution; Task 6 snapshots both modes.

---

### Task 1: Implement the ClientGoal API

**Files:**
- Create: `api/src/modules/client-goals/client-goals.module.ts`
- Create: `api/src/modules/client-goals/client-goals.controller.ts`
- Create: `api/src/modules/client-goals/client-goals.service.ts`
- Create: `api/src/modules/client-goals/client-goals.service.spec.ts`
- Create: `api/src/modules/client-goals/client-goals.controller.spec.ts`
- Create: `api/src/modules/client-goals/dto/upsert-client-goal.dto.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces `list(user: AuthUser)`, `findOne(user, clientId)`, `upsert(user, clientId, dto)`, and `remove(user, clientId)`.
- Produces `GET /client-goals`, `GET /client-goals/:clientId`, `PUT /client-goals/:clientId`, and `DELETE /client-goals/:clientId`.
- The DTO excludes `clientId`, `professionalId`, and timestamps; path/JWT supply ownership fields.

- [ ] **Step 1: Write failing service/controller tests**

Assert list filters `professionalId: user.sub`; find/upsert/delete call `getOwnedClient` first; upsert uses unique `clientId`; Client B and `ADMIN` are denied; unknown/internal fields produce HTTP 400.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/client-goals`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement validated goal persistence**

Use exact DTO enums from Prisma, ISO dates, positive/realistic numeric bounds, optional notes length limits, and nested habit target fields. Store `professionalId` from JWT and never accept it from the body.

- [ ] **Step 4: Run focused tests and build**

Run: `npm.cmd test -- --runInBand modules/client-goals`

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 5: Commit goal API**

```bash
git add api/src/modules/client-goals api/src/app.module.ts
git commit -m "feat: persist owned client goals"
```

### Task 2: Implement the LabOrder API and complete LabExam mutations

**Files:**
- Create: `api/src/modules/lab-orders/lab-orders.module.ts`
- Create: `api/src/modules/lab-orders/lab-orders.controller.ts`
- Create: `api/src/modules/lab-orders/lab-orders.service.ts`
- Create: `api/src/modules/lab-orders/lab-orders.service.spec.ts`
- Create: `api/src/modules/lab-orders/lab-orders.controller.spec.ts`
- Create: `api/src/modules/lab-orders/dto/create-lab-order.dto.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.controller.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.service.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.service.spec.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Produces `GET /lab-orders`, `POST /lab-orders`, and `DELETE /lab-orders/:id`.
- Completes `GET /lab-exams` and `DELETE /lab-exams/:id` with professional/Client scoping.
- Aggregate list responses include Client `id/name` from owned relations, not duplicated body fields.

- [ ] **Step 1: Write failing aggregate ownership tests**

Assert list filters by JWT professional, create resolves owned Client before insert, delete scopes by `id + professionalId`, marker arrays have size/length limits, and another account's IDs return `404`.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/lab-orders modules/lab-exams`

Expected: FAIL.

- [ ] **Step 3: Implement owned orders and exam list/delete**

Map API responses to the frontend contracts with `client: { id, name }`; do not persist `clientName`, sample orders, or attachment bytes in browser storage.

- [ ] **Step 4: Run focused tests and build**

Run: `npm.cmd test -- --runInBand modules/lab-orders modules/lab-exams`

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 5: Commit laboratory API**

```bash
git add api/src/modules/lab-orders api/src/modules/lab-exams api/src/app.module.ts
git commit -m "feat: persist owned lab orders"
```

### Task 3: Replace local Client goals with TanStack Query mutations

**Files:**
- Modify: `web/hooks/features/useClientGoals.ts`
- Modify: `web/hooks/features/useClientGoals.test.ts`
- Modify: `web/lib/query-keys.ts`
- Modify: `web/types/goal.ts`
- Modify: `web/app/metas/page.tsx`
- Modify: `web/components/features/goals/GoalFormModal.tsx`

**Interfaces:**
- Consumes Delivery B Task 1 endpoints.
- Produces async `saveGoal(input): Promise<ClientGoalCommitment>`, `deleteGoal(clientId): Promise<void>`, and `markGoalAchieved(clientId): Promise<ClientGoalCommitment>`.
- Query key is session-scoped: `queryKeys.clientGoals(user.sub)`.

- [ ] **Step 1: Rewrite tests first for server-only behavior**

Spy on `Storage.prototype.getItem/setItem` and assert zero calls. Assert empty API data remains empty, a 500 create/delete leaves cached goals unchanged, failure emits only an error toast, and a successful mutation invalidates the session-scoped key.

- [ ] **Step 2: Run the hook test to verify failure**

Run: `npm.cmd test -- hooks/features/useClientGoals.test.ts`

Expected: FAIL because the hook seeds and persists local goals.

- [ ] **Step 3: Implement Query-based loading and mutations**

Remove `STORAGE_KEY_PREFIX`, `getStorageKey`, effects/state used for persistence, and `generateDefaultGoalsForClients`. Keep deterministic progress calculations only from persisted goals, owned Clients, and real assessments; do not synthesize adherence measurements.

- [ ] **Step 4: Update consumers and verify**

Make modal/page handlers await mutations, disable duplicate submits, and display `AsyncState` for API errors/empty data.

Run: `npm.cmd test -- hooks/features/useClientGoals.test.ts app/metas`

Expected: PASS.

- [ ] **Step 5: Commit goal frontend**

```bash
git add web/hooks/features/useClientGoals.ts web/hooks/features/useClientGoals.test.ts web/lib/query-keys.ts web/types/goal.ts web/app/metas/page.tsx web/components/features/goals/GoalFormModal.tsx
git commit -m "fix: remove local clinical goal storage"
```

### Task 4: Replace central lab fallbacks with API queries/mutations

**Files:**
- Modify: `web/hooks/features/useCentralLabExams.ts`
- Modify: `web/hooks/features/useCentralLabExams.test.ts`
- Modify: `web/lib/query-keys.ts`
- Modify: `web/types/lab-exam.ts`
- Modify: `web/app/exames/page.tsx`
- Modify: `web/components/features/lab-exams/ExamRegistryModal.tsx`
- Modify: `web/components/features/lab-exams/ExamOrderIssuerModal.tsx`

**Interfaces:**
- Consumes `GET/POST/DELETE /lab-exams` and `GET/POST/DELETE /lab-orders`.
- Produces async `registerExam`, `issueOrder`, `deleteExam`, and `deleteOrder` with no local fallback.

- [ ] **Step 1: Rewrite failing tests for fail-closed persistence**

Assert zero `localStorage` calls, no seed records, one aggregate request per resource, Client B never appears, backend create IDs are authoritative, and rejected mutations preserve state/no success toast.

- [ ] **Step 2: Run the hook tests to verify failure**

Run: `npm.cmd test -- hooks/features/useCentralLabExams.test.ts`

Expected: FAIL because the hook merges local/seed data and swallows API errors.

- [ ] **Step 3: Implement server-only Query state**

Remove `LOCAL_STORAGE_*`, `generateSeedExams`, local persistence helpers, nested per-Client fetch loops, random IDs, and console warnings with fallback. Enrich marker display data after receiving typed server rows.

- [ ] **Step 4: Update page/modal async behavior and verify**

Await mutations, keep dialogs open on failure, prevent success copy/print for unsaved orders, and render empty/error states honestly.

Run: `npm.cmd test -- hooks/features/useCentralLabExams.test.ts app/exames`

Expected: PASS.

- [ ] **Step 5: Commit laboratory frontend**

```bash
git add web/hooks/features/useCentralLabExams.ts web/hooks/features/useCentralLabExams.test.ts web/lib/query-keys.ts web/types/lab-exam.ts web/app/exames/page.tsx web/components/features/lab-exams/ExamRegistryModal.tsx web/components/features/lab-exams/ExamOrderIssuerModal.tsx
git commit -m "fix: remove local lab data fallbacks"
```

### Task 5: Introduce a shared escaped print-document builder

**Files:**
- Create: `web/lib/print-document.ts`
- Create: `web/lib/print-document.test.ts`
- Create: `web/lib/lab-print-document.ts`
- Create: `web/lib/lab-print-document.test.ts`
- Modify: `web/lib/diet-print-document.ts`
- Modify: `web/lib/diet-print-document.test.ts`
- Modify: `web/components/features/lab-exams/ExamOrderIssuerModal.tsx`
- Modify: `web/app/exames/page.tsx`
- Modify: `web/hooks/features/useManagementReports.ts`
- Modify: `web/app/clientes/[id]/nova-dieta/page.tsx`

**Interfaces:**
- Produces `escapeHtml(value: unknown): string`, `multiline(value: unknown): string`, `buildPrintDocument(input): string`, and `openPrintWindow(html, features?): Window | null`.
- `buildPrintDocument` accepts trusted static CSS plus already-built escaped body fragments and never emits a script tag.
- `openPrintWindow` writes/closes the document and registers `load` from the opener to call `print()`.

- [ ] **Step 1: Write failing injection tests**

Use payloads containing `<script>`, SVG `onload`, `</style>`, quotes, ampersands, and newlines in every lab/report/diet dynamic field. Assert parsed output has no script/event nodes, textContent equals the original payload, and generated HTML contains no inline print script.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- lib/print-document.test.ts lib/lab-print-document.test.ts lib/diet-print-document.test.ts`

Expected: FAIL for lab/report builders and inline print scripts.

- [ ] **Step 3: Implement shared escaping and document builders**

Move existing diet escaping primitives into `print-document.ts`; build order/exam/report documents through explicit escaped template functions. Never interpolate raw user/API strings into CSS, attributes, title, or body.

- [ ] **Step 4: Replace direct document writers and verify**

Replace all four direct `document.write` call sites with the shared opener and ensure the opener, not document HTML, triggers printing.

Run: `rg -n "document\.write|window\.onload|<script" web --glob '*.ts' --glob '*.tsx'`

Expected: only the reviewed shared writer remains; no generated inline scripts remain.

- [ ] **Step 5: Commit print hardening**

```bash
git add web/lib/print-document.ts web/lib/print-document.test.ts web/lib/lab-print-document.ts web/lib/lab-print-document.test.ts web/lib/diet-print-document.ts web/lib/diet-print-document.test.ts web/components/features/lab-exams/ExamOrderIssuerModal.tsx web/app/exames/page.tsx web/hooks/features/useManagementReports.ts web/app/clientes/[id]/nova-dieta/page.tsx
git commit -m "fix: escape clinical print documents"
```

### Task 6: Enforce nonce-based production CSP

**Files:**
- Create: `web/proxy.ts`
- Create: `web/proxy.test.ts`
- Modify: `web/app/layout.tsx`
- Modify: `web/next.config.mjs`
- Modify: `web/next.config.test.ts`

**Interfaces:**
- Produces a cryptographically random base64 nonce per request.
- Sets request header `x-nonce` and response `Content-Security-Policy` with matching `'nonce-<value>'`.
- Keeps static non-CSP security headers in `next.config.mjs`.

- [ ] **Step 1: Write failing CSP tests**

Assert two requests receive different nonces, response/request nonce values match, production `script-src` excludes unsafe directives, development allows only the documented tooling directive, and API/static asset paths are excluded by the matcher.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm.cmd test -- proxy.test.ts next.config.test.ts`

Expected: FAIL because CSP is static and permits inline scripts.

- [ ] **Step 3: Implement proxy CSP and layout nonce consumption**

Use Web Crypto (`crypto.getRandomValues`) to create 16 random bytes and encode them as base64, keeping the proxy compatible with the configured Next runtime. Sanitize no user input into the policy, forward `x-nonce`, and let Next consume the nonce for framework scripts. `RootLayout` reads the request nonce for any explicit script-bearing component; do not add custom inline scripts.

- [ ] **Step 4: Run typecheck/build and inspect output headers**

Run: `npm.cmd run typecheck`

Run: `npm.cmd run build`

Expected: PASS; build output contains no CSP static-header conflict.

- [ ] **Step 5: Commit CSP hardening**

```bash
git add web/proxy.ts web/proxy.test.ts web/app/layout.tsx web/next.config.mjs web/next.config.test.ts
git commit -m "fix: enforce nonce based production csp"
```

### Task 7: Verify no browser clinical persistence and no executable print payload

**Files:**
- Create: `web/cypress/e2e/clinical-persistence-security.cy.ts`
- Modify: `web/cypress/e2e/professional-phase1-real.cy.ts`
- Modify: `web/package.json`

**Interfaces:**
- Consumes Delivery B endpoints, Query hooks, print builders, and CSP proxy.
- Produces browser-level regression coverage for findings 4 and 5.

- [ ] **Step 1: Add the browser security journey**

Create/update/delete a real goal, exam, and order; reload; prove server persistence; force API 500 and prove no local entity/success toast; inspect both storages for clinical keys; print a malicious order and assert it remains text with no executable node.

- [ ] **Step 2: Run focused component/unit gates**

Run: `npm.cmd test -- hooks/features/useClientGoals.test.ts hooks/features/useCentralLabExams.test.ts lib/print-document.test.ts lib/lab-print-document.test.ts proxy.test.ts`

Expected: PASS.

- [ ] **Step 3: Build the production frontend**

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 4: Run the focused Cypress spec**

Run: `npx.cmd cypress run --browser electron --spec cypress/e2e/clinical-persistence-security.cy.ts`

Expected: PASS.

- [ ] **Step 5: Commit delivery B verification**

```bash
git add web/cypress/e2e/clinical-persistence-security.cy.ts web/cypress/e2e/professional-phase1-real.cy.ts web/package.json
git commit -m "test: verify clinical browser security"
```
