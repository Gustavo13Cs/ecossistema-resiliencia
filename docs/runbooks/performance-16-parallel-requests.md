# Performance 16 — paralelização de requisições e invalidações independentes

## Resultado

Alteração entregue no commit **`63c1b8b`** na branch `agent/codex/performance-diagnosis`, comparada ao baseline `defb43b`. As invalidações independentes de exames laboratoriais (`useCentralLabExams.ts`), criação de prontuário (`clientes/novo/page.tsx`) e atualização das centrais de retorno (`useFollowUps.ts` e `usePersonalFollowUps.ts`), além do carregamento inicial da prescrição de reabilitação (`nova-reabilitacao/page.tsx`), passaram a executar em paralelo via `Promise.all`.

Nos fluxos de atualização das centrais de retorno (`useFollowUps` e `usePersonalFollowUps`), a unificação da invalidação de `appointmentsRoot` dentro do mesmo `Promise.all` eliminou a espera sequencial pós-refetch e reduziu os `GET /appointments` disparados por `refetch()` de **6 para 3** (−50% nas chamadas de janelas de agenda durante atualização manual), preservando a invalidação das chaves inativas da `/agenda`.

Implementação exclusivamente no frontend (`web/`). Nenhuma mudança em `api/`, `schema.prisma`, migrations, políticas RLS, autenticação, dependências ou deploy de produção.

## Mudanças aplicadas

| Arquivo | Antes | Depois |
|---|---|---|
| `web/hooks/features/useCentralLabExams.ts` (`refreshExams`, L109–114; ref. original pré-paginação L81) | `await cache.invalidateQueries({ queryKey: examsKey })` seguido sequencialmente de `await cache.invalidateQueries({ queryKey: ["lab-exams", sessionUserId] })` | `Promise.all` invalidando ambas as chaves independentes simultaneamente em `registerMutation` e `deleteExamMutation` |
| `web/app/clientes/novo/page.tsx` (`handleCreate`, L33–40) | `await invalidateQueries(clients)` seguido sequencialmente de `await invalidateQueries(trainingWorkspace)` antes de `router.push("/clientes")` | `Promise.all` aguardando ambas as invalidações independentes antes de navegar |
| `web/app/clientes/[id]/nova-reabilitacao/page.tsx` (`useEffect`, L45–89) | `await api.get(/clients/:id)` seguido sequencialmente de `await api.get(/rehab-plans/client/:id/active)` | `Promise.all` disparando ambas as leituras simultaneamente com `AbortController` no cleanup do efeito |
| `web/hooks/features/useFollowUps.ts` (`refetchAll`, L332–339) | `await Promise.all([refetchClients(), refetchAppointments()])` seguido de `await queryClient.invalidateQueries({ queryKey: appointmentsRoot })` | `Promise.all([refetchClients(), queryClient.invalidateQueries({ queryKey: appointmentsRoot })])`, eliminando a espera sequencial e duplicação de refetch (6 → 3 `GET /appointments`) |
| `web/hooks/features/usePersonalFollowUps.ts` (`refetch`, L378–388) | `await Promise.all([...refetches, appointmentsQuery.refetch()])` seguido de `await queryClient.invalidateQueries({ queryKey: appointmentsRoot })` | `invalidateQueries({ queryKey: appointmentsRoot })` dentro do mesmo `Promise.all`, eliminando a espera sequencial e duplicação de refetch (6 → 3 `GET /appointments`) |

## Auditoria do backend (`api/`)

Os serviços da API foram auditados e mantidos intocados de forma deliberada:

- Toda requisição clínica autenticada executa dentro de `ClinicalContextInterceptor` → `PrismaService.runAsProfessional`, que abre uma única `this.root.$transaction` em uma única conexão PostgreSQL para aplicar `set_config` de RLS (`safemove.professional_id`, `safemove.role`, `safemove.session_id`, `safemove.request_id`).
- Dentro de uma única transação PostgreSQL não há paralelismo real de queries SQL sobre a mesma conexão.
- Os `await` sequenciais nos services da API correspondem a dependências reais de autorização (`getOwnedClient` / `assertOwnedClient` antes da operação) ou locks transacionais (`FOR UPDATE`, `lockOwnedClient`, `pg_advisory_xact_lock`).
- Leituras compostas seguras fora de dependências sequenciais já utilizam `Promise.all` (`client-overview.service.ts`, `clients.service.ts`, `lab-exams.service.ts`, `lab-orders.service.ts`, `training-read.service.ts`).

## Regressões e validação

### Testes de concorrência determinísticos adicionados

Cada ponto alterado recebeu teste de regressão determinístico usando barreiras com `Promise` pendente (sem timers arbitrários), comprovando que a segunda requisição/invalidação inicia antes de a primeira resolver e que caches de outra sessão profissional não são invalidados:

1. `web/hooks/features/useCentralLabExams.test.ts`: prova invalidação simultânea da lista central e da série clínica em `registerExam` e `deleteExam`, mantendo o toast de sucesso apenas após ambas concluírem e preservando o cache de `professional-b`.
2. `web/app/clientes/novo/page.test.tsx`: prova invalidação simultânea de `clients` e `trainingWorkspace` antes de `router.push("/clientes")`.
3. `web/app/clientes/[id]/nova-reabilitacao/rehab-client-contract.test.tsx`: prova carregamento simultâneo de `/clients/:id` e `/rehab-plans/client/:id/active`, e cancelamento via `AbortSignal` ao desmontar sem exibir toast de erro.
4. `web/hooks/features/useFollowUps.test.ts`: prova paralelismo entre `refetchClients()` e `invalidateQueries(appointmentsRoot)`, exatamente **3** `GET /appointments` por `refetch()` (em vez de 6), invalidação da agenda inativa da sessão e preservação de outra conta.
5. `web/hooks/features/usePersonalFollowUps.test.ts`: prova paralelismo de `invalidateQueries(appointmentsRoot)` com clientes/treinos/rascunhos/avaliações, exatamente **3** `GET /appointments` por `refetch()` (em vez de 6) e isolamento entre contas.

### Resultados das verificações executadas

- **Testes focados (6 arquivos):** **6/6 arquivos, 43/43 testes aprovados** (`useCentralLabExams.test.ts`, `clientes/novo/page.test.tsx`, `rehab-client-contract.test.tsx`, `useFollowUps.test.ts`, `usePersonalFollowUps.test.ts`, `useLabExams.test.tsx`).
- **Suíte completa `npm --prefix web test`:** **103/104 arquivos, 795/796 testes aprovados**.
  - **Única falha (pré-existente de ambiente Windows, não relacionada ao item 16):** `web/test/licensed-media-fixture.test.ts` (`Licensed media fixture SHA-256 mismatch`), causada por `C:/Program Files/Git/etc/gitconfig` com `core.autocrlf=true` convertendo `i/lf` para `w/crlf` em `web/cypress/fixtures/exercise-demonstration/bench-press.svg` (20.295 bytes em disco, SHA-256 `ed884dfaaa08034e99b83c42e6b4a415834e32b8f15ee87b1212ae608f4114cc`, contra 20.294 bytes em LF e SHA-256 esperado `8d2e44a4623545d6de7318bd7e9e61ca6c70b79847ef0360973a8ad6ec4a7d27`). Não houve edição de `.gitattributes` ou fixtures fora do escopo.
- **`npm --prefix web run typecheck`:** aprovado (código 0).
- **`npm --prefix web run lint` (`eslint . --max-warnings=0`):** aprovado (código 0, 0 erros, 0 warnings).
- **`NEXT_PUBLIC_API_URL=http://localhost:3000` + `npm --prefix web run build` (`postbuild`):** compilação Next.js aprovada; `assert-direction-contract.mjs` validou **32/32 páginas** de produção; `assert-standalone-runtime.mjs` verificou **297 diretórios** no standalone sem pacotes de dev ou `.env`.
- **`git diff --check`:** aprovado (código 0).

## Reprodução

Na raiz do repositório:

1. Regressões focadas:
   ```powershell
   npm --prefix web test -- hooks/features/useCentralLabExams.test.ts app/clientes/novo/page.test.tsx "app/clientes/[id]/nova-reabilitacao/rehab-client-contract.test.tsx" hooks/features/useFollowUps.test.ts hooks/features/usePersonalFollowUps.test.ts hooks/features/useLabExams.test.tsx
   ```
2. Typecheck e lint:
   ```powershell
   npm --prefix web run typecheck
   npm --prefix web run lint
   ```
3. Build de produção e pós-build:
   ```powershell
   $env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build
   ```

## Rollback

Reverter o commit **`63c1b8b`** (`git revert 63c1b8b`) e gerar novo build. Não há migrations, alterações de banco, variáveis de ambiente ou dependências envolvidas.
