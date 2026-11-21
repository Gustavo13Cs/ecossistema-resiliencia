# Performance 24 — selecionar somente colunas necessárias nas consultas

## Resultado

Alteração entregue no commit **`84e4895`** na branch `agent/codex/performance-diagnosis`, comparada ao baseline `a85e764`. Antes, listagens de pacientes, receitas e planos alimentares carregavam colunas clínicas extensas (`@db.Text`), campos não utilizados na UI e múltiplos joins de ingredientes/alimentos desnecessários nas telas de listagem e verificações internas de posse.

Com projeções explícitas `select` no Prisma e divisão tipada de contratos no frontend (`ClientSummary` vs `Client`, `RecipeVersionSummary` vs `RecipeVersion`), os payloads de listagem e checagem ficam enxutos preservando integralmente os campos exigidos por autorização, ownership multi-tenant (`professionalId`), `ClinicalResponseValidator` (`id`, `clientId`, `isTemplate`) e carregamento completo sob demanda ao editar ou prescrever receitas.

Escopo exclusivamente de código de aplicação e testes (`api/src/modules/*` e `web/`). Nenhuma alteração em `api/prisma/schema.prisma`, migrations, políticas RLS, variáveis de ambiente ou dependências.

## Mudanças aplicadas

### Backend (`api/`)

| Arquivo | Antes | Depois |
|---|---|---|
| [`api/src/modules/clients/clients.service.ts`](../../api/src/modules/clients/clients.service.ts) | `findAll` e `findPage` retornavam todas as **26 colunas** de `Client` (incluindo `@db.Text` clínicos e estilo de vida) | Exporta `CLIENT_LIST_SELECT` (**10 colunas**: `id`, `professionalId`, `name`, `email`, `phone`, `goal`, `initialWeight`, `status`, `createdAt`, `updatedAt`) e `ClientListItem`; omite 16 colunas clínicas/extensas das listagens e preserva `Client` completo em `create`, `findOne`, `update`, `setStatus` e `ClientAccessService.getOwnedClient` |
| [`api/src/modules/recipes/recipes.service.ts`](../../api/src/modules/recipes/recipes.service.ts) | `list` incluía `currentVersion` completa com `ingredients` e `food: true`; `update`/`setStatus` carregavam todos ingredientes no pré-check; `findOwnedRecipeDetails` incluía `food: true` em todo o histórico | Define `RECIPE_LIST_SELECT` (**18 colunas** de `RecipeVersion`, sem `description`, `instructions`, `publishedAt` e sem join de `ingredients`/`food`), `RECIPE_FOOD_SELECT` (**12 colunas** de `Food`), `RECIPE_OWNED_SELECT` (para mutações e `currentVersion` de detalhe), `RECIPE_HISTORY_VERSION_SELECT` (`food: { select: { id: true, name: true } }` para histórico em `GET /recipes/:id`) e pré-checks mínimos em `update` e `setStatus` |
| [`api/src/modules/diet-plans/diet-plans.service.ts`](../../api/src/modules/diet-plans/diet-plans.service.ts) | `findAll` carregava todas as **22 colunas** de `DietPlan` + relações; `prepareMeals` fazia join de 3 tabelas (`recipeVersion` + `recipe` + `ingredients` + `food`) só para conferir IDs | Define `DIET_PLAN_LIST_SELECT` (**7 colunas escalares**: `id`, `clientId`, `title`, `goal`, `isActive`, `isTemplate`, `createdAt` + `client: { id, name }` + `user: { name }`), preservando campos do `ClinicalResponseValidator`, e reduz `prepareMeals` (`tx.recipeVersion.findMany`) para `select: { id: true }`; mantém `fullPlanInclude` inalterado nos endpoints de detalhe |
| Testes unitários da API | Expectations genéricas ou com `include` completo | [`clients.service.spec.ts`](../../api/src/modules/clients/clients.service.spec.ts), [`recipes.service.spec.ts`](../../api/src/modules/recipes/recipes.service.spec.ts) e [`diet-plans.service.spec.ts`](../../api/src/modules/diet-plans/diet-plans.service.spec.ts) atualizados com projeção real de `select` no fake do Prisma, validando presença dos campos obrigatórios e omissão dos campos pesados |

### Frontend (`web/`)

| Arquivo | Antes | Depois |
|---|---|---|
| [`web/types/client.ts`](../../web/types/client.ts) + 12 consumidores de listagem (`useClients`, `ClientList`, `ClientListItem`, `app/clientes/page`, `useClientGoals`, `GoalFormModal`, `AgendaToolbar`, `AppointmentDialog`, `types/follow-up`, `usePersonalFollowUps`, `useProfessionalDashboard`, `RecentClients`) | Tipados como `Client` completo (26 campos) | Separa `ClientSummary` (10 colunas) de `Client extends ClientSummary` (26 colunas); compilação estrita `tsc --noEmit` comprova que nenhuma listagem lê os 16 campos clínicos omitidos |
| [`web/types/recipe.ts`](../../web/types/recipe.ts) | `RecipeVersion` sempre assumia `ingredients` presentes | Separa `RecipeVersionSummary` de `RecipeVersion extends RecipeVersionSummary`, adiciona `RecipeHistoryIngredient` / `RecipeHistoryVersion` e o type guard `hasRecipeVersionIngredients()` |
| [`web/components/features/recipes/RecipeFormDialog.tsx`](../../web/components/features/recipes/RecipeFormDialog.tsx) e [`web/app/receitas/page.tsx`](../../web/app/receitas/page.tsx) | Assumia `recipe.currentVersion.ingredients` já carregado pela listagem | Quando edita um item resumido da listagem (`!hasRecipeVersionIngredients(recipe.currentVersion)`), busca `GET /recipes/:id` sob demanda via `useRecipe(recipe.id, true)`, exibe skeleton acessível (`aria-label="Carregando detalhes da receita"`), alerta recuperável com `"Tentar novamente"`, mantém `"Salvar receita"` desabilitado até hidratar e propaga `expectedVersion` atualizado |
| [`web/components/features/diet/RecipePickerPanel.tsx`](../../web/components/features/diet/RecipePickerPanel.tsx) | Selecionava `version` da listagem esperando `ingredients` preenchidos | `RecipePicker` aceita `RecipeVersionSummary`, hidrata `GET /recipes/${version.recipeId}` via `queryClient.fetchQuery` sob demanda quando faltam ingredientes, bloqueia cliques duplicados (`loadingRecipeId`) e exibe erro em `role="alert"` mantendo inalterada a assinatura pública `RecipePickerPanel` (`onSelect: (version: RecipeVersion, servings: number) => void`) |

## Comparativo determinístico de payload JSON (Antes × Depois)

Como não há banco PostgreSQL ativo neste ambiente para execução ao vivo ou `EXPLAIN ANALYZE`, a medição abaixo foi calculada de forma determinística aplicando os objetos compilados reais (`CLIENT_LIST_SELECT`, `RECIPE_LIST_SELECT`, `RECIPE_DETAIL_SELECT` e `DIET_PLAN_LIST_SELECT` de `api/dist`) e as enums de colunas do `@prisma/client` sobre fixtures JSON sintéticas em dois cenários (campos clínicos nulos vs preenchidos):

| Consulta / payload avaliado | Colunas / joins (antes → depois) | Payload antes (bytes) | Payload depois (bytes) | Economia |
|---|---|---:|---:|---:|
| `GET /clients` (25 itens, campos clínicos `null`) | `26 → 10` colunas | `15.508` | `7.333` | **−8.175 B (−52,7%)** |
| `GET /clients` (25 itens, campos clínicos preenchidos) | `26 → 10` colunas (sem `@db.Text`) | `28.958` | `7.333` | **−21.625 B (−74,7%)** |
| `GET /recipes` (25 itens × 5 ingredientes) | `21 → 18` cols versão; `5 → 0` joins ingrediente/food | `72.034` | `12.824` | **−59.210 B (−82,2%)** |
| `GET /recipes/:id` (1 receita × 5 versões × 5 ingr.) | `Food` histórico `15 → 2` cols; atual `15 → 12` | `16.300` | `7.185` | **−9.115 B (−55,9%)** |
| `GET /diet-plans` (25 itens, `notes` nulo) | `22 → 7` cols escalares (+ `client`, `user`) | `13.158` | `6.783` | **−6.375 B (−48,4%)** |
| `GET /diet-plans` (25 itens, `notes` preenchido) | `22 → 7` cols escalares (+ `client`, `user`) | `15.633` | `6.783` | **−8.850 B (−56,6%)** |
| `DietPlansService.prepareMeals` check interno (10 IDs) | Join 3 tabelas → `{ id: true }` | `27.604` | `172` | **−27.432 B (−99,4%)** |

**Limites da medição:** cálculo local determinístico sobre payloads JSON serializados equivalentes às projeções do Prisma. Não substitui medição de planos SQL (`EXPLAIN (ANALYZE, BUFFERS)`) nem testes E2E em instância PostgreSQL real.

## Regressões e validação

- **Testes focados API (`5` arquivos Jest):** **5/5 suítes, 96/96 testes aprovados** (`clients.service.spec.ts`, `clients.controller.spec.ts`, `recipes.service.spec.ts`, `diet-plans.service.spec.ts`, `clinical-response.validator.spec.ts`).
- **Suíte unitária completa `npm --prefix api test`:** **68/69 suítes, 843/844 testes aprovados**.
  - **Única falha (pré-existente de ambiente Windows, fora do escopo):** `src/modules/workouts/exercise-demonstration-probe.spec.ts` (`Public media rules differ from verified API rules`), causada por diferença `LF → CRLF` no checkout Windows de `web/lib/exercise-media-rules.ts`.
- **`npm --prefix api run build` (`nest build`):** aprovado (código 0).
- **ESLint da API (`--max-warnings=0` nos 6 arquivos alterados em `api/src/`):** aprovado (0 erros, 0 warnings).
- **Testes focados Web (`10` arquivos Vitest):** **10/10 arquivos, 60/60 testes aprovados** (inclui carregamento sob demanda e recuperação de erro em `receitas-page.test.tsx` e `RecipePickerPanel.test.tsx`).
- **Suíte unitária completa `npm --prefix web test`:** **103/104 arquivos, 811/812 testes aprovados**.
  - **Única falha (pré-existente de ambiente Windows, fora do escopo):** `web/test/licensed-media-fixture.test.ts` (`Licensed media fixture SHA-256 mismatch`), causada por `core.autocrlf=true` no fixture SVG.
- **`npm --prefix web run typecheck` (`tsc --noEmit --incremental false`):** aprovado (código 0).
- **`npm --prefix web run lint` (`eslint . --max-warnings=0`):** aprovado (código 0, 0 erros, 0 warnings).
- **`$env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build` (`postbuild`):** aprovado; `assert-direction-contract.mjs` validou **32/32 páginas** de produção; `assert-standalone-runtime.mjs` validou **297 diretórios** no standalone.
- **`git diff --check`:** aprovado (código 0).
- **Não executado por infraestrutura local:** `npm --prefix api run test:e2e` e Cypress E2E contra PostgreSQL (sem container Docker PostgreSQL ativo no ambiente).

## Reprodução e conferência manual

1. Rodar os testes e validações locais:
   ```powershell
   npm --prefix api test -- src/modules/clients/clients.service.spec.ts src/modules/clients/clients.controller.spec.ts src/modules/recipes/recipes.service.spec.ts src/modules/diet-plans/diet-plans.service.spec.ts src/common/clinical-context/clinical-response.validator.spec.ts
   npm --prefix api run build
   Push-Location api; npx eslint --max-warnings=0 src/modules/clients/clients.service.ts src/modules/clients/clients.service.spec.ts src/modules/recipes/recipes.service.ts src/modules/recipes/recipes.service.spec.ts src/modules/diet-plans/diet-plans.service.ts src/modules/diet-plans/diet-plans.service.spec.ts; Pop-Location
   npm --prefix web test -- app/receitas/receitas-page.test.tsx hooks/features/useRecipes.test.tsx "app/clientes/[id]/nova-dieta/recipe-integration.test.tsx" components/features/diet/RecipePickerPanel.test.tsx app/clientes/clientes-page.test.tsx components/features/clients/ClientDirectory.test.tsx app/dietas/dietas-page.test.tsx app/avaliacoes/avaliacoes-page.test.tsx hooks/features/useClientGoals.test.ts hooks/features/list-pagination.test.tsx
   npm --prefix web run typecheck
   npm --prefix web run lint
   $env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm --prefix web run build
   ```
2. Em ambiente com PostgreSQL ativo:
   - Rodar `npm --prefix api run test:e2e` (`clients.e2e-spec.ts`, `list-pagination.e2e-spec.ts`, `recipes.e2e-spec.ts`).
   - Abrir `/clientes` e `/receitas` no navegador e confirmar via aba Network:
     - `GET /clients` e `GET /clients/page` retornam apenas os 10 campos de `CLIENT_LIST_SELECT`, enquanto `/clientes/[id]` continua exibindo anamnese e notas completas;
     - `GET /recipes` retorna receitas sem `ingredients[]`, enquanto clicar em editar na receita ou selecionar no picker de dieta busca `GET /recipes/:id` e preenche ingredientes e `expectedVersion` completos.

## Rollback

Reverter o commit **`84e4895`** (`git revert 84e4895`) na branch `agent/codex/performance-diagnosis`. Como não há alterações de schema, migrations ou dependências, o rollback é imediato via rebuild.
