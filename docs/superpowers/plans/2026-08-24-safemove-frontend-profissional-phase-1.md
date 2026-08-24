# SafeMove Professional Frontend Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a primeira fase do novo frontend profissional do SafeMove, com identidade SaaS Clínico Contemporâneo, workspaces isolados por profissão, sessão endurecida e jornadas críticas validadas contra frontend, API e PostgreSQL reais.

**Architecture:** O Next.js continua como cliente App Router, mas passa a ter um shell autenticado baseado em uma política tipada única de papéis, rotas, termos e ações. O dashboard e o prontuário usam somente `Client`, sem fallback para `User`; a API mantém o cookie de sessão `HttpOnly`, adiciona origem + double-submit CSRF para mutações por cookie e impõe papéis também nos endpoints clínicos legados. Vitest cobre contratos e componentes, Jest cobre a borda HTTP, e Cypress percorre o build de produção contra banco isolado.

**Tech Stack:** Next.js 16.2.7, React 19.1, TypeScript 5, Tailwind CSS 4, TanStack Query 5, Axios, NestJS 11, Prisma 7, PostgreSQL 16, Vitest, React Testing Library, Jest, Cypress 15 e cypress-axe.

**Spec:** `docs/superpowers/specs/2026-08-24-safemove-frontend-profissional-design.md`

## Global Constraints

- Preservar somente o nome `SafeMove`; a identidade visual anterior não é autoridade.
- Direção visual obrigatória: `SaaS Clínico Contemporâneo`.
- Composição obrigatória: `Visão geral equilibrada`, aprovada em `.impeccable/mocks/dashboard-comp-01.png`.
- Build path obrigatório: `comp-first`; o comp define composição e densidade, mas seus nomes, agenda, contadores e valores demonstrativos não são dados do produto.
- Nutricionista, Personal Trainer e Fisioterapeuta têm igual qualidade, porém cada conta enxerga somente o próprio domínio.
- Administrador permanece em painel isolado e não acessa superfícies clínicas.
- Acessibilidade alvo: WCAG 2.2 AA, teclado completo, foco visível, alvos de toque adequados e `prefers-reduced-motion`.
- Nenhuma métrica, alerta, agenda ou afirmação clínica pode aparecer sem fonte real, autorização e semântica verificável.
- Nenhum token de autenticação ou dado clínico novo pode ser persistido em `localStorage`, `sessionStorage`, IndexedDB ou cache persistente.
- Toda entrega segue Red, Green e Refactor; falha de ambiente, seletor ou seed não conta como Red.
- O gate final exige ESLint, `tsc --noEmit`, testes frontend/API, build de produção, Cypress sem mocks contra PostgreSQL de teste, capturas desktop/mobile, detector e revisão final Impeccable.

---

## File map

### Fundação e política de workspace

- `web/types/auth.ts`: papéis e contrato do usuário autenticado.
- `web/lib/professional-workspace.ts`: fonte única para termos, navegação, ações e permissão de rota.
- `web/components/auth/ProfessionalRouteBoundary.tsx`: bloqueio visual e redirecionamento de URL incompatível com o papel.
- `web/components/layout/*`: shell, sidebar, cabeçalho e navegação mobile.
- `web/components/feedback/AsyncState.tsx`: estados assíncronos semanticamente distintos.

### Segurança de sessão

- `api/src/modules/auth/auth-cookie-options.ts`: política única de cookie.
- `api/src/common/security/csrf-protection.ts`: geração, comparação e middleware de origem/CSRF.
- `web/lib/api.ts`: token CSRF somente em memória e tratamento central de `401`.
- `web/contexts/auth-context.tsx`: hidratação do novo contrato de sessão e limpeza de cache.

### Superfícies

- `web/app/page.tsx`, `web/app/auth/*`: landing e autenticação profissional.
- `web/app/home/page.tsx`, `web/components/features/dashboard/*`: dashboard baseado em `/clients`.
- `web/app/clientes/*`, `web/components/features/clients/*`: lista, formulário e prontuário modular.
- `web/app/clientes/[id]/nova-dieta/page.tsx`: remoção cirúrgica da persistência clínica local e migração explícita de rascunho antigo.

### Verificação

- `web/test/*`, arquivos `*.test.ts(x)`: Vitest/Testing Library.
- `api/src/**/*.spec.ts`, `api/test/*.e2e-spec.ts`: Jest e Supertest.
- `api/prisma/seed-phase1-e2e.ts`: fixtures sintéticas determinísticas.
- `web/cypress/e2e/professional-phase1-real.cy.ts`: jornadas reais, sem `cy.intercept`.
- `scripts/run-professional-phase1-e2e.ps1`: orquestra banco, migrations, API, Next e Cypress.

---

### Task 1: Restore frontend quality gates and define the workspace policy

**Files:**
- Modify: `web/package.json`
- Modify: `web/package-lock.json`
- Create: `web/eslint.config.mjs`
- Create: `web/vitest.config.mts`
- Create: `web/test/setup.ts`
- Create: `web/types/auth.ts`
- Create: `web/lib/professional-workspace.ts`
- Create: `web/lib/professional-workspace.test.ts`

**Interfaces:**
- Produces: `ProfessionalRole`, `UserRole`, `AuthUser`, `WorkspaceDefinition`, `getWorkspaceDefinition(role)`, `getNavigationForRole(role)` e `canAccessProfessionalPath(role, pathname)`.
- Consumes: rotas reais já existentes em `web/app`.

- [ ] **Step 1: Install and wire the missing quality dependencies**

Run in `web/`:

```powershell
npm.cmd install --save-dev eslint@^9.39.1 eslint-config-next@16.2.7 vitest@^3.2.4 @vitejs/plugin-react@^4.3.4 vite-tsconfig-paths@^5.1.4 jsdom@^26.1.0 @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.3 @testing-library/user-event@^14.6.1 @testing-library/cypress@^10.0.3 axios-mock-adapter@^2.1.0 axe-core@^4.10.3 cypress-axe@^1.6.0 cypress-real-events@^1.14.0
```

Set scripts to:

```json
{
  "lint": "eslint . --max-warnings=0",
  "typecheck": "tsc --noEmit --incremental false",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "e2e": "cypress run --browser electron"
}
```

Use the Next flat config in `eslint.config.mjs`, and configure Vitest with `environment: "jsdom"`, `setupFiles: ["./test/setup.ts"]`, the React plugin and the `@` alias through `vite-tsconfig-paths`.

- [ ] **Step 2: Write the failing role-policy tests**

```ts
import { describe, expect, it } from "vitest"
import { canAccessProfessionalPath, getNavigationForRole } from "./professional-workspace"

describe("professional workspace policy", () => {
  it.each([
    ["NUTRITIONIST", ["Planos alimentares", "Alimentos"], ["Planilhas", "Reabilitação"]],
    ["PERSONAL", ["Planilhas"], ["Planos alimentares", "Alimentos", "Reabilitação"]],
    ["PHYSIO", ["Reabilitação"], ["Planos alimentares", "Alimentos", "Planilhas"]],
  ] as const)("isolates %s navigation", (role, visible, absent) => {
    const labels = getNavigationForRole(role).map((item) => item.label)
    visible.forEach((label) => expect(labels).toContain(label))
    absent.forEach((label) => expect(labels).not.toContain(label))
  })

  it("rejects direct cross-domain paths and every clinical path for ADMIN", () => {
    expect(canAccessProfessionalPath("PERSONAL", "/clientes/c1/nova-dieta")).toBe(false)
    expect(canAccessProfessionalPath("NUTRITIONIST", "/clientes/c1/novo-treino")).toBe(false)
    expect(canAccessProfessionalPath("PHYSIO", "/clientes/c1/nova-reabilitacao")).toBe(true)
    expect(canAccessProfessionalPath("ADMIN", "/clientes")).toBe(false)
  })
})
```

- [ ] **Step 3: Run Red for the policy**

Run: `npm.cmd test -- professional-workspace.test.ts`

Expected: FAIL because `professional-workspace.ts` and its exports do not exist.

- [ ] **Step 4: Implement typed roles and the single workspace matrix**

```ts
export type ProfessionalRole = "NUTRITIONIST" | "PERSONAL" | "PHYSIO"
export type UserRole = ProfessionalRole | "ADMIN"

export interface AuthUser {
  sub: string
  role: UserRole
  email?: string
  name?: string
}

export interface WorkspaceNavigationItem {
  id: "home" | "clients" | "assessments" | "nutrition" | "foods" | "workouts" | "rehab"
  label: string
  href: string
}

export interface WorkspaceDefinition {
  role: ProfessionalRole
  areaLabel: string
  clientSingular: string
  clientPlural: string
  navigation: WorkspaceNavigationItem[]
}
```

In `professional-workspace.ts`, create one immutable record for the three roles. Use these exact role-only route prefixes in `canAccessProfessionalPath`:

```ts
const ROLE_ONLY_PREFIXES: ReadonlyArray<[string, readonly ProfessionalRole[]]> = [
  ["/dietas", ["NUTRITIONIST"]],
  ["/alimentos", ["NUTRITIONIST"]],
  ["/treinos", ["PERSONAL"]],
  ["/reabilitacao", ["PHYSIO"]],
  ["/clientes/:id/nova-dieta", ["NUTRITIONIST"]],
  ["/clientes/:id/calculo-energetico", ["NUTRITIONIST"]],
  ["/clientes/:id/exames", ["NUTRITIONIST"]],
  ["/clientes/:id/nova-suplementacao", ["NUTRITIONIST"]],
  ["/clientes/:id/novo-treino", ["PERSONAL"]],
  ["/clientes/:id/nova-reabilitacao", ["PHYSIO"]],
]
```

Treat `/home`, `/clientes`, `/clientes/:id` and `/avaliacoes` as professional routes; treat `/clientes/:id/visao-360` as denied for all roles because it contradicts the approved separation. `ADMIN` may access only `/home` among authenticated product routes.

- [ ] **Step 5: Run Green, then all frontend static gates**

Run:

```powershell
npm.cmd test -- professional-workspace.test.ts
npm.cmd run lint
npm.cmd run typecheck
```

Expected: all PASS with zero ESLint warnings.

- [ ] **Step 6: Refactor duplicate role strings without changing behavior**

Replace the local `User` type in `web/contexts/auth-context.tsx` with `AuthUser`, but do not alter its runtime flow in this task. Re-run the three commands from Step 5.

- [ ] **Step 7: Commit**

```powershell
git add -- web/package.json web/package-lock.json web/eslint.config.mjs web/vitest.config.mts web/test/setup.ts web/types/auth.ts web/lib/professional-workspace.ts web/lib/professional-workspace.test.ts web/contexts/auth-context.tsx
git commit -m "test: restore frontend quality gates"
```

---

### Task 2: Harden cookie sessions with origin and CSRF protection

**Files:**
- Create: `api/src/modules/auth/auth-cookie-options.ts`
- Create: `api/src/common/security/csrf-protection.ts`
- Create: `api/src/common/security/csrf-protection.spec.ts`
- Modify: `api/src/modules/auth/auth.controller.ts`
- Modify: `api/src/modules/auth/auth.controller.spec.ts`
- Modify: `api/src/main.ts`
- Modify: `api/.env.example`
- Modify: `web/lib/api.ts`
- Create: `web/lib/api.test.ts`
- Modify: `web/contexts/auth-context.tsx`
- Create: `web/contexts/auth-context.test.tsx`

**Interfaces:**
- Produces API response `AuthSessionResponse = { user: AuthUser; csrfToken: string }` from `GET /auth/me`.
- Produces frontend functions `setCsrfToken(token: string | null)` and `setUnauthorizedHandler(handler: (() => void) | null)`.
- Consumes `AuthUser` from Task 1 and `ALLOWED_ORIGINS` from environment.

- [ ] **Step 1: Write failing API tests for the session contract and unsafe requests**

Add tests asserting:

```ts
it("returns the authenticated user plus a CSRF token without exposing the JWT", () => {
  const response = { cookie: jest.fn() } as unknown as Response
  const body = controller.me({ user: { sub: "pro-1", role: "NUTRITIONIST" } } as Request, response)

  expect(body).toEqual({
    user: expect.objectContaining({ sub: "pro-1", role: "NUTRITIONIST" }),
    csrfToken: expect.any(String),
  })
  expect(JSON.stringify(body)).not.toContain("signed-token")
  expect(response.cookie).toHaveBeenCalledWith("csrf_token", expect.any(String), expect.objectContaining({ httpOnly: true }))
})

it("rejects a cookie-authenticated mutation without matching origin and CSRF header", async () => {
  await request(app.getHttpServer())
    .post("/auth/logout")
    .set("Origin", "http://localhost:3001")
    .set("Cookie", ["access_token=signed-token", "csrf_token=known-token"])
    .expect(403)
})
```

In the CSRF unit spec, test allowed origin + matching token, hostile origin, missing origin under cookie auth, and Bearer-only tooling without a cookie.

- [ ] **Step 2: Run API Red**

Run: `npm.cmd test -- auth.controller.spec.ts csrf-protection.spec.ts --runInBand`

Expected: FAIL because `/auth/me` returns the old shape and no CSRF middleware exists.

- [ ] **Step 3: Implement one cookie policy and double-submit CSRF**

Use `randomBytes(32).toString("base64url")` for the CSRF token and `timingSafeEqual` for comparisons. `AUTH_COOKIE_SAME_SITE` accepts only `lax`, `strict` or `none`; reject `none` unless secure cookies are enabled. Keep both `access_token` and `csrf_token` `HttpOnly`; the CSRF value reaches JavaScript only in the `/auth/me` response and stays in memory.

The middleware behavior must be exactly:

```ts
if (SAFE_METHODS.has(request.method)) return next()
if (origin && !allowedOrigins.includes(origin)) throw new ForbiddenException("Origem não autorizada.")
if (PUBLIC_AUTH_MUTATIONS.has(request.path) && origin) return next()
if (!request.cookies?.access_token) return next() // Bearer/API tooling remains possible
if (!origin || !allowedOrigins.includes(origin)) throw new ForbiddenException("Origem obrigatória.")
assertCsrfPair(request.cookies.csrf_token, request.header("x-csrf-token"))
return next()
```

Register it after `cookieParser()` and add `X-CSRF-Token` to CORS `allowedHeaders`. Set `AUTH_COOKIE_SAME_SITE=lax` and `AUTH_COOKIE_SECURE=false` in `api/.env.example`.

- [ ] **Step 4: Change `/auth/me` and logout to the new session contract**

`GET /auth/me` generates a CSRF token, sets its cookie with the shared options, and returns `{ user: req.user, csrfToken }`. Logout clears both cookies using the same `path`, `domain`, `secure` and `sameSite` values used to set them. Login still returns no authentication token.

- [ ] **Step 5: Write failing frontend interceptor tests**

```ts
it("adds the in-memory CSRF token only to unsafe methods", async () => {
  setCsrfToken("csrf-memory")
  mock.onPost("/clients").reply((config) => {
    expect(config.headers?.["X-CSRF-Token"]).toBe("csrf-memory")
    return [201, { id: "c1" }]
  })
  await api.post("/clients", { name: "Ana" })
})

it("calls the centralized handler once for a 401 outside auth hydration", async () => {
  const handler = vi.fn()
  setUnauthorizedHandler(handler)
  mock.onGet("/clients").reply(401)
  await expect(api.get("/clients")).rejects.toBeDefined()
  expect(handler).toHaveBeenCalledTimes(1)
})
```

Use `axios-mock-adapter` as an additional dev dependency for this test.

- [ ] **Step 6: Run frontend Red and implement in-memory session handling**

Run: `npm.cmd test -- api.test.ts auth-context.test.tsx`

Expected: FAIL because the two setter functions and wrapped session response do not exist.

In `web/lib/api.ts`, add the CSRF request interceptor and a response interceptor that ignores `401` only for `/auth/me`, `/auth/login` and `/auth/logout`; all other `401`s call the registered handler. In `AuthProvider`, register a stable handler that clears the QueryClient, clears the CSRF value, clears the user, and `replace`s `/auth/login?reason=session-expired`. Hydration must read `response.data.user` and call `setCsrfToken(response.data.csrfToken)`.

- [ ] **Step 7: Run Green and regression gates**

Run:

```powershell
npm.cmd test -- auth.controller.spec.ts csrf-protection.spec.ts --runInBand
Set-Location ..\web
npm.cmd test -- api.test.ts auth-context.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```powershell
git add -- api/src/modules/auth api/src/common/security api/src/main.ts api/.env.example web/lib/api.ts web/lib/api.test.ts web/contexts/auth-context.tsx web/contexts/auth-context.test.tsx web/package.json web/package-lock.json
git commit -m "security: harden cookie session boundary"
```

---

### Task 3: Build the design contract, tokens, accessible app shell and route boundary

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/app/layout.tsx`
- Modify: `web/components/LayoutWrapper.tsx`
- Delete: `web/components/Sidebar.tsx`
- Create: `web/components/design/DirectionContract.tsx`
- Create: `web/components/layout/AppShell.tsx`
- Create: `web/components/layout/ProfessionalSidebar.tsx`
- Create: `web/components/layout/WorkspaceHeader.tsx`
- Create: `web/components/layout/MobileNavigation.tsx`
- Create: `web/components/layout/AppShell.test.tsx`
- Create: `web/components/auth/ProfessionalRouteBoundary.tsx`
- Create: `web/components/auth/ProfessionalRouteBoundary.test.tsx`
- Create: `web/components/feedback/AsyncState.tsx`

**Interfaces:**
- Consumes: `AuthUser`, `getWorkspaceDefinition`, `getNavigationForRole` and `canAccessProfessionalPath`.
- Produces: `AppShell({ children })`, `ProfessionalRouteBoundary({ children })` and `AsyncState({ kind, title, description, action })`.

- [ ] **Step 1: Record the direction contract before UI code**

The first element inside `<body>` must be a `<template aria-hidden="true">` whose emitted contents contain this comment, so the seed survives the production build:

```html
<!--
THESIS: SafeMove is a calm private workspace for one professional practice, refusing the crowded multidisciplinary control panel.
OWN-WORLD: Cold-white ground, deep navy type, teal action, hairline slate borders, restrained elevation, compact linear icons, small and medium radii.
STORY: The professional recognizes their area and private base, finds a client, understands honest workload, then takes one permitted action.
FIRST VIEWPORT: Light sidebar; workspace identity, search and account in the header; profession-safe actions; real client summary; recent clients with generous whitespace.
FORM: SaaS Clinico Contemporaneo, canonical direction, seed 49524f2c; approved comp dashboard-comp-01.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->
```

Implement `DirectionContract` with `dangerouslySetInnerHTML` containing only this constant and no user-controlled value.

- [ ] **Step 2: Write failing shell and direct-route tests**

Render the shell with each role and assert landmark names, private-base copy, visible role label, mobile menu button, and absence of cross-domain links. Render `ProfessionalRouteBoundary` at `/clientes/c1/nova-dieta` as Personal and assert `router.replace("/home?access=denied")`.

- [ ] **Step 3: Run Red**

Run: `npm.cmd test -- AppShell.test.tsx ProfessionalRouteBoundary.test.tsx`

Expected: FAIL because the new components do not exist.

- [ ] **Step 4: Define the visual tokens and accessibility floor**

Add these semantic tokens to `globals.css` and consume the tokens rather than raw page colors:

```css
:root {
  --sm-canvas: #f7f9fb;
  --sm-surface: #ffffff;
  --sm-ink: #0f172a;
  --sm-muted: #526176;
  --sm-border: #dbe3ea;
  --sm-brand: #0f766e;
  --sm-brand-hover: #115e59;
  --sm-danger: #b42318;
  --sm-focus: #0e7490;
  --sm-radius-sm: 0.5rem;
  --sm-radius-md: 0.75rem;
  --sm-shadow-rest: 0 1px 2px rgb(15 23 42 / 0.06);
}

:focus-visible { outline: 3px solid var(--sm-focus); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

Use one contemporary sans through `next/font`; keep body at 16px minimum and secondary text at contrast AA.

- [ ] **Step 5: Implement the shell from focused components**

`ProfessionalSidebar` maps only `getNavigationForRole(user.role)`. `WorkspaceHeader` contains area label, a real client-search entry point linking to `/clientes?focus=search`, “Base privada · somente sua conta”, account menu and logout. `MobileNavigation` exposes the same allowed destinations inside a labeled menu/dialog; logout lives in the account section, not a primary nav slot.

`ProfessionalRouteBoundary` must return children only after auth hydration and permission evaluation. An incompatible role redirects without rendering the target page. Public routes render outside `AppShell`; authenticated routes render inside it.

Change the authenticated professional redirect target in `AuthProvider` from `/clientes` to `/home`; keep `ADMIN` on `/home` and let `ProfessionalRouteBoundary` isolate the administrative rendering. Add this redirect assertion to `ProfessionalRouteBoundary.test.tsx`.

- [ ] **Step 6: Run Green and inspect keyboard behavior**

Run:

```powershell
npm.cmd test -- AppShell.test.tsx ProfessionalRouteBoundary.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: PASS. In the component test, tab through menu, account and logout and assert focus order.

- [ ] **Step 7: Build and verify contract persistence**

Run:

```powershell
npm.cmd run build
rg -n "seed 49524f2c" .next
```

Expected: build PASS and at least one emitted server artifact contains the seed. If the `<template>` is stripped, move the same safe constant to the earliest root-layout emission mechanism that produces a real body comment, rebuild, and repeat the grep before committing.

- [ ] **Step 8: Commit**

```powershell
git add -- web/app/globals.css web/app/layout.tsx web/components/LayoutWrapper.tsx web/components/design web/components/layout web/components/auth web/components/feedback
git add -u -- web/components/Sidebar.tsx
git commit -m "feat: add professional app shell"
```

---

### Task 4: Reposition the landing, login and registration surfaces

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/app/auth/login/page.tsx`
- Modify: `web/app/auth/register/page.tsx`
- Create: `web/components/marketing/ProfessionalAreas.tsx`
- Create: `web/app/auth/auth-pages.test.tsx`

**Interfaces:**
- Consumes: `ProfessionalRole`, the session contract from Task 2 and public/authenticated layout split from Task 3.
- Produces: a professional-only acquisition and authentication journey; registration sends exactly one allowed role.

- [ ] **Step 1: Write failing copy, role and error-state tests**

```tsx
it("presents SafeMove to professionals without corporate HR claims", () => {
  render(<LandingPage />)
  expect(screen.getByRole("heading", { name: /seu trabalho clínico, em uma base privada/i })).toBeVisible()
  expect(screen.getByText(/nutricionista/i)).toBeVisible()
  expect(screen.getByText(/personal trainer/i)).toBeVisible()
  expect(screen.getByText(/fisioterapeuta/i)).toBeVisible()
  expect(screen.queryByText(/recursos humanos|saúde corporativa|colaboradores/i)).not.toBeInTheDocument()
})

it("distinguishes invalid credentials from unavailable service", async () => {
  mockApi.onPost("/auth/login").replyOnce(401)
  await userEvent.type(screen.getByLabelText("E-mail"), "pro@example.test")
  await userEvent.type(screen.getByLabelText("Senha"), "Senha-forte-2026")
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }))
  expect(await screen.findByText("E-mail ou senha inválidos.")).toBeVisible()

  mockApi.resetHandlers()
  mockApi.onPost("/auth/login").networkErrorOnce()
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }))
  expect(await screen.findByText("Não foi possível acessar o SafeMove agora. Tente novamente.")).toBeVisible()
})
```

Test that registration exposes exactly Nutricionista, Personal Trainer and Fisioterapeuta, sends one of `NUTRITIONIST | PERSONAL | PHYSIO`, and shows password requirements before submit.

- [ ] **Step 2: Run Red**

Run: `npm.cmd test -- auth-pages.test.tsx`

Expected: FAIL on old corporate copy and undifferentiated errors.

- [ ] **Step 3: Implement the public narrative and auth forms**

Landing structure: compact SafeMove header, headline “Seu trabalho clínico, em uma base privada”, concise paragraph, primary “Criar conta profissional”, secondary “Entrar”, three equal profession descriptions, confirmed capability section for private client records, and a final CTA. Do not add testimonials, compliance badges, analytics claims, patient collaboration or numeric results.

Login title is “Entrar no SafeMove”. Registration title is “Criar conta profissional”, with the role selector before contact fields and these visible password rules: at least 8 characters, one uppercase letter, one lowercase letter and one number. Keep backend validation authoritative.

- [ ] **Step 4: Implement semantic API error mapping**

Create a local `toAuthMessage(error)` that maps `401` to invalid credentials, `429` to too many attempts, `5xx` to service unavailable and missing Axios response to network unavailable. Field validation stays next to the field with `aria-describedby`; page-level errors use `role="alert"`.

- [ ] **Step 5: Run Green, typecheck and lint**

Run:

```powershell
npm.cmd test -- auth-pages.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- web/app/page.tsx web/app/auth web/components/marketing
git commit -m "feat: reposition SafeMove for professionals"
```

---

### Task 5: Replace the fake dashboard with the approved balanced overview

**Files:**
- Delete: `web/hooks/features/useHomeDashboard.ts`
- Modify: `web/app/home/page.tsx`
- Create: `web/hooks/features/useProfessionalDashboard.ts`
- Create: `web/hooks/features/useProfessionalDashboard.test.tsx`
- Create: `web/components/features/dashboard/ProfessionalDashboard.tsx`
- Create: `web/components/features/dashboard/QuickActions.tsx`
- Create: `web/components/features/dashboard/DashboardSummary.tsx`
- Create: `web/components/features/dashboard/RecentClients.tsx`
- Create: `web/components/features/dashboard/ProfessionalDashboard.test.tsx`

**Interfaces:**
- Consumes: `useClients("ACTIVE" | "ARCHIVED")`, `WorkspaceDefinition`, `Client`, `AsyncState` and the Task 3 shell.
- Produces: `useProfessionalDashboard(): { activeClients; archivedClients; recentClients; status }` and dashboard components that never accept unproven metrics.

- [ ] **Step 1: Write failing hook and dashboard tests**

```tsx
it("derives only honest summary values from /clients", async () => {
  const { result } = renderHook(() => useProfessionalDashboard(), { wrapper })
  await waitFor(() => expect(result.current.status).toBe("ready"))
  expect(result.current.activeClients).toHaveLength(2)
  expect(result.current.archivedClients).toHaveLength(1)
  expect(result.current.recentClients.map((client) => client.id)).toEqual(["latest", "older"])
})

it("shows only actions valid for the signed-in profession", () => {
  renderDashboardAs("PERSONAL")
  expect(screen.getByRole("link", { name: /novo aluno/i })).toHaveAttribute("href", "/clientes/novo")
  expect(screen.queryByText(/dieta|alimento|reabilitação/i)).not.toBeInTheDocument()
})
```

Also test loading, empty, 401, 404/forbidden-equivalent, network and `5xx` as distinct states.

- [ ] **Step 2: Run Red**

Run: `npm.cmd test -- useProfessionalDashboard.test.tsx ProfessionalDashboard.test.tsx`

Expected: FAIL because the existing dashboard still uses `/users` and fixed alert/inactivity content.

- [ ] **Step 3: Implement the typed hook from real client lists**

Fetch active and archived clients with session-scoped query keys. Define recent clients as the five active clients with greatest valid `updatedAt`; if dates are invalid, preserve API order after valid entries. Return `loading`, `ready`, `empty`, `network-error`, `server-error` or `unauthorized` without converting errors to empty arrays.

- [ ] **Step 4: Implement the balanced first viewport**

Match `.impeccable/mocks/dashboard-comp-01.png` at its desktop proportions: light sidebar, restrained top header, small action row, low-elevation white summary surface and a dominant recent-client list. The only phase-one values are active count, archived count and recent clients derived above. Do not render agenda, clinical alerts, progress or “all clear”.

Actions are limited to real migrated routes: new client, client directory and archived-client view. Labels use role terminology (`cliente`, `aluno`, `paciente`) from `WorkspaceDefinition`; profession-specific legacy module actions remain absent until their migrations.

- [ ] **Step 5: Run Green and static gates**

Run:

```powershell
npm.cmd test -- useProfessionalDashboard.test.tsx ProfessionalDashboard.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Capture desktop reproduction before responsive adaptation**

Run the production app with deterministic E2E data, capture the dashboard at the comp dimensions, and place it at `.impeccable/review/dashboard-reproduction.png`. Open it beside `.impeccable/mocks/dashboard-comp-01.png`; correct topology, spacing, type scale, field temperature, line weight and density in one batch. Only then add the mobile reflow.

- [ ] **Step 7: Commit**

```powershell
git add -- web/app/home/page.tsx web/hooks/features web/components/features/dashboard .impeccable/review/dashboard-reproduction.png
git add -u -- web/hooks/features/useHomeDashboard.ts
git commit -m "feat: rebuild professional dashboard"
```

---

### Task 6: Modernize the client directory and role-aware intake form

**Files:**
- Modify: `web/app/clientes/page.tsx`
- Modify: `web/app/clientes/novo/page.tsx`
- Modify: `web/components/features/clients/ClientForm.tsx`
- Create: `web/components/features/clients/client-field-policy.ts`
- Create: `web/components/features/clients/client-field-policy.test.ts`
- Create: `web/components/features/clients/ClientFilters.tsx`
- Create: `web/components/features/clients/ClientList.tsx`
- Create: `web/components/features/clients/ClientListItem.tsx`
- Create: `web/components/features/clients/ClientDirectory.test.tsx`

**Interfaces:**
- Consumes: `Client`, `ClientFormValues`, `ProfessionalRole`, `useClients` and `WorkspaceDefinition`.
- Produces: `getClientFieldGroups(role)` and responsive `ClientList` with archive/restore controls.

- [ ] **Step 1: Write failing field-policy and directory tests**

```ts
it("does not expose nutrition-only intake fields to a Personal", () => {
  const names = getClientFieldGroups("PERSONAL").flatMap((group) => group.fields)
  expect(names).toContain("exerciseFrequency")
  expect(names).not.toContain("foodRelationship")
  expect(names).not.toContain("allergies")
})

it("keeps archive and restore explicit and never offers deletion", async () => {
  render(<ClientList clients={[activeClient]} status="ACTIVE" onArchive={vi.fn()} onRestore={vi.fn()} />)
  expect(screen.getByRole("button", { name: /arquivar/i })).toBeVisible()
  expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument()
})
```

The policy must include common identity/contact fields for every role and only relevant clinical context for the selected role.

- [ ] **Step 2: Run Red**

Run: `npm.cmd test -- client-field-policy.test.ts ClientDirectory.test.tsx`

Expected: FAIL because the form currently renders a shared all-domain field set and the directory is not componentized.

- [ ] **Step 3: Implement the exact field matrix**

Use this matrix:

```ts
const COMMON = ["name", "email", "phone", "birthDate", "gender", "goal", "professionalNotes", "privacyNotes"] as const
const BY_ROLE = {
  NUTRITIONIST: ["height", "initialWeight", "allergies", "pathologies", "typicalSleep", "stressLevel", "foodRelationship", "psychologyHistory", "workActivityLevel"],
  PERSONAL: ["height", "initialWeight", "pathologies", "exerciseType", "exerciseFrequency", "exerciseDuration", "hasPersonal", "workActivityLevel"],
  PHYSIO: ["height", "initialWeight", "pathologies", "exerciseType", "exerciseFrequency", "exerciseDuration", "workActivityLevel"],
} as const
```

Hidden fields must not be submitted. Existing data outside the visible role matrix must not be overwritten with `null` during edit.

- [ ] **Step 4: Implement desktop table and mobile list from one data model**

`ClientFilters` controls search and `ACTIVE | ARCHIVED`. Desktop uses a semantic table with named column headers; mobile uses `ClientListItem` with the same name, contact, status and update date. Search is client-side over the authorized result set for this phase. Use accessible confirmation dialogs for archive/restore and keep mutation buttons disabled until mutation plus refetch settle.

- [ ] **Step 5: Run Green and regression tests**

Run:

```powershell
npm.cmd test -- client-field-policy.test.ts ClientDirectory.test.tsx
npm.cmd run typecheck
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add -- web/app/clientes/page.tsx web/app/clientes/novo/page.tsx web/components/features/clients
git commit -m "feat: modernize professional client directory"
```

---

### Task 7: Split the client record and remove legacy data fallbacks and browser drafts

**Files:**
- Modify: `web/hooks/features/useClientRecord.ts`
- Create: `web/hooks/features/useClientRecord.test.tsx`
- Modify: `web/app/clientes/[id]/page.tsx`
- Create: `web/components/features/clients/ClientRecordHeader.tsx`
- Create: `web/components/features/clients/ClientOverviewSection.tsx`
- Create: `web/components/features/clients/ProfessionalScopePanel.tsx`
- Create: `web/components/features/clients/ClientRecord.test.tsx`
- Create: `web/lib/legacy-clinical-draft.ts`
- Create: `web/lib/legacy-clinical-draft.test.ts`
- Modify: `web/app/clientes/[id]/nova-dieta/page.tsx`

**Interfaces:**
- Produces: `useClientRecord(clientId)` returning the typed `Client` query only; `readLegacyDietDraft`, `consumeLegacyDietDraft` and `discardLegacyDietDraft`.
- Consumes: `Client`, `ProfessionalRole`, `AsyncState`, `canAccessProfessionalPath` and Task 6 field policy.

- [ ] **Step 1: Write failing tests for the removed fallback and role-only record**

```ts
it("requests only /clients/:id and preserves authorization errors", async () => {
  mockApi.onGet("/clients/c1").reply(404, { message: "Not found" })
  const { result } = renderHook(() => useClientRecord("c1"), { wrapper })
  await waitFor(() => expect(result.current.status).toBe("not-found"))
  expect(mockApi.history.get.map((request) => request.url)).toEqual(["/clients/c1"])
})

it("never loads another profession domain", () => {
  renderRecordAs("PHYSIO")
  expect(screen.getByText("Reabilitação")).toBeVisible()
  expect(screen.queryByText(/dieta|plano alimentar|planilha de treino/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run record Red**

Run: `npm.cmd test -- useClientRecord.test.tsx ClientRecord.test.tsx`

Expected: FAIL because the current hook falls back to `/users/:id`, queries every clinical domain and returns broad `any` values.

- [ ] **Step 3: Reduce `useClientRecord` to the authorized Client snapshot**

The hook makes exactly one request to `/clients/:id`, uses `queryKeys.client(sessionUserId, clientId)`, and maps Axios status into `ready | not-found | unauthorized | network-error | server-error`. It must not catch and replace the error with another endpoint or empty data.

- [ ] **Step 4: Split and implement the record surface**

`ClientRecordHeader` owns name, role-appropriate entity label, status, last update and archive action. `ClientOverviewSection` renders only fields in `getClientFieldGroups(role)`. `ProfessionalScopePanel` names the authenticated area and shows only a migrated action; non-migrated diet, workout and rehab summaries are absent rather than loaded from legacy `User` resources. Remove administrator-as-all-professions logic.

- [ ] **Step 5: Write failing legacy-draft tests**

```ts
it("detects an old diet draft but never removes it before explicit choice", () => {
  localStorage.setItem("diet_draft_c1", JSON.stringify(validDraft))
  expect(readLegacyDietDraft("c1")).toEqual(validDraft)
  expect(localStorage.getItem("diet_draft_c1")).not.toBeNull()
})

it("consumes an old draft into memory and removes persistent clinical data", () => {
  localStorage.setItem("diet_draft_c1", JSON.stringify(validDraft))
  expect(consumeLegacyDietDraft("c1")).toEqual(validDraft)
  expect(localStorage.getItem("diet_draft_c1")).toBeNull()
})
```

- [ ] **Step 6: Run draft Red and implement explicit migration**

Run: `npm.cmd test -- legacy-clinical-draft.test.ts`

Expected: FAIL because the helper does not exist.

The diet page must stop every `localStorage.setItem`. On first load, if a valid old key exists, show a blocking choice: “Carregar nesta sessão e remover do navegador” or “Descartar rascunho local”. Neither choice runs automatically. Loading copies the parsed data to React state and removes the key immediately; discarding removes it without reading it into the form. Invalid JSON is reported as an unreadable legacy draft and removed only after confirmation. Replace `/users/:id` with `/clients/:id` for the profile request.

- [ ] **Step 7: Run Green and scan for forbidden persistence/fallbacks**

Run:

```powershell
npm.cmd test -- useClientRecord.test.tsx ClientRecord.test.tsx legacy-clinical-draft.test.ts
rg -n "api\.get.*users/|localStorage\.setItem|sessionStorage\.setItem" app components hooks lib
npm.cmd run typecheck
npm.cmd run lint
```

Expected: tests PASS; the scan returns no clinical write and no `/users/:id` fallback in the redesigned scope.

- [ ] **Step 8: Commit**

```powershell
git add -- web/hooks/features/useClientRecord.ts web/hooks/features/useClientRecord.test.tsx web/app/clientes/[id] web/components/features/clients web/lib/legacy-clinical-draft.ts web/lib/legacy-clinical-draft.test.ts
git commit -m "security: isolate professional client records"
```

---

### Task 8: Enforce professional domains at the API boundary

**Files:**
- Create: `api/src/common/policies/professional-domain-roles.ts`
- Create: `api/src/common/policies/professional-domain-roles.spec.ts`
- Modify: `api/src/modules/foods/foods.controller.ts`
- Modify: `api/src/modules/assessments/assessments.controller.ts`
- Modify: `api/src/modules/anamneses/anamneses.controller.ts`
- Modify: `api/src/modules/lab-exams/lab-exams.controller.ts`
- Modify: `api/src/modules/physio-assessments/physio-assessments.controller.ts`
- Modify: `api/src/modules/supplements/supplements.controller.ts`
- Modify: `api/src/modules/diet-plans/diet-plans.controller.ts`
- Modify: `api/src/modules/workouts/workouts.controller.ts`
- Modify: `api/src/modules/rehab-plans/rehab-plans.controller.ts`
- Modify: `api/src/modules/consultation-notes/consultation-notes.controller.ts`
- Modify: `api/src/modules/metrics/metrics.controller.ts`
- Create: `api/test/professional-domain-boundaries.e2e-spec.ts`

**Interfaces:**
- Produces: immutable `DOMAIN_ROLES` constants consumed by `@Roles`.
- Consumes: `JwtAuthGuard`, `RolesGuard`; the E2E test reuses the real `RolesGuard` and only substitutes authentication identity as in `clients.e2e-spec.ts`.

- [ ] **Step 1: Write failing policy and direct-endpoint tests**

Define the expected policy:

```ts
expect(DOMAIN_ROLES).toEqual({
  nutrition: ["NUTRITIONIST"],
  training: ["PERSONAL"],
  rehabilitation: ["PHYSIO"],
  sharedAssessment: ["NUTRITIONIST", "PERSONAL", "PHYSIO"],
})
```

The E2E spec must directly call at least one endpoint per domain and assert `403` for the other two professions and for `ADMIN`. It must also assert that `/metrics/*` is no longer public. Mock each domain service inside the Nest testing module so a `403` proves the controller guard ran before business logic; keep the existing real-database clients E2E as the ownership proof for the migrated `Client` resource.

Use this table-driven assertion after the test auth guard has populated `request.user` from headers:

```ts
const boundaries = [
  { path: "/foods", allowed: "NUTRITIONIST", denied: ["PERSONAL", "PHYSIO", "ADMIN"] },
  { path: "/workouts", allowed: "PERSONAL", denied: ["NUTRITIONIST", "PHYSIO", "ADMIN"] },
  { path: "/rehab-plans", allowed: "PHYSIO", denied: ["NUTRITIONIST", "PERSONAL", "ADMIN"] },
] as const

for (const boundary of boundaries) {
  for (const deniedRole of boundary.denied) {
    await request(app.getHttpServer())
      .get(boundary.path)
      .set("x-test-user-id", `${deniedRole.toLowerCase()}-id`)
      .set("x-test-role", deniedRole)
      .expect(403)
  }

  await request(app.getHttpServer())
    .get(boundary.path)
    .set("x-test-user-id", `${boundary.allowed.toLowerCase()}-id`)
    .set("x-test-role", boundary.allowed)
    .expect(200)
}

await request(app.getHttpServer()).get("/metrics/today/client-a").expect(401)
```

- [ ] **Step 2: Run API Red**

Run: `npm.cmd test -- professional-domain-roles.spec.ts --runInBand`

Then run the new E2E spec with the isolated database environment.

Expected: FAIL because several controllers have no `@Roles`, `metrics` has no guards, and clinical controllers still admit `ADMIN`.

- [ ] **Step 3: Implement the domain-role constants and decorators**

Apply:

```ts
export const DOMAIN_ROLES = {
  nutrition: ["NUTRITIONIST"],
  training: ["PERSONAL"],
  rehabilitation: ["PHYSIO"],
  sharedAssessment: ["NUTRITIONIST", "PERSONAL", "PHYSIO"],
} as const
```

Nutrition: foods, diets, anamneses, lab exams, supplements and consultation notes. Training: workouts. Rehabilitation: rehab plans and physio assessments. General assessments use `sharedAssessment` until a later migration splits their schema. Remove `ADMIN` from every clinical decorator. Add `@UseGuards(JwtAuthGuard, RolesGuard)` and the narrowest role set to metrics; do not surface metrics in phase one because its legacy `patientId` ownership is not yet migrated.

- [ ] **Step 4: Run Green including current ownership tests**

Run:

```powershell
npm.cmd test -- professional-domain-roles.spec.ts --runInBand
npm.cmd run test:e2e -- --runInBand professional-domain-boundaries.e2e-spec.ts
npm.cmd run test:e2e -- --runInBand clients.e2e-spec.ts
npm.cmd run build
```

Expected: all PASS. A domain role test does not replace the `Client` tenant-isolation test; both must remain green.

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/common/policies api/src/modules/foods api/src/modules/assessments api/src/modules/anamneses api/src/modules/lab-exams api/src/modules/physio-assessments api/src/modules/supplements api/src/modules/diet-plans api/src/modules/workouts api/src/modules/rehab-plans api/src/modules/consultation-notes api/src/modules/metrics api/test/professional-domain-boundaries.e2e-spec.ts
git commit -m "security: enforce professional domain boundaries"
```

---

### Task 9: Add deterministic real Cypress journeys and the isolated runner

**Files:**
- Modify: `web/cypress.config.ts`
- Modify: `web/cypress/support/e2e.ts`
- Create: `web/cypress/support/commands.ts`
- Create: `web/cypress/e2e/professional-phase1-real.cy.ts`
- Create: `api/prisma/seed-phase1-e2e.ts`
- Modify: `api/package.json`
- Create: `scripts/run-professional-phase1-e2e.ps1`
- Modify: `docker-compose.test.yml`

**Interfaces:**
- Produces: `npm run seed:phase1-e2e`, Cypress command `cy.loginAs(role)` and one root runner that returns the Cypress exit code.
- Consumes: fixed PostgreSQL test URL, production Next build, real Nest app, the role/session/client contracts from Tasks 1–8.

- [ ] **Step 1: Create a safe deterministic seed**

The seed must exit unless `DATABASE_URL` ends in `_test`. Use fixed UUIDs and credentials:

```ts
export const E2E = {
  password: "SafeMove-E2E-2026!",
  nutritionist: { id: "31000000-0000-4000-8000-000000000001", email: "nutri.phase1@e2e.test" },
  personal: { id: "31000000-0000-4000-8000-000000000002", email: "personal.phase1@e2e.test" },
  physio: { id: "31000000-0000-4000-8000-000000000003", email: "physio.phase1@e2e.test" },
  tenantB: { id: "31000000-0000-4000-8000-000000000004", email: "tenant-b.phase1@e2e.test" },
  clientA: "41000000-0000-4000-8000-000000000001",
  clientB: "41000000-0000-4000-8000-000000000002",
} as const
```

Hash the password with bcrypt, upsert four professionals, create `clientA` for the nutritionist and `clientB` for tenant B, and delete only records owned by these fixed fixture users before recreation.

- [ ] **Step 2: Write the Cypress spec before starting services**

The spec must contain no `cy.intercept`. Cover:

In `web/cypress/support/e2e.ts`, import `@testing-library/cypress/add-commands`, `cypress-axe` and `cypress-real-events/support`. Define the login command without bypassing the UI:

```ts
type E2ERole = "NUTRITIONIST" | "PERSONAL" | "PHYSIO"

const emailByRole: Record<E2ERole, string> = {
  NUTRITIONIST: "nutri.phase1@e2e.test",
  PERSONAL: "personal.phase1@e2e.test",
  PHYSIO: "physio.phase1@e2e.test",
}

Cypress.Commands.add("loginAs", (role: E2ERole) => {
  cy.visit("/auth/login")
  cy.findByLabelText("E-mail").type(emailByRole[role])
  cy.findByLabelText("Senha").type("SafeMove-E2E-2026!", { log: false })
  cy.findByRole("button", { name: "Entrar" }).click()
  cy.location("pathname").should("eq", "/home")
})
```

Augment `Cypress.Chainable` in `commands.ts` with `loginAs(role: E2ERole): Chainable<void>`.

```ts
const credentials = {
  NUTRITIONIST: { email: "nutri.phase1@e2e.test", area: "Área de Nutrição", allowed: /planos alimentares|alimentos/i, denied: /planilhas|reabilitação/i },
  PERSONAL: { email: "personal.phase1@e2e.test", area: "Área de Treinamento", allowed: /planilhas/i, denied: /planos alimentares|alimentos|reabilitação/i },
  PHYSIO: { email: "physio.phase1@e2e.test", area: "Área de Fisioterapia", allowed: /reabilitação/i, denied: /planos alimentares|alimentos|planilhas/i },
} as const

it("registers, logs in, hydrates and logs out through real HTTP", () => {
  const email = `new-professional-${Date.now()}@e2e.test`
  cy.visit("/auth/register")
  cy.findByLabelText("Nutricionista").click()
  cy.findByLabelText("Nome").type("Profissional Nova")
  cy.findByLabelText("E-mail").type(email)
  cy.findByLabelText("Senha").type("SafeMove-E2E-2026!")
  cy.findByRole("button", { name: "Criar conta" }).click()
  cy.location("pathname").should("eq", "/auth/login")
  cy.findByLabelText("E-mail").type(email)
  cy.findByLabelText("Senha").type("SafeMove-E2E-2026!")
  cy.findByRole("button", { name: "Entrar" }).click()
  cy.findByText("Base privada · somente sua conta").should("be.visible")
  cy.reload()
  cy.findByText("Profissional Nova").should("be.visible")
  cy.findByRole("button", { name: /conta/i }).click()
  cy.findByRole("button", { name: "Sair" }).click()
  cy.location("pathname").should("eq", "/auth/login")
})

Object.entries(credentials).forEach(([role, account]) => {
  it(`shows only the ${role} workspace`, () => {
    cy.loginAs(role as keyof typeof credentials)
    cy.findByText(account.area).should("be.visible")
    cy.findByRole("navigation", { name: "Navegação profissional" }).within(() => {
      cy.contains(account.allowed).should("exist")
      cy.contains(account.denied).should("not.exist")
    })
  })
})

it("creates, edits, archives and restores a client", () => {
  cy.loginAs("NUTRITIONIST")
  cy.findByRole("link", { name: /novo cliente/i }).click()
  cy.findByLabelText("Nome").type("Cliente Jornada Real")
  cy.findByLabelText("E-mail").type("client-journey@e2e.test")
  cy.findByRole("button", { name: "Salvar cliente" }).click()
  cy.findByRole("link", { name: "Cliente Jornada Real" }).click()
  cy.findByLabelText("Nome").clear().type("Cliente Jornada Atualizada")
  cy.findByRole("button", { name: "Salvar alterações" }).click()
  cy.findByRole("button", { name: "Arquivar cliente" }).click()
  cy.findByRole("button", { name: "Confirmar arquivamento" }).click()
  cy.visit("/clientes?status=ARCHIVED")
  cy.findByText("Cliente Jornada Atualizada").should("be.visible")
  cy.findByRole("button", { name: /restaurar cliente/i }).click()
  cy.findByRole("button", { name: "Confirmar restauração" }).click()
  cy.visit("/clientes")
  cy.findByText("Cliente Jornada Atualizada").should("be.visible")
})

it("hides tenant B and returns not found on its direct URL", () => {
  cy.loginAs("NUTRITIONIST")
  cy.visit("/clientes")
  cy.contains("Cliente privado B").should("not.exist")
  cy.visit("/clientes/41000000-0000-4000-8000-000000000002", { failOnStatusCode: false })
  cy.findByRole("heading", { name: "Cliente não encontrado" }).should("be.visible")
})

it("clears rendered clinical state after session expiration", () => {
  cy.loginAs("NUTRITIONIST")
  cy.visit("/clientes/41000000-0000-4000-8000-000000000001")
  cy.findByText("Cliente privado A").should("be.visible")
  cy.clearCookie("access_token")
  cy.reload()
  cy.location("pathname").should("eq", "/auth/login")
  cy.contains("Cliente privado A").should("not.exist")
})

it("does not persist authentication or clinical data in browser storage", () => {
  cy.loginAs("NUTRITIONIST")
  cy.visit("/clientes/41000000-0000-4000-8000-000000000001")
  cy.window().then((window) => {
    const persisted = [window.localStorage, window.sessionStorage]
      .flatMap((storage) => Array.from({ length: storage.length }, (_, index) => `${storage.key(index)}=${storage.getItem(storage.key(index)!)}`))
      .join("\n")
    expect(persisted).not.to.match(/access_token|csrf|Cliente privado A|diet_draft_/i)
  })
})

it("passes keyboard and axe checks on desktop and mobile", () => {
  cy.loginAs("PHYSIO")
  ;[[1440, 900], [390, 844]].forEach(([width, height]) => {
    cy.viewport(width, height)
    cy.visit("/home")
    cy.injectAxe()
    cy.checkA11y(undefined, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })
    cy.get("body").realPress("Tab")
    cy.focused().should("have.attr", "href")
  })
})
```

`cy.loginAs` uses the visible login form, not `cy.request`, for the critical journey. Direct API setup is allowed only for noncritical fixture reset and may not stub responses.

- [ ] **Step 3: Run intentional Red against the old UI on real services**

Bring up only the test database, deploy migrations, seed it, start the API and the current production web build, then run:

```powershell
npx.cmd cypress run --spec cypress/e2e/professional-phase1-real.cy.ts --browser electron
```

Expected: FAIL on new shell/copy/role isolation assertions while login reaches the real API. Stop if the failure is connection, migration, selector typo or seed; correct the harness and rerun until Red is behavioral.

- [ ] **Step 4: Implement the orchestration script**

`run-professional-phase1-e2e.ps1` must:

1. Resolve the repository root and assert `docker-compose.test.yml` is inside it.
2. Start `db-test` and wait for its health check.
3. Set `DATABASE_URL` and `DIRECT_URL` to `postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test` only in child process environments.
4. Run `npx.cmd prisma migrate deploy` and `npm.cmd run seed:phase1-e2e` in `api/`.
5. Build API and web.
6. Start API on 3000 and Next production on 3001 with hidden windows and redirected temporary logs.
7. Poll `/auth/me` and `/auth/login` only for service readiness; a 401 from `/auth/me` counts as API ready.
8. Run the Cypress spec and preserve its exit code.
9. In `finally`, kill only captured child process trees, remove only its temp logs, and stop the test compose project.

- [ ] **Step 5: Run Green twice for determinism**

Run from repository root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts/run-professional-phase1-e2e.ps1
powershell.exe -ExecutionPolicy Bypass -File scripts/run-professional-phase1-e2e.ps1
```

Expected: both runs PASS; the second run proves fixture cleanup and process teardown are deterministic.

- [ ] **Step 6: Keep mocked component journeys separate**

Retain existing mocked Cypress specs only if they test race conditions or component-level timing that the real journey does not. Rename them with `-mocked.cy.ts` and exclude them from the real gate. Delete obsolete `/membros` agenda specs whose routes no longer exist. The command in Step 5 must execute only the real phase-one spec.

- [ ] **Step 7: Commit**

```powershell
git add -- web/cypress.config.ts web/cypress/support web/cypress/e2e api/prisma/seed-phase1-e2e.ts api/package.json scripts/run-professional-phase1-e2e.ps1 docker-compose.test.yml
git commit -m "test: add real professional phase one e2e"
```

---

### Task 10: Apply browser headers, finish the comp-led review and close every gate

**Files:**
- Modify: `web/next.config.mjs`
- Create: `web/next.config.test.ts`
- Create: `.impeccable/review/desktop.png`
- Create: `.impeccable/review/mobile.png`
- Create or update after the final correction: `web/DESIGN.md`
- Create or update after the final correction: `web/.impeccable/design.json`

**Interfaces:**
- Consumes: the complete phase-one build, approved comp, direction contract and E2E runner.
- Produces: production browser headers, final desktop/mobile evidence, Impeccable verdict and recorded design system.

- [ ] **Step 1: Write failing header tests**

Load `next.config.mjs`, call `headers()`, and assert the catch-all route emits:

```ts
expect(headers).toEqual(expect.arrayContaining([
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  expect.objectContaining({ key: "Content-Security-Policy" }),
]))
```

The CSP must contain `default-src 'self'`, `frame-ancestors 'none'`, explicit `connect-src` for `NEXT_PUBLIC_API_URL`, and only the script/style/font allowances required by the verified Next production build.

- [ ] **Step 2: Run Red, implement headers and run Green**

Run: `npm.cmd test -- next.config.test.ts`

Expected Red: FAIL because no headers are configured.

Implement the header factory without interpolating an unvalidated URL. Parse `NEXT_PUBLIC_API_URL` with `new URL`, extract `.origin`, and fail the build if it is missing outside the test environment. Re-run the test, `npm.cmd run build`, then inspect response headers with `Invoke-WebRequest` against the production server.

- [ ] **Step 3: Run the complete automated gate from clean processes**

Run:

```powershell
Set-Location api
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run build
Set-Location ..\web
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
Set-Location ..
powershell.exe -ExecutionPolicy Bypass -File scripts/run-professional-phase1-e2e.ps1
git diff --check
```

Expected: every command exits 0. Save command, exit code and timestamp in the implementation task handoff; do not summarize a skipped command as passing.

- [ ] **Step 4: Run the Impeccable detector on the changed surface**

Run from repository root:

```powershell
npx.cmd impeccable detect web/app web/components web/hooks web/lib
```

Fix every real finding. Persist an exception only for a demonstrated false positive or a choice explicitly approved by the user, using the narrowest `ignore-value` command and recording the reason.

- [ ] **Step 5: Capture the bounded visual review**

With the production stack and deterministic fixtures running, capture in one batch:

- `.impeccable/review/desktop.png` at 1440 × 900.
- `.impeccable/review/mobile.png` at 390 × 844.
- Dashboard crop at the approved comp aspect for side-by-side comparison.

Inspect desktop and mobile together against the contract and `.impeccable/mocks/dashboard-comp-01.png`. Batch all material fixes once, rerun affected tests/build, then capture one confirmation batch. Two visual rounds are the ceiling.

- [ ] **Step 6: Run the independent Impeccable finish review**

Dispatch a fresh `impeccable_finish_reviewer` with no inherited conversation. Provide the original request, approved decisions, changed artifact paths, both screenshots, direction contract, `PRODUCT.md`, detector findings, `.impeccable/mocks/decision/canon.png`, approved comp, and `C:/Users/MICRO/.agents/skills/impeccable/reference/craft-floor.md`. Require the five sections `persistence`, `fidelity`, `ceiling`, `material_fixes` and `keep`. Apply every material fix, rerun the affected automated gate, and recapture only when the reviewer explicitly requests it.

- [ ] **Step 7: Document the built system after the final correction**

Dispatch `impeccable_documenter` with project root, final artifact paths, direction contract, `PRODUCT.md`, `C:/Users/MICRO/.agents/skills/impeccable/reference/document.md`, and boundary `web/`. It must write `web/DESIGN.md` and `web/.impeccable/design.json` from the actual tokens/components. If any correction follows documentation, rerun the documenter.

- [ ] **Step 8: Commit the verified phase**

```powershell
git add -- web/next.config.mjs web/next.config.test.ts .impeccable/review web/DESIGN.md web/.impeccable/design.json
git diff --cached --check
git commit -m "feat: complete professional frontend phase one"
```

- [ ] **Step 9: Final evidence check**

Run `git status --short --branch` and `git log -10 --oneline`. The handoff must distinguish implemented phase-one surfaces from still-unmigrated diet, training and rehabilitation workflows, name the final commit IDs, list test commands with outcomes, link the desktop/mobile captures, and quote the Impeccable disposition without upgrading it.
