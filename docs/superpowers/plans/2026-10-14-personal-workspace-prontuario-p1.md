# Personal — Painel de Trabalho e Prontuário P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma jornada operada exclusivamente pelo Personal: localizar aluno, consultar avaliação/treino, prescrever e organizar o atendimento com dados privados reais.

**Architecture:** Reutilizar Client, agenda, autenticação e contexto clínico/RLS da main vigente. Criar projeções específicas de leitura no WorkoutsModule e componentes/hooks de treinamento; preservar a composição de Nutrição/Fisioterapia. P1 usa a persistência existente e não implementa modelos independentes ou versionamento formal.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query, Tailwind/Radix; NestJS 11, Prisma 7/PostgreSQL; Jest, Vitest/Testing Library e Cypress real.

**Spec:** [Especificação P1 aprovada em 14/10/2026](../specs/2026-10-14-personal-workspace-prontuario-p1-design.md).

**Estado:** plano técnico preparado para revisão e escolha do método de execução; código de produto não alterado.

## Global Constraints

- Somente o Personal opera a área; aluno é um Client privado, sem conta, portal ou tarefas de preenchimento.
- Começar da `origin/main` vigente em checkout isolado; última referência remota conferida: `37a174df176228eca297311db1337aaf68c4032a`.
- Preservar JwtAuthGuard, RolesGuard, ClinicalResponse, ClinicalContextInterceptor, PrismaService, ownership, sanitização de erros e Cache-Control: no-store.
- Sem alterações de schema, migrations, segredos, CI, deploy ou PRODUCT.md neste lote.
- Workspace: cinco entradas por seção, máximo de dez items; ordenação updatedAt desc e id asc. Contagens não dependem desse limite.
- Papel PERSONAL e propriedade de Client/Workout são verificados no servidor; role/IDs internos enviados pelo browser nunca são autoridade.
- Sem overview multidomínio, dados nutricionais/fisioterapêuticos ou indicadores derivados de DailyTracking na nova composição.
- Avaliação somente de força não exige peso; campo vazio não vira zero. MuscleMass/VO₂ com unidade desconhecida não recebem unidade inventada.
- Client arquivado permite leitura e bloqueia novas avaliações/treinos também no servidor.
- Agenda usa os helpers/fuso do navegador já existentes; consulta somente após resolver o período.
- Nenhum conteúdo clínico ou rascunho em localStorage/sessionStorage/cache persistente.
- Alvos de toque de pelo menos 44 px, teclado, foco visível, diálogo acessível e layout desktop/celular.
- Código em inglês, documentação e interface em pt-BR, commits convencionais em inglês; npm.cmd/npx.cmd no Windows.
- Testes clínicos somente em banco sintético local, com roles restritos; não executar seed, migration ou DDL contra banco remoto.

## Review Focus

1. Resposta atrasada depois de trocar profissional/aluno não reaparece na nova sessão — teste da tarefa 3.
2. Base somente arquivada não recebe onboarding de conta vazia; falha parcial não vira contagem zero — tarefa 4.
3. Mesmo aluno com dois treinos deve abrir o registro selecionado; ID de outro aluno da mesma conta não aparece no prontuário errado — tarefas 1 e 6.
4. Arquivamento concorrente com escrita não permite criar avaliação/treino após o estado ARCHIVED — tarefas 2 e 7.
5. Meia-noite/fuso, retorno à aba e compromisso cancelado não mostram agenda do dia anterior ou execução de treino presumida — tarefa 4.

## File Map

| Unidade | Arquivos |
|---|---|
| Leitura de treinamento | Novos `api/src/modules/workouts/training-read.service.ts`, `types/training-read.types.ts`; controller/module/serviço de treinos existentes. |
| Ciclo de vida/entrada | Novo `api/src/common/client-access/lock-active-owned-client.ts`, novo `api/src/modules/assessments/domain/assessment-input.ts`; serviços de treino/avaliação e DTO de avaliação. |
| Tipos e hooks | Novos `web/types/training.ts`, `web/types/assessment.ts`, `web/hooks/features/useTrainingWorkspace.ts`, `useTrainingOverview.ts`, `useWorkouts.ts`; query-keys, tipos de treino e hook de avaliações existentes. |
| Dashboard | Novos `web/components/features/training/PersonalDashboard.tsx`, `PersonalAgendaPreview.tsx`, `WorkoutClientPicker.tsx`, `web/hooks/features/usePersonalDayAgenda.ts`; despacho do ProfessionalDashboard e nova extração BaseProfessionalDashboard. |
| Prontuário/avaliação | Novos `web/components/features/training/PersonalClientRecord.tsx`, `PersonalAssessmentDialog.tsx`, `web/lib/personal-assessment.ts`; página do Client e AssessmentModal existentes. |
| Consulta/editor/listagem | Nova rota `web/app/clientes/[id]/treinos/[workoutId]/page.tsx`, novos `WorkoutReadView.tsx`, `WorkoutEditor.tsx`, `web/lib/workout-form.ts`; listagem/novo-treino existentes e política de rotas. |
| Verificação real | Novos `api/test/training-workspace.e2e-spec.ts`, `training-archived-client.e2e-spec.ts`, `web/cypress/e2e/personal-workspace-real.cy.ts`, `api/test/run-personal-p1-real.ts`; regressões e fixtures existentes. |

Cada novo arquivo de domínio/UI/hook recebe um teste adjacente `.spec.ts`/`.test.ts(x)` conforme o pacote. Não criar cópias dos módulos de auth/Prisma.

## Task 1: Contratos autenticados de leitura de treinamento

**Files:** criar TrainingReadService, training-read.types e `training-read.service.spec.ts`; modificar `workouts.controller.ts`, `workouts.module.ts`, `workouts.service.ts`, `workouts.controller.spec.ts` e `api/test/professional-domain-boundaries.e2e-spec.ts`.

**Interfaces:** `TrainingReadService.getWorkspace(user: AuthUser): Promise<TrainingWorkspace>`; `getClientOverview(user, clientId): Promise<TrainingClientOverview>`; `getWorkout(user, workoutId): Promise<WorkoutDetail>`. Types usam Date no servidor e ISO no transporte. Workspace tem counts `{activeStudents, archivedStudents, withoutActiveWorkout}` e items `{clientId,name,goal,updatedAt,section}`. Overview tem client `{id,status}`, activeWorkout nullable e recentAssessments, máximo dois. WorkoutDetail inclui Client `{id,name,status}`, isActive/updatedAt e filhos existentes.

- [ ] Criar checkout isolado de origin/main pela skill using-git-worktrees; branch `agent/codex/personal-workspace-p1`. Ler AGENTS/status e documentação Next local antes de editar. Trazer somente os documentos P1 revisados da branch de planejamento; preservar alterações locais preexistentes. Registrar baseline e status nesse checkout.
- [ ] Escrever testes de comportamento: `denies_foreign_client_before_aggregates`, `counts_students_not_workouts`, `limits_each_preview_to_five`, `keeps_legacy_template_workout_active`, `opens_selected_workout_and_omits_foreign_records`, `never_queries_other_domains`. Asserções centrais:

```ts
expect(result.items.filter(row => row.section === 'RECENT')).toHaveLength(5);
expect(result.counts.activeStudents).toBe(7);
expect(result.recentAssessments).toHaveLength(2);
expect(prisma.dietPlan.findFirst).not.toHaveBeenCalled();
```

Fixtures dos exemplos representam sete alunos ativos e mais de cinco candidatos recentes; o terceiro exemplo pertence ao overview. Testar também 401/403, UUID inválido, rota templates preservada e 404 por ownership.
- [ ] Rodar, de api, `npm.cmd test -- --runInBand training-read.service.spec.ts workouts.controller.spec.ts`. RED precisa indicar comportamento ausente, não falha de configuração/import; completar somente o scaffold de tipos/injeção necessário e repetir até a falha atingir a regra exercitada.
- [ ] Implementar as três projeções e rotas `GET /workouts/workspace`, `GET /workouts/client/:clientId/overview`, `GET /workouts/:workoutId`. Registrar rotas específicas antes da genérica; usar ParseUUIDPipe, papéis de treinamento e ClinicalResponse resource-page/overview/resource respectivamente. Queries explicitamente restritas; sem aumentar isolação por transação aninhada. No workspace, mesma pessoa pode constar em duas seções; todas as linhas têm clientId. Completar a listagem existente com isActive/updatedAt e status do Client para consumo correto.
- [ ] Reexecutar os testes focais e o teste de validação de resposta clínica. Resultado esperado: zero falhas, nenhum handler sem classificação, e ownership verificado antes de leituras do Client.
- [ ] Fazer commit apenas dos arquivos deste contrato: `feat: add personal training workspace read contracts`.

## Task 2: Escritas respeitam arquivamento e avaliação válida

**Files:** criar `lock-active-owned-client.ts` e seu teste, `assessments/domain/assessment-input.ts` e teste; modificar `workouts.service.ts`/spec, `assessments.service.ts`/spec e `dto/create-assessment.dto.ts`. Conservar `lockOwnedClient` existente para seus outros consumidores.

**Interfaces:** `lockActiveOwnedClient(tx: Prisma.TransactionClient, clientId: string, professionalId: string): Promise<void>` chama lockOwnedClient e verifica estado atual usando id+professionalId na mesma transação; lança 404 para ausência e ConflictException para ARCHIVED. `validateAssessmentMeasurements(dto: CreateAssessmentDto): void` rejeita avaliação sem medida e números inválidos antes da escrita. Chaves numéricas são as já existentes no DTO, incluindo os campos legados preservados para as outras atuações.

- [ ] Escrever REDs `archived_client_does_not_replace_active_workout`, `archived_client_cannot_receive_assessment`, `force_only_assessment_is_valid`, `empty_or_invalid_assessment_is_rejected`. Provar:

```ts
await expect(createForArchivedClient()).rejects.toMatchObject({ status: 409 });
expect(tx.workout.updateMany).not.toHaveBeenCalled();
expect(tx.physicalAssessment.create).not.toHaveBeenCalled();
expect(() => validateAssessmentMeasurements({ clientId, squat1RM: 80 })).not.toThrow();
```

Parametrizar entrada vazia, nota isolada, NaN/Infinity, peso/perímetro/dobra/força <=0, gordura <0/>100 e valores válidos inclusive gordura 0/100. A identificação clientId/userId não conta como medida.
- [ ] Rodar, de api, `npm.cmd test -- --runInBand lock-active-owned-client.spec.ts assessment-input.spec.ts workouts.service.spec.ts assessments.service.spec.ts`; confirmar falhas novas de regra.
- [ ] Implementar lock+verificação de estado junto das escritas de treino e avaliação. Manter resolução legada autorizada de avaliação e aplicar validação/estado ao Client resolvido. PrismaService reutiliza a transação clínica vigente; não criar outra conexão. DTO valida números finitos e os limites definidos; serviço impede registro sem medidas, inclusive nota isolada. Ranges são validação de entrada, não interpretação clínica.
- [ ] Rodar novamente os testes focais; executar regressões de criação/rollback/ownership. Esperado: força sem peso salva; nada é escrito após ARCHIVED; falha mantém ativo anterior. Ajustar mocks ao contrato transacional sem remover assertivas de autorização.
- [ ] Commit: `feat: enforce active client lifecycle for training and assessments`.

## Task 3: Tipos, hooks e invalidação por profissional

**Files:** criar `web/types/training.ts`, `assessment.ts`, hooks useTrainingWorkspace/useTrainingOverview/useWorkouts e respectivos testes. Modificar `web/types/workout.ts`, `web/lib/query-keys.ts`, `web/hooks/features/useClientAssessments.ts`; criar/atualizar seu teste.

**Interfaces:** `useTrainingWorkspace()`; `useTrainingOverview(clientId?: string, options?: {enabled?: boolean})`; `useWorkouts(options: {clientId?: string;workoutId?: string;enabled?: boolean})` fornece listQuery/detailQuery/activeQuery/createMutation. Somente query apropriada aos IDs/operação fica habilitada. `useClientAssessments(clientId, options?: {enabled?: boolean})` conserva retorno existente e amplia PhysicalAssessment com campos reais. `CreateWorkoutInput` replica campos permitidos do DTO; retornos usam WorkoutPrescription/WorkoutDetail.

Keys: `trainingWorkspace(sub)`, `trainingOverview(sub,clientId)`, `workoutsRoot(sub)`, `workouts(sub)`, `workout(sub,clientId,workoutId)`, `activeWorkout(sub,clientId)`. Todas as queries novas passam AbortSignal à API.

- [ ] Criar REDs `does_not_query_outside_personal_role`, `does_not_query_before_owned_client_is_ready`, `ignores_late_response_after_account_switch`, `invalidates_training_views_after_mutation`. Asserções:

```ts
expect(http.history.get).toHaveLength(0); // papel Nutrição, hooks específicos
expect(queryKeys.trainingOverview('pro-a', 'c1')).not.toEqual(queryKeys.trainingOverview('pro-b', 'c1'));
expect(result.current.detailQuery.data?.id).toBe(selectedWorkoutId);
```

Testar 401/403 com dados previamente em cache, troca de Client durante request e resposta 404. Não confundir request abortado com vazio.
- [ ] Rodar, de web, `npm.cmd test -- hooks/features/useTrainingWorkspace.test.tsx hooks/features/useTrainingOverview.test.tsx hooks/features/useWorkouts.test.tsx hooks/features/useClientAssessments.test.tsx`; confirmar REDs de comportamento.
- [ ] Implementar contratos e queries limitadas a PERSONAL, respeitando opção enabled. Detail query valida que clientId retornado corresponde ao solicitado. Alterar WorkoutSummary para incluir isActive, updatedAt e status no Client; WorkoutPrescription continua sem exigir Client embutido, pois POST/active não o fornecem. WorkoutDetail acrescenta o Client embutido. Normalizar estado de erro para não tornar dados clínicos utilizáveis após negação de acesso.
- [ ] Garantir invalidação: treino → workspace/listagem/overview/ativo; avaliação → assessments/overview; Client → workspace/leituras afetadas. A criação de Client e o cadastro/arquivamento existente serão conectados nas tarefas 4/5. Usar as chaves antigas para os demais consumidores e preservar o comportamento de logout/troca de conta.
- [ ] Rodar os testes focais e `npm.cmd run typecheck`; esperar zero falhas/erros. Commit: `feat: add scoped personal training data hooks`.

## Task 4: Dashboard operacional do Personal

**Files:** criar PersonalDashboard/PersonalAgendaPreview/WorkoutClientPicker e testes em `web/components/features/training/`; criar usePersonalDayAgenda e teste. Extrair conteúdo comum para `features/dashboard/BaseProfessionalDashboard.tsx`; modificar ProfessionalDashboard, suas regressões, AppShell.test e brief `.impeccable/surfaces/web-app-home-page-tsx.md`. Modificar ClientDirectory para invalidar workspace após cadastro/restauração/arquivamento.

**Interfaces:** ProfessionalDashboard despacha pelo papel usando somente hooks de auth; PersonalDashboard usa hooks da tarefa 3. BaseProfessionalDashboard contém a composição anterior para Nutrição/Fisioterapia. `usePersonalDayAgenda()` fornece period/timeZone/appointments/state/refetch, reutilizando useAppointments/helpers; `WorkoutClientPicker({open,onOpenChange,onSelect})` usa useClients(ACTIVE,{enabled:open}) e entrega Client.id.

- [ ] REDs `shows_personal_work_without_generic_directory_queries`, `distinguishes_new_and_archived_only_accounts`, `keeps_successful_blocks_when_agenda_fails`, `rolls_day_on_focus_and_midnight`, `excludes_cancelled_and_keeps_status`. Fixar horário e testar São Paulo próximo da meia-noite; não consultar período provisório. Asserções:

```tsx
expect(screen.getByText('Alunos sem treino ativo')).toBeVisible();
expect(screen.queryByText('Sua base começa aqui')).not.toBeInTheDocument(); // só arquivados
expect(screen.getByText('Agenda indisponível')).toBeVisible();
expect(screen.getByText('7')).toBeVisible(); // resumo carregou apesar da agenda
```

Testar limite cinco, toque/teclado no seletor, contagem nula durante erro, retorno à aba e callback de seleção. Nutrição/Fisioterapia preservam composição existente.
- [ ] Rodar, de web, `npm.cmd test -- PersonalDashboard.test.tsx PersonalAgendaPreview.test.tsx WorkoutClientPicker.test.tsx usePersonalDayAgenda.test.tsx ProfessionalDashboard.test.tsx`; confirmar REDs.
- [ ] Implementar composição e rótulos da especificação. Agenda independente, cinco compromissos não cancelados ordenados por início, com estado explícito. Workspace determina onboarding/arquivados; sem métricas fabricadas. Hook calcula dia após montagem e recalcula na mudança de dia/focus/visibility. Nenhum fetch completo da base para contagens; seletor de prescrição carrega Clients apenas quando aberto.
- [ ] Conectar “Novo aluno”, “Nova prescrição” e “Abrir agenda”; atualização de Client invalida workspace. Rodar testes focais e typecheck; esperado: sem regressão por ordem de hooks quando mudar papel. Atualizar brief somente para a composição efetivamente implementada.
- [ ] Commit: `feat: add personal daily workspace dashboard`.

## Task 5: Prontuário e avaliação próprios de treinamento

**Files:** criar PersonalClientRecord/PersonalAssessmentDialog e testes; criar `web/lib/personal-assessment.ts` e teste. Modificar `web/app/clientes/[id]/page.tsx`, `web/components/AssessmentModal.tsx`, ClientRecord.test.tsx. Usar os hooks/keys existentes e da tarefa 3.

**Interfaces:** `PersonalClientRecord({client: Client,pending:boolean})` monta consultas após o Client autorizado estar pronto e apresenta treino/avaliações/ações. `PersonalAssessmentDialog({isOpen:boolean,onClose:()=>void,clientId:string,onSuccess:()=>void})` mantém contrato de entrada do modal existente. `buildPersonalAssessmentPayload(values: Partial<PersonalAssessmentValues>,clientId:string): AssessmentCreateInput` envia somente campos válidos preenchidos; `validatePersonalAssessment(values: Partial<PersonalAssessmentValues>): Record<string,string>` produz erros por campo e erro de ausência de medida.

`PersonalNumericField` é a união weight/bodyFat, waist/abdomen/hips/thorax, armLeft/armRight/thighLeft/thighRight/calfLeft/calfRight, skinfoldTriceps/skinfoldSubscapular/skinfoldChest/skinfoldAxillary/skinfoldSuprailiac/skinfoldAbdominal/skinfoldThigh e benchPress1RM/squat1RM/deadlift1RM. `PersonalAssessmentValues = Record<PersonalNumericField | 'notes', string>`; `AssessmentCreateInput = {clientId:string;notes?:string} & Partial<Record<PersonalNumericField,number>>`. Em web/types/assessment.ts; sem muscleMass/vo2Max na entrada Personal.

- [ ] REDs `saves_force_without_weight`, `does_not_send_blank_as_zero`, `does_not_capture_ambiguous_unit_fields`, `archived_record_is_readable_without_creation`, `does_not_query_other_domains`. Asserções:

```ts
expect(buildPersonalAssessmentPayload({ squat1RM: '80', weight: '' }, clientId))
  .toEqual({ clientId, squat1RM: 80 });
expect(screen.queryByText(/em migração/i)).not.toBeInTheDocument(); // Personal
expect(screen.getByRole('button', { name: 'Nova avaliação física' })).toBeDisabled(); // arquivado
```

Adicionar conversão de entrada decimal aceita pelo input, limites da tarefa 2, foco/Escape/retorno ao acionador, notas de unidade desconhecida nos registros antigos e erro isolado do overview. Confirmar preservação das ações nutricionais/fisioterapêuticas.
- [ ] Rodar, de web, `npm.cmd test -- personal-assessment.test.ts PersonalClientRecord.test.tsx PersonalAssessmentDialog.test.tsx ClientRecord.test.tsx`; confirmar REDs.
- [ ] Implementar ramo PERSONAL com resumo, treino ativo, avaliação recente e consulta das avaliações usando endpoint existente. O modal genérico delega seu ramo PERSONAL ao novo diálogo acessível; os outros papéis conservam campos e comportamento. Omitir muscleMass/vo2Max na nova entrada Personal, preservar valores históricos sem comparações. Validar ao menos uma medida, valores finitos/positivos e gordura 0–100, com payload sem IDs internos ou zero automático.
- [ ] Conectar mutations/invalidações e estados de Client arquivado. Armazenar dados somente em memória enquanto o diálogo estiver aberto. Rodar testes focais, regressão de avaliação Nutrição/Fisioterapia e typecheck; esperar zero erros.
- [ ] Commit: `feat: integrate personal client record and physical assessment`.

## Task 6: Consulta exata, listagem e criação de prescrição

**Files:** criar `web/app/clientes/[id]/treinos/[workoutId]/page.tsx`, WorkoutReadView/WorkoutEditor e testes em features/training; criar `web/lib/workout-form.ts` e teste. Modificar treinos/page.tsx, clientes/[id]/novo-treino/page.tsx, workout-client-contract.test.tsx, professional-workspace.ts/test e AppShell.test.tsx. Ajustar `web/cypress/e2e/client-owned-clinical-resources.cy.ts` ao editor sem exemplos.

**Interfaces:** `WorkoutReadView({workout: WorkoutDetail})`; `WorkoutEditor({client:Client,activeWorkout:WorkoutPrescription|null,onSubmit:(input:CreateWorkoutInput)=>Promise<WorkoutPrescription>})`; `createEmptyWorkoutForm(): WorkoutForm`; `copyWorkoutToForm(workout:WorkoutPrescription): WorkoutForm`; `validateWorkoutForm(form:WorkoutForm): Record<string,string>`; `buildWorkoutInput(form:WorkoutForm,clientId:string): CreateWorkoutInput`. Auxiliares ficam no workout-form; renderização e operações do formulário no componente.

`WorkoutForm` tem title/goal/durationWeeks/notes como string e splits com id/name/focus como string e exercises com id/name/sets/reps/rest/notes como string. IDs de formulário são locais e não entram no payload. Duração vazia é omitida; quando informada, é inteiro de 1 a 104, conforme DTO vigente. Strings obrigatórias não aceitam somente espaços. Formulário inicial contém apenas a divisão estrutural Treino A e nenhum exercício.

- [ ] REDs `selected_history_row_opens_its_workout_id`, `foreign_client_route_does_not_render_detail`, `starts_blank_and_copies_only_after_click`, `failed_save_retains_form`, `prevents_double_submit`, `confirms_discard_on_navigation`. Asserções:

```ts
expect(navigation.push).toHaveBeenCalledWith(`/clientes/${clientId}/treinos/${olderWorkoutId}`);
expect(screen.queryByDisplayValue('Supino Reto com Barra')).not.toBeInTheDocument();
expect(screen.getByDisplayValue('Conteúdo preenchido')).toBeVisible(); // POST falhou
expect(http.history.post).toHaveLength(1); // dois acionamentos durante envio
```

Também testar Client arquivado, falha da consulta do treino base, fichas com várias divisões, campos completos preservados por ID e impressão sem anotações privadas de Client. Testes não prometem ordenação histórica inexistente.
- [ ] Rodar, de web, `npm.cmd test -- workout-form.test.ts WorkoutReadView.test.tsx WorkoutEditor.test.tsx workout-client-contract.test.tsx professional-workspace.test.ts AppShell.test.tsx`; confirmar REDs.
- [ ] Implementar rota de leitura/limite de papel e validação Client/Workout. Listagem usa hooks e o seletor da tarefa 4, diferencia falha de vazio e aponta ao treino selecionado. Trocar rótulo de menu para Treinos. Editor começa com campos vazios e divisão estrutural Treino A; copiar ativo exige ação explícita. Confirmar substituição quando há ativo; conservar lock/transaction do servidor. Validar título/divisões/exercícios; não introduzir controles de reordenação, rascunhos persistidos ou aplicação de modelo.
- [ ] Ao salvar, invalidar keys e voltar ao prontuário. Bloquear submit até concluir Client/base, manter formulário em falha e usar confirmação de saída/beforeunload apenas quando houver alterações. Oferecer “Imprimir ficha salva” na consulta, sem botão inoperante de WhatsApp no editor. Rodar focais/typecheck e atualizar os testes de contrato que anteriormente dependiam de exemplos automáticos.
- [ ] Commit: `feat: connect workout viewing and explicit prescription creation`.

## Task 7: Jornada real, concorrência e conclusão

**Files:** criar `api/test/training-workspace.e2e-spec.ts`, `training-archived-client.e2e-spec.ts`, `web/cypress/e2e/personal-workspace-real.cy.ts`, `api/test/run-personal-p1-real.ts`; modificar fixtures sintéticas somente onde a preparação exigir, incluindo seed-phase1-e2e.ts se necessário. Criar relatório `docs/runbooks/personal-p1-verification.md`; atualizar status/backlog no worktree de execução.

**Interfaces:** `runPersonalP1Real(): Promise<number>` é orquestrador local de verificação; usa assertIsolationDatabase/runtimeUrls, nunca é montado na API. Prepara migrações/seed com owner somente no banco sintético; API publicada para o teste recebe apenas CLINICAL/AUTH/JOBS_DATABASE_URL dos roles gerados. Usa processos escondidos no Windows e encerra somente os próprios processos ao finalizar.

- [ ] Criar testes E2E com duas contas PERSONAL, alunos ativos/arquivados, treino ativo/anterior, mais de cinco registros e contas Nutrição/Fisioterapia. Para Cypress, acrescentar uma conta sintética Personal B no seed (id 31000000-0000-4000-8000-000000000005, e-mail personal-b.phase1@e2e.test), sem mudar papel/IDs das contas já usadas pelas regressões; login da conta B usa o formulário real e uma chave cy.session própria. Reutilizar fixtures/client-isolation, runtime-roles, test-admin e a autenticação real onde o comportamento depender de sessão/contexto. Criar testes coordenados de corrida arquivar/criar sem sleeps arbitrários. REDs funcionais foram registrados nas tarefas 1–6; não inventar um RED final por ambiente ainda não iniciado.
- [ ] Implementar o orquestrador para localhost e banco ecossistema_resiliencia_test na porta 5434/5435. Recusar qualquer alvo diferente antes de migration/seed; não herdar URLs de produção. Reutilizar runtimeUrls(pool).values e restaurar env em finally. Omitir DATABASE_URL/DIRECT_URL de owner do ambiente da API filha; usá-las somente nas etapas administrativas sintéticas. Recusar portas HTTP ocupadas por processos não iniciados pelo runner. Construir API/Web e executar Cypress contra HTTP real com as contas sintéticas; cy.intercept pode observar requisições, sem substituir auth, dados ou mutations. Não usar o script antigo run-professional-phase1-e2e.ps1 sem preparo dos roles atuais.
- [ ] Rodar os E2E focais pelo wrapper vigente, de api: `npm.cmd run test:e2e -- training-workspace.e2e-spec.ts training-archived-client.e2e-spec.ts workout-client-transactions.e2e-spec.ts professional-domain-boundaries.e2e-spec.ts`. Ambiente deve passar assertIsolationDatabase. Esperado: zero falhas, rollback e estado de Client preservados nos casos concorrentes.
- [ ] Rodar uma vez os gates gerais depois dos focais aprovados. De api: `npm.cmd test -- --runInBand`; `npx.cmd tsc --noEmit`; `npx.cmd eslint "src/**/*.ts" "test/**/*.ts" --max-warnings=0`; `npm.cmd run build`; `npm.cmd run test:e2e`. De web: `npm.cmd test`; `npm.cmd run typecheck`; `npm.cmd run lint`; `npm.cmd run build`. Não usar lint API com --fix como mera verificação. Novas falhas são analisadas antes de repetir suites; não declarar gates suprimidos como aprovados.
- [ ] De api: `npx.cmd ts-node test/run-personal-p1-real.ts`. Deve construir/iniciar a stack sintética com os roles atuais e rodar `cypress/e2e/personal-workspace-real.cy.ts`, `professional-phase1-real.cy.ts`, `assessments-client-real.cy.ts`, além da regressão de contratos clínicos atualizada. Esperado: login, cadastrar, avaliar só força, prescrever, reabrir os IDs corretos e consultar agenda funcionam; nenhuma outra conta/dominio aparece.
- [ ] Fazer uma rodada final de DOM/inspeção visual desktop/celular; capturar somente evidência final ou bug. Usar detector Impeccable nos TSX alterados e checklist React aplicável. Corrigir problemas encontrados em um lote; confirmar novamente apenas o que mudou. Não criar séries de screenshots equivalentes.
- [ ] Registrar comandos/resultados, REDs, base/HEAD, limitações e evidência no runbook. Encerrar status/backlog somente com fatos verificados. Commit: `test: verify personal workspace flow and client lifecycle`. Rever o diff completo; integração/publicação seguem a autorização existente e as regras do repositório, sem merge ou deploy automático.

## Dependências e cobertura da especificação

Ordem: 1 → 2 → 3 → 4 → 5 → 6 → 7. Os contratos de leitura sustentam hooks e telas; a regra de ciclo de vida precede mutations; a jornada real fecha a integração.

| Seção/critério da especificação | Tarefas |
|---|---|
| Uso exclusivo, isolamento, base vigente, classificação e roles | 1, 2, 3, 7 |
| Dashboard, onboarding, arquivados, amostras e agenda/fuso | 1, 3, 4, 7 |
| Prontuário, ausência de outros domínios e avaliação | 1, 2, 3, 5, 7 |
| Consulta de ficha selecionada, editor vazio/cópia, erro/duplo envio | 1, 3, 6, 7 |
| Cache, autorização tardia, invalidação e falhas parciais | 3, 4, 5, 6 |
| Arquivamento e concorrência | 2, 5, 6, 7 |
| Teclado, acessibilidade, celular, impressão e ausência de storage | 4, 5, 6, 7 |
| Limites P1, ausência de versões/ordem inventada/PDF avançado | 6, 7 |

## Handoff de execução

Recomendação: **execução direta nesta conversa**, seguindo executing-plans, porque as sete tarefas compartilham contratos e exigem integração sequencial. Registrar progresso por tarefa e realizar a revisão final do conjunto conforme o método escolhido.

Alternativa: implementação por subagentes com revisão por tarefa, via subagent-driven-development, se o usuário escolher esse método.

Antes de implementação, o usuário revisa este plano e escolhe o método. Aprovação da especificação já está registrada; não repetir essa etapa. Nenhum teste de produto ou alteração funcional foi executado ao escrever este plano.
