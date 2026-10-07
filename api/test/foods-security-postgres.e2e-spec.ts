import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { FoodsController } from '../src/modules/foods/foods.controller';
import { FoodsService } from '../src/modules/foods/foods.service';
import { assertIsolationDatabase } from './fixtures/client-isolation';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { RecipesService } from '../src/modules/recipes/recipes.service';

const id = (n: number) =>
  `95000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const a = id(1),
  b = id(2),
  client = id(3),
  diet = id(4),
  meal = id(5);
const used = id(10),
  official = id(11),
  unused = id(12),
  recipeFood = id(13);
const concurrentEdit = id(14),
  concurrentDelete = id(15),
  templateFood = id(16);
const recipe = id(20),
  recipeVersion = id(21),
  template = id(22);
const foodIds = [
  used,
  official,
  unused,
  recipeFood,
  concurrentEdit,
  concurrentDelete,
  templateFood,
];
const asA = { 'x-test-user-id': a };
const asB = { 'x-test-user-id': b };

// Somente a identidade é injetada. HTTP, DTOs, roles, serviço, locks e banco são reais.
class FixtureAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: AuthUser }>();
    req.user = { sub: req.headers['x-test-user-id'], role: 'NUTRITIONIST' };
    return true;
  }
}

describe('Foods security (PostgreSQL HTTP, two professionals)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let pool: Pool;
  let database: Awaited<ReturnType<typeof isolatedPostgres>>;

  beforeAll(async () => {
    assertIsolationDatabase();
    database = await isolatedPostgres();
    const module = await Test.createTestingModule({
      controllers: [FoodsController],
      providers: [
        { provide: PrismaService, useValue: database.prisma },
        FoodsService,
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FixtureAuthGuard)
      .compile();
    prisma = module.get(PrismaService);
    pool = database.pool;
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await prisma.user.createMany({
      data: [a, b].map((userId) => ({
        id: userId,
        email: `${userId}@foods-security.invalid`,
        name: 'Synthetic professional',
        password: 'test-only-not-a-login',
        role: 'NUTRITIONIST',
      })),
    });
    await prisma.client.create({
      data: { id: client, professionalId: b, name: 'Synthetic Client B' },
    });
    await prisma.food.createMany({
      data: foodIds.map((foodId) => ({
        id: foodId,
        name: 'Synthetic security food',
        source: foodId === official ? 'TACO' : 'MANUAL',
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
      })),
    });
    const dietData = {
      title: 'Synthetic prescription',
      goal: 'Test',
      targetKcal: 2000,
      proteinG: 100,
      fatG: 60,
      carbsG: 250,
      creatorId: b,
    };
    await prisma.dietPlan.create({
      data: {
        ...dietData,
        id: diet,
        clientId: client,
        meals: {
          create: {
            id: meal,
            name: 'Synthetic meal',
            items: {
              create: [
                { foodId: used, quantity: 100, measure: 'g' },
                { foodId: official, quantity: 80, measure: 'g' },
              ],
            },
          },
        },
      },
    });
    await prisma.dietPlan.create({
      data: {
        ...dietData,
        id: template,
        isTemplate: true,
        meals: {
          create: {
            name: 'Synthetic template',
            items: {
              create: { foodId: templateFood, quantity: 100, measure: 'g' },
            },
          },
        },
      },
    });
    await prisma.recipe.create({
      data: {
        id: recipe,
        professionalId: b,
        versions: {
          create: {
            id: recipeVersion,
            version: 1,
            name: 'Synthetic recipe',
            category: 'MAIN_MEAL',
            servings: 1,
            kcal: 100,
            protein: 10,
            carbs: 10,
            fat: 2,
            fiber: 0,
            sodium: 0,
            calcium: 0,
            iron: 0,
            ingredients: {
              create: { foodId: recipeFood, quantity: 100, measure: 'g' },
            },
          },
        },
      },
    });
    await prisma.foodPreference.createMany({
      data: [a, b].map((nutritionistId) => ({
        nutritionistId,
        foodId: used,
        quantity: 100,
        measure: nutritionistId === a ? 'own measure' : 'other private measure',
      })),
    });
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await database?.close();
    }
  });

  it.each([
    { mealItems: { updateMany: { where: {}, data: { quantity: 9999 } } } },
    { mealItems: { deleteMany: {} } },
    { recipeIngredients: { deleteMany: {} } },
  ])(
    'rejects nested write %j and preserves the other account records',
    async (body) => {
      const beforeMeals = await prisma.mealItem.findMany({
        where: { mealId: meal },
        orderBy: { id: 'asc' },
      });
      const beforeIngredients = await prisma.recipeIngredient.findMany({
        where: { recipeVersionId: recipeVersion },
      });
      await request(app.getHttpServer())
        .put(`/foods/${used}`)
        .set(asA)
        .send(body)
        .expect(400);
      await request(app.getHttpServer())
        .put(`/foods/${recipeFood}`)
        .set(asA)
        .send(body)
        .expect(400);
      expect(
        await prisma.mealItem.findMany({
          where: { mealId: meal },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(beforeMeals);
      expect(
        await prisma.recipeIngredient.findMany({
          where: { recipeVersionId: recipeVersion },
        }),
      ).toEqual(beforeIngredients);
    },
  );

  it.each([used, recipeFood, templateFood])(
    'keeps shared referenced food %s immutable',
    async (foodId) => {
      const before = await prisma.food.findUniqueOrThrow({
        where: { id: foodId },
      });
      await request(app.getHttpServer())
        .put(`/foods/${foodId}`)
        .set(asA)
        .send({ kcal: 1, name: 'Changed' })
        .expect(409);
      await request(app.getHttpServer())
        .delete(`/foods/${foodId}`)
        .set(asA)
        .expect(400);
      expect(
        await prisma.food.findUniqueOrThrow({ where: { id: foodId } }),
      ).toEqual(before);
    },
  );

  it('protects official catalog against both professionals and source spoofing', async () => {
    for (const identity of [asA, asB]) {
      await request(app.getHttpServer())
        .put(`/foods/${official}`)
        .set(identity)
        .send({ kcal: 1, source: 'MANUAL' })
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/foods/${official}`)
        .set(identity)
        .expect(403);
      await request(app.getHttpServer())
        .post('/foods')
        .set(identity)
        .send({
          name: 'Synthetic official',
          kcal: 1,
          protein: 0,
          carbs: 0,
          fat: 0,
          source: 'IBGE',
        })
        .expect(400);
    }
    expect(
      await prisma.food.findUniqueOrThrow({ where: { id: official } }),
    ).toMatchObject({ kcal: 100, source: 'TACO' });
  });

  it('preserves legitimate create, partial edit, search and removal of unused manual food', async () => {
    const created = await request(app.getHttpServer())
      .post('/foods')
      .set(asA)
      .send({
        name: 'Synthetic legitimate manual food',
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
      })
      .expect(201);
    const createdId = (created.body as { id: string }).id;
    try {
      expect(created.body).toMatchObject({ source: 'MANUAL', baseAmount: 100 });
      const edited = await request(app.getHttpServer())
        .put(`/foods/${createdId}`)
        .set(asA)
        .send({ kcal: 120, source: 'MANUAL' })
        .expect(200);
      expect(edited.body).toMatchObject({
        kcal: 120,
        protein: 10,
        source: 'MANUAL',
      });
      const found = await request(app.getHttpServer())
        .get('/foods/search?q=Synthetic%20legitimate&source=MANUAL')
        .set(asA)
        .expect(200);
      expect(found.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: createdId })]),
      );
      await request(app.getHttpServer())
        .delete(`/foods/${createdId}`)
        .set(asA)
        .expect(200);
      expect(
        await prisma.food.findUnique({ where: { id: createdId } }),
      ).toBeNull();
    } finally {
      await prisma.food.deleteMany({ where: { id: createdId } });
    }
  });

  it('reads each session own preference and refuses cross-account legacy owner', async () => {
    const own = await request(app.getHttpServer())
      .get(`/foods/${used}/preference?quantity=100`)
      .set(asA)
      .expect(200);
    const other = await request(app.getHttpServer())
      .get(`/foods/${used}/preference?quantity=100`)
      .set(asB)
      .expect(200);
    expect(own.body).toMatchObject({
      nutritionistId: a,
      measure: 'own measure',
    });
    expect(other.body).toMatchObject({
      nutritionistId: b,
      measure: 'other private measure',
    });
    await request(app.getHttpServer())
      .get(`/foods/${used}/preference?quantity=100&nutritionistId=${b}`)
      .set(asA)
      .expect(403);
  });

  it.each([
    { method: 'put', foodId: concurrentEdit, status: 409 },
    { method: 'delete', foodId: concurrentDelete, status: 400 },
  ] as const)(
    '$method waits for an in-flight reference and preserves the prescription',
    async ({ method, foodId, status }) => {
      const connection = await pool.connect();
      let mutation: Promise<request.Response> | undefined;
      try {
        await connection.query('BEGIN');
        await connection.query(
          'INSERT INTO meal_items (id, quantity, measure, "mealId", "foodId") VALUES ($1,100,\'g\',$2,$3)',
          [id(method === 'put' ? 30 : 31), meal, foodId],
        );
        const action =
          method === 'put'
            ? request(app.getHttpServer())
                .put(`/foods/${foodId}`)
                .send({ kcal: 1 })
            : request(app.getHttpServer()).delete(`/foods/${foodId}`);
        mutation = action.set(asA).then((response) => response);
        const deadline = Date.now() + 2000;
        let blocked = false;
        while (Date.now() < deadline) {
          const activity = await pool.query<{ blocked: boolean }>(
            `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
           AND wait_event_type='Lock' AND query LIKE '%FROM "foods"%FOR UPDATE%') AS blocked`,
          );
          blocked = activity.rows[0].blocked;
          if (blocked) break;
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(true);
        await connection.query('COMMIT');
        expect((await mutation).status).toBe(status);
        expect(
          await prisma.food.findUniqueOrThrow({ where: { id: foodId } }),
        ).toMatchObject({ kcal: 100 });
        expect(
          await prisma.mealItem.findFirst({ where: { foodId, mealId: meal } }),
        ).toMatchObject({ quantity: 100 });
      } finally {
        await connection.query('ROLLBACK');
        connection.release();
        await mutation?.catch(() => undefined);
      }
    },
  );
  it('serializes catalogue mutation with recipe snapshot calculation before ingredient insertion', async () => {
    const food = await prisma.food.create({
      data: {
        name: 'Synthetic snapshot race',
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
        source: 'MANUAL',
      },
    });
    const recipes = new RecipesService(prisma);
    const gate = await pool.connect();
    let publication: ReturnType<RecipesService['create']> | undefined;
    let mutation: Promise<request.Response> | undefined;
    async function blocked(queryFragment: string, waitEvent: string) {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        const result = await pool.query<{ blocked: boolean }>(
          `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
           AND wait_event_type='Lock' AND wait_event=$1 AND query LIKE $2) AS blocked`,
          [waitEvent, queryFragment],
        );
        if (result.rows[0].blocked) return true;
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
      return false;
    }
    try {
      await pool.query(`CREATE FUNCTION public.fixture_food_snapshot_barrier() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock_shared(90261005); RETURN NEW; END $$;
        CREATE TRIGGER fixture_food_snapshot_barrier BEFORE INSERT ON public.recipe_versions
        FOR EACH ROW EXECUTE FUNCTION public.fixture_food_snapshot_barrier()`);
      await gate.query('BEGIN');
      await gate.query('SELECT pg_advisory_xact_lock(90261005)');
      publication = recipes.create(
        {
          name: 'Synthetic racing recipe',
          category: 'MAIN_MEAL',
          servings: 1,
          isGlutenFree: false,
          isLactoseFree: false,
          isVegan: false,
          ingredients: [{ foodId: food.id, quantity: 100, measure: 'g' }],
        },
        b,
      );
      void publication.catch(() => undefined);
      expect(await blocked('%recipe_versions%', 'advisory')).toBe(true);
      mutation = request(app.getHttpServer())
        .put(`/foods/${food.id}`)
        .set(asA)
        .send({ kcal: 900 })
        .then((response) => response);
      expect(await blocked('%FROM "foods"%FOR UPDATE%', 'transactionid')).toBe(
        true,
      );
      await gate.query('COMMIT');
      expect((await mutation).status).toBe(409);
      const published = await publication;
      expect(published.currentVersion).toMatchObject({ kcal: 100 });
      expect(
        await prisma.food.findUniqueOrThrow({ where: { id: food.id } }),
      ).toMatchObject({ kcal: 100 });
    } finally {
      await gate.query('ROLLBACK');
      gate.release();
      await publication?.catch(() => undefined);
      await mutation?.catch(() => undefined);
      await pool.query(
        'DROP TRIGGER IF EXISTS fixture_food_snapshot_barrier ON public.recipe_versions; DROP FUNCTION IF EXISTS public.fixture_food_snapshot_barrier()',
      );
    }
  });
});
