# Personal — Rascunhos e Revisões Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Salvar e retomar elaborações no servidor, finalizando uma prescrição válida sem perder o histórico ou substituir trabalho concorrente.

**Architecture:** WorkoutDraft separado das prescrições Workout. Escritas serializam no Client e usam version para concorrência; finalização produz Workout e encerra o rascunho na mesma transação clínica. Editor, biblioteca, leitura por ID e contexto RLS existentes são reutilizados.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, Next.js 16, React 19, TanStack Query, Jest, Vitest e Cypress.

**Spec:** [Especificação aprovada](../specs/2026-10-17-personal-rascunhos-revisoes-design.md).

## Global Constraints

- Somente PERSONAL; Client e proprietário resolvidos pela sessão, sem bypass administrativo.
- “No máximo um OPEN por aluno e profissional, garantido por índice único parcial.”
- “Limite adicional de 64 KiB para o JSON normalizado: excesso retorna 413 e mantém o trabalho local.”
- “até 30 divisões e 100 exercícios por divisão”; demais limites de texto/enum/duração conforme seção 5 da especificação.
- “Nesta entrega o salvamento é manual, sem autosave prometido.”
- Sem armazenamento clínico em localStorage/sessionStorage; sem alterações de CI, segredos, deploy ou PRODUCT.md.
- Fichas finalizadas são preservadas; legado não recebe numeração/data inventadas. Arquivado permite leitura e bloqueia todas as mutações do rascunho.
- Aprovação da especificação cobre a proposta aditiva de schema/migration em desenvolvimento. Nenhuma aplicação em produção está incluída.
- Antes da execução, usar using-git-worktrees para conferir isolamento; ler AGENTS.md e o guia Next.js instalado aplicável. Não copiar arquivos antigos de auth/Prisma.

## Review Focus

- Texto digitado enquanto save está em voo continua marcado como não salvo: teste na tarefa 5.
- Empate de updatedAt e cursor adulterado não saltam linhas nem cruzam contas: tarefa 3.
- Resposta de finalize perdida é recuperada, mas expectedVersion errado não recebe sucesso: tarefa 3.
- Rebase confirmado em uma aba não aceita base que mudou de novo antes do request: tarefa 3.
- Voltar pelo navegador, trocar sessão ou receber 403 não restaura conteúdo clínico antigo: tarefas 5 e 7.

## Estrutura de arquivos e interfaces

Criar dentro de `api/src/modules/workouts/`: `workout-draft.types.ts` (conteúdo e contratos), `workout-draft-content.ts` (normalização/validação), `workout-drafts.service.ts` (ciclo de vida), `workout-drafts.controller.ts` (HTTP), `dto/workout-draft.dto.ts` (entradas concretas). Modificar somente os serviços existentes necessários à escrita/leitura e ao registro do controller.

Na web: criar `types/workout-draft.ts`, `hooks/features/useWorkoutDrafts.ts`, `lib/workout-draft-form.ts` e componentes `WorkoutDraftEditor.tsx`/`WorkoutDraftList.tsx` em `components/features/training/`. O editor de rascunho reutiliza WorkoutSplitCard e helpers, sem duplicar cartões de exercício. Separar operações assíncronas do formulário puro.

Tipos de conteúdo V1 usam strings vazias para campos não preenchidos, duração `number | null` e arrays ordenados; enums opcionais usam null, não uma string fora do enum. `WorkoutDraftResource` tem id, clientId, status, version, schemaVersion, content anulável, sourceWorkoutId, baseActiveWorkoutId, finalizedWorkoutId e datas. Na web, definir `DraftVersionInput = { expectedVersion: number }`, `DraftSaveInput = DraftVersionInput & { content: DraftContentV1 }` e `DraftRebaseInput = DraftVersionInput & { expectedActiveWorkoutId: string | null }`. DTOs de mutação não aceitam professionalId ou snapshot externo.

## Task 1: Conteúdo de rascunho e persistência isolada

**Files:** Create `api/src/modules/workouts/workout-draft.types.ts`, `workout-draft-content.ts`, `workout-draft-content.spec.ts`, `dto/workout-draft.dto.ts`, `api/test/workout-draft-storage.e2e-spec.ts`, `api/prisma/migrations/20261017120000_workout_drafts/migration.sql`; modify `api/prisma/schema.prisma`.

**Interfaces:** Produces `DraftContentV1`, `normalizeDraftContent(input: DraftContentDto): DraftContentV1`, `assertDraftContentSize(content: DraftContentV1): void`, `toFinalizedWorkoutInput(clientId: string, content: DraftContentV1): CreateWorkoutDto`; Prisma WorkoutDraft/status/relations and nullable Workout.finalizedAt/revisionOfId.

- [x] **Step 1 — Testes RED:** `normalizes_empty_fields_without_inventing_exercises` verifica `{ title: '', splits: [] }`; `rejects_payload_above_65536_bytes` verifica 413 pelo tamanho UTF-8, inclusive caracteres multibyte; `finalization_requires_name_sets_reps_and_effort_pair` verifica falha de ficha incompleta. No PostgreSQL, `one_open_per_owner_and_client` exige violação de unicidade na segunda OPEN; `rejects_invalid_terminal_shape` exige falha dos checks; outro profissional não lê/escreve a linha sob role clínico.
- [x] **Step 2 — Confirmar RED:** em `api/`, `npm test -- --runInBand workout-draft-content.spec.ts`. Deve falhar por módulo ausente/assertiva nova, não por configuração do banco.
- [x] **Step 3 — Implementar:** enums, tabela, FKs RESTRICT, índice parcial, checks dos três estados e policies/grants da especificação; funções de conteúdo e DTOs com limites exatos. Não usar IsOptional para aceitar JSON arbitrário nem tratar campo vazio como zero. Validar `content` opcional XOR sourceWorkoutId no DTO de criação. Copiar modelo de RLS da migration de custom_exercises, acrescentando ownership do Client. Não alterar linhas Workout existentes.
- [x] **Step 4 — Verificar GREEN:** teste unitário acima; no banco sintético atestado por `test/fixtures/client-isolation.ts`, executar `npx prisma validate`, `npx prisma generate`, `npx prisma migrate deploy` e `npm run test:e2e -- workout-draft-storage.e2e-spec.ts`. Esperado: sucesso, checks/índices/RLS exercitados e conteúdo legado idêntico. Configurar URLs somente para `localhost:5434/ecossistema_resiliencia_test`, sem ler .env remoto.
- [x] **Step 5 — Commit:** adicionar somente os arquivos desta tarefa; `git commit -m "feat: persist isolated workout drafts"`.

## Task 2: Escrita finalizada e preservação das fichas

**Files:** Modify `api/src/modules/workouts/workouts.service.ts`, `workouts.service.spec.ts`, `training-read.service.ts`, `training-read.types.ts`, `api/test/workout-client-transactions.e2e-spec.ts`.

**Interfaces:** Produces `WorkoutsService.createFromDraft(user: AuthUser, data: CreateWorkoutDto, revisionOfId: string | null): Promise<WorkoutDetail>`; existing `create(user, data)` keeps its compatible result and lock semantics. Read contract adds finalizedAt/revisionOfId, existing fields remain.

- [x] **Step 1 — Testes RED:** `new_prescription_has_server_finalized_at`, `draft_revision_preserves_source_content`, `cannot_delete_client_prescription_or_legacy_history` e `nested_failure_preserves_previous_active`; conferir 409 na exclusão e quantidade/conteúdo inalterados após falha.
- [x] **Step 2 — Confirmar RED:** `npm test -- --runInBand workouts.service.spec.ts training-read.service.spec.ts` em `api/`.
- [x] **Step 3 — Implementar:** compartilhar a construção transacional da ficha entre create/createFromDraft; origem validada no mesmo aluno/conta; data no servidor. createFromDraft usa a transação clínica corrente e retorna WorkoutDetail com clientId no topo. O helper transacional deve reutilizar a conexão do PrismaService e o lock de Client, sem abrir PrismaClient externo. Bloquear DELETE de toda ficha com clientId, preservando tratamento de modelos independentes e save-as-template legado.
- [x] **Step 4 — Verificar GREEN:** comandos unitários anteriores e `npm run test:e2e -- workout-client-transactions.e2e-spec.ts training-workspace.e2e-spec.ts`; esperado: compatibilidade de criação/leitura e rollback preservados.
- [x] **Step 5 — Commit:** `git commit -m "feat: preserve finalized workout history"` após adicionar somente o delta desta tarefa.

## Task 3: Ciclo de vida, idempotência e conflitos

**Files:** Create `api/src/modules/workouts/workout-drafts.service.ts`, `workout-drafts.service.spec.ts`, `api/test/workout-draft-transactions.e2e-spec.ts`; modify fixtures de limpeza nos testes existentes que removem Client/Workout para excluir drafts sintéticos antes dos pais.

**Interfaces:** Consumes tarefas 1/2. Produces `WorkoutDraftsService.list(user, query): Promise<DraftPage>`, `create(user, dto): Promise<WorkoutDraftResource>`, `get(user, id): Promise<WorkoutDraftResource>`, `update(user, id, dto): Promise<WorkoutDraftResource>`, `rebase(user, id, dto): Promise<WorkoutDraftResource>`, `finalize(user, id, dto): Promise<FinalizedDraftResult>`, `discard(user, id, dto): Promise<DraftAck>`. `FinalizedDraftResult` é o envelope exato da seção 6 da especificação. DTOs/tipos ficam nos arquivos da tarefa 1; user/id/expectedVersion nunca vêm de JSON clínico.

- [x] **Step 1 — Testes RED:** `save_does_not_replace_active`, `stale_version_keeps_server_content`, `retry_same_finalize_returns_same_workout`, `different_finalize_version_conflicts`, `rebase_checks_active_again`, `archive_serializes_with_finalize`, `rollback_keeps_open_content`, `list_cursor_is_scoped_and_stable`. No cursor testar updatedAt empatado com id como desempate; cursor tem `{ updatedAt, id }` codificado/validado e nunca define professionalId. Inserir duas contas e aluno diferente da mesma conta para testar origem/base estrangeiras.
- [x] **Step 2 — Confirmar RED:** `npm test -- --runInBand workout-drafts.service.spec.ts`.
- [x] **Step 3 — Implementar:** tipos de query/cursor/envelope na tarefa 1; list somente OPEN com limite padrão/máximo 20 e `take 21`. Em mutações, Client lock → releitura/lock draft → version/status → escrita. Retornar códigos `DRAFT_EXISTS`, `DRAFT_VERSION_CONFLICT`, `DRAFT_CLOSED`, `CLIENT_ARCHIVED`, `ACTIVE_WORKOUT_CHANGED`. Finalize compara base, chama createFromDraft e encerra com content SQL NULL/version+1; descartar limpa content da mesma forma. Retry terminal só aceita expectedVersion = version terminal − 1 e operação compatível. Nunca registrar payloads nos erros.
- [x] **Step 4 — Verificar GREEN:** unitários e `npm run test:e2e -- workout-draft-transactions.e2e-spec.ts workout-draft-storage.e2e-spec.ts workout-client-transactions.e2e-spec.ts`. Usar conexões concorrentes e barreiras de transação, sem sleeps como prova de corrida. Confirmar exatamente um OPEN e um ativo sob concorrência; falha injetada depois da criação dos filhos reverte tudo.
- [x] **Step 5 — Commit:** `git commit -m "feat: finalize workout drafts with conflict protection"`.

## Task 4: API pública autenticada dos rascunhos

**Files:** Create `api/src/modules/workouts/workout-drafts.controller.ts`, `workout-drafts.controller.spec.ts`, `api/test/workout-draft-http.e2e-spec.ts`; modify `api/src/modules/workouts/workouts.module.ts`, DTOs/tipos da tarefa 1.

**Interfaces:** Consumes WorkoutDraftsService. Produces os sete endpoints list/create/detail/update/rebase/finalize/discard da seção 6; todos com JWT/PERSONAL. List usa resource-page; finalize/detail usam resource com clientId; discard usa ack.

- [ ] **Step 1 — Testes RED:** `draft_route_is_not_workout_id`, `rejects_non_personal_before_service`, `foreign_draft_is_404`, `rejects_owner_fields_and_invalid_uuid`, `classified_finalize_has_top_level_client_identity`. Assertivas: sem sessão 401; papéis errados 403; outra conta 404; DTO inválido 400; >64 KiB normalizados 413; base/version obsoleta 409 com código específico.
- [ ] **Step 2 — Confirmar RED:** `npm test -- --runInBand workout-drafts.controller.spec.ts`.
- [ ] **Step 3 — Implementar:** registrar WorkoutDraftsController antes de WorkoutsController no módulo para que `/workouts/drafts` não caia em `:workoutId`. Definir ParseUUIDPipe/DTO concreto, guard de domínio e ClinicalResponse em cada handler. Reutilizar interceptors/CSRF/no-store existentes; sem exceção de catálogo.
- [ ] **Step 4 — Verificar GREEN:** comando anterior e `npm run test:e2e -- workout-draft-http.e2e-spec.ts professional-domain-boundaries.e2e-spec.ts`; confirmar também rejeição de resposta preparada com Client alheio.
- [ ] **Step 5 — Commit:** `git commit -m "feat: expose personal workout draft lifecycle"`.

## Task 5: Formulário, hooks e editor de rascunho

**Files:** Create `web/types/workout-draft.ts`, `web/lib/workout-draft-form.ts`, `workout-draft-form.test.ts`, `web/hooks/features/useWorkoutDrafts.ts`, `useWorkoutDrafts.test.tsx`, `web/components/features/training/WorkoutDraftEditor.tsx`, `WorkoutDraftEditor.test.tsx`; modify `web/lib/query-keys.ts`.

**Interfaces:** Produces `toDraftContent(form: WorkoutForm): DraftContentV1`, `fromDraftContent(content: DraftContentV1): WorkoutForm`; `useWorkoutDrafts({ clientId?, draftId?, cursor?, enabled? })` returns listQuery/detailQuery/createMutation/saveMutation/rebaseMutation/finalizeMutation/discardMutation. `WorkoutDraftEditor({ client: Client, draft: WorkoutDraftResource | null, onCreate, onSave, onFinalize, onRebase, onDiscard, onAccessDenied })`; callbacks: `onCreate(content: DraftContentV1): Promise<WorkoutDraftResource>`, `onSave(input: DraftSaveInput): Promise<WorkoutDraftResource>`, `onRebase(input: DraftRebaseInput): Promise<WorkoutDraftResource>`, `onFinalize(input: DraftVersionInput): Promise<FinalizedDraftResult>`, `onDiscard(input: DraftVersionInput): Promise<DraftAck>`, `onAccessDenied(): void`. ClientId/draftId vêm do container autorizado, não de texto do formulário.

- [ ] **Step 1 — Testes RED:** `roundtrips_empty_and_advanced_fields`, `draft_save_accepts_incomplete_form`, `typing_during_save_stays_dirty`, `save_error_does_not_finalize`, `rebase_requires_explicit_confirmation`, `late_response_does_not_cross_session`. Assertar salvo apenas para o snapshot enviado; nome/séries novos digitados durante save permanecem dirty; 403 remove conteúdo; cache de outra conta permanece intocado.
- [ ] **Step 2 — Confirmar RED:** `npm test -- lib/workout-draft-form.test.ts hooks/features/useWorkoutDrafts.test.tsx components/features/training/WorkoutDraftEditor.test.tsx` em `web/`.
- [ ] **Step 3 — Implementar:** converters sem exemplos; hooks com useClinicalQuery, AbortSignal e chaves `[workout-drafts, sub, …]`. Salvar incompleto e finalizar completo têm validações separadas. Snapshot salvo serve de baseline; pending não autoriza descartar alterações posteriores. Confirmação de rebase usa activeWorkoutId visto pelo usuário, nova alteração gera novo conflito. Remover listeners de saída em cleanup; sem persistência de browser.
- [ ] **Step 4 — Verificar GREEN:** comando anterior e `npm run typecheck`; resultados completos sem supressões de tipo ou cache global.
- [ ] **Step 5 — Commit:** `git commit -m "feat: edit and resume workout drafts"`.

## Task 6: Rotas, listagem, prontuário e revisão de ficha

**Files:** Create `web/app/clientes/[id]/rascunhos/[draftId]/page.tsx`, `web/components/features/training/WorkoutDraftList.tsx`, `WorkoutDraftList.test.tsx`; modify `web/app/clientes/[id]/novo-treino/page.tsx`, `web/app/treinos/page.tsx`, `web/components/features/training/PersonalClientRecord.tsx`, `PersonalClientRecord.test.tsx`, `WorkoutReadView.tsx`, `WorkoutReadView.test.tsx`, `web/lib/professional-workspace.ts`, `professional-workspace.test.ts`, `web/types/workout.ts` e testes de contrato existentes.

**Interfaces:** Consumes tarefas 4/5. Produces `/clientes/:id/rascunhos/:draftId` PERSONAL-only e integração das ações Criar/Continuar/Revisar/Descartar. `WorkoutDraftList({ page: DraftPage, onContinue, onDiscard, onNextPage })` não calcula contagens clínicas a partir da página limitada.

- [ ] **Step 1 — Testes RED:** `record_separates_active_and_open_draft`, `revision_uses_selected_workout_id`, `existing_draft_requires_continue_or_discard`, `archived_draft_is_read_only`, `draft_does_not_offer_print`, `legacy_label_has_no_invented_version`.
- [ ] **Step 2 — Confirmar RED:** `npm test -- components/features/training/WorkoutDraftList.test.tsx components/features/training/PersonalClientRecord.test.tsx components/features/training/WorkoutReadView.test.tsx lib/professional-workspace.test.ts`.
- [ ] **Step 3 — Implementar:** resolver Client antes das queries; cruzar clientId retornado com rota e negar mismatch. Criação do zero só grava no primeiro save; copiar/revisar chama create(sourceWorkoutId) explicitamente antes de navegar. Paginação de rascunhos preserva erros por bloco; confirmação de descarte. Revisão de ficha anterior usa seu ID, não o ativo. Ampliar route boundary só para o novo ramo Personal; fonte arquivada não habilita escrita. Mostrar finalizedAt/revisionOfId e estado legado sem alterar a ficha.
- [ ] **Step 4 — Verificar GREEN:** comando anterior, `npm test -- 'app/clientes/[id]/novo-treino/workout-client-contract.test.tsx'`, `npm run typecheck`, `npm run lint`. Atualizar o contrato antigo para refletir criação de rascunho, preservando verificações de propriedade/papel.
- [ ] **Step 5 — Commit:** `git commit -m "feat: integrate draft review into personal workspace"`.

## Task 7: Jornada real e fechamento do lote

**Files:** Create `web/cypress/e2e/personal-workout-drafts-real.cy.ts`, `docs/runbooks/personal-workout-drafts-verification.md`; modify `api/test/run-personal-p1-real.ts`, `api/prisma/seed-phase1-e2e.ts` somente se o fixture existente não fornecer as duas contas necessárias, e testes do runner se houver extração de argumentos.

**Interfaces:** Runner mantém os specs padrão P1 e aceita `--spec <lista>`; escolhe npm/npx e spawn conforme process.platform, sem cmd.exe em Linux. Mantém assertIsolationDatabase, portas livres e cleanup somente de processos filhos que iniciou. `npx ts-node test/run-personal-p1-real.ts --spec cypress/e2e/personal-workout-drafts-real.cy.ts` deve executar frontend/API/PostgreSQL reais.

- [ ] **Step 1 — Testes RED:** Cypress cria aluno, salva vazio, recarrega, preenche, finaliza, revisa e abre as duas fichas por ID. Testar mudança de base em segunda aba, arquivamento e conta B sem dados da A; após navegação/voltar e 403, nenhum prontuário antigo reaparece. Usar respostas reais para sincronização, sem force-click ou timeout aumentado. Testar seleção de comando do runner para win32 e linux se extraído helper puro.
- [ ] **Step 2 — Confirmar RED:** rodar runner portátil com novo spec e confirmar falha de comportamento ainda ausente quando aplicável; falha de browser não é evidência RED do produto.
- [ ] **Step 3 — Implementar:** ajustes finais estritamente necessários; fixtures/runner portáveis com mesmas restrições de banco e identidade. Remover drafts nos cleanups antes de Workout/Client para respeitar RESTRICT. Não enfraquecer as restrições para fazer o teste passar.
- [ ] **Step 4 — Verificar GREEN:** API `npm test -- --runInBand`, `npx tsc --noEmit`, `npx eslint "src/**/*.ts" "test/**/*.ts" --max-warnings=0`, `npm run build`, `npm run test:e2e`. Web `npm test`, `npm run typecheck`, `npm run lint`, `INTERNAL_API_URL=http://localhost:3000 npm run build`. Runner novo e specs P1 de regressão; inspeção final em 1440×900 e 390×844, foco/teclado e leitura. Esperado: zero falhas, nenhum acesso remoto, nenhuma gravação clínica em storage. Não repetir a suíte completa se nenhum delta/risco novo justificar.
- [ ] **Step 5 — Commit:** registrar comandos/contagens/limites efetivamente observados no runbook e atualizar CODEX_STATUS/TASKS; `git commit -m "test: verify personal workout draft lifecycle end to end"`. Solicitar revisão independente da branch conforme método de execução escolhido; sem merge/deploy automático.

## Cobertura e handoff

Especificação seções 1–3: tarefas 5–7; modelo/validação: tarefa 1; contratos: tarefa 4; transações/legado: tarefas 2–3; cache/estados: tarefas 5–6; RLS/rollout: tarefas 1/4/7; todos os dez critérios: tarefas 1–7.

Autorrevisão: interfaces, enums, caminhos, limites e testes de Review Focus conferidos. Plano preparado, não executado. Após revisão deste plano, escolher execução direta nesta conversa ou execução por subagentes. Recomendação: direta, porque os contratos de conteúdo, serviço e editor evoluem sequencialmente; uma revisão independente ao final verifica o conjunto.
