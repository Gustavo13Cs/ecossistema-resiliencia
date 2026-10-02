# Security Remediation C - Sessions and Supply Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace week-long stateless JWT sessions with revocable rotating sessions, fail closed on cookie policy, remove known runtime advisories, and ship production-only container dependencies.

**Architecture:** Store one hashed opaque refresh secret per `AuthSession`; issue 15-minute access JWTs keyed by session ID and `User.authVersion`; reload session/user state during Passport validation. The browser obtains a CSRF pair before refresh, rotates refresh/access tokens through same-origin `/api/auth`, and retries one failed request at most once.

**Tech Stack:** NestJS JWT/Passport, Prisma/PostgreSQL, Node crypto/bcrypt, HttpOnly cookies, Axios interceptors, Jest/Vitest/Cypress, npm lockfiles, multi-stage Docker.

**Spec:** `docs/superpowers/specs/2026-09-29-security-remediation-design.md`

## Global Constraints

- Access token lifetime is exactly 15 minutes; refresh session lifetime is exactly 30 days.
- Refresh token format is opaque `<sessionId>.<secret>` and only its hash is persisted.
- Access validation reloads current User role/authVersion and active AuthSession; JWT role is never authoritative.
- Refresh rotation is transactional; reuse of an old secret revokes that session.
- Production bootstrap requires `AUTH_COOKIE_SECURE=true`.
- Default refresh cookie path is `/api/auth` to match the repository's same-origin rewrite; an override must be an absolute path.
- Refresh/logout require allowed Origin and constant-time CSRF validation.
- Do not use `npm audit fix --force`; retain Next 16, Nest 11, and Prisma 7 unless tests prove an approved major migration.

## Review Focus

- Concurrent refresh requests with one old token must yield one success and revoke/fail the replay; Task 2 tests this.
- A page reload with expired access but valid refresh must recover without exposing refresh token to JavaScript; Task 4 tests this.
- Role/authVersion changes must affect the next authenticated request, not wait for JWT expiry; Task 3 tests this.
- Logout with expired access must still revoke by refresh token, but missing/invalid CSRF must fail; Tasks 2-4 test this.
- Container images must run Prisma migrations without retaining TypeScript/Cypress/Vitest/ESLint toolchains; Task 6 inspects image contents.

---

### Task 1: Add User authVersion and AuthSession persistence

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/20260929123000_add_revocable_auth_sessions/migration.sql`
- Create: `api/test/auth-session-schema.e2e-spec.ts`

**Interfaces:**
- Produces `User.authVersion Int @default(0)`.
- Produces `AuthSession { id, userId, refreshTokenHash, expiresAt, revokedAt, lastUsedAt, createdAt, updatedAt }` and indexes on active/user expiry lookups.

- [x] **Step 1: Write failing schema tests**

Assert existing users receive `authVersion = 0`, every session requires one refresh hash, user deletion/restriction behavior is explicit, and indexes cover `userId/revokedAt/expiresAt`.

- [x] **Step 2: Run the E2E test to verify failure**

Run: `npm.cmd run test:e2e -- --runInBand auth-session-schema.e2e-spec.ts`

Expected: FAIL.

- [x] **Step 3: Implement the additive schema/migration**

Do not migrate or log current access cookies; existing JWTs become invalid when the new validator requires `jti` and `authVersion`.

- [x] **Step 4: Validate schema/generation/test**

Run: `npx.cmd prisma validate`

Run: `npx.cmd prisma generate`

Run: `npm.cmd run test:e2e -- --runInBand auth-session-schema.e2e-spec.ts`

Expected: PASS.

- [x] **Step 5: Commit session schema**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/20260929123000_add_revocable_auth_sessions/migration.sql api/test/auth-session-schema.e2e-spec.ts
git commit -m "feat: add revocable auth sessions"
```

### Task 2: Implement opaque refresh rotation and revocation

**Files:**
- Create: `api/src/modules/auth/refresh-token.ts`
- Create: `api/src/modules/auth/refresh-token.spec.ts`
- Create: `api/src/modules/auth/auth-session.service.ts`
- Create: `api/src/modules/auth/auth-session.service.spec.ts`
- Modify: `api/src/modules/auth/auth.service.ts`
- Modify: `api/src/modules/auth/auth.service.spec.ts`
- Modify: `api/src/modules/auth/auth.module.ts`
- Modify: `api/src/common/types/auth-user.ts`

**Interfaces:**
- Produces `createRefreshToken(sessionId: string): { rawToken: string; hash: string }`.
- Produces `parseRefreshToken(raw: string): { sessionId: string; secret: string }` and constant-time hash comparison.
- Produces `AuthSessionService.create(user)`, `rotate(rawToken)`, `revoke(rawToken)`, `revokeAll(userId)`, and `validateAccess(payload)`.
- Produces access payload `{ sub, jti, authVersion }`; returned `AuthUser` role/name/email come from current DB state.

- [x] **Step 1: Write failing token/session tests**

Assert 32-byte random secrets, malformed tokens fail uniformly, database stores no raw secret, rotation updates hash/lastUsedAt in one transaction, old-token replay revokes session, expiry/revocation/authVersion mismatch fail, and concurrent replay yields at most one valid rotation.

- [x] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand modules/auth/refresh-token.spec.ts modules/auth/auth-session.service.spec.ts modules/auth/auth.service.spec.ts`

Expected: FAIL.

- [x] **Step 3: Implement session primitives and login issuance**

Use SHA-256/HMAC-style fixed-length hashes suitable for timing-safe comparison; transactionally create/rotate session state and lock the session row (`SELECT ... FOR UPDATE`) before comparing/replacing the hash. Configure `JwtModule` access `expiresIn: '15m'`; do not include role as an authorization source.

- [x] **Step 4: Run focused tests and build**

Run: `npm.cmd test -- --runInBand modules/auth`

Run: `npm.cmd run build`

Expected: PASS.

- [x] **Step 5: Commit session service**

```bash
git add api/src/modules/auth api/src/common/types/auth-user.ts
git commit -m "feat: rotate and revoke refresh sessions"
```

### Task 3: Validate JWTs against current session and User state

**Files:**
- Modify: `api/src/common/strategies/jwt.strategy.ts`
- Create: `api/src/common/strategies/jwt.strategy.spec.ts`
- Modify: `api/src/modules/users/users.service.ts`
- Modify: `api/src/modules/users/users.service.spec.ts`

**Interfaces:**
- `JwtStrategy.validate(payload)` delegates to `AuthSessionService.validateAccess`.
- Role/block/credential-changing operations increment `User.authVersion` and revoke active sessions in the same transaction.

- [x] **Step 1: Write failing validation/invalidation tests**

Assert missing `jti`, revoked/expired session, mismatched subject, changed authVersion, and deleted user all produce 401. Assert a role change is reflected immediately and a credential reset increments authVersion/revokes sessions atomically.

- [x] **Step 2: Run focused tests to verify failure**

Run: `npm.cmd test -- --runInBand common/strategies/jwt.strategy.spec.ts modules/users/users.service.spec.ts`

Expected: FAIL because JWT claims are currently trusted directly.

- [x] **Step 3: Implement database-backed validation**

Select only current identity/role/session fields; return `AuthUser` from DB. Ensure no clinical record is loaded during authentication.

- [x] **Step 4: Run auth/user tests**

Run: `npm.cmd test -- --runInBand common/strategies modules/users`

Expected: PASS.

- [x] **Step 5: Commit validation**

```bash
git add api/src/common/strategies/jwt.strategy.ts api/src/common/strategies/jwt.strategy.spec.ts api/src/modules/users/users.service.ts api/src/modules/users/users.service.spec.ts
git commit -m "fix: validate jwt sessions against current state"
```

### Task 4: Add secure cookie, CSRF, refresh, and logout HTTP flows

**Files:**
- Modify: `api/src/modules/auth/auth-cookie-options.ts`
- Create: `api/src/modules/auth/auth-cookie-options.spec.ts`
- Modify: `api/src/modules/auth/auth.controller.ts`
- Modify: `api/src/modules/auth/auth.controller.spec.ts`
- Modify: `api/src/common/security/csrf-protection.ts`
- Modify: `api/src/common/security/csrf-protection.spec.ts`
- Modify: `api/src/main.ts`
- Modify: `web/lib/api.ts`
- Modify: `web/lib/api.test.ts`
- Modify: `web/contexts/auth-context.tsx`
- Modify: `web/contexts/auth-context.test.tsx`

**Interfaces:**
- Produces `GET /auth/csrf`, `POST /auth/refresh`, and revoking `POST /auth/logout`.
- Produces separate access/refresh/CSRF cookie policies with matching set/clear boundaries.
- Produces a single-flight frontend refresh promise and one `_authRetry` per failed request.

- [x] **Step 1: Write failing HTTP/security tests**

Assert login sets three cookies without token response fields; production rejects missing/false secure setting; refresh cookie defaults to `/api/auth`; `/auth/csrf` returns a valid pair; refresh/logout reject missing Origin or CSRF; refresh rotates cookies; logout revokes before clearing; expired access plus valid refresh recovers; replay logs out.

- [x] **Step 2: Run focused API/web tests to verify failure**

Run in `api`: `npm.cmd test -- --runInBand modules/auth common/security/csrf-protection.spec.ts`

Run in `web`: `npm.cmd test -- lib/api.test.ts contexts/auth-context.test.tsx`

Expected: FAIL.

- [x] **Step 3: Implement fail-closed cookie and CSRF policies**

Treat either auth cookie as requiring CSRF on unsafe requests. Keep login/register exempt only with allowed Origin. Mark refresh/logout `@Public()` solely so expired access can use the refresh credential; both endpoints validate the refresh token and CSRF before state change.

- [x] **Step 4: Implement frontend refresh recovery**

On hydration 401, call `/auth/csrf`, then `/auth/refresh`, then `/auth/me`. On ordinary 401, single-flight refresh and retry once; exclude login/register/refresh/logout from recursive refresh. Clear Query state and redirect on terminal failure.

Run in `api`: `npm.cmd test -- --runInBand modules/auth common/security`

Run in `web`: `npm.cmd test -- lib/api.test.ts contexts/auth-context.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit HTTP session flow**

```bash
git add api/src/modules/auth api/src/common/security api/src/main.ts web/lib/api.ts web/lib/api.test.ts web/contexts/auth-context.tsx web/contexts/auth-context.test.tsx
git commit -m "fix: secure refresh and logout flows"
```

### Task 5: Remove current runtime dependency advisories

**Files:**
- Modify: `api/package.json`
- Modify: `api/package-lock.json`
- Verify only: `web/package.json`
- Verify only: `web/package-lock.json`

**Interfaces:**
- Pins Nest 11 packages to at least `11.2.6` and Multer to `2.4.0`.
- Tests compatibility overrides for `mysql2 >= 3.24.5` and `deepmerge-ts >= 8.0.2` while retaining Prisma 7; removes an override if Prisma validate/generate/build proves incompatibility and documents the residual advisory instead of silently downgrading to Prisma 6.

- [x] **Step 1: Capture the current advisory regression test**

Run: `npm.cmd audit --omit=dev --json`

Expected current API baseline: 6 vulnerabilities (4 high, 2 moderate); frontend baseline: 0.

- [x] **Step 2: Update direct packages within approved majors**

Set Nest common/core/platform-express to `^11.2.6`, Multer override to `2.4.0`, and test narrow transitive overrides for the two Prisma CLI advisories. Regenerate only the API lockfile with `npm.cmd install`.

- [x] **Step 3: Verify package/tool compatibility**

Run: `npx.cmd prisma validate`

Run: `npx.cmd prisma generate`

Run: `npm.cmd test -- --runInBand`

Run: `npm.cmd run build`

Expected: PASS without major-version downgrade.

- [x] **Step 4: Re-run production audits**

Run in `api`: `npm.cmd audit --omit=dev`

Run in `web`: `npm.cmd audit --omit=dev`

Expected: no high/critical runtime advisory. Any unfixable tool-only advisory is explicitly separated from the production image proof in Task 6.

- [x] **Step 5: Commit dependency remediation**

```bash
git add api/package.json api/package-lock.json
git commit -m "fix: update vulnerable runtime dependencies"
```

### Task 6: Build production-only API and Next standalone images

**Files:**
- Modify: `Dockerfile`
- Modify: `web/Dockerfile`
- Modify: `web/next.config.mjs`
- Create: `api/src/infra/runtime/container-runtime.spec.ts`
- Create: `web/scripts/assert-standalone-runtime.mjs`
- Modify: `web/package.json`

**Interfaces:**
- API build stage retains dev tools; production dependencies stage runs `npm ci --omit=dev` and includes only runtime packages plus generated Prisma artifacts/migration CLI requirements.
- Next config sets `output: 'standalone'`; image copies `.next/standalone`, `.next/static`, and `public` only.

- [x] **Step 1: Write failing image/runtime assertions**

Assert Dockerfiles do not copy builder `node_modules`, API production install omits dev dependencies, web runtime uses `server.js`, and standalone output contains no Cypress/Vitest/ESLint/TypeScript package trees.

- [x] **Step 2: Run static assertions to verify failure**

Run in `api`: `npm.cmd test -- --runInBand infra/runtime/container-runtime.spec.ts`

Run in `web`: `node scripts/assert-standalone-runtime.mjs`

Expected: FAIL against current images.

- [x] **Step 3: Implement minimal multi-stage images**

Create a dedicated `migration` target that contains Prisma CLI/generated artifacts and runs `prisma migrate deploy`. Keep the final API `production` target free of Prisma CLI and start only the compiled Node application; deployment runs the migration target before replacing the application container. Copy standalone Next output and start `node server.js`.

- [x] **Step 4: Build and inspect images**

Run: `docker build -t safemove-api-security .`

Run: `docker build -t safemove-web-security web`

Run the assertion scripts against the built filesystem/image package list.

Expected: images start, health endpoints respond, and dev-only packages are absent.

- [x] **Step 5: Commit image hardening**

```bash
git add Dockerfile web/Dockerfile web/next.config.mjs api/src/infra/runtime/container-runtime.spec.ts web/scripts/assert-standalone-runtime.mjs web/package.json
git commit -m "build: ship production only runtimes"
```

### Task 7: Prove session lifecycle in API and browser

**Files:**
- Create: `api/test/auth-session.e2e-spec.ts`
- Create: `web/cypress/e2e/auth-session-security.cy.ts`
- Modify: `web/package.json`

**Interfaces:**
- Consumes Tasks 1-4 session contracts and Task 6 production runtime behavior.

- [x] **Step 1: Add API E2E session scenarios**

Cover login, 15-minute access claims, refresh rotation, replay revocation, logout revocation, authVersion invalidation, current-role reload, cookie flags/paths, and CSRF/origin failures.

- [x] **Step 2: Run the API E2E spec**

Run: `npm.cmd run test:e2e -- --runInBand auth-session.e2e-spec.ts`

Expected: PASS.

- [x] **Step 3: Add the real browser lifecycle**

Log in, expire/replace the access cookie in the fixture, reload and recover through refresh, verify one concurrent refresh, log out, and prove old access/refresh tokens cannot reopen the workspace. Inspect storage to confirm no token persistence.

- [x] **Step 4: Run build and Cypress**

Run: `npm.cmd run build`

Run: `npx.cmd cypress run --browser electron --spec cypress/e2e/auth-session-security.cy.ts`

Expected: PASS.

- [x] **Step 5: Commit delivery C verification**

```bash
git add api/test/auth-session.e2e-spec.ts web/cypress/e2e/auth-session-security.cy.ts web/package.json
git commit -m "test: verify revocable session lifecycle"
```
