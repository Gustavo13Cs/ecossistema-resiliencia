# Antigravity Agent — Status

> Este arquivo é atualizado pelo agente Antigravity para registrar progresso,
> tarefas concluídas e impedimentos. Outros agentes devem consultar este arquivo
> antes de iniciar trabalho para evitar conflitos.

---

## Current Task

- **2026-11-21 — Performance 18 concluído na branch `agent/codex/performance-diagnosis`**:
  - ✅ **Instrumentar duração de requisições e etapas (`e912854`)**: instrumentação por etapa (`total`, `txAcquire`, `rlsContext`, `handler`, `validation`, `txCommit`, `db`) em `ClinicalContextInterceptor` + `PrismaService`, wrapper do driver adapter `PrismaPg` (`clinical`/`auth`/`jobs`), correlação `X-Request-Id` / W3C `traceparent` / `Server-Timing` (somente rotas clínicas), redação defensiva (`log-redaction.ts`), percentis (`p50`/`p95`/`p99`) em memória (`RequestMetricsService`) e endpoint `ADMIN`-only `GET /observability/performance`.
  - ✅ **Validação**: testes focados `6/6` suítes (`32/32` testes), `nest build`, ESLint (`--max-warnings=0` nos arquivos alterados e `npx eslint "src/**/*.ts"`) e `git diff --check` aprovados; suíte unitária completa `npm --prefix api test` `68/69` suítes (`840/841` testes — única falha pré-existente de checkout Windows CRLF em `exercise-demonstration-probe.spec.ts`). Sem PostgreSQL Docker ativo para reexecução de `test:e2e`. Documentado em [docs/runbooks/performance-18-observability.md](../runbooks/performance-18-observability.md).

- **2026-11-21 — Performance 16 concluído na branch `agent/codex/performance-diagnosis`**:
  - ✅ **Paralelizar requisições independentes (`63c1b8b`)**: paralelizadas com `Promise.all` as invalidações de `useCentralLabExams.ts` (`refreshExams()`), criação de prontuário (`clientes/novo/page.tsx`), carregamento inicial com `AbortController` (`nova-reabilitacao/page.tsx`) e unificação de `invalidateQueries(appointmentsRoot)` em `useFollowUps.ts` e `usePersonalFollowUps.ts` (reduzindo `GET /appointments` por `refetch()` de 6 para 3). Backend (`api/`) auditado e mantido inalterado (transação única RLS via `PrismaService.runAsProfessional`).
  - ✅ **Validação**: testes focados de concorrência/contrato 43/43 (6 arquivos), `typecheck`, `lint` (`--max-warnings=0`), `next build` e `postbuild` (32/32 páginas, 297 diretórios standalone) e `git diff --check` aprovados; suíte completa `npm --prefix web test` 795/796 (103/104 arquivos, com única falha pré-existente de checkout Windows `core.autocrlf=true` em `web/test/licensed-media-fixture.test.ts`). Documentado em [docs/runbooks/performance-16-parallel-requests.md](../runbooks/performance-16-parallel-requests.md).

- **2026-11-16 — Personal P5 concluído na branch `agent/antigravity/personal-p5`**:
  - ✅ **Painel de Evolução Longitudinal & Gráficos de Força (`/evolucao` para o Personal)**: Implementado em `usePersonalEvolution.ts`, `PersonalEvolutionWorkspace.tsx`, `PersonalEvolutionDetail.tsx` e `evolution-print-document.ts`. Inclui curvas de 1RM (Agachamento, Terra, Supino), Força Relativa (× peso corporal), evolução de peso/%GC/perímetros/soma de 7 dobras, comparativo lado a lado entre quaisquer duas avaliações e exportação em PDF A4 tipográfico com proteção contra XSS.
  - ✅ **Central de Retornos, Ciclos de Treino & Reavaliações (`/retornos` para o Personal)**: Implementado em `usePersonalFollowUps.ts`, `PersonalFollowUpsWorkspace.tsx`, `PersonalFollowUpCard.tsx` e `PersonalFollowUpQuickMessageModal.tsx`. Monitora vencimento de mesociclo, alunos em Semana de Deload, reavaliações pendentes (>45 dias ou sem avaliação), rascunhos abertos, agendamento direto e mensagens rápidas para WhatsApp.
  - ✅ **Navegação e Permissões**: Seção `ACOMPANHAMENTO` adicionada à sidebar do Personal com `Evolução` (`/evolucao`) e `Retornos` (`/retornos`).

---

## Completed

| Data | Tarefa | Branch |
|------|--------|--------|
| 2026-11-21 | Performance 18 — Instrumentação de duração por etapa, spans SQL (`clinical`/`auth`/`jobs`), correlação `X-Request-Id`/`traceparent`/`Server-Timing`, redação defensiva de logs, percentis (`p50`/`p95`/`p99`) e endpoint `ADMIN`-only `GET /observability/performance` (`e912854`). Focada 32/32 (6 suítes), build e ESLint aprovados; suíte API 840/841 (68/69 suítes — falha pré-existente CRLF Windows em `exercise-demonstration-probe.spec.ts`). | `agent/codex/performance-diagnosis` |
| 2026-11-21 | Performance 16 — Paralelização de requisições e invalidações independentes (`63c1b8b`: `useCentralLabExams.ts`, `clientes/novo/page.tsx`, `nova-reabilitacao/page.tsx`, `useFollowUps.ts` e `usePersonalFollowUps.ts` com 6 → 3 `GET /appointments` no `refetch`). Testes focados 43/43 (6 arquivos), typecheck, lint (0 warnings), build/postbuild (32 páginas / 297 diretórios) aprovados; suíte web 795/796 (103/104, única falha pré-existente CRLF Windows em `licensed-media-fixture.test.ts`). | `agent/codex/performance-diagnosis` |
| 2026-11-16 | Personal P5 — Painel de Evolução Longitudinal & Gráficos de Força (`/evolucao` com 1RM, força relativa, perímetros, comparativo lado a lado e PDF A4) + Central de Retornos, Vencimento de Fichas & Reavaliações (`/retornos` com radar de fim de mesociclo, Semana de Deload, reavaliações pendentes e mensagens rápidas). | `agent/antigravity/personal-p5` |
| 2026-11-06 | Personal P4 — Gerador de PDF A4 tipográfico (Ficha de Academia e Planilha do Bloco), Anamnese de Treino/PAR-Q+ e Mapeamento de Ambiente/Equipamentos com aviso na biblioteca de exercícios, e Central Dedicada de Modelos de Treino (`/modelos-treinos`) com RBAC `PERSONAL`, cópia profunda, aplicação a aluno e ciclo de vida de modelos. | `agent/antigravity/personal-p4` |
| 2026-10-16 | P2 — Prescrição de treino avançada (Personal): parâmetros avançados (`position`, `muscleGroup`, `load`, `effortType`, `effortTarget`, `tempo`, `method`), biblioteca de exercícios (~150 catálogo SafeMove + `custom_exercises` com RLS por profissional), reordenação persistida (↑/↓), duplicação de divisões e exercícios, `ExerciseLibraryCombobox`, `WorkoutExerciseCard`, `WorkoutSplitCard`, `WorkoutEditor`, `WorkoutReadView`, migração Prisma `20261016150000_advanced_workout_prescription` aplicada no banco de testes (porta 5434), 51/51 testes unitários API (602 testes), 32/32 testes E2E API (192 testes), 74/74 testes frontend (516 testes), typecheck, lint e builds Next.js/NestJS aprovados. | `agent/antigravity/workout-prescription-p2` |
| 2026-10-16 | P1 — Painel de trabalho e prontuário do Personal (`TrainingReadService`, bloqueio transacional em `Client` arquivado, dashboard operacional, avaliação física sem campos ambíguos, leitura de ficha por `workoutId` exato, editor sem exemplos pré-preenchidos e suíte E2E real; ver `docs/runbooks/personal-p1-verification.md`) | `agent/antigravity/personal-workspace-p1` |
| 2026-09-30 | Adição e integração do novo logotipo oficial: geração de favicons multi-tamanho (.ico, .png, .svg, apple-icon), remoção suave de fundo (transparência precisa do prato/emblema), substituição de placeholders de logo na sidebar, navegação mobile, landing page e telas de autenticação | `agent/codex/security-scan-2026-09-30` |
| 2026-09-22 | Refatoração dos PDFs de Dieta e Lista de Compras: janelas dedicadas com HTML/CSS limpo, layout profissional A4, sem dados clínicos internos para o paciente | `main` |
| 2026-09-17 | Implementação do módulo de Relatórios & Métricas de Gestão concluído | `main` |
| 2026-09-15 | Implementação do módulo de Modelos de Planos Alimentares (templates pré-configurados SafeMove, auto-scaling de porções e macros, versionamento, arquivamento e importação para prontuário) | `main` |
| 2026-09-08 | Corrigir 500/429 em `/clients`: throttler 20→60, Dockerfile com migrate deploy, backfill de dados legados | `codex/fix-production-client-data` |

---

## Blocked

_Nenhum impedimento._

---

## Notes

- Migration `20261106150000_personal_p4` adiciona `TrainingEnvironment`, campos em `WorkoutTemplate` (`environment`, `archivedAt`) e modelo `TrainingAnamnesis` com RLS defensivo (`safemove_clinical`).
- Migration `20260908194000_backfill_legacy_clients` copia dados de `professional_patient_links` + `User` para `clients`
- O Dockerfile agora roda `prisma migrate deploy` antes de iniciar o servidor
- Consultar `AGENTS.md` na raiz para orientação geral
- Consultar `docs/TASKS.md` para o backlog de tarefas
