# Performance 14 — atualização otimista apenas em ações reversíveis

## Resultado

Alteração entregue no commit **`b775819`** na branch `agent/codex/performance-diagnosis`, comparada ao baseline `8d63763`. Antes, mutações de criação, salvamento, finalização e descarte em `useWorkouts` e `useWorkoutDrafts`, bem como arquivamento e restauração na Central de Modelos (`/modelos-treinos`), capturavam o dono da sessão no `onMutate` mas aguardavam a resposta completa da API antes de refletir qualquer mudança na interface.

Em conformidade estrita com o critério clínico de segurança, **prescrições e rascunhos clínicos** ([`useWorkouts.ts`](../../web/hooks/features/useWorkouts.ts) e [`useWorkoutDrafts.ts`](../../web/hooks/features/useWorkoutDrafts.ts)) permanecem **100% dependentes de confirmação da API** antes de atualizar fichas ativas ou prontuários. A atualização otimista foi aplicada exclusivamente às ações **reversíveis** de organização da biblioteca privada de modelos (**arquivar** e **restaurar** em `useWorkoutTemplateHubMutations` / `WorkoutTemplatesHub`), que não alteram treinos já prescritos a alunos.

Escopo exclusivamente frontend (`web/`). Nenhuma alteração em `api/`, `schema.prisma`, migrations, políticas RLS ou dependências.

## Mudanças aplicadas

| Arquivo | Função |
|---|---|
| [`web/lib/workout-template-optimistic.ts`](../../web/lib/workout-template-optimistic.ts) | Helpers puros `applyOptimisticTemplateArchiveState`, `rollbackOptimisticTemplateArchiveState`, `reconcileTemplateArchiveState` e `matchesWorkoutTemplateFilters` operando sobre o snapshot de listas filtradas (`origin`, `status`, `goal`, `level`, `environment`, `q`), cursores (`"first"` vs páginas seguintes) e cache de detalhe |
| [`web/hooks/features/useWorkoutTemplates.ts`](../../web/hooks/features/useWorkoutTemplates.ts) | `archiveTemplateMutation` e `restoreTemplateMutation` em `useWorkoutTemplateHubMutations`: cancelam leituras em voo (`list`/`detail`) no `onMutate`, aplicam o estado otimista com timestamp provisório, executam rollback exato no `onError` (somente no mesmo usuário e sem violar bloqueio 401/403) e reconciliam + invalidam `list`/`detail` no `onSuccess` |
| [`web/components/features/training/WorkoutTemplatesHub.tsx`](../../web/components/features/training/WorkoutTemplatesHub.tsx) | Estado visual explícito de pendência (`pendingStatusAction`), banner imediato (`"Salvando arquivamento de ..."` / `"Salvando restauração de ..."`), badge transitório nos cards (`"Meu modelo · Arquivado (salvando...)"` / `"Meu modelo · Editável (salvando...)"` com `data-optimistic-pending="true"`), preservação do feedback ao trocar de aba em voo e alerta recuperável após rollback em falha |
| Testes unitários e de UI | [`workout-template-optimistic.test.ts`](../../web/lib/workout-template-optimistic.test.ts), [`useWorkoutTemplates.test.tsx`](../../web/hooks/features/useWorkoutTemplates.test.tsx), [`WorkoutTemplatesHub.test.tsx`](../../web/components/features/training/WorkoutTemplatesHub.test.tsx) e regressão clínica em [`useWorkouts.test.tsx`](../../web/hooks/features/useWorkouts.test.tsx) |

## Garantias de segurança, consistência e rollback

1. **Fronteira clínica preservada:** `useWorkouts.ts` (`createMutation`) e `useWorkoutDrafts.ts` (`create`, `save`, `rebase`, `finalize`, `discard`) não antecipam estado otimista no cache — comprovado em [`useWorkouts.test.tsx`](../../web/hooks/features/useWorkouts.test.tsx).
2. **Isolamento de modelos globais:** `applyOptimisticTemplateArchiveState` ignora registros com `isGlobal: true`; os endpoints e mutações atuam somente sobre modelos privados editáveis do profissional.
3. **Sem ressurreição após 401/403 ou troca de conta:** `rollbackOptimisticTemplateArchiveState` aborta imediatamente se `["workout-templates", owner, "access"]` estiver ativo, e `revertOptimisticArchiveStatus` valida `session.current.active && session.current.owner === context.owner` além de exigir que a query ainda exista em `cache.getQueryCache()` antes de restaurar snapshots anteriores.
4. **Concorrência segura:** enquanto uma operação de arquivamento/restauração está pendente (`actionBusy`), botões de mutação ficam desabilitados e leituras `list`/`detail` em andamento são canceladas no `onMutate` antes da gravação no cache.

## Regressões e validação

- **Testes focados Web (`5` arquivos Vitest):** **5/5 arquivos, 48/48 testes aprovados**:
  - `lib/workout-template-optimistic.test.ts` (**3/3** — filtros, todos os status/cursores/detalhe, bloqueio de globais e guardas de rollback);
  - `hooks/features/useWorkoutTemplates.test.tsx` (**12/12** — transição otimista -> reconciliação 200, rollback em HTTP 500 de archive/restore, negação 403 e troca de conta em voo);
  - `components/features/training/WorkoutTemplatesHub.test.tsx` (**8/8** — transição visual imediata entre abas com badge `(salvando...)` -> confirmado após 200, e rollback visível + alerta em falha de arquivamento e restauração);
  - `hooks/features/useWorkouts.test.tsx` (**13/13** — confirma ausência de confirmação otimista em `POST /workouts` pendente);
  - `hooks/features/useWorkoutDrafts.test.tsx` (**12/12**).
- **Suíte completa `npm --prefix web test`:** **107/108 arquivos, 829/830 testes aprovados**.
  - **Única falha (pré-existente no checkout Windows CRLF):** `web/test/licensed-media-fixture.test.ts` (`Licensed media fixture SHA-256 mismatch`).
- **`npm --prefix web run typecheck` (`tsc --noEmit --incremental false`):** aprovado (código 0).
- **`npm --prefix web run lint` (`eslint . --max-warnings=0`):** aprovado (0 erros, 0 warnings — inclusive `react-hooks/refs`).
- **`$env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build` (`postbuild`):** aprovado; **32/32 páginas** e **297 diretórios** standalone validados.
- **`git diff --check`:** aprovado (código 0).
- **Fora de escopo:** `api/` e suítes Cypress E2E contra PostgreSQL não foram reexecutados nesta etapa (sem alterações de backend, endpoints ou schema).

## Reprodução e conferência manual

1. Rodar regressões focadas e gates estáticos:
   ```powershell
   npm --prefix web test -- lib/workout-template-optimistic.test.ts hooks/features/useWorkoutTemplates.test.tsx components/features/training/WorkoutTemplatesHub.test.tsx hooks/features/useWorkouts.test.tsx hooks/features/useWorkoutDrafts.test.tsx
   npm --prefix web run typecheck
   npm --prefix web run lint
   $env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build
   ```
2. Em `/modelos-treinos` como profissional `PERSONAL`:
   - Arquivar um modelo privado com latência simulada: observar desaparecimento imediato de `Todos ativos` / `Meus modelos`, banner `"Salvando arquivamento de ..."` e badge `(salvando...)` se a aba `Arquivados` já estiver em cache; ao resolver `200`, o estado se consolida sem `(salvando...)`.
   - Simular erro `500` no arquivamento ou restauração: o card retorna imediatamente à lista de origem com `role="alert"` informando reversão.

## Rollback

Reverter o commit **`b775819`** (`git revert b775819`) na branch `agent/codex/performance-diagnosis` e rebuildar `web/`. Não há mudanças de API, schema ou dependências envolvidas.
