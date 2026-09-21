import { Pool, PoolClient } from 'pg';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';

const RECIPE_TABLES = [
  'recipes',
  'recipe_versions',
  'recipe_ingredients',
] as const;

describe('Versioned recipe schema (e2e)', () => {
  let pool: Pool;

  beforeAll(() => {
    const url = new URL(SAFE_TEST_DATABASE_URL);
    expect(['localhost', '127.0.0.1']).toContain(url.hostname);
    expect(url.port).toBe('5434');
    expect(url.pathname).toBe('/ecossistema_resiliencia_test');
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);

    pool = new Pool({ connectionString: SAFE_TEST_DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

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

    const deleteActions = await pool.query<{
      constraint_name: string;
      delete_action: string;
    }>(
      `select conname as constraint_name, confdeltype::text as delete_action
       from pg_constraint
       where conname = any($1::text[])
       order by conname`,
      [['meal_items_foodId_fkey', 'meal_items_recipeVersionId_fkey']],
    );
    expect(deleteActions.rows).toEqual([
      {
        constraint_name: 'meal_items_foodId_fkey',
        delete_action: 'r',
      },
      {
        constraint_name: 'meal_items_recipeVersionId_fkey',
        delete_action: 'r',
      },
    ]);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { foodId, recipeVersionId } =
        await assertMealItemSourceConstraint(client);
      await expectPgError(
        client,
        'delete_referenced_food',
        'delete from public.foods where id = $1',
        [foodId],
        '23503',
      );
      await expectPgError(
        client,
        'delete_referenced_recipe_version',
        'delete from public.recipe_versions where id = $1',
        [recipeVersionId],
        '55000',
      );
      await client.query('ROLLBACK');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  it('rejects current versions owned by another recipe or professional', async () => {
    await withTransaction(pool, async (client) => {
      const professionalA = await createUser(client, 'owner-a');
      const professionalB = await createUser(client, 'owner-b');
      const recipe = await createRecipe(client, professionalA);
      const validVersion = await createRecipeVersion(client, recipe, 1);
      const siblingRecipe = await createRecipe(client, professionalA);
      const siblingVersion = await createRecipeVersion(
        client,
        siblingRecipe,
        1,
      );
      const foreignRecipe = await createRecipe(client, professionalB);
      const foreignVersion = await createRecipeVersion(
        client,
        foreignRecipe,
        1,
      );

      await expectPgError(
        client,
        'cross_recipe_current_version',
        `update public.recipes
         set "currentVersionId" = $1, "updatedAt" = CURRENT_TIMESTAMP
         where id = $2`,
        [siblingVersion, recipe],
        '23503',
      );
      await expectPgError(
        client,
        'cross_professional_current_version',
        `update public.recipes
         set "currentVersionId" = $1, "updatedAt" = CURRENT_TIMESTAMP
         where id = $2`,
        [foreignVersion, recipe],
        '23503',
      );

      const validPublication = await client.query<{ id: string }>(
        `update public.recipes
         set "currentVersionId" = $1, "updatedAt" = CURRENT_TIMESTAMP
         where id = $2
         returning id`,
        [validVersion, recipe],
      );
      expect(validPublication.rows).toHaveLength(1);
    });
  });

  it('keeps published recipe versions and ingredient snapshots immutable', async () => {
    await withTransaction(pool, async (client) => {
      const professionalId = await createUser(client, 'immutable-owner');
      const recipeId = await createRecipe(client, professionalId);
      const recipeVersionId = await createRecipeVersion(client, recipeId, 1);
      const foodId = await createFood(client, 'Immutable food');
      const ingredientId = await createRecipeIngredient(
        client,
        recipeVersionId,
        foodId,
      );

      await client.query(
        `update public.recipes
         set "currentVersionId" = $1, "updatedAt" = CURRENT_TIMESTAMP
         where id = $2`,
        [recipeVersionId, recipeId],
      );

      await expectPgError(
        client,
        'update_published_version',
        `update public.recipe_versions set name = 'Mutated' where id = $1`,
        [recipeVersionId],
        '55000',
      );
      await expectPgError(
        client,
        'delete_published_version',
        `delete from public.recipe_versions where id = $1`,
        [recipeVersionId],
        '55000',
      );
      await expectPgError(
        client,
        'update_published_ingredient',
        `update public.recipe_ingredients set quantity = 99 where id = $1`,
        [ingredientId],
        '55000',
      );
      await expectPgError(
        client,
        'delete_published_ingredient',
        `delete from public.recipe_ingredients where id = $1`,
        [ingredientId],
        '55000',
      );

      const lateFoodId = await createFood(client, 'Late food');
      await expectPgError(
        client,
        'insert_late_published_ingredient',
        `insert into public.recipe_ingredients
           (id, "recipeVersionId", "foodId", quantity, measure)
         values (gen_random_uuid(), $1, $2, 1, 'g')`,
        [recipeVersionId, lateFoodId],
        '55000',
      );
      await expectPgError(
        client,
        'delete_recipe_with_snapshots',
        `delete from public.recipes where id = $1`,
        [recipeId],
        '55000',
      );

      const nextVersionId = await createRecipeVersion(client, recipeId, 2);
      const nextIngredient = await createRecipeIngredient(
        client,
        nextVersionId,
        lateFoodId,
      );
      expect(nextIngredient).toBeTruthy();
    });
  });
});

async function assertMealItemSourceConstraint(client: PoolClient) {
  const user = await client.query<{ id: string }>(
    `insert into public."User" (id, name, email, password, "updatedAt")
     values (gen_random_uuid(), 'Recipe Schema Owner', 'recipe-schema@example.test', 'not-a-real-password', CURRENT_TIMESTAMP)
     returning id`,
  );
  const professionalId = user.rows[0].id;

  const dietPlan = await client.query<{ id: string }>(
    `insert into public.diet_plans
       (id, title, goal, "targetKcal", "proteinG", "fatG", "carbsG", "creatorId", "updatedAt")
     values (gen_random_uuid(), 'Recipe schema diet', 'Schema fixture', 2000, 120, 70, 220, $1, CURRENT_TIMESTAMP)
     returning id`,
    [professionalId],
  );
  const meal = await client.query<{ id: string }>(
    `insert into public.meals (id, name, "dietPlanId")
     values (gen_random_uuid(), 'Lunch', $1)
     returning id`,
    [dietPlan.rows[0].id],
  );
  const mealId = meal.rows[0].id;

  const food = await client.query<{ id: string }>(
    `insert into public.foods (id, name, kcal, protein, carbs, fat, "updatedAt")
     values (gen_random_uuid(), 'Recipe schema food', 100, 10, 12, 2, CURRENT_TIMESTAMP)
     returning id`,
  );
  const foodId = food.rows[0].id;

  const recipe = await client.query<{ id: string }>(
    `insert into public.recipes (id, "professionalId", "updatedAt")
     values (gen_random_uuid(), $1, CURRENT_TIMESTAMP)
     returning id`,
    [professionalId],
  );
  const recipeVersion = await client.query<{ id: string }>(
    `insert into public.recipe_versions
       (id, "recipeId", version, name, category, servings, kcal, protein, carbs, fat, fiber, sodium, calcium, iron)
     values (gen_random_uuid(), $1, 1, 'Recipe schema version', 'MAIN_MEAL', 2, 500, 30, 50, 20, 5, 300, 100, 4)
     returning id`,
    [recipe.rows[0].id],
  );
  const recipeVersionId = recipeVersion.rows[0].id;

  await client.query('SAVEPOINT neither_source');
  await expect(
    client.query(
      `insert into public.meal_items (id, quantity, measure, "mealId", "foodId", "recipeVersionId")
       values (gen_random_uuid(), 1, 'porção', $1, null, null)`,
      [mealId],
    ),
  ).rejects.toMatchObject({ code: '23514' });
  await client.query('ROLLBACK TO SAVEPOINT neither_source');

  await client.query('SAVEPOINT both_sources');
  await expect(
    client.query(
      `insert into public.meal_items (id, quantity, measure, "mealId", "foodId", "recipeVersionId")
       values (gen_random_uuid(), 1, 'porção', $1, $2, $3)`,
      [mealId, foodId, recipeVersionId],
    ),
  ).rejects.toMatchObject({ code: '23514' });
  await client.query('ROLLBACK TO SAVEPOINT both_sources');

  const foodItem = await client.query<{ id: string }>(
    `insert into public.meal_items (id, quantity, measure, "mealId", "foodId", "recipeVersionId")
     values (gen_random_uuid(), 100, 'g', $1, $2, null)
     returning id`,
    [mealId, foodId],
  );
  const recipeItem = await client.query<{ id: string }>(
    `insert into public.meal_items (id, quantity, measure, "mealId", "foodId", "recipeVersionId")
     values (gen_random_uuid(), 1, 'porção', $1, null, $2)
     returning id`,
    [mealId, recipeVersionId],
  );

  expect(foodItem.rows).toHaveLength(1);
  expect(recipeItem.rows).toHaveLength(1);

  return { foodId, recipeVersionId };
}

async function withTransaction(
  pool: Pool,
  run: (client: PoolClient) => Promise<void>,
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await run(client);
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function expectPgError(
  client: PoolClient,
  savepoint: string,
  query: string,
  values: unknown[],
  code: string,
) {
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await expect(client.query(query, values)).rejects.toMatchObject({ code });
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
}

async function createUser(client: PoolClient, suffix: string) {
  const result = await client.query<{ id: string }>(
    `insert into public."User" (id, name, email, password, "updatedAt")
     values (gen_random_uuid(), $1, $2, 'not-a-real-password', CURRENT_TIMESTAMP)
     returning id`,
    [`Recipe ${suffix}`, `recipe-${suffix}@example.test`],
  );
  return result.rows[0].id;
}

async function createRecipe(client: PoolClient, professionalId: string) {
  const result = await client.query<{ id: string }>(
    `insert into public.recipes (id, "professionalId", "updatedAt")
     values (gen_random_uuid(), $1, CURRENT_TIMESTAMP)
     returning id`,
    [professionalId],
  );
  return result.rows[0].id;
}

async function createRecipeVersion(
  client: PoolClient,
  recipeId: string,
  version: number,
) {
  const result = await client.query<{ id: string }>(
    `insert into public.recipe_versions
       (id, "recipeId", version, name, category, servings, kcal, protein, carbs, fat, fiber, sodium, calcium, iron)
     values (gen_random_uuid(), $1, $2, $3, 'MAIN_MEAL', 2, 500, 30, 50, 20, 5, 300, 100, 4)
     returning id`,
    [recipeId, version, `Recipe version ${version}`],
  );
  return result.rows[0].id;
}

async function createFood(client: PoolClient, name: string) {
  const result = await client.query<{ id: string }>(
    `insert into public.foods
       (id, name, kcal, protein, carbs, fat, "updatedAt")
     values (gen_random_uuid(), $1, 100, 10, 12, 2, CURRENT_TIMESTAMP)
     returning id`,
    [name],
  );
  return result.rows[0].id;
}

async function createRecipeIngredient(
  client: PoolClient,
  recipeVersionId: string,
  foodId: string,
) {
  const result = await client.query<{ id: string }>(
    `insert into public.recipe_ingredients
       (id, "recipeVersionId", "foodId", quantity, measure)
     values (gen_random_uuid(), $1, $2, 1, 'g')
     returning id`,
    [recipeVersionId, foodId],
  );
  return result.rows[0].id;
}
