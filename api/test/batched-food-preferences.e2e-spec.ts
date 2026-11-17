import { randomUUID } from 'node:crypto';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { DietPlansService } from '../src/modules/diet-plans/diet-plans.service';
import { CreateDietPlanDto } from '../src/modules/diet-plans/dto/create-diet-plan.dto';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Batched food preferences with clinical RLS and atomic plan replacement', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let clinical: PrismaService;
  let service: DietPlansService;
  const nutritionist = randomUUID();
  const other = randomUUID();
  const clientId = randomUUID();
  const foods = [randomUUID(), randomUUID()];
  const actor: AuthUser = {
    sub: nutritionist,
    role: 'NUTRITIONIST',
    sessionId: 'synthetic-session',
  };
  const run = <T>(call: () => Promise<T>) =>
    clinical.runAsProfessional(actor, randomUUID(), call);
  const dto = (): CreateDietPlanDto => ({
    clientId,
    title: 'Synthetic plan',
    goal: 'Synthetic goal',
    targetKcal: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 70,
    meals: [
      {
        name: 'A',
        items: [
          { foodId: foods[0], quantity: 1, measure: 'primeira' },
          { foodId: foods[0], quantity: 2, measure: 'outra quantidade' },
          { foodId: foods[1], quantity: 100, measure: 'g' },
        ],
      },
      {
        name: 'B',
        items: [{ foodId: foods[0], quantity: 1, measure: ' última medida ' }],
      },
    ],
  });
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    await db.prisma.user.createMany({
      data: [nutritionist, other].map((id) => ({
        id,
        role: 'NUTRITIONIST',
        name: 'Synthetic',
        email: `${id}@batch.invalid`,
        password: 'unused',
      })),
    });
    await db.prisma.client.create({
      data: {
        id: clientId,
        professionalId: nutritionist,
        name: 'Synthetic client',
      },
    });
    await db.prisma.food.createMany({
      data: foods.map((id) => ({
        id,
        name: 'Synthetic food',
        kcal: 1,
        protein: 1,
        fat: 1,
        carbs: 1,
      })),
    });
    clinical = new PrismaService();
    await clinical.onModuleInit();
    service = new DietPlansService(clinical);
  });
  afterAll(async () => {
    await clinical?.$disconnect();
    urls?.restore();
    await db?.close();
  });
  it('inserts distinct quantities, keeps the final measure and updates the existing ID and timestamp', async () => {
    const existingId = randomUUID();
    await db.prisma.foodPreference.createMany({
      data: [
        {
          id: existingId,
          nutritionistId: nutritionist,
          foodId: foods[0],
          quantity: 1,
          measure: 'antiga',
          updatedAt: new Date('2020-01-01Z'),
        },
        {
          nutritionistId: other,
          foodId: foods[0],
          quantity: 1,
          measure: 'privada',
          updatedAt: new Date('2020-01-01Z'),
        },
      ],
    });
    const before = new Date();
    const plan = await run(() => service.create(dto(), nutritionist));
    expect(plan.meals.flatMap((meal) => meal.items)).toHaveLength(4);
    const rows = await db.prisma.foodPreference.findMany({
      where: { nutritionistId: nutritionist },
      orderBy: { quantity: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: existingId,
      quantity: 1,
      measure: ' última medida ',
    });
    expect(rows[1]).toMatchObject({
      foodId: foods[0],
      quantity: 2,
      measure: 'outra quantidade',
    });
    expect(rows[0].updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(rows[1].id).toMatch(/^[a-f0-9-]{36}$/);
    expect(
      await db.prisma.foodPreference.findFirst({
        where: { nutritionistId: other },
      }),
    ).toMatchObject({ measure: 'privada', updatedAt: new Date('2020-01-01Z') });
    expect(await run(() => clinical.foodPreference.findMany())).toHaveLength(2);
    await expect(
      run(
        () =>
          clinical.$executeRaw`INSERT INTO food_preferences (id,"nutritionistId","foodId",quantity,measure,"updatedAt") VALUES (${randomUUID()},${other},${foods[1]},1,'forbidden',CURRENT_TIMESTAMP)`,
      ),
    ).rejects.toThrow();
  });
  it('rolls back preference writes, plan creation and active-plan replacement together', async () => {
    const before = await db.prisma.dietPlan.findMany({
      where: { clientId },
      orderBy: { id: 'asc' },
    });
    const preferences = await db.prisma.foodPreference.findMany({
      orderBy: { id: 'asc' },
    });
    // Falha controlada exclusivamente no banco descartável deste teste.
    await db.pool
      .query(`CREATE FUNCTION public.reject_synthetic_preference() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic write failure'; END $$;
      CREATE TRIGGER reject_synthetic_preference BEFORE INSERT OR UPDATE ON food_preferences FOR EACH ROW EXECUTE FUNCTION public.reject_synthetic_preference()`);
    try {
      await expect(
        run(() => service.create(dto(), nutritionist)),
      ).rejects.toThrow();
      expect(
        await db.prisma.dietPlan.findMany({
          where: { clientId },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(before);
      expect(
        await db.prisma.foodPreference.findMany({ orderBy: { id: 'asc' } }),
      ).toEqual(preferences);
    } finally {
      await db.pool.query(
        'DROP TRIGGER reject_synthetic_preference ON food_preferences; DROP FUNCTION public.reject_synthetic_preference()',
      );
    }
  });
});
