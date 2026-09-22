# Banco de Receitas Versionado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um Banco de Receitas privado e versionado, com nutrientes autoritativos por porção, filtros manuais de restrição e associação segura às refeições dos planos alimentares.

**Architecture:** `Recipe` mantém identidade, ownership e estado; `RecipeVersion` e `RecipeIngredient` formam snapshots imutáveis. `MealItem` referencia exatamente um `Food` ou uma `RecipeVersion`, e o backend recalcula nutrientes com dados persistidos antes de gravar qualquer versão.

**Tech Stack:** NestJS 11, Prisma 7.10, PostgreSQL 16/Supabase, Jest/Supertest, Next.js 16, React 19, TanStack Query 5, TypeScript, Tailwind/Radix, Vitest/Testing Library e Cypress.

**Spec:** `docs/superpowers/specs/2026-09-21-banco-de-receitas-versionado-design.md`

## Global Constraints

- Código e identificadores em inglês; documentação e texto de interface em português.
- Sem fotos, blobs ou integração com Supabase Storage neste MVP.
- `Recipe` é sempre privada e filtrada por `professionalId` derivado do JWT.
- `RecipeVersion` é imutável; editar uma receita cria uma nova versão.
- Uma dieta existente mantém a versão prescrita até ação explícita do nutricionista no editor da dieta.
- Glúten, lactose e veganismo são marcadores manuais, com aviso de que não são inferidos automaticamente.
- O backend calcula e persiste os nutrientes; macros enviados pelo navegador nunca são autoritativos.
- `MealItem` deve referenciar exatamente um `foodId` ou `recipeVersionId`.
- As novas tabelas em `public` nascem com RLS habilitado, policy restritiva `deny_data_api_access` e privilégios da Data API revogados.
- RLS defensivo não substitui ownership no Prisma, pois a conexão administrativa pode usar `BYPASSRLS`.
- Nenhum dado de receita ou dieta será persistido em `localStorage` ou `sessionStorage`.
- Todo comportamento novo segue RED → GREEN → REFACTOR; o teste precisa falhar pelo motivo esperado antes do código funcional.
- `api/prisma/schema.prisma` e a migration versionada desta feature estão autorizados pelo mantenedor.
- Não aplicar migration nem fazer deploy em produção sem autorização operacional específica.
- O código atual é a fonte final da verdade; preservar mudanças paralelas não relacionadas.

## Review Focus

- Quantidade, rendimento ou `baseAmount` zero, negativo, `NaN` ou infinito deve ser rejeitado sem persistência — coberto nas Tasks 2 e 3.
- Uma versão de receita de outro profissional nunca pode ser lida nem associada a uma dieta — coberto nas Tasks 3, 4 e 5.
- Duas edições concorrentes com o mesmo `expectedVersion` devem produzir exatamente uma nova versão e um HTTP 409 — coberto nas Tasks 3 e 4.
- Receita arquivada deve continuar legível em dietas antigas, mas não aparecer no seletor de novas associações — coberto nas Tasks 3, 5 e 7.
- Lista de compras deve escalar ingredientes por rendimento, porções prescritas e dias sem alterar o fluxo atual de alimentos — coberto na Task 7.

## File Structure

### API e persistência

- `api/prisma/schema.prisma`: enums, modelos versionados, relações e união alimento/receita em `MealItem`.
- `api/prisma/migrations/<generated>_add_versioned_recipe_bank/migration.sql`: DDL, constraint XOR, índices, RLS e revogações.
- `api/src/modules/recipes/domain/recipe-nutrition.ts`: cálculo puro e validação numérica.
- `api/src/modules/recipes/dto/create-recipe.dto.ts`: payload completo de criação.
- `api/src/modules/recipes/dto/update-recipe.dto.ts`: payload completo com `expectedVersion`.
- `api/src/modules/recipes/dto/list-recipes-query.dto.ts`: busca, categoria, restrições e status.
- `api/src/modules/recipes/recipes.service.ts`: ownership, versionamento, filtros e transações.
- `api/src/modules/recipes/recipes.controller.ts`: contrato HTTP autenticado da Nutrição.
- `api/src/modules/recipes/recipes.module.ts`: composição do módulo.
- `api/src/modules/recipes/*.spec.ts`: testes unitários de domínio, service e controller.
- `api/test/recipes-schema.e2e-spec.ts`: invariantes físicas do schema e constraint XOR.
- `api/test/recipes.e2e-spec.ts`: jornada HTTP real e isolamento entre profissionais.
- `api/src/modules/diet-plans/dto/create-diet-plan.dto.ts`: item com `foodId` ou `recipeVersionId`.
- `api/src/modules/diet-plans/diet-plans.service.ts`: associação, include, templates e ownership da versão.
- `api/src/modules/diet-plans/diet-plans.service.spec.ts`: regressões e segurança da integração.
- `api/src/app.module.ts`: registro do `RecipesModule`.
- `api/test/database-security.e2e-spec.ts`: inventário de RLS atualizado.

### Frontend

- `web/types/recipe.ts`: contratos tipados de receita, versões, ingredientes, filtros e DTOs.
- `web/types/diet.ts`: união discriminada `FoodMealItem | RecipeMealItem`.
- `web/lib/recipe-nutrition.ts`: prévia não autoritativa do formulário.
- `web/lib/diet-meal-items.ts`: totais, payload e lista de compras para a união de itens.
- `web/lib/query-keys.ts`: chaves de cache de receitas.
- `web/hooks/features/useRecipes.ts`: queries e mutations da biblioteca.
- `web/components/features/recipes/RecipeFilters.tsx`: busca e filtros combináveis.
- `web/components/features/recipes/RecipeCard.tsx`: resumo e ações de lifecycle.
- `web/components/features/recipes/RecipeFormDialog.tsx`: ingredientes, porções, preparo e marcadores.
- `web/components/features/recipes/RecipeVersionHistoryDialog.tsx`: histórico imutável.
- `web/components/features/diet/RecipePickerPanel.tsx`: seleção e atualização explícita no plano.
- `web/app/receitas/page.tsx`: composição da experiência real.
- `web/app/clientes/[id]/nova-dieta/page.tsx`: uso da união tipada, impressão e lista de compras.
- testes Vitest próximos aos módulos e `web/cypress/e2e/recipes.cy.ts`: comportamento e jornada crítica.

---

### Task 1: Persistência versionada, constraint XOR e RLS

**Files:**
- Modify: `api/prisma/schema.prisma`
- Create: `api/prisma/migrations/<generated>_add_versioned_recipe_bank/migration.sql`
- Create: `api/test/recipes-schema.e2e-spec.ts`
- Modify: `api/test/database-security.e2e-spec.ts`

**Interfaces:**
- Consumes: `User`, `Food`, `MealItem` e o padrão de policy `deny_data_api_access` existente.
- Produces: `RecipeStatus`, `RecipeCategory`, `Recipe`, `RecipeVersion`, `RecipeIngredient`, `Recipe.currentVersionId` e `MealItem.recipeVersionId` no Prisma Client.

- [ ] **Step 1: Escrever o teste E2E de schema que falha sem as novas tabelas**

Criar `recipes-schema.e2e-spec.ts` usando exclusivamente o banco seguro na porta 5434. O teste deve consultar `pg_constraint` e provar as três relações e a regra XOR:

```ts
const RECIPE_TABLES = ['recipes', 'recipe_versions', 'recipe_ingredients'] as const;

it('creates versioned recipe tables and enforces exactly one meal item source', async () => {
  const tables = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name = any($1::text[])
     order by array_position($1::text[], table_name)`,
    [RECIPE_TABLES],
  );
  expect(tables.rows.map((row) => row.table_name)).toEqual(RECIPE_TABLES);

  const constraint = await pool.query<{ definition: string }>(
    `select pg_get_constraintdef(oid) as definition
     from pg_constraint where conname = 'meal_items_exactly_one_source_check'`,
  );
  expect(constraint.rows).toHaveLength(1);
  expect(constraint.rows[0].definition).toContain('foodId');
  expect(constraint.rows[0].definition).toContain('recipeVersionId');
});
```

No mesmo arquivo, criar fixtures mínimas dentro de uma transação e executar dois inserts inválidos em savepoints independentes:

```ts
await expect(pool.query(
  `insert into public.meal_items (id, quantity, measure, "mealId", "foodId", "recipeVersionId")
   values (gen_random_uuid(), 1, 'porção', $1, null, null)`,
  [mealId],
)).rejects.toMatchObject({ code: '23514' });

await expect(pool.query(
  `insert into public.meal_items (id, quantity, measure, "mealId", "foodId", "recipeVersionId")
   values (gen_random_uuid(), 1, 'porção', $1, $2, $3)`,
  [mealId, foodId, recipeVersionId],
)).rejects.toMatchObject({ code: '23514' });
```

Após cada erro, fazer `ROLLBACK TO SAVEPOINT` para que a segunda asserção não rode em uma transação abortada. Incluir também um insert válido de cada variante e reverter a transação ao final.

Adicionar as três tabelas ao `APPLICATION_TABLES` de `database-security.e2e-spec.ts` para que RLS, policy e grants sejam verificados pelo teste existente.

- [ ] **Step 2: Executar o teste e observar a falha correta**

Run, em `api` com banco de teste já iniciado:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$env:DIRECT_URL=$env:DATABASE_URL
npm.cmd run test:e2e -- --runInBand test/recipes-schema.e2e-spec.ts test/database-security.e2e-spec.ts
```

Expected: FAIL porque `recipes`, `recipe_versions`, `recipe_ingredients` e a constraint ainda não existem.

- [ ] **Step 3: Adicionar os modelos Prisma mínimos**

Adicionar ao schema, mantendo os campos nutricionais `Float` compatíveis com `Food`:

```prisma
enum RecipeStatus {
  ACTIVE
  ARCHIVED
}

enum RecipeCategory {
  BREAKFAST
  MAIN_MEAL
  SNACK
  DESSERT
  DRINK
  OTHER
}

model Recipe {
  id               String         @id @default(uuid())
  professionalId   String
  professional     User           @relation("ProfessionalRecipes", fields: [professionalId], references: [id], onDelete: Restrict)
  status           RecipeStatus   @default(ACTIVE)
  currentVersionId String?        @unique
  currentVersion   RecipeVersion? @relation("CurrentRecipeVersion", fields: [currentVersionId], references: [id], onDelete: Restrict)
  versions         RecipeVersion[] @relation("RecipeVersions")
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([professionalId, status, updatedAt])
  @@map("recipes")
}

model RecipeVersion {
  id             String         @id @default(uuid())
  recipeId       String
  recipe         Recipe         @relation("RecipeVersions", fields: [recipeId], references: [id], onDelete: Cascade)
  currentFor     Recipe?        @relation("CurrentRecipeVersion")
  version        Int
  name           String
  description    String?        @db.Text
  category       RecipeCategory
  servings       Float
  instructions   String?        @db.Text
  isGlutenFree   Boolean        @default(false)
  isLactoseFree  Boolean        @default(false)
  isVegan        Boolean        @default(false)
  kcal           Float
  protein        Float
  carbs          Float
  fat            Float
  fiber          Float
  sodium         Float
  calcium        Float
  iron           Float
  ingredients    RecipeIngredient[]
  mealItems      MealItem[]
  createdAt      DateTime       @default(now())

  @@unique([recipeId, version])
  @@index([recipeId, createdAt])
  @@map("recipe_versions")
}

model RecipeIngredient {
  id              String        @id @default(uuid())
  recipeVersionId String
  recipeVersion   RecipeVersion @relation(fields: [recipeVersionId], references: [id], onDelete: Cascade)
  foodId          String
  food            Food          @relation(fields: [foodId], references: [id], onDelete: Restrict)
  quantity        Float
  measure         String

  @@unique([recipeVersionId, foodId])
  @@index([foodId])
  @@map("recipe_ingredients")
}
```

Adicionar `recipes Recipe[] @relation("ProfessionalRecipes")` a `User`, `recipeIngredients RecipeIngredient[]` a `Food` e tornar `MealItem.foodId`/`food` opcionais, adicionando `recipeVersionId`/`recipeVersion` opcionais.

- [ ] **Step 4: Gerar a migration com o CLI do ORM e completar as garantias SQL**

Run em `api`:

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$env:DIRECT_URL=$env:DATABASE_URL
npx.cmd prisma migrate dev --name add_versioned_recipe_bank --create-only
```

Não inventar o timestamp. Revisar o SQL gerado e acrescentar:

```sql
ALTER TABLE "public"."meal_items"
ADD CONSTRAINT "meal_items_exactly_one_source_check"
CHECK (
  ("foodId" IS NOT NULL AND "recipeVersionId" IS NULL)
  OR ("foodId" IS NULL AND "recipeVersionId" IS NOT NULL)
);

ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_data_api_access" ON "public"."recipes"
AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."recipe_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_data_api_access" ON "public"."recipe_versions"
AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

ALTER TABLE "public"."recipe_ingredients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_data_api_access" ON "public"."recipe_ingredients"
AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
```

Adicionar um bloco `DO` que execute `REVOKE ALL PRIVILEGES` nessas três tabelas para cada role existente entre `anon`, `authenticated` e `service_role`. Não criar policy `auth.uid()`: a Data API permanece deliberadamente bloqueada.

- [ ] **Step 5: Aplicar somente no banco local de teste e tornar os testes verdes**

```powershell
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run test:e2e -- --runInBand test/recipes-schema.e2e-spec.ts test/database-security.e2e-spec.ts
```

Expected: PASS; as três tabelas têm RLS, policy restritiva, zero privilégios da Data API e a constraint rejeita ambos/nem um identificador.

- [ ] **Step 6: Commit**

```powershell
git add -- api/prisma/schema.prisma api/prisma/migrations api/test/recipes-schema.e2e-spec.ts api/test/database-security.e2e-spec.ts
git commit -m "feat: add versioned recipe persistence"
```

---

### Task 2: Calculadora nutricional autoritativa

**Files:**
- Create: `api/src/modules/recipes/domain/recipe-nutrition.ts`
- Create: `api/src/modules/recipes/domain/recipe-nutrition.spec.ts`

**Interfaces:**
- Consumes: nutrientes e `baseAmount` de `Food`.
- Produces: `calculateRecipeNutrition(ingredients, servings): RecipeNutrition` e `RecipeNutritionValidationError`.

- [ ] **Step 1: Escrever testes unitários com resultados calculados manualmente**

```ts
it('sums ingredients and divides every nutrient by servings', () => {
  const result = calculateRecipeNutrition([
    {
      foodId: 'food-a', quantity: 50,
      food: { baseAmount: 100, kcal: 200, protein: 10, carbs: 20, fat: 5, fiber: 4, sodium: 20, calcium: 10, iron: 2 },
    },
    {
      foodId: 'food-b', quantity: 2,
      food: { baseAmount: 1, kcal: 100, protein: 2, carbs: 15, fat: 3, fiber: 1, sodium: 5, calcium: 8, iron: 1 },
    },
  ], 2);

  expect(result).toEqual({
    kcal: 150, protein: 4.5, carbs: 20, fat: 4.25,
    fiber: 2, sodium: 10, calcium: 10.5, iron: 1.5,
  });
});
```

Adicionar casos separados para `servings` zero/negativo/não finito, `quantity` inválida, `baseAmount` inválido e lista vazia. Cada caso deve capturar uma mutação real do validador.

- [ ] **Step 2: Executar e observar falha por módulo ausente**

```powershell
npm.cmd test -- --runInBand src/modules/recipes/domain/recipe-nutrition.spec.ts
```

Expected: FAIL porque `calculateRecipeNutrition` não existe.

- [ ] **Step 3: Implementar o cálculo puro mínimo**

```ts
export const RECIPE_NUTRIENT_KEYS = [
  'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'calcium', 'iron',
] as const;

export function calculateRecipeNutrition(
  ingredients: readonly RecipeNutritionIngredient[],
  servings: number,
): RecipeNutrition {
  assertPositiveFinite(servings, 'servings');
  if (ingredients.length === 0) throw new RecipeNutritionValidationError('ingredients');

  const totals = emptyNutrition();
  for (const ingredient of ingredients) {
    assertPositiveFinite(ingredient.quantity, 'quantity');
    assertPositiveFinite(ingredient.food.baseAmount, 'baseAmount');
    const factor = ingredient.quantity / ingredient.food.baseAmount;
    for (const key of RECIPE_NUTRIENT_KEYS) totals[key] += ingredient.food[key] * factor;
  }
  return mapNutrition(totals, (value) => value / servings);
}
```

Validar também que todos os valores nutricionais são finitos e não negativos.

- [ ] **Step 4: Executar teste focal e suite unitária completa**

```powershell
npm.cmd test -- --runInBand src/modules/recipes/domain/recipe-nutrition.spec.ts
npm.cmd test -- --runInBand
```

Expected: todos os testes passam sem warnings.

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/modules/recipes/domain
git commit -m "feat: calculate recipe nutrition per serving"
```

---

### Task 3: Service de receitas, DTOs, filtros e versionamento concorrente

**Files:**
- Create: `api/src/modules/recipes/dto/create-recipe.dto.ts`
- Create: `api/src/modules/recipes/dto/update-recipe.dto.ts`
- Create: `api/src/modules/recipes/dto/list-recipes-query.dto.ts`
- Create: `api/src/modules/recipes/recipes.service.ts`
- Create: `api/src/modules/recipes/recipes.service.spec.ts`

**Interfaces:**
- Consumes: `calculateRecipeNutrition`, Prisma models da Task 1 e `professionalId` autenticado.
- Produces: `RecipesService.create/list/findOne/update/duplicate/archive/restore`.

- [ ] **Step 1: Escrever os testes RED do service**

Os testes devem usar um Prisma fake específico e verificar resultados observáveis. Cobrir separadamente:

```ts
await expect(service.findOne(RECIPE_ID, OTHER_PROFESSIONAL_ID))
  .rejects.toBeInstanceOf(NotFoundException);

await expect(service.update(RECIPE_ID, {
  ...validRecipeInput,
  expectedVersion: 1,
}, PROFESSIONAL_ID)).resolves.toMatchObject({
  currentVersion: { version: 2 },
});

await expect(service.update(RECIPE_ID, {
  ...validRecipeInput,
  expectedVersion: 1,
}, PROFESSIONAL_ID)).rejects.toBeInstanceOf(ConflictException);
```

Adicionar testes para criação da versão 1, macros ignorando qualquer valor do cliente, ingredientes duplicados, alimento ausente, filtros combinados somente na `currentVersion`, duplicação como nova identidade, archive/restore e rollback quando a troca concorrente de `currentVersionId` afeta zero linhas.

- [ ] **Step 2: Executar e observar a falha por service ausente**

```powershell
npm.cmd test -- --runInBand src/modules/recipes/recipes.service.spec.ts
```

Expected: FAIL porque DTOs e `RecipesService` ainda não existem.

- [ ] **Step 3: Implementar DTOs completos e estritos**

`CreateRecipeDto` e `UpdateRecipeDto` compartilham a forma completa da versão:

```ts
export class RecipeIngredientDto {
  @IsUUID() foodId!: string;
  @IsNumber() @Min(0.000001) quantity!: number;
  @IsString() @IsNotEmpty() measure!: string;
}

export class CreateRecipeDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(RecipeCategory) category!: RecipeCategory;
  @IsNumber() @Min(0.000001) servings!: number;
  @IsOptional() @IsString() instructions?: string;
  @IsBoolean() isGlutenFree!: boolean;
  @IsBoolean() isLactoseFree!: boolean;
  @IsBoolean() isVegan!: boolean;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto) ingredients!: RecipeIngredientDto[];
}

export class UpdateRecipeDto extends CreateRecipeDto {
  @IsInt() @Min(1) expectedVersion!: number;
}
```

`ListRecipesQueryDto` aceita `q`, `category`, três booleanos transformados explicitamente e `status` com default `ACTIVE`. Não transformar valores diferentes de `true`/`false` silenciosamente:

```ts
const optionalBoolean = ({ value }: TransformFnParams) => {
  if (value === undefined) return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export class ListRecipesQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(RecipeCategory) category?: RecipeCategory;
  @IsOptional() @Transform(optionalBoolean) @IsBoolean() isGlutenFree?: boolean;
  @IsOptional() @Transform(optionalBoolean) @IsBoolean() isLactoseFree?: boolean;
  @IsOptional() @Transform(optionalBoolean) @IsBoolean() isVegan?: boolean;
  @IsOptional() @IsEnum(RecipeStatus) status: RecipeStatus = RecipeStatus.ACTIVE;
}
```

- [ ] **Step 4: Implementar transações e ownership**

Criar helpers privados `loadFoods`, `buildVersionCreateData` e `findOwnedRecipe`. O fluxo de criação deve:

1. rejeitar `foodId` duplicado;
2. buscar todos os alimentos persistidos;
3. rejeitar qualquer ID ausente;
4. calcular nutrientes no servidor;
5. criar `Recipe` sem versão atual;
6. criar `RecipeVersion` 1 e ingredientes;
7. apontar `currentVersionId` para a versão criada;
8. retornar a identidade com `currentVersion` completa.

No update, usar compare-and-swap dentro da transação:

```ts
const switched = await tx.recipe.updateMany({
  where: {
    id: recipe.id,
    professionalId,
    currentVersionId: recipe.currentVersionId,
  },
  data: { currentVersionId: nextVersion.id },
});
if (switched.count !== 1) throw new ConflictException('A receita foi atualizada por outra sessão.');
```

O filtro deve usar `currentVersion: { is: ... }`, nunca `versions: { some: ... }`, para não retornar receita por um nome ou marcador histórico.

- [ ] **Step 5: Tornar o teste focal e a suite unitária verdes**

```powershell
npm.cmd test -- --runInBand src/modules/recipes/recipes.service.spec.ts
npm.cmd test -- --runInBand
```

- [ ] **Step 6: Commit**

```powershell
git add -- api/src/modules/recipes/dto api/src/modules/recipes/recipes.service.ts api/src/modules/recipes/recipes.service.spec.ts
git commit -m "feat: add private versioned recipe service"
```

---

### Task 4: API autenticada de receitas e isolamento HTTP

**Files:**
- Create: `api/src/modules/recipes/recipes.controller.ts`
- Create: `api/src/modules/recipes/recipes.controller.spec.ts`
- Create: `api/src/modules/recipes/recipes.module.ts`
- Modify: `api/src/app.module.ts`
- Create: `api/test/recipes.e2e-spec.ts`
- Modify: `api/test/professional-domain-boundaries.e2e-spec.ts`

**Interfaces:**
- Consumes: `RecipesService` da Task 3 e `DOMAIN_ROLES.nutrition`.
- Produces: endpoints REST descritos na spec e registro no `AppModule`.

- [ ] **Step 1: Escrever testes RED do controller e da jornada HTTP**

O controller spec deve provar que `request.user.sub` é passado em todas as operações. O E2E deve subir `AppModule`, substituir somente `JwtAuthGuard`, usar `ValidationPipe` real e dois usuários `NUTRITIONIST` no banco de teste.

Jornada mínima:

```ts
const created = await request(app.getHttpServer())
  .post('/recipes')
  .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
  .send(validPayload)
  .expect(201);

await request(app.getHttpServer())
  .get(`/recipes/${created.body.id}`)
  .set(asUser(PROFESSIONAL_B, 'NUTRITIONIST'))
  .expect(404);

const [first, second] = await Promise.all([
  request(app.getHttpServer())
    .patch(`/recipes/${created.body.id}`)
    .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
    .send({ ...validPayload, expectedVersion: 1 }),
  request(app.getHttpServer())
    .patch(`/recipes/${created.body.id}`)
    .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
    .send({ ...validPayload, expectedVersion: 1 }),
]);
expect([first.status, second.status].sort()).toEqual([200, 409]);
```

Cobrir filtros combinados, campos extras rejeitados, papel não nutricional, duplicação, archive e restore. Limpar fixtures em ordem segura: `MealItem`, ingredientes, versões, receitas, alimentos e usuários.

- [ ] **Step 2: Executar e observar 404/compilação ausente**

```powershell
npm.cmd test -- --runInBand src/modules/recipes/recipes.controller.spec.ts
npm.cmd run test:e2e -- --runInBand test/recipes.e2e-spec.ts test/professional-domain-boundaries.e2e-spec.ts
```

Expected: FAIL porque controller, módulo e rotas não existem.

- [ ] **Step 3: Implementar controller e módulo**

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DOMAIN_ROLES.nutrition)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  list(@Request() request: AuthenticatedRequest, @Query() query: ListRecipesQueryDto) {
    return this.recipesService.list(query, request.user.sub);
  }

  @Post()
  create(@Request() request: AuthenticatedRequest, @Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto, request.user.sub);
  }
}
```

Completar `GET :id`, `PATCH :id`, `POST :id/duplicate`, `PATCH :id/archive` e `PATCH :id/restore`. Importar `DatabaseModule` no `RecipesModule` e registrar `RecipesModule` em `AppModule`.

Adicionar `RecipesController` ao teste de fronteiras profissionais para provar `401` sem JWT e `403` para `PATIENT`, `PERSONAL` e `PHYSIO`.

- [ ] **Step 4: Tornar testes focais e suites completas verdes**

```powershell
npm.cmd test -- --runInBand src/modules/recipes/recipes.controller.spec.ts
npm.cmd run test:e2e -- --runInBand test/recipes.e2e-spec.ts test/professional-domain-boundaries.e2e-spec.ts
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run build
```

- [ ] **Step 5: Commit**

```powershell
git add -- api/src/app.module.ts api/src/modules/recipes api/test/recipes.e2e-spec.ts api/test/professional-domain-boundaries.e2e-spec.ts
git commit -m "feat: expose secured recipe API"
```

---

### Task 5: Associação imutável de receitas aos planos alimentares

**Files:**
- Modify: `api/src/modules/diet-plans/dto/create-diet-plan.dto.ts`
- Modify: `api/src/modules/diet-plans/diet-plans.service.ts`
- Modify: `api/src/modules/diet-plans/diet-plans.service.spec.ts`
- Modify: `api/test/recipes.e2e-spec.ts`

**Interfaces:**
- Consumes: `RecipeVersion` própria, imutável, criada nas Tasks 1–4.
- Produces: `CreateMealItemDto` com XOR, planos que retornam `food` ou `recipeVersion`, templates que preservam a versão e erro 404 para associação alheia.

- [ ] **Step 1: Escrever testes RED da integração**

Adicionar testes unitários que provem:

```ts
await expect(service.create(planWithBothIds, PROFESSIONAL_ID))
  .rejects.toBeInstanceOf(BadRequestException);

await expect(service.create(planWithForeignRecipeVersion, PROFESSIONAL_ID))
  .rejects.toBeInstanceOf(NotFoundException);

expect(createdPlan.meals[0].items[0]).toMatchObject({
  foodId: null,
  recipeVersionId: VERSION_1_ID,
  quantity: 1.5,
});
```

Cobrir alimento legado, plano misto, versão arquivada já carregada, duplicação de template, update de template e importação com escala de porções. No E2E, criar plano com versão 1, editar receita para versão 2 e provar que o plano continua retornando versão 1.

- [ ] **Step 2: Executar e observar falhas de DTO/service**

```powershell
npm.cmd test -- --runInBand src/modules/diet-plans/diet-plans.service.spec.ts
npm.cmd run test:e2e -- --runInBand test/recipes.e2e-spec.ts
```

Expected: FAIL porque `foodId` ainda é obrigatório e `recipeVersionId` é descartado.

- [ ] **Step 3: Alterar o DTO sem aceitar estado ambíguo**

```ts
export class CreateMealItemDto {
  @IsNumber() @Min(0.1) quantity!: number;
  @IsString() measure!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsUUID() foodId?: string;
  @IsOptional() @IsUUID() recipeVersionId?: string;
}
```

O service deve aplicar `assertExactlyOneItemSource` antes de qualquer escrita. A constraint do banco é a última defesa, não a primeira mensagem ao usuário.

- [ ] **Step 4: Preparar itens e validar ownership em lote**

Criar um helper interno que coleta `recipeVersionId` únicos, busca:

```ts
await tx.recipeVersion.findMany({
  where: {
    id: { in: recipeVersionIds },
    recipe: { professionalId: creatorId },
  },
  include: {
    recipe: { select: { id: true, currentVersionId: true, status: true } },
    ingredients: { include: { food: true } },
  },
});
```

Se a contagem divergir, retornar `NotFoundException`. Gravar somente IDs validados. Atualizar `fullPlanInclude` para:

```ts
items: {
  include: {
    food: true,
    recipeVersion: {
      include: {
        recipe: { select: { id: true, currentVersionId: true, status: true } },
        ingredients: { include: { food: true } },
      },
    },
  },
}
```

Atualizar create, template create/update/duplicate e import. `FoodPreference` é gravada somente quando `foodId` existe. Receita arquivada pode permanecer ou ser copiada de um plano/template próprio já existente; a listagem `/recipes` ativa é que impede novas escolhas acidentais.

- [ ] **Step 5: Tornar a integração verde e executar regressão da API**

```powershell
npm.cmd test -- --runInBand src/modules/diet-plans/diet-plans.service.spec.ts
npm.cmd run test:e2e -- --runInBand test/recipes.e2e-spec.ts
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run build
```

- [ ] **Step 6: Commit**

```powershell
git add -- api/src/modules/diet-plans api/test/recipes.e2e-spec.ts
git commit -m "feat: associate recipe versions with diet meals"
```

---

### Task 6: Biblioteca de receitas no frontend

**Files:**
- Create: `web/types/recipe.ts`
- Create: `web/lib/recipe-nutrition.ts`
- Create: `web/lib/recipe-nutrition.test.ts`
- Modify: `web/lib/query-keys.ts`
- Create: `web/hooks/features/useRecipes.ts`
- Create: `web/hooks/features/useRecipes.test.tsx`
- Create: `web/components/features/recipes/RecipeFilters.tsx`
- Create: `web/components/features/recipes/RecipeCard.tsx`
- Create: `web/components/features/recipes/RecipeFormDialog.tsx`
- Create: `web/components/features/recipes/RecipeVersionHistoryDialog.tsx`
- Modify: `web/app/receitas/page.tsx`
- Create: `web/app/receitas/receitas-page.test.tsx`

**Interfaces:**
- Consumes: endpoints de receitas, `/foods` e componentes UI existentes.
- Produces: `Recipe`, `RecipeVersion`, `RecipeFilters`, `RecipeFormValues`, hooks de query/mutation e tela funcional `/receitas`.

- [ ] **Step 1: Escrever testes RED da prévia, hooks e página**

O teste da prévia usa os mesmos valores literais da Task 2, mas deixa claro que é apenas feedback visual. O teste do hook usa `AxiosMockAdapter` e um `QueryClient` real para provar parâmetros e invalidação. O teste da página deve verificar:

```tsx
render(<ReceitasPage />)
expect(await screen.findByRole('heading', { name: /banco de receitas/i })).toBeInTheDocument()
expect(screen.getByRole('button', { name: /nova receita/i })).toBeEnabled()
expect(screen.queryByText(/em planejamento/i)).not.toBeInTheDocument()
```

Adicionar casos para filtros combinados, estado vazio, erro recuperável, aviso manual de restrições, criação com ingredientes e ausência de qualquer campo de foto.

- [ ] **Step 2: Executar e observar falhas contra o placeholder**

```powershell
npm.cmd test -- web/lib/recipe-nutrition.test.ts web/hooks/features/useRecipes.test.tsx web/app/receitas/receitas-page.test.tsx
```

Expected: FAIL porque tipos, hook e componentes não existem e a página ainda mostra o placeholder.

- [ ] **Step 3: Criar contratos e prévia tipada**

Definir categorias e contratos sem `any`:

```ts
export type RecipeCategory = 'BREAKFAST' | 'MAIN_MEAL' | 'SNACK' | 'DESSERT' | 'DRINK' | 'OTHER'
export type RecipeStatus = 'ACTIVE' | 'ARCHIVED'
export interface RecipeNutrition {
  kcal: number; protein: number; carbs: number; fat: number
  fiber: number; sodium: number; calcium: number; iron: number
}
export interface RecipeSummary {
  id: string
  status: RecipeStatus
  currentVersionId: string
  currentVersion: RecipeVersion
  createdAt: string
  updatedAt: string
}
```

`calculateRecipePreview` valida rendimento/base/quantidades e retorna os oito nutrientes. A API continua autoritativa.

- [ ] **Step 4: Implementar hooks com cache por usuário e filtros**

Adicionar:

```ts
recipesRoot: (sessionUserId: string) => ['recipes', sessionUserId] as const,
recipes: (sessionUserId: string, filters: RecipeFilters) =>
  ['recipes', sessionUserId, filters] as const,
recipe: (sessionUserId: string, recipeId: string) =>
  ['recipe', sessionUserId, recipeId] as const,
```

`useRecipes` só habilita a query para `NUTRITIONIST`; mutations invalidam `recipesRoot` e a receita individual. Serializar booleanos como `true` apenas quando selecionados, sem enviar `false` como filtro involuntário.

- [ ] **Step 5: Implementar componentes e substituir o placeholder**

`RecipeFormDialog` deve:

- buscar alimentos com debounce;
- impedir alimento duplicado;
- mostrar unidade/base do alimento;
- receber quantidade, medida e porções;
- recalcular a prévia ao editar ingredientes;
- enviar somente conteúdo, IDs e quantidades, nunca macros;
- exibir “Marcadores informados manualmente. Confira ingredientes e rótulos.”;
- não renderizar upload, URL ou campo de foto.

`RecipeCard` mostra macros por porção, categoria e chips de restrição. `RecipeVersionHistoryDialog` é somente leitura. A página compõe loading, empty, error, no-results e lifecycle ativo/arquivado com confirmação.

- [ ] **Step 6: Executar testes, typecheck e build**

```powershell
npm.cmd test -- web/lib/recipe-nutrition.test.ts web/hooks/features/useRecipes.test.tsx web/app/receitas/receitas-page.test.tsx
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

- [ ] **Step 7: Commit**

```powershell
git add -- web/types/recipe.ts web/lib/recipe-nutrition.ts web/lib/recipe-nutrition.test.ts web/lib/query-keys.ts web/hooks/features/useRecipes.ts web/hooks/features/useRecipes.test.tsx web/components/features/recipes web/app/receitas
git commit -m "feat: build professional recipe library"
```

---

### Task 7: Seletor de receitas, totais, impressão e lista de compras na dieta

**Files:**
- Create: `web/types/diet.ts`
- Create: `web/lib/diet-meal-items.ts`
- Create: `web/lib/diet-meal-items.test.ts`
- Create: `web/components/features/diet/RecipePickerPanel.tsx`
- Create: `web/components/features/diet/RecipePickerPanel.test.tsx`
- Modify: `web/app/clientes/[id]/nova-dieta/page.tsx`
- Create: `web/app/clientes/[id]/nova-dieta/recipe-integration.test.tsx`
- Create: `web/cypress/e2e/recipes.cy.ts`
- Modify: `web/package.json`

**Interfaces:**
- Consumes: `RecipeSummary`, `RecipeVersion`, plano misto retornado pela API e fluxos existentes do editor.
- Produces: `DietMealItem`, helpers puros, payload XOR, seletor em abas, atualização explícita e lista de compras expandida.

- [ ] **Step 1: Escrever testes RED das funções de dieta**

Definir a API desejada no teste:

```ts
const recipeItem: RecipeMealItem = {
  kind: 'RECIPE', id: 'item-1', quantity: 1.5, measure: 'porções',
  recipeVersion,
}

expect(getMealItemNutrition(recipeItem)).toEqual({
  kcal: 300, protein: 24, carbs: 45, fat: 9,
  fiber: 6, sodium: 150, calcium: 120, iron: 3,
})

expect(toMealItemPayload(recipeItem)).toEqual({
  quantity: 1.5, measure: 'porções', recipeVersionId: recipeVersion.id,
})
```

Adicionar lista de compras com a expectativa literal
`ingredient.quantity * item.quantity / recipeVersion.servings * days` e agregação de alimento direto e ingrediente da receita com mesmo `foodId`.

- [ ] **Step 2: Escrever teste RED do seletor e da página**

O `RecipePickerPanel` deve listar apenas receitas ativas, aplicar filtros e chamar `onSelect(version, servings)`. O teste da página deve carregar uma dieta contendo versão antiga, mostrar “Versão 1” e disponibilizar “Atualizar para versão 2” sem atualizar automaticamente.

Criar `recipes.cy.ts` com intercepts determinísticos para a jornada criar/filtrar receita e associar uma versão a uma refeição. Executá-lo agora deve falhar no placeholder ou na ausência da aba “Receitas”.

- [ ] **Step 3: Executar e observar as falhas esperadas**

```powershell
npm.cmd test -- web/lib/diet-meal-items.test.ts web/components/features/diet/RecipePickerPanel.test.tsx web/app/clientes/[id]/nova-dieta/recipe-integration.test.tsx
```

Expected: FAIL por módulos ausentes e editor food-only.

Com o stack local já iniciado, executar também o aceite Cypress e confirmar a falha na ausência da aba:

```powershell
npx.cmd cypress run --browser electron --spec cypress/e2e/recipes.cy.ts
```

Expected: FAIL ao procurar a aba ou ação “Receitas”.

- [ ] **Step 4: Criar a união tipada e helpers puros**

```ts
export interface FoodMealItem {
  kind: 'FOOD'
  id: string
  quantity: number
  measure: string
  food: FoodNutrition
}

export interface RecipeMealItem {
  kind: 'RECIPE'
  id: string
  quantity: number
  measure: string
  recipeVersion: RecipeVersion
}

export type DietMealItem = FoodMealItem | RecipeMealItem
```

Definir `FoodNutrition` no mesmo arquivo com `id`, `name`, `baseAmount` e os oito nutrientes numéricos; `RecipeVersion` vem de `web/types/recipe.ts` e inclui `ingredients[].food` completos para impressão e compras.

`getMealItemNutrition` usa `food/baseAmount*quantity` para alimentos e nutrientes por porção vezes `quantity` para receitas. `toMealItemPayload` emite apenas um ID. `buildShoppingList` expande ingredientes, agrega por `foodId` e mantém nome/medida.

- [ ] **Step 5: Implementar seletor e adaptar o editor sem persistência local nova**

Adicionar abas “Alimentos” e “Receitas” no modal existente. Ao selecionar receita, criar `RecipeMealItem` com a `currentVersion`; ao carregar API, discriminar por `recipeVersionId`/`recipeVersion`. Atualizar totais, linhas impressas, payload e lista de compras para chamar os helpers.

Quando `recipeVersion.recipe.currentVersionId !== recipeVersion.id`, mostrar ação explícita. A ação busca/usa a versão atual e substitui apenas aquele item em memória; a alteração chega ao servidor somente no salvamento da dieta.

Não integrar a nova união aos helpers de legacy draft e não introduzir nenhuma escrita de receita em storage. O fluxo legado food-only permanece isolado e inalterado.

Ao aplicar templates, preservar `recipeVersion` retornada pela API e escalar quantidade em passos de 0,5 porção; alimentos mantêm a regra atual de gramas/ml.

- [ ] **Step 6: Tornar testes e Cypress verdes**

Adicionar `recipes.cy.ts` ao script `e2e` de `web/package.json`, iniciar a aplicação conforme o fluxo padrão do projeto e executar:

```powershell
npm.cmd test -- web/lib/diet-meal-items.test.ts web/components/features/diet/RecipePickerPanel.test.tsx web/app/clientes/[id]/nova-dieta/recipe-integration.test.tsx
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npx.cmd cypress run --browser electron --spec cypress/e2e/recipes.cy.ts
```

- [ ] **Step 7: Commit**

```powershell
git add -- web/types/diet.ts web/lib/diet-meal-items.ts web/lib/diet-meal-items.test.ts web/components/features/diet/RecipePickerPanel.tsx web/components/features/diet/RecipePickerPanel.test.tsx 'web/app/clientes/[id]/nova-dieta/page.tsx' 'web/app/clientes/[id]/nova-dieta/recipe-integration.test.tsx' web/cypress/e2e/recipes.cy.ts web/package.json
git commit -m "feat: add recipes to diet prescriptions"
```

---

### Task 8: Gate completo, validação visual única e documentação final

**Files:**
- Modify: `docs/agents/CODEX_STATUS.md`
- Modify: `docs/TASKS.md`
- Update if generated: `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`, relevant `graphify-out/memory/*`

**Interfaces:**
- Consumes: todos os commits anteriores.
- Produces: evidência reproduzível de conclusão e estado de coordenação atualizado.

- [ ] **Step 1: Executar o gate Prisma e API em banco local de teste**

```powershell
docker compose -f docker-compose.test.yml up -d
cd api
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test'
$env:DIRECT_URL=$env:DATABASE_URL
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
npx.cmd prisma generate
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run build
```

Expected: todas as suites passam; migration está aplicada somente no banco de teste; nenhuma alteração em produção.

- [ ] **Step 2: Executar o gate completo do frontend**

```powershell
cd web
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run e2e
```

Expected: Vitest, TypeScript, lint, build e Cypress passam sem supressões novas.

- [ ] **Step 3: Fazer uma única validação visual final**

Com a aplicação já funcional, inspecionar `/receitas` em desktop e viewport móvel, além do seletor de receitas na dieta. Capturar no máximo uma evidência final quando ela ajudar a demonstrar layout, responsividade e ausência do placeholder.

- [ ] **Step 4: Atualizar o grafo incrementalmente**

Executar o comando Graphify do ambiente com `--update`, consultar o subgrafo de recipes/diet-plans e confirmar que `GRAPH_REPORT.md` não descreve mais `/receitas` apenas como placeholder.

- [ ] **Step 5: Atualizar coordenação e fazer commit final**

Marcar Task 3.6 como concluída em `docs/TASKS.md`. Mover a tarefa de `Current Task` para `Completed` em `CODEX_STATUS.md`, registrando branch, migrations e resultados exatos dos gates.

```powershell
git add -- docs/agents/CODEX_STATUS.md docs/TASKS.md
git diff --cached --check
git commit -m "docs: complete versioned recipe bank"
```

- [ ] **Step 6: Revisão integral da branch**

Gerar o pacote de revisão desde o merge-base da branch de implementação e enviar a um revisor novo no modelo mais capaz. Corrigir em uma única onda quaisquer achados Critical/Important, executar uma re-revisão focal e só então usar `superpowers:finishing-a-development-branch` para integrar em `codex/BancodeReceitas`.

## Self-Review Record

- Cobertura da spec: persistência, macros, versionamento, categorias, filtros, API, frontend, dieta, impressão, lista de compras, RLS, testes e ausência de fotos têm tarefas explícitas.
- Placeholder scan: todos os passos possuem ação concreta, comando e resultado esperado.
- Consistência de tipos: `Recipe.currentVersionId` aponta para `RecipeVersion`; dieta e frontend usam `recipeVersionId`; `quantity` significa porções somente quando `kind === 'RECIPE'`.
- Fronteiras: Tasks 1–4 produzem o contrato consumido pela Task 5; Task 6 produz tipos/hooks consumidos pela Task 7; Task 8 não introduz comportamento novo.
- Review Focus: cada um dos cinco riscos possui teste nomeado na tarefa que detém o comportamento.
