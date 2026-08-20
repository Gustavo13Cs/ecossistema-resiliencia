# Cache e Redução do Bundle — Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir chamadas HTTP repetidas e retirar Recharts do carregamento inicial da ficha e da criação de dieta, preservando os contratos e a interface atuais.

**Architecture:** TanStack Query v5 será o cache em memória sobre o Axios atual. Um provider raiz fornecerá política única de stale/retry; query keys conterão a identidade autenticada e mutações invalidarão apenas famílias relacionadas. Gráficos serão extraídos para client components carregados por `next/dynamic`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Axios, TanStack Query v5, Cypress 15, Recharts 2.

**Spec:** `docs/superpowers/specs/2026-08-20-cache-e-bundle-fase-1-design.md`

## Global Constraints

- Alterar somente `web/` e a documentação desta fase; não alterar API, Prisma, migrations, rate limit ou hospedagem.
- Cache apenas em memória: `staleTime` 60 segundos, `gcTime` 5 minutos e `refetchOnWindowFocus: false`.
- Queries repetem no máximo uma vez somente falhas transitórias; `401` e `403` nunca repetem; `Retry-After` é limitado a 5 segundos.
- Mutações não repetem automaticamente e usam invalidação precisa, sem atualização otimista.
- Chaves incluem `user.sub`; logout e troca de identidade limpam todo o cache.
- Preservar as assinaturas públicas dos hooks migrados e os contratos HTTP atuais.
- Recharts permanece funcional, mas não pode ser importado estaticamente nas duas páginas priorizadas.
- Todo código comportamental segue RED -> GREEN -> refatoração.

---

### Task 1: Provar e implementar o cache compartilhado de usuários

**Files:**
- Create: `web/cypress/e2e/performance-cache.cy.ts`
- Create: `web/lib/query-client.ts`
- Create: `web/lib/query-keys.ts`
- Create: `web/components/providers/QueryProvider.tsx`
- Create: `web/hooks/features/useUsers.ts`
- Modify: `web/package.json`
- Modify: `web/package-lock.json`
- Modify: `web/app/layout.tsx`
- Modify: `web/hooks/features/useHomeDashboard.ts`
- Modify: `web/app/membros/page.tsx`
- Modify: `web/app/dietas/page.tsx`
- Modify: `web/app/treinos/page.tsx`
- Modify: `web/app/avaliacoes/page.tsx`

**Interfaces:**
- Produces: `createQueryClient(): QueryClient`, `queryKeys.users(sessionUserId)`, `useUsers()` returning `{ users, loading, error, refetch }`.
- Consumes: `useAuth().user.sub` and `api.get('/users')`.

- [ ] **Step 1: Write the failing navigation test**

Add a Cypress scenario that intercepts complete `/auth/me` and `/users` responses, visits `/home`, clicks the desktop link `Meus Pacientes`, then `Início`, and then `Meus Pacientes` again. Count actual interceptions with a closure and assert the total is `1` after all three route changes:

```ts
let usersRequests = 0
cy.intercept("GET", "**/users", (request) => {
  usersRequests += 1
  request.reply({ body: [professionalPatientFixture] })
}).as("getUsers")

cy.visit("http://localhost:3001/home")
cy.wait("@getUsers")
cy.contains("a", "Meus Pacientes").first().click()
cy.contains("Diretório de Pacientes").should("be.visible")
cy.contains("a", "Início").first().click()
cy.contains("Bom dia").should("be.visible")
cy.contains("a", "Meus Pacientes").first().click()
cy.then(() => expect(usersRequests).to.equal(1))
```

- [ ] **Step 2: Run RED**

Start Next on port 3001 and run:

```powershell
npx.cmd cypress run --spec cypress/e2e/performance-cache.cy.ts --browser electron
```

Expected: FAIL because the current Home and Membros effects each call `/users`.

- [ ] **Step 3: Install and configure TanStack Query**

Run `npm.cmd install @tanstack/react-query@5`. Implement:

```ts
export const QUERY_STALE_TIME = 60_000
export const QUERY_GC_TIME = 5 * 60_000

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME,
        gcTime: QUERY_GC_TIME,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
      },
      mutations: { retry: false },
    },
  })
}
```

`shouldRetryQuery(failureCount, error)` returns true only when `failureCount < 1` and the Axios error has no response, or status `408`, `429`, or `>= 500`. `queryRetryDelay` parses integer seconds or HTTP-date from `Retry-After`, clamps to 5,000 ms, and otherwise returns 1,000 ms.

`QueryProvider` creates exactly one client per browser mount with `useState(createQueryClient)` and wraps children in `QueryClientProvider`. Mount it above `AuthProvider` in `web/app/layout.tsx`.

- [ ] **Step 4: Add the shared users hook and migrate consumers**

```ts
export function useUsers() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: queryKeys.users(user!.sub),
    queryFn: async ({ signal }) => (await api.get("/users", { signal })).data ?? [],
    enabled: Boolean(user?.sub),
  })
  return { users: query.data ?? [], loading: query.isPending, error: query.error, refetch: query.refetch }
}
```

Replace the five independent `/users` effects with this hook. Keep diet/workout/assessment list requests local and combine their existing loading state with `usersLoading`. In Membros, replace `fetchUsers()` after create/delete with `queryClient.invalidateQueries({ queryKey: queryKeys.users(user.sub) })`.

- [ ] **Step 5: Run GREEN and commit**

Run the focused Cypress spec and `npx.cmd tsc --noEmit`. Expect one `/users` request and zero TypeScript errors. Commit only Task 1 files with `feat: cache shared users query`.

---

### Task 2: Isolar o cache por sessão

**Files:**
- Modify: `web/cypress/e2e/performance-cache.cy.ts`
- Modify: `web/lib/query-keys.ts`
- Modify: `web/hooks/features/useUsers.ts`
- Modify: `web/contexts/auth-context.tsx`

**Interfaces:**
- Produces: cache cleanup on hydrate/login/logout while preserving session-scoped query keys from Task 1.
- Consumes: `QueryClientProvider` from Task 1 and `useAuth().user.sub`.

- [ ] **Step 1: Write the failing session test**

Intercept `/auth/me` to return professional A on initial hydration, professional B after the first mocked login and professional A after the second mocked login. Return Patient A or Patient B from `/users` according to the active identity. Navigate through the real logout/login flow twice and count the requests made for A.

```ts
cy.contains("button", "Sair da Conta").click()
cy.url().should("include", "/auth/login")
cy.get('input[type="email"]').type("b@example.com")
cy.get('input[type="password"]').type("senha-segura")
cy.contains("button", /entrar/i).click()
cy.contains("Paciente B").should("be.visible")
cy.contains("Paciente A").should("not.exist")

// Logout B, login A novamente e voltar a /membros.
cy.then(() => expect(usersRequestsForA).to.equal(2))
```

Expected RED: Patient A não vaza para B graças às chaves por sessão, mas o segundo login de A reutiliza o cache antigo e `usersRequestsForA` permanece `1`, provando que o logout ainda não limpou a memória.

- [ ] **Step 2: Implement scoped keys and cleanup**

In `AuthProvider`, call `useQueryClient()`. Clear the client before applying a different hydrated/login identity and in the `finally` path of logout before `setUser(null)`. Do not cache `/auth/me`.

- [ ] **Step 3: Run GREEN and commit**

Run both performance-cache scenarios and TypeScript. Expect Patient B only and a new `/users` request for B. Commit with `fix: isolate query cache by session`.

---

### Task 3: Cachear a ficha e invalidar suas gravações

**Files:**
- Modify: `web/cypress/e2e/performance-cache.cy.ts`
- Create: `web/hooks/features/usePatientRecord.ts`
- Modify: `web/lib/query-keys.ts`
- Modify: `web/app/membros/[id]/page.tsx`

**Interfaces:**
- Produces: `usePatientRecord(patientId)` returning `{ patient, assessments, anamneses, loading, patientError }`.
- Consumes: session-scoped `patient`, `assessments`, and `anamneses` keys.

- [ ] **Step 1: Write and run the failing ficha cache test**

Intercept full patient, assessment and anamnesis fixtures. Open the ficha from Membros, return through the real `Voltar` link, reopen the same patient, and assert each detail endpoint was called exactly once. Expected RED: each endpoint is called twice.

- [ ] **Step 2: Implement the three parallel queries**

Create three `useQuery` calls in the same hook render, all enabled only with session and patient IDs and all forwarding TanStack's `signal` to Axios. Patient failure supplies `patientError`; assessment/anamnesis failures preserve their existing non-blocking behavior.

Replace page state/effect fetches with hook values. After profile PATCH invalidate `queryKeys.patient(sessionId, patientId)`. After assessment POST invalidate `queryKeys.assessments(sessionId, patientId)`. Keep modal form state local.

- [ ] **Step 3: Run GREEN and commit**

Run the ficha Cypress scenario and TypeScript. Expect one call per detail endpoint across the back-and-forth navigation. Commit with `feat: cache patient record queries`.

---

### Task 4: Migrar dieta, visão 360, alertas e agenda

**Files:**
- Modify: `web/cypress/e2e/performance-cache.cy.ts`
- Modify: `web/cypress/e2e/agenda-patient.cy.ts`
- Modify: `web/hooks/features/useDiet.ts`
- Modify: `web/hooks/features/usePatientOverview.ts`
- Modify: `web/hooks/features/useProfessionalAlerts.ts`
- Modify: `web/hooks/features/useAgenda.ts`
- Modify: `web/lib/query-keys.ts`
- Modify: `web/app/membros/[id]/agenda/page.tsx`

**Interfaces:**
- Preserves: public return shapes of all four hooks.
- Produces: session-scoped keys for diet, overview, alerts and agenda range.

- [ ] **Step 1: Write and run RED for reused diet and agenda ranges**

For a patient session, visit `/paciente`, click the real `Dieta`, then `Início`, then `Dieta`; assert `/diet-plans/user/:id/active` is called once. Extend the agenda test to select tomorrow and return to today; count each exact `from/to` URL and assert today's range is fetched once. Expected RED: current effects fetch again when the component/range remounts.

- [ ] **Step 2: Convert read hooks**

Implement `useQuery` in each hook with complete keys and Axios `signal`. Preserve Diet's `404 -> null`, current Portuguese error strings, and the exported return fields. Use `useEffect` only for existing toast side effects, never for fetching.

For Agenda, derive `from/to` first and key by session ID, patient ID, from and to. Replace manual AbortController/request IDs with TanStack cancellation. Implement complete/skip via `useMutation`, keep `mutatingId`, and on success invalidate only the current agenda key. `refetch` remains callable by both patient and professional pages.

After professional task create/edit/pause/end, replace broad reload behavior with invalidation/refetch of the current agenda key. Do not migrate the separate health-check-in query in this phase.

- [ ] **Step 3: Run GREEN and commit**

Run performance, patient agenda and professional agenda Cypress specs plus TypeScript. Commit with `feat: cache patient domain queries`.

---

### Task 5: Carregar os gráficos sob demanda

**Files:**
- Create: `web/components/features/patient/BodyCompositionChart.tsx`
- Create: `web/components/features/diet/MacroDistributionChart.tsx`
- Modify: `web/app/membros/[id]/page.tsx`
- Modify: `web/app/membros/[id]/nova-dieta/page.tsx`
- Modify: `web/cypress/e2e/performance-cache.cy.ts`

**Interfaces:**
- `BodyCompositionChart({ data, isPersonal })` renders the existing three-line chart.
- `MacroDistributionChart({ data })` renders the existing macro donut.

- [ ] **Step 1: Add behavior coverage before refactoring**

Add fixtures with assessment and macro data and assert the chart regions expose accessible names `Evolução da composição corporal` and `Distribuição de macronutrientes`, while the page heading/form remains visible. Run against current code and first observe failure because those named regions do not exist.

- [ ] **Step 2: Extract and dynamically import charts**

Move every Recharts import into the two new client components. In each page use:

```ts
const BodyCompositionChart = dynamic(
  () => import("@/components/features/patient/BodyCompositionChart"),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-slate-100" aria-label="Carregando gráfico" /> },
)
```

Use an equivalent stable-size placeholder for the macro chart. Wrap each real chart in a `section` with its specified accessible name. Preserve colors, tooltips, labels, print behavior and dimensions.

- [ ] **Step 3: Verify behavior and split imports**

Run the focused Cypress scenario and TypeScript. Then run:

```powershell
rg -n 'from ["'']recharts["'']' 'app/membros/[id]/page.tsx' 'app/membros/[id]/nova-dieta/page.tsx'
```

Expected: no matches in either page; matches exist only in the extracted chart components. Commit with `perf: lazy load heavy charts`.

---

### Task 6: Verificação integral e handoff

**Files:**
- Modify if needed: `docs/superpowers/specs/2026-08-20-cache-e-bundle-fase-1-design.md` only for verified deviations.

**Interfaces:**
- Consumes every deliverable above; produces no new runtime behavior.

- [ ] **Step 1: Run complete frontend verification**

From `web/`, run fresh:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
npx.cmd cypress run --spec cypress/e2e/performance-cache.cy.ts,cypress/e2e/agenda-patient.cy.ts,cypress/e2e/agenda-professional.cy.ts --browser electron
```

Record exact exit codes and test counts. If full lint exposes unrelated baseline failures, separate them from changed-file failures and do not hide them.

- [ ] **Step 2: Audit scope and repository state**

Run `git diff --check`, `git status --short`, and inspect the complete diff. Confirm no `api/`, Prisma, migration, hosting or rate-limit file changed and no Recharts static imports remain in the two pages.

- [ ] **Step 3: Commit final verification-only adjustments**

Commit only if Task 6 required a real file adjustment, using `chore: finalize performance phase one`. Otherwise keep the preceding task commits as the final implementation history.
