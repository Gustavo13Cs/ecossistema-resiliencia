# Backlog de Tarefas — SafeMove

> Backlog centralizado. Agentes devem consultar este arquivo antes de iniciar
> trabalho e marcar tarefas como "em andamento" com seu nome.
>
> **Legenda**: ✅ Concluído | 🔄 Em andamento | ⏳ Pendente | ❌ Bloqueado

---

- ✅ **Codex (27/11/2026)** — Carregamento de sessão centralizado em tela inteira, com identidade SafeMove, transição discreta, retry de conexão e suporte a redução de movimento. Tipos/lint, 57 testes, build/pós-build e Chromium em quatro larguras aprovados; máscara de privacidade e rascunho preservados.

- ✅ **Codex (26/11/2026)** — Validação final da otimização de login para revisão no GitHub.

- ✅ **Codex (26/11/2026)** — Confirmação do login acelerada e validada em ambiente local. [Comparativo](runbooks/diagnostico-latencia-login.md).

- ✅ **Codex (26/11/2026)** — Propostas de login confrontadas com as melhorias anteriores de sessão, renderização pública e acesso ao banco.

- ✅ **Codex (26/11/2026)** — Investigação da espera entre entrar e abrir o painel concluída. [Medições e prioridades](runbooks/diagnostico-latencia-login.md).

## Personal P3 — concluído localmente em 24/10/2026

- ✅ **Antigravity — Performance 14 (21/11/2026)**: atualização otimista com rollback aplicada exclusivamente às ações reversíveis de arquivamento e restauração de modelos privados de treino no commit `b775819` (`agent/codex/performance-diagnosis`), mantendo prescrições (`useWorkouts.ts`) e rascunhos clínicos (`useWorkoutDrafts.ts`) estritamente dependentes de confirmação da API. Adicionados [`web/lib/workout-template-optimistic.ts`](../web/lib/workout-template-optimistic.ts) (`applyOptimisticTemplateArchiveState`, `rollbackOptimisticTemplateArchiveState`, `reconcileTemplateArchiveState`, `matchesWorkoutTemplateFilters`), integração em `useWorkoutTemplateHubMutations` (`useWorkoutTemplates.ts`) cancelando leituras em voo com rollback protegido contra ressurreição pós-401/403 ou troca de conta, e feedback visual pendente/reversão em `WorkoutTemplatesHub.tsx`. Vitest focado `5/5` arquivos (`48/48` testes cobrindo sucesso, pendência entre abas, rollback 500, negação 403, troca de conta e ausência de otimismo em `POST /workouts`), suíte completa `107/108` (`829/830` — única falha pré-existente CRLF Windows em `licensed-media-fixture.test.ts`), `typecheck`, `lint` (0 warnings, incluindo `react-hooks/refs`), `next build`/`postbuild` (`32/32` páginas, `297` dirs) e `git diff --check` aprovados. [Relatório e rollback](runbooks/performance-14-optimistic-updates.md).

- ✅ **Antigravity — Performance 30 (21/11/2026)**: coleta RUM real de Web Vitals (`LCP`, `INP`, `CLS`, `FCP`, `TTFB`) em produção via `next/web-vitals` (`useReportWebVitals`), sanitização de rotas por allowlist e painel segmentado no commit `9cf2ad6` (`agent/codex/performance-diagnosis`), sem pacotes novos nem captura de dados clínicos. No frontend, `WebVitalsReporter` (`web/app/layout.tsx`) agrupa métricas por rota normalizada (33 templates) e dispositivo (`desktop`/`tablet`/`mobile`) enviando lotes sem cookies (`credentials: 'omit'`, `keepalive: true`) para `POST /api/observability/web-vitals`, enquanto `/home` para `ADMIN` carrega sob demanda (`next/dynamic` `ssr: false`) `AdminWebVitalsDashboard` preservando todos invariantes do Cypress. Na API, `WebVitalsController` (`@Public()`, `@HttpCode(202)`, `Throttle`, `no-store`), `WebVitalsMetricsService` (ring buffers de 256 amostras, `p50`/`p75`/`p95`, ordenação por severidade), logs redigidos (`metric` em `RequestTelemetryLogger`) e `GET /observability/web-vitals` (`ADMIN`-only). Prova ao vivo em Chrome headless + Next produção + NestJS local confirmou 10/10 POSTs `202` sem cookie, 16 amostras reais (`Desktop` 8 / `Mobile` 8) em 5 segmentos rota/dispositivo e renderização no `/home` com 0 erros CSP/JS. API Jest focado `7/7` (`31/31`), full `69/70` (`849/850` — falha pré-existente CRLF em `exercise-demonstration-probe.spec.ts`), `nest build`, API ESLint `0` warnings, Web Vitest focado `5/5` (`25/25`), full `106/107` (`820/821` — falha pré-existente CRLF em `licensed-media-fixture.test.ts`), `typecheck`, `lint`, `next build`/`postbuild` (`32/32` páginas, `297` dirs) e `git diff --check` aprovados. [Relatório e rollback](runbooks/performance-30-rum-web-vitals.md).

- ✅ **Antigravity — Performance 24 (21/11/2026)**: seleção mínima de colunas e relações no Prisma para listagens e checagens no commit `84e4895` (`agent/codex/performance-diagnosis`), mantendo contratos de autorização (`professionalId`), `ClinicalResponseValidator` e carregamento detalhado sob demanda no frontend. Em `api/`, `ClientsService.findAll`/`findPage` passaram a projetar `CLIENT_LIST_SELECT` (`10` das `26` colunas, omitindo 16 campos clínicos `@db.Text`/estilo de vida), `RecipesService.list` e os pré-checks de `update`/`setStatus` deixaram de incluir `ingredients`/`food: true` (`RECIPE_LIST_SELECT`, `RECIPE_HISTORY_VERSION_SELECT` com `food: { id, name }`), e `DietPlansService.findAll`/`prepareMeals` passaram a usar `DIET_PLAN_LIST_SELECT` (`7` escalares + `client`/`user`) e `select: { id: true }`. Em `web/`, `ClientSummary` foi separado de `Client` (`tsc --noEmit` comprovou 12 consumidores de listagem sem leitura dos campos omitidos) e `RecipeFormDialog` / `RecipePickerPanel` passaram a hidratar `GET /recipes/:id` sob demanda com estado de carregamento e retry em falha. Medição determinística local sobre payloads sintéticos (`api/dist`) mostrou redução de `15.508 → 7.333 B` (`-52,7%`) / `28.958 → 7.333 B` (`-74,7%`) em `GET /clients`, `72.034 → 12.824 B` (`-82,2%`) em `GET /recipes`, `16.300 → 7.185 B` (`-55,9%`) em `GET /recipes/:id`, `13.158/15.633 → 6.783 B` (`-48,4%` a `-56,6%`) em `GET /diet-plans` e `27.604 → 172 B` (`-99,4%`) no check interno de `prepareMeals` (sem E2E/`EXPLAIN` ao vivo no Postgres por falta de container Docker ativo). Validação: Jest focado `5/5` (`96/96`), API full `68/69` (`843/844` — única falha pré-existente CRLF em `exercise-demonstration-probe.spec.ts`), `nest build`, API ESLint `0` warnings, Vitest focado `10/10` (`60/60`), Web full `103/104` (`811/812` — única falha pré-existente CRLF em `test/licensed-media-fixture.test.ts`), `typecheck`, `lint`, `next build` + pós-build (`32/32` páginas, `297` dirs) e `git diff --check`. [Relatório e rollback](runbooks/performance-24-minimal-selects.md).

- ✅ **Antigravity — Performance 20 (21/11/2026)**: isolamento das páginas públicas (`/`, `/auth/login`, `/auth/register`) da barreira de loading inicial do `AuthProvider` no commit `75aac62` (`agent/codex/performance-diagnosis`), mantendo rotas protegidas (`/home`, `/clientes`, etc.) bloqueadas no SSR e durante a hidratação. Adicionados helper `web/lib/public-routes.ts`, guarda de época/sessão (`authSessionEpoch` em `web/lib/api.ts` + `sessionGenerationRef` / `AbortController` em `AuthProvider`) contra race de 401 obsoleto durante login rápido, e `<Toaster />` posicionado após `</QueryProvider>`. HTML inicial SSR das rotas públicas passou a conter integralmente headings, landmarks e formulários sem `"Carregando sua área profissional"`; medição local em Chrome headless (atraso de auth simulado de 250 ms) registrou LCP local `1.324 → 152 ms` (`/`), `1.248 → 148 ms` (`/auth/login`) e `1.276 → 136 ms` (`/auth/register`) com `CLS 0` e zero erros de hidratação, mantendo redirecionamentos autenticados/anônimos e proteção sem regressão. Regressões focadas `65/65` (`7/7` arquivos), `typecheck`, `lint` (0 warnings), `next build` + pós-build (`32/32` páginas e `297` diretórios standalone) e `git diff --check` aprovados; suíte web completa `809/810` (`103/104` arquivos — única falha pré-existente de checkout Windows CRLF em `test/licensed-media-fixture.test.ts`). [Relatório e rollback](runbooks/performance-20-public-rendering.md).

- ✅ **Antigravity — Performance 18 (21/11/2026)**: instrumentação de duração por etapa (`total`, `txAcquire`, `rlsContext`, `handler`, `validation`, `txCommit`, `db`) no `ClinicalContextInterceptor` e spans SQL no adapter Prisma (`clinical`/`auth`/`jobs`) no commit `e912854` (`agent/codex/performance-diagnosis`). Correlação via `X-Request-Id`, W3C `traceparent`, GUC `safemove.request_id` e `Server-Timing` (apenas rotas clínicas), redação defensiva de dados clínicos/segredos, percentis (`p50`/`p95`/`p99`) e top rotas lentas em logs JSON e em `GET /observability/performance` (`ADMIN`-only). Testes focados 6/6 suítes (32/32), build `nest build` e ESLint (`--max-warnings=0`) aprovados; suíte unitária completa 68/69 suítes (840/841 — única falha pré-existente no checkout Windows CRLF em `exercise-demonstration-probe.spec.ts`); E2E PostgreSQL não reexecutado sem Docker ativo. [Relatório e rollback](runbooks/performance-18-observability.md).

- ✅ **Antigravity — Performance 16 (21/11/2026)**: paralelização de requisições e invalidações independentes em `63c1b8b` (`agent/codex/performance-diagnosis`), mantendo `api/` inalterada pela fronteira transacional única de RLS (`PrismaService.runAsProfessional`). Paralelizadas invalidações de exames em `useCentralLabExams.ts` (`refreshExams`), criação de prontuário em `clientes/novo/page.tsx`, carregamento inicial de `nova-reabilitacao/page.tsx` (com `AbortController`) e `invalidateQueries(appointmentsRoot)` em `useFollowUps.ts` e `usePersonalFollowUps.ts` (reduzindo `GET /appointments` por `refetch()` de 6 para 3). Regressões focadas 43/43 (6 arquivos), typecheck, lint (0 warnings), build Next.js e pós-build (32/32 páginas, 297 diretórios standalone) aprovados; suíte completa web 795/796 (103/104 arquivos — única falha pré-existente no checkout Windows CRLF em `test/licensed-media-fixture.test.ts`). [Relatório e rollback](runbooks/performance-16-parallel-requests.md).

- ✅ **Codex — Performance 05 (19/11/2026)**: paginação de clientes, laudos e pedidos concluída; padrão de 25 e máximo de 100, filtros/ordem globais e históricos completos em lotes. JSON de clientes/exames cerca de 96% menor por página; mediana local de clientes −53,83%, exames +1,60% e pedidos +4,07 ms (tradeoffs descritos). Travessia de 1.105 registros íntegra; API 820, PostgreSQL 265 + benchmark/browser, web 787 + 2, builds/lint/tipos e desktop/mobile aprovados. Sem migration/RLS/produção. [Relatório e rollback](runbooks/performance-05-pagination.md).


- ✅ **Codex — Performance 03 (18/11/2026)**: catálogo da nova dieta unificado em `d208c02`; abertura/fonte2→1 e roteiro8→5requests (−37,5%) em produção local e desenvolvimento. Debounce500ms, filtros, CRUD e prescrição preservados; Strict Mode3→1 no teste de montagem e resposta obsoleta descartada. Web778/100, build/tipos/lint/32páginas e browser aprovados. Mesma branch, sem banco/API/auth ou deploy de produção. [Relatório e reprodução](runbooks/performance-03-food-catalogue.md).


- ✅ **Codex — Performance 02 (17/11/2026)**: AVIF/WebP responsivos para a marca, qualidade85 e restrição local do otimizador em `dc27372`. 12 cenários antes/depois: imagens248.272→799–5.312bytes (−97,86% a−99,68%); nitidez/crops, alpha, dimensões porDPR eCLS0 conferidos. Web773, build/tipos/lint/32páginas e standalone isolado aprovados;22 variantes, fallbackPNG e6 bloqueios400. Sem API/banco/dependência/deploy de produção. [Relatório e reprodução](runbooks/performance-02-images.md).


- ✅ **Codex — Performance 22 (17/11/2026)**: gráficos e modais sob demanda implementados em `5f1aad2`; comparação antes/depois com 21 capturas por build e redução de JS gzip de 30,65–31,88% nos quatro cenários sem gráfico inicial. Web773, tipos/lint/build/32 páginas e interações desktop/mobile aprovados. Gráficos críticos mantidos automáticos; pequenos aumentos em dois cenários e LCP local inconclusivo documentados. Publicação na mesma branch, sem banco/API ou deploy de produção. [Relatório e reprodução](runbooks/performance-22-progressive-loading.md).


- ✅ **Codex — Performance 19 (17/11/2026)**: API ativa na Virgínia, banco mantido em São Paulo e Oregon como reserva sem cron. Mediana SQL real177,81→116,13 ms (−34,69%), 15 amostras de leitura por região. Domínio principal validado, frontend de produção preservado; API819/PostgreSQL256/web773 e builds/lint/tipos aprovados. Bloqueio inicial resolvido pela autorização específica posterior; paridade com main corrigida antes da promoção final. Rollback testado, env sensível original preservado e zero DDL/RLS/auth alterados em produção. [Resultado, métricas, limites e rollback](runbooks/performance-19-regional-migration.md).

- ✅ **Codex — Performance 08 (17/11/2026)**: preferências alimentares, demonstrações/referências de modelos e tracking agrupados; SQL e duração medidos antes/depois com papéis restritos. API 801 unitários/255 PostgreSQL, web 751, builds/lint/tipos aprovados. Entrega na branch `agent/codex/performance-diagnosis`, com publicação autorizada. [Evidência e limites](runbooks/performance-08-verification.md).

- ✅ **Codex**: PDF confrontado com o projeto; [especificação](superpowers/specs/2026-10-23-personal-p3-design.md) e [plano](superpowers/plans/2026-10-23-personal-p3.md) aprovados e executados. Consulta/impressão na ficha atual, conforme escolha do mantenedor.
- ✅ Monitor de volume semanal, frequência, sinergia, cobertura e snapshot do servidor implementados e revisados.
- ✅ Modelos globais/privados imutáveis, filtros, prévia, cópia sanitizada para rascunho e isolamento por conta implementados e revisados.
- ✅ Periodização opcional de 4–12 semanas, prévia antes de finalizar, progressão/deload e datas da semana na consulta/impressão implementados e revisados.
- ✅ API 755/755, web 748/748, PostgreSQL/HTTP/RLS 253/253; tipos, lint, builds e verificações de produção local aprovados. Nove verificações reais Chromium/Playwright, desktop/mobile e PDF A4 aprovados; rerevisão final sem achados materiais.
- ℹ️ Cenários Cypress versionados; runner nativo não executado porque o download do binário recebeu HTTP 403. Jornada real validada com Chromium/Playwright disponível, sem contornar a política de rede.
- ✅ [Relatório final e decisões](runbooks/personal-p3-verification.md). Branch `agent/codex/personal-p3` publicada, por solicitação posterior do mantenedor, no [PR #31](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/31). Migrations somente no PostgreSQL sintético; sem merge, deploy ou produção.

## Correções das revisões — 2026-10-17

- ✅ Codex: PR #27 — prescrição preservada em falhas transitórias, histórico após avaliação e reautenticação nas cinco telas corrigidos. PR #28 — suíte API pendente validada (602/602); web 525/525, tipos/lint/builds aprovados. Publicado no PR #29 (rascunho), após autorização do mantenedor em 2026-10-17.

## Fase 1 — Fundação Profissional ✅

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 1.1 | Cadastro público de profissional (NUTRITIONIST, PERSONAL, PHYSIO) | ✅ | — |
| 1.2 | Login com JWT em HttpOnly cookie | ✅ | — |
| 1.3 | CRUD de Client (prontuário sem login) | ✅ | — |
| 1.4 | Arquivamento e restauração de Client | ✅ | — |
| 1.5 | Isolamento por professionalId (ownership) | ✅ | — |
| 1.6 | ClientAccessGuard na API | ✅ | — |
| 1.7 | CI com testes unitários, e2e e Cypress | ✅ | — |

---

## Fase 2 — Design System & Migração (Em Andamento)

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 2.1 | Design system (tokens, cores, tipografia) | 🔄 | Codex |
| 2.2 | Navegação profissional no Sidebar (filtrar por role) | 🔄 | Codex |
| 2.3 | Dashboard por atuação profissional | 🔄 | Codex |
| 2.4 | Migrar dietas de User para Client | ✅ | Codex |
| 2.5 | Migrar treinos de User para Client | 🔄 | Codex |
| 2.6 | Migrar avaliações de User para Client | 🔄 | Codex |
| 2.7 | Migrar reabilitação de User para Client | 🔄 | Codex |
| 2.8 | Migrar anamnese de User para Client | 🔄 | Codex |
| 2.9 | Migrar suplementos de User para Client | 🔄 | Codex |
| 2.10 | Migrar exames lab de User para Client | 🔄 | Codex |
| 2.11 | Remover fluxos legados de paciente (ProfessionalPatientLink, /membros, /paciente) | 🔄 | Codex |
| 2.12 | Agenda profissional de atendimentos vinculada a Client | ✅ | Codex |

---

## Fase 3 — Planos Versionados & Outputs

Publicação em andamento, autorizada em 21/10/2026: integração com main validada (web666, browser32/32), seguida por PR/checks, três migrations e deploy dos serviços existentes. [Runbook da publicação](runbooks/personal-release-2026-10-21.md).

Entrega do Personal aprovada pelo usuário em 17/10/2026, com execução por subagentes: [direção](planning/2026-10-17-personal-proxima-entrega.md), [rascunhos/revisões](superpowers/plans/2026-10-17-personal-rascunhos-revisoes.md) e [biblioteca visual](superpowers/plans/2026-10-17-personal-biblioteca-visual.md). Ambos os planos concluídos e revisados. A biblioteca preserva 148 exercícios, inclui 20 com 21 ilustrações licenciadas e permite cadastro manual com link próprio opcional; fichas e rascunhos mantêm referências históricas autorizadas. A revisão ampla identificou um ajuste de foco, corrigido em `2d8d803` e aprovado na única rerevisão restrita, sem pendências. Gates finais: 657 testes web, tipos/lint/builds e visual real 4/4; API 737, PostgreSQL 243, 21 probes oficiais e 28/28 regressões reais retidos sem alterações nas fontes afetadas. O lote histórico 31/32 continua discriminado no [runbook](runbooks/personal-exercise-media-verification.md), sem ser apresentado como verde. Desktop/celular, teclado, impressão e isolamento por conta conferidos. Branch/worktree preservadas; sem publicação ou migrations em produção.

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 3.1 | Rascunhos e revisões de prescrição do Personal | ✅ | Codex |
| 3.2 | Modelos reutilizáveis com cópia profunda (`/modelos-treinos`) | 🔄 | Antigravity |
| 3.3 | Geração de PDF A4 tipográfico para prescrições do Personal | ✅ | Antigravity |
| 3.4 | Impressão de planos | ✅ | Antigravity |
| 3.5 | Compartilhamento por WhatsApp/e-mail | ⏳ | — |
| 3.6 | Banco versionado de receitas com macros, restrições e associação às refeições | ✅ | Codex |
| 3.7 | Biblioteca visual de exercícios e referências nas prescrições | ✅ | Codex |

---

## Fase 4 — Infraestrutura & Qualidade

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| 4.1 | Shared types entre API e frontend | ⏳ | — |
| 4.2 | Testes unitários para todos os services da API | ⏳ | — |
| 4.3 | Testes Cypress para todos os fluxos profissionais | ⏳ | — |
| 4.4 | Seed de dados realistas para desenvolvimento | ⏳ | — |
| 4.5 | Documentação de API (Swagger/OpenAPI) | ⏳ | — |
| 4.6 | Monitoramento de performance (bundle size, query time) | ⏳ | — |
| 4.7 | Endurecer Data API, grants e RLS defensivo no Supabase | ✅ | Codex |
| 4.8 | Remediar os 15 achados da auditoria de segurança e qualidade | ✅ | Codex |
| 4.10 | Corrigir DR-001/002/003 e validar patch local; proposta de leitura/RLS preparada | ✅ local | Codex |
| 4.11 | Auditoria de leitura v3 implementada e verificada; produção pendente | ✅ local | Codex |
| 4.12 | RLS sem bypass provado em PG16/17; produção depende da Fase 0 | ✅ local | Codex |
| 4.13 | Atualizar dependências de desenvolvimento/testes e validar compatibilidade | ⏳ | — |
| 4.14 | Proteger scripts demo/seed e atestar role, backups/restauração e publicação | ⏳ | — |
| 4.16 | Recuperação Render concluída: backup restaurado, migration/LOGINs/CA em produção; PR#24 e deploy live; página própria confirmada pelo mantenedor | ✅ deploy | Codex |
| 4.15 | Consolidar proposta v3 com ajustes da revisão de leitura/RLS | ✅ documento | Codex |

---

## Roadmap Futuro

| # | Tarefa | Status |
|---|--------|--------|
| 5.1 | Notificações por email/SMS | ⏳ |
| 5.2 | Integração com Google Calendar | ⏳ |
| 5.3 | Chat profissional-paciente | ⏳ |
| 5.4 | App mobile (React Native) | ⏳ |
| 5.5 | Wearable integration (Apple Health, Google Fit) | ⏳ |
| 5.6 | IA para sugestões de treino/dieta | ⏳ |

---

## Como usar este arquivo

1. **Antes de iniciar**: verifique a coluna "Agente" — se outro agente está trabalhando, evite conflito
2. **Ao iniciar**: mude o status para 🔄 e coloque seu nome na coluna "Agente"
3. **Ao concluir**: mude o status para ✅
4. **Se bloqueado**: mude para ❌ e descreva o impedimento em `docs/agents/<SEU_STATUS>.md`

### Remediação de segurança — Codex
- ✅ Review final do PR #22 (Codex): cache do protocolo invalidado antes de navegar; criação/substituição com o mesmo QueryClient real em menos de 60 segundos, consulta ativa e erro cobertos. 9 testes focais, tipos/lint/build aprovados localmente; conferir checks após push.
- ✅ Correção do CI do PR #22 (Codex): gate standalone compatível com o artefato do Vercel, preservando os checks local/Docker; 44 testes, tipos/lint/build aprovados localmente. Conferir o deployment do novo HEAD após push.
- ✅ Review do PR #22 (Codex): índice legado sem reescrever histórico, refresh resiliente a 500 e invalidação da central de exames; [validação e limites](runbooks/pr22-review-corrections.md).
- [x] Plano A: ownership por Client, schema e retirada do runtime legado — concluído no worktree de segurança.
- [x] Plano B: persistência server-only, impressão escapada e CSP — concluído (Codex); jornada real e gate de HTML dinâmico aprovados.
- [x] Plano C: sessões revogáveis e dependências — concluído (Codex); 11 testes HTTP reais e jornada Cypress aprovados.
- [x] Plano D: operação, índices e gates de qualidade — concluído no worktree (Codex). Evidência e limites: [verificação final](runbooks/security-remediation-verification.md). Sem publicação ou migrations em produção.

## Remoção de Histórico de acessos — 2026-10-08

- [x] Codex: interface/API/coleta/entrega/modelos exclusivos retirados; RLS/guards/contexto e históricos de alterações preservados.
- [x] Primeira etapa revisada sem achados; PR #25 integrado em e1b13ddd com CI completo; Render live e Vercel produção READY.
- [x] Segunda etapa preparada e provada: owner gerenciado, preservação dos dados/RLS e rollback diante de dependência inesperada; 30 suítes/181 E2E PG17, TypeScript/lint aprovados.
- [x] Revisão sem achados e PR #26 pronto; rebase sobre main preservou o SQL/teste já revisados.
- [x] Produção autorizada: primeira etapa live; novo backup cifrado restaurou43 tabelas/21 acessos; migration18 aplicada externamente pelo owner. 18 concluídas/zero falhas,40 tabelas de domínio com RLS e contagens preservadas; objetos exclusivos ausentes.
- [ ] Publicar segunda etapa após CI completo e confirmar Render live/checker sem migrations pendentes e frontend em produção.

---

## Planejamento — Workspace do Personal

| # | Tarefa | Status | Agente |
|---|--------|--------|--------|
| P.0 | Diagnóstico Obsidian/código e proposta de evolução de uso exclusivo do Personal | ✅ proposta documentada | Codex |
| P.1 | Workspace e prontuário do Personal integrados à avaliação, treino ativo e agenda ([verificação](runbooks/personal-p1-verification.md)) | ✅ concluído | Antigravity |
| P.2 | Contexto/anamnese de treinamento, PAR-Q+ e mapeamento de equipamentos | ✅ concluído | Antigravity |
| P.3 | Editor profissional e biblioteca de exercícios | ⏳ proposta | — |
| P.4 | Versões, modelos independentes (/modelos-treinos) e PDF A4 tipográfico | ✅ concluído | Antigravity |
| P.5 | Sessões, evolução e revisão periódica registradas pelo Personal | ⏳ proposta | — |
| P.6 | Periodização e gestão do acompanhamento | ⏳ proposta | — |

- [x] Codex — Rascunhos Task 2: escrita finalizada, metadados e preservação de histórico; 39 unitários e 13 regressões PostgreSQL, tipos/lint aprovados (2026-10-17).

- [x] Codex — Auditoria de segurança do SafeMove com a skill da Cloudflare (2026-11-26). [Escopo e quatro pontos para validação](agents/CODEX_STATUS.md#current-task).
- [x] Codex — Validação dos quatro pontos da auditoria (2026-11-26). [Resultados e limite da verificação de produção](agents/CODEX_STATUS.md#current-task).
- [x] Codex — Correções dos quatro pontos da auditoria concluídas (2026-11-26). [Resultados da validação](agents/CODEX_STATUS.md#current-task).
- [x] Codex — Correções da auditoria publicadas e [PR #38 aberto para revisão](https://github.com/Gustavo13Cs/ecossistema-resiliencia/pull/38) (2026-11-26).
- [x] Codex — Falha de Cypress no PR #38 corrigida e validada localmente com 7/7 testes do CI (2026-11-26).
