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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await assertMealItemSourceConstraint(client);
      await client.query('ROLLBACK');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
}
