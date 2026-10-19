# Personal — Biblioteca Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oferecer demonstrações conferidas na biblioteca pronta e na ficha salva, mantendo exercícios manuais e links próprios opcionais.

**Architecture:** Catálogo SafeMove e manifesto versionado de mídia atendem a busca localmente; o fornecedor é consultado somente na preparação do catálogo. A prescrição guarda referência e snapshot resolvido no servidor. Exercícios próprios continuam isolados por conta.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Next.js/React, TanStack Query, Jest, Vitest e Cypress; mídia oficial HTTPS, sem SDK pago.

**Spec:** [Especificação aprovada](../specs/2026-10-17-personal-biblioteca-visual-design.md).

## Global Constraints

- Executar após o [lote de rascunhos/revisões](2026-10-17-personal-rascunhos-revisoes.md), usando seus tipos, rotas e testes aprovados.
- “Preservar os 148 exercícios do catálogo atual.”
- “pelo menos 20 exercícios desse catálogo, abrangendo peitoral, costas, membros inferiores, ombros e core.”
- “Após a escolha explícita do usuário, o requisito desta entrega aceita ilustração licenciada, foto ou vídeo; vídeo em todos os exercícios não é condição de aceite. Não apresentar ilustração como fotografia ou vídeo.”
- “Não incluir upload de arquivos, busca automática no YouTube, geração de demonstrações por IA, portal de aluno ou contratação de serviço pago nesta entrega.”
- Aceitar somente CC0, CC BY ou CC BY-SA com versão/origem/autoria identificadas; cumprir obrigações da mídia. Sem importação baseada somente na licença de software do repositório.
- Detalhe/busca privados para PERSONAL, dados CUSTOM filtrados pelo dono; snapshot nunca é JSON/URL arbitrário do cliente.
- “Seu formato passa de schemaVersion 1 para 2”; v1 continua legível, convertido sem mídia presumida. Conteúdo normalizado, incluindo snapshot, continua limitado a 64 KiB.
- Mídia não é requisito para criar exercício nem prescrever. Nenhum conteúdo do aluno é enviado ao fornecedor; não incorporar players de YouTube/Vimeo, scripts externos ou storage clínico no navegador.
- Não aplicar migrations/deploy em produção; usar a aprovação das especificações para o desenvolvimento aditivo em ambiente isolado.

## Review Focus

- Renomear manualmente um exercício selecionado não conserva demonstração incompatível: tarefa 4.
- Remover um exercício próprio ou alterar seu link não impede leitura/revisão de ficha antiga: tarefa 3.
- Vídeo privado/removido, imagem 404 ou fonte retirada por direitos não quebra a ficha: tarefa 5.
- URL com credenciais, host semelhante, parâmetros de tracking ou JavaScript não vira mídia/HTML executável: tarefas 2/5.
- Snapshot repetido em outra linha, referência de outra conta e versão de mídia obsoleta têm tratamento distinto: tarefa 3.

## Estrutura e contratos compartilhados

Dentro de `api/src/modules/workouts/`, criar `exercise-demonstration.types.ts` (contratos), `exercise-demonstration-manifest.ts` (dados versionados), `exercise-demonstration.ts` (validação/resolução), `exercise-video-url.ts` (links próprios) e testes correspondentes. Criar script explícito em `api/scripts/verify-exercise-demonstrations.ts` para validar manifesto e testar disponibilidade fora de requests clínicos; não criar um importador agendado.

`DemonstrationAsset` contém id, type IMAGE/VIDEO, url, alt, sourcePageUrl, author, licenseName e licenseUrl. `DemonstrationSnapshot` contém revision, instruction, assets ou personalVideoUrl. Máximo de duas imagens ou um vídeo oficial por exercício; instrução até 2000 caracteres, alt/author até 300 e URLs até 2048. Créditos não são truncados para caber: item fora desses limites é revisado ou rejeitado.

`LibraryReference = { source: 'CATALOG' | 'CUSTOM'; exerciseId: string; demonstrationRevision: string | null }`. Revisão oficial usa versão do manifesto e do item; CUSTOM usa mediaVersion. Seleção sem demonstração usa revision null. `DemonstrationPresentation` tem os mesmos campos do snapshot, com assets acrescidos de `displayAllowed: boolean` calculado para leitura. Armazenamento usa DemonstrationSnapshot, apresentação usa DemonstrationPresentation e nunca copia displayAllowed de volta ao banco. Esses tipos devem existir também em `web/types/exercise-demonstration.ts`, sem depender de Prisma no browser.

Na web, criar `ExerciseDemonstration.tsx` (renderizador), `ExerciseLibraryDetail.tsx` (detalhe/dialog), `ExerciseLibraryPage.tsx` (busca/filtros/cadastro) em `components/features/training/`. Reutilizar o detalhe no editor e na leitura; não replicar renderizadores de mídia.

## Task 1: Evidência de fornecedor e manifesto validado

**Files:** Create `api/src/modules/workouts/exercise-demonstration.types.ts`, `exercise-demonstration-manifest.ts`, `exercise-demonstration.ts`, `exercise-demonstration.spec.ts`, `api/scripts/verify-exercise-demonstrations.ts`, `docs/runbooks/personal-exercise-media-verification.md`.

**Interfaces:** Produces `validateDemonstrationManifest(entries: readonly DemonstrationManifestEntry[]): void`, `findCatalogDemonstration(exerciseId: string): DemonstrationSnapshot | null`, `isApprovedDemonstrationAsset(asset: DemonstrationAsset): boolean`, constante `DEMONSTRATION_MEDIA_RULES` com origin/pathPrefix de hosts oficiais verificados e `REVOKED_DEMONSTRATION_ASSET_IDS` para retirada explícita de assets por direitos. Manifesto relaciona IDs cat-* aos IDs oficiais e variantes conferidas; retirar um item da seleção futura não revoga automaticamente snapshots históricos.

- [x] **Step 1 — Verificar evidência:** o usuário aprovou ilustrações nesta entrega após a pesquisa de fonte alternativa. Conferir o Workout Guide/Everkinetic e a distribuição normal por jsDelivr, com revisão fixa `aac599224bb9780305239607ef98540b7e0ce389`, autoria/licença CC BY-SA 4.0 por arquivo e distinção explícita de ilustração. Manter o bloqueio de wger registrado, sem simular acesso ou licença. Ler termos/documentação oficial vigentes da fonte e a licença individual dos candidatos; conferir acesso gratuito compatível com produção, cotas/autenticação e cobertura. Inspecionar os arquivos visuais selecionados uma vez para validar a correspondência, sem capturas redundantes ou dados reais. Registrar URLs, data, limites e os 20 mapeamentos aceitos; selecionar quatro de cada grupo mínimo exigido. Se faltar acesso/licença/cobertura, registrar o impedimento e avaliar Free Exercise DB sob os mesmos critérios; não pagar, não contornar política de rede e não marcar o lote como pronto sem os 20 itens.
- [x] **Step 2 — Testes RED:** `manifest_preserves_existing_catalog_ids` exige os 148 originais intactos; `has_twenty_verified_demonstrations_across_five_groups` exige >=20 e os cinco grupos; `rejects_missing_authorship_or_license`, `rejects_nc_license_or_unknown_host`, `rejects_wrong_equipment_mapping`. Rejeitar ID duplicado, ausência de alt/instrução e URL sem HTTPS.
- [x] **Step 3 — Confirmar RED:** `npm test -- --runInBand exercise-demonstration.spec.ts` em `api/`; falha deve ser da implementação/assertiva, não do acesso externo.
- [x] **Step 4 — Implementar:** manifesto revisado manualmente, funções puras e script `--check` para validar estrutura/cobertura; `--probe` faz apenas HEAD/GET limitado para os assets oficiais aceitos, com timeout de 10s e sem seguir redirect para host não autorizado. Registrar status, não conteúdo clínico. Sem rede na suíte unitária ou no servidor de prescrições.
- [x] **Step 5 — Verificar GREEN:** comando unitário e `npx ts-node scripts/verify-exercise-demonstrations.ts --check`; `--probe` separadamente com rede autorizada. Esperado: pelo menos 20 correspondências comprovadas, nenhum host/licença indevidos; anotar falhas observadas sem transformá-las em sucesso.
- [x] **Step 6 — Commit:** `git commit -m "feat: add verified exercise demonstration catalog"` com manifesto, validação e evidência, sem arquivos de mídia copiados.

## Task 2: Links próprios e detalhe da biblioteca

**Files:** Create `api/src/modules/workouts/exercise-video-url.ts`, `exercise-video-url.spec.ts`, `dto/update-exercise-video.dto.ts`, `api/prisma/migrations/20261017130000_exercise_demonstrations/migration.sql`; modify `api/prisma/schema.prisma`, `exercise-library.service.ts`, `exercise-library.service.spec.ts`, `exercise-catalog.ts`, `workouts.controller.ts`, `workouts.controller.spec.ts`, `dto/create-custom-exercise.dto.ts`, `dto/exercise-library-query.dto.ts`; create `api/test/exercise-demonstrations.e2e-spec.ts`.

**Interfaces:** Produces `normalizeExerciseVideoUrl(input: string): string` (lança 400 se inválido), `ExerciseLibraryService.get(user, exerciseId): Promise<ExerciseLibraryDetail>`, `updateVideo(user, id, { expectedMediaVersion, videoUrl }): Promise<ExerciseLibraryDetail>`; existing list accepts equipment and returns hasDemonstration/demonstrationTypes. GET `/workouts/exercise-library/:exerciseId` e PATCH `/workouts/exercise-library/:id`, classificados como catálogo, JWT/PERSONAL.

- [ ] **Step 1 — Testes RED:** `canonicalizes_supported_video_urls` normaliza youtube.com/watch?v=, youtu.be/ e youtube.com/shorts/ com ID de 11 caracteres para `https://www.youtube.com/watch?v=<id>`; Vimeo público `vimeo.com/<id numérico>` para URL canônica. `rejects_credentials_fake_hosts_and_protocols` cobre user:pass@, youtube.com.evil, javascript:, URLs relativas e IDs vazios; remover parâmetros extra. `update_video_compares_and_increments_version` exige CAS atômico, null remove e conflito retorna 409. Outro dono tem 404; detalhe cat-* não é submetido a ParseUUIDPipe.
- [ ] **Step 2 — Confirmar RED:** `npm test -- --runInBand exercise-video-url.spec.ts exercise-library.service.spec.ts workouts.controller.spec.ts`.
- [ ] **Step 3 — Implementar:** adicionar CustomExercise.videoUrl/mediaVersion=1 e WorkoutExercise.librarySource/libraryExerciseId/demonstrationSnapshot opcionais. Enum CATALOG/CUSTOM, sem backfill de referências e sem cascade/FK para item de biblioteca. Validação WHATWG URL + host/path/ID estritos, nunca fetch do link. List/detalhe mesclam catálogo e CUSTOM próprio; filtro equipamento aplicado aos dois. Registrar detalhe antes da rota genérica de Workout; grants/policies existentes permanecem.
- [ ] **Step 4 — Verificar GREEN:** unitários anteriores, Prisma validate/generate/migrate deploy somente no banco sintético e `npm run test:e2e -- exercise-demonstrations.e2e-spec.ts tenant-rls.e2e-spec.ts`; ausência de mídia/novo campo não quebra legado. RLS de filho mantém proteção do Workout e mediaVersion não é gravável via criação arbitrária.
- [ ] **Step 5 — Commit:** `git commit -m "feat: support private exercise video links and library details"`.

## Task 3: Referências e snapshots na prescrição e no rascunho

**Files:** Modify `api/src/modules/workouts/exercise-demonstration.ts`, `exercise-demonstration.spec.ts`, `workout-draft.types.ts`, `workout-draft-content.ts`, `workout-draft-content.spec.ts`, `workout-drafts.service.ts`, `workout-drafts.service.spec.ts`, `dto/create-workout.dto.ts`, `dto/workout-draft.dto.ts`, `workouts.service.ts`, `workouts.module.ts`, `training-read.service.ts`, `training-read.types.ts`; create `api/src/modules/workouts/exercise-demonstration.service.ts`, `exercise-demonstration.service.spec.ts`, `api/test/workout-demonstration-snapshots.e2e-spec.ts`.

**Interfaces:** Produces `resolveDemonstrationReference(user: AuthUser, reference: LibraryReference, reusable: readonly AuthorizedDemonstration[]): Promise<DemonstrationSnapshot | null>` em um serviço `ExerciseDemonstrationService`, registrado no WorkoutsModule. `AuthorizedDemonstration` só é construído por leituras do draft ou Workout autorizados. Produces `upgradeDraftContent(content: DraftContentV1 | DraftContentV2): DraftContentV2`; CreateWorkoutDto accepts libraryReference, never snapshot bruto. Funções puras de manifesto permanecem no módulo da tarefa 1; serviço assíncrono fica em `exercise-demonstration.service.ts` com seu teste.

- [ ] **Step 1 — Testes RED:** `persists_server_resolved_snapshot`, `changed_custom_link_does_not_rewrite_finalized_workout`, `deleted_custom_item_keeps_existing_authorized_snapshot`, `foreign_custom_reference_is_404`, `stale_new_selection_is_409`, `v1_draft_upgrades_without_guessed_media`, `duplicate_reference_reuses_same_authorized_snapshot`. Snapshot bruto/URL injetada no DTO retorna 400; edição com referência removida gera conteúdo manual somente por ação explícita. Conferir ordenação/parâmetros e cap 65536 bytes incluindo snapshot.
- [ ] **Step 2 — Confirmar RED:** `npm test -- --runInBand exercise-demonstration.service.spec.ts workout-draft-content.spec.ts workout-drafts.service.spec.ts workouts.service.spec.ts`.
- [ ] **Step 3 — Implementar:** nova seleção resolve catálogo/owner e compara revisão atual; correspondência reference+revision já autorizada no rascunho/copied Workout preserva snapshot antigo. Tipo `reusable` nunca vem do request. Rebase não troca mídia. Finalize copia snapshot salvo; mídia revogada é bloqueada na apresentação por `isApprovedDemonstrationAsset`, conservando dados históricos. As leituras acrescentam `displayAllowed: boolean` por asset, calculado pelo servidor e nunca persistido no snapshot ou aceito do request. Campos ausentes são null, nunca associação por nome. Adicionar projeções de leitura e formatos V2 sem aceitar campos desconhecidos.
- [ ] **Step 4 — Verificar GREEN:** unitários acima e `npm run test:e2e -- workout-demonstration-snapshots.e2e-spec.ts workout-draft-transactions.e2e-spec.ts workout-client-transactions.e2e-spec.ts`. Esperado: deep equality do snapshot antigo após atualização/exclusão do item e nenhuma referência alheia aceita.
- [ ] **Step 5 — Commit:** `git commit -m "feat: preserve exercise demonstration snapshots in prescriptions"`.

## Task 4: Estado do editor, hooks e referência explícita

**Files:** Create `web/types/exercise-demonstration.ts`, `web/lib/exercise-reference.ts`, `exercise-reference.test.ts`; modify `web/types/workout.ts`, `web/types/workout-draft.ts`, `web/lib/workout-form.ts`, `workout-form.test.ts`, `workout-draft-form.ts`, `workout-draft-form.test.ts`, `query-keys.ts`, `web/hooks/features/useExerciseLibrary.ts`, `useExerciseLibrary.test.tsx`, `web/components/features/training/ExerciseLibraryCombobox.tsx`, `ExerciseLibraryCombobox.test.tsx`, `WorkoutExerciseCard.tsx`, `WorkoutDraftEditor.tsx`.

**Interfaces:** `ExerciseLibraryCombobox.onSelect` returns `{ name, muscleGroup, libraryReference }`; WorkoutFormExercise carries libraryReference and read-only demonstrationSnapshot from authorized loads. `useExerciseLibrary({ q?, muscleGroup?, equipment?, exerciseId?, enabled? })` adds detailQuery/updateVideoMutation while preserving existing list/create/delete mutations. `renameWorkoutExercise(exercise, name): WorkoutFormExercise` clears reference/snapshot only when normalized name changes.

- [ ] **Step 1 — Testes RED:** `manual_rename_clears_demonstration_with_notice`, `changing_sets_keeps_reference`, `duplicate_and_reorder_preserve_snapshot`, `save_sends_reference_not_snapshot`, `equipment_filter_scopes_query_key`, `session_change_aborts_detail`. Assertar null na referência após renomear; nenhum snapshot bruto no payload; keys diferentes por equipamento/sub.
- [ ] **Step 2 — Confirmar RED:** `npm test -- lib/exercise-reference.test.ts lib/workout-form.test.ts lib/workout-draft-form.test.ts hooks/features/useExerciseLibrary.test.tsx components/features/training/ExerciseLibraryCombobox.test.tsx` em `web/`.
- [ ] **Step 3 — Implementar:** propagar referência por seleção/cópia/conversão de conteúdo V2; revisão retornada pelo servidor vence dados de demonstração somente na resposta correspondente. Renomear dá aviso e remove vínculo; parâmetros editados não removem. Acrescentar filtro e detalhe às chaves por conta e AbortSignal; conflito de link/seleção exige atualizar ou remover explicitamente a referência.
- [ ] **Step 4 — Verificar GREEN:** testes anteriores e `npm run typecheck`; preservar regressões de rascunhos e criação manual.
- [ ] **Step 5 — Commit:** `git commit -m "feat: retain explicit exercise references in workout editor"`.

## Task 5: Biblioteca visual, detalhe compartilhado e CSP

**Files:** Create `web/app/exercicios/page.tsx`, `web/components/features/training/ExerciseLibraryPage.tsx`, `ExerciseLibraryPage.test.tsx`, `ExerciseLibraryDetail.tsx`, `ExerciseLibraryDetail.test.tsx`, `ExerciseDemonstration.tsx`, `ExerciseDemonstration.test.tsx`, `web/lib/exercise-media-policy.ts`; modify `WorkoutReadView.tsx`, `WorkoutReadView.test.tsx`, `ExerciseLibraryCombobox.tsx`, `web/lib/professional-workspace.ts`, `professional-workspace.test.ts`, `web/components/layout/ProfessionalSidebar.tsx`, `web/proxy.ts` e seu teste existente ou novo `web/proxy.test.ts`.

**Interfaces:** `ExerciseDemonstration({ snapshot, onUnavailable? })`; `ExerciseLibraryDetail({ exerciseId, open, onOpenChange, onSelect? })`; `ExerciseLibraryPage()` usa hooks da tarefa 4. `buildExerciseMediaDirectives(rules: readonly MediaOriginRule[]): { imgSrc: string[]; mediaSrc: string[] }` gera entradas específicas dos hosts aceitos pela tarefa 1. Catálogo/manifesto privado não é importado no browser; somente regras públicas de mídia e tipos.

- [ ] **Step 1 — Testes RED:** `preview_does_not_select_or_lose_editor_text`, `manual_exercise_needs_no_media`, `media_404_keeps_text_and_prescription_actions`, `withdrawn_asset_is_not_rendered`, `video_requires_user_action`, `own_video_opens_only_safe_external_link`, `dialog_restores_focus_and_has_credits`, `csp_has_only_verified_media_hosts`. Assertar ausência de autoplay, scripts/frames novos e tracking; referrerPolicy no-referrer; target blank com noopener/noreferrer. Texto externo como `<script>` aparece escapado.
- [ ] **Step 2 — Confirmar RED:** `npm test -- components/features/training/ExerciseDemonstration.test.tsx components/features/training/ExerciseLibraryDetail.test.tsx components/features/training/ExerciseLibraryPage.test.tsx proxy.test.ts lib/professional-workspace.test.ts`.
- [ ] **Step 3 — Implementar:** página com grupos/equipamento/fontes, cadastro próprio e edição de link; estados por bloco. Img lazy com dimensões reservadas/alt; video com controls só após ação; legenda/instrução equivalente e créditos no detalhe. Na ficha, mostrar snapshot selecionado; impressão permanece textual. Navegação PERSONAL ganha `/exercicios`, seção TREINAMENTO agrupa Treinos/Exercícios; outras atuações não montam consulta. CSP mantém nonce/script-src e libera apenas img-src/media-src verificados, sem wildcard. Gerar o módulo público de regras a partir das regras verificadas e acrescentar ao script `--check` a comparação de igualdade dessas origens, evitando divergência API/web. Assets com displayAllowed=false nunca geram img/video no DOM, mesmo quando vêm de snapshot antigo.
- [ ] **Step 4 — Verificar GREEN:** testes acima, `npm run typecheck`, `npm run lint`; regressões de WorkoutReadView, AppShell e combobox. Verificar que build inclui somente as regras públicas de origem e não segredos/imports de Prisma.
- [ ] **Step 5 — Commit:** `git commit -m "feat: add visual exercise library to personal workspace"`.

## Task 6: E2E real, evidência e revisão final

**Files:** Create `web/cypress/e2e/personal-exercise-library-real.cy.ts`, fixture licenciada em `web/cypress/fixtures/exercise-demonstration/` e evidência em `docs/runbooks/personal-exercise-media-verification.md`; modify runner real do lote anterior para configuração de catálogo de teste, sem relaxar domínio/autorização de produção.

**Interfaces:** Runner `--spec` existente aceita novo spec; mídia de teste é servida pelo host local controlado somente em NODE_ENV=test. A configuração de teste não permite `localhost` no manifesto de produção e não substitui API/banco por mocks.

- [ ] **Step 1 — Testes RED:** jornada abrir biblioteca, filtrar, visualizar, selecionar, prescrever, salvar rascunho, finalizar e reabrir snapshot; criar próprio com/sem link, renomear item e verificar desvinculação, excluir/alterar biblioteca e reabrir ficha antiga. Separar falha de carregamento da mídia usando fixture/rota de teste; verificação de disponibilidade real do fornecedor fica no probe. Conta B não encontra exercício próprio da A.
- [ ] **Step 2 — Confirmar RED:** `npx ts-node test/run-personal-p1-real.ts --spec cypress/e2e/personal-exercise-library-real.cy.ts` em `api/`, com banco sintético atestado; falha deve apontar comportamento ausente, não serviço externo instável.
- [ ] **Step 3 — Implementar:** somente ajustes de integração identificados pelo fluxo e isolamento da configuração da fixture. Não criar endpoint de upload, proxy genérico de mídia ou script de integração que usa dados reais.
- [ ] **Step 4 — Verificar GREEN:** API `npm test -- --runInBand`, `npx tsc --noEmit`, `npx eslint "src/**/*.ts" "test/**/*.ts" --max-warnings=0`, `npm run build`, `npm run test:e2e`. Web `npm test`, `npm run typecheck`, `npm run lint`, `INTERNAL_API_URL=http://localhost:3000 npm run build`. Runner com novo spec, rascunhos e P1. Probe oficial separado e registrado. Inspeção final 1440×900/390×844 e teclado, com uma evidência visual por fluxo quando necessária.
- [ ] **Step 5 — Commit:** atualizar runbook, TASKS e CODEX_STATUS com resultados observados, sem declarar cobertura/gratuidade não verificadas; `git commit -m "test: verify visual exercise library end to end"`. Revisão independente de snapshots/licenças/CSP e regressões antes de concluir branch. Nenhum merge, contratação ou deploy automático.

## Cobertura e handoff

Especificação seções 1–3: tarefa 1; persistência e contratos: tarefas 2–4; interface/acessibilidade: tarefa 5; segurança/cache: tarefas 2–5; os nove critérios de aceite: tarefas 1–6. Review Focus tem testes nas tarefas indicadas. Modelo legado e rascunho V1 preservados.

Autorrevisão: decisões de fonte condicionadas a uma verificação explícita na tarefa 1; nenhuma etapa depende de nome de provedor adivinhado ou acesso pago. Interfaces, campos, comandos e sequência conferidos. Plano preparado, não executado. Recomendação: execução direta após o primeiro lote, com revisão independente da branch ao final.
