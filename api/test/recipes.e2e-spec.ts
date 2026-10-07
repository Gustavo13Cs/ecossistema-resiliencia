import { isolationPort } from './fixtures/client-isolation';
import { testAdminPrisma, clearTestReadAudits } from './fixtures/test-admin';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecipeCategory, Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule, GLOBAL_JWT_AUTH_GUARD } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/infra/database/prisma.service';

const SAFE_TEST_DATABASE_URL = `postgresql://postgres:postgres@localhost:${isolationPort}/ecossistema_resiliencia_test`;
const PROFESSIONAL_A = '40000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '40000000-0000-4000-8000-000000000002';
const FOOD_A = '40000000-0000-4000-8000-000000000003';
const FOOD_B = '40000000-0000-4000-8000-000000000004';
const CLIENT_A = '40000000-0000-4000-8000-000000000005';
const FIXTURE_USER_IDS = [PROFESSIONAL_A, PROFESSIONAL_B];
const FIXTURE_FOOD_IDS = [FOOD_A, FOOD_B];

type TestRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: Role; sessionId?: string };
};

type RecipeResponse = {
  id: string;
  professionalId: string;
  status: string;
  currentVersion: {
    id: string;
    version: number;
    name: string;
    kcal: number;
  };
};

const toRecipeResponse = (value: unknown): RecipeResponse => {
  if (!value || typeof value !== 'object') {
    throw new Error('Resposta de receita inválida.');
  }
  const record = value as Record<string, unknown>;
  const currentVersion = record.currentVersion;
  if (
    typeof record.id !== 'string' ||
    typeof record.professionalId !== 'string' ||
    typeof record.status !== 'string' ||
    !currentVersion ||
    typeof currentVersion !== 'object'
  ) {
    throw new Error('Resposta de receita incompleta.');
  }
  const version = currentVersion as Record<string, unknown>;
  if (
    typeof version.id !== 'string' ||
    typeof version.version !== 'number' ||
    typeof version.name !== 'string' ||
    typeof version.kcal !== 'number'
  ) {
    throw new Error('Versão atual da receita incompleta.');
  }
  return {
    id: record.id,
    professionalId: record.professionalId,
    status: record.status,
    currentVersion: {
      id: version.id,
      version: version.version,
      name: version.name,
      kcal: version.kcal,
    },
  };
};

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TestRequest>();
    req.user = {
      sessionId: 'synthetic-guard-session',
      sub: String(req.headers['x-test-user-id']),
      role: String(req.headers['x-test-role']) as Role,
    };
    return true;
  }
}

describe('Recipes HTTP isolation and versioning (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let prismaServices: PrismaService[] = [];
  let originalJwtSecret: string | undefined;
  let jwtSecretWasPresent = false;
  let databaseReadyForCleanup = false;

  const asUser = (userId: string, role: Role) => ({
    'x-test-user-id': userId,
    'x-test-role': role,
  });

  const validPayload = {
    name: 'Mingau proteico',
    description: 'Receita para o café da manhã',
    category: RecipeCategory.BREAKFAST,
    servings: 2,
    instructions: 'Misture e cozinhe.',
    isGlutenFree: false,
    isLactoseFree: true,
    isVegan: true,
    ingredients: [
      { foodId: FOOD_A, quantity: 50, measure: 'g' },
      { foodId: FOOD_B, quantity: 100, measure: 'g' },
    ],
  };

  const assertSafeTestDatabase = () => {
    expect(SAFE_TEST_DATABASE_URL).toMatch(/localhost:543[45]\/.*_test$/);
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);
  };

  const deleteFixtures = async () => {
    assertSafeTestDatabase();
    await clearTestReadAudits(prisma, FIXTURE_USER_IDS);
    await prisma.$transaction(async (tx) => {
      const recipes = await tx.recipe.findMany({
        where: { professionalId: { in: FIXTURE_USER_IDS } },
        select: { id: true },
      });
      const recipeIds = recipes.map(({ id }) => id);
      const versions = await tx.recipeVersion.findMany({
        where: { recipeId: { in: recipeIds } },
        select: { id: true },
      });
      const versionIds = versions.map(({ id }) => id);
      const dietPlans = await tx.dietPlan.findMany({
        where: { creatorId: { in: FIXTURE_USER_IDS } },
        select: { id: true },
      });
      const dietPlanIds = dietPlans.map(({ id }) => id);
      const meals = await tx.meal.findMany({
        where: { dietPlanId: { in: dietPlanIds } },
        select: { id: true },
      });
      const mealIds = meals.map(({ id }) => id);

      await tx.mealItem.deleteMany({ where: { mealId: { in: mealIds } } });
      await tx.meal.deleteMany({ where: { id: { in: mealIds } } });
      await tx.dietPlan.deleteMany({ where: { id: { in: dietPlanIds } } });
      await tx.client.deleteMany({ where: { id: CLIENT_A } });

      // Production snapshots are intentionally immutable. This fixed, local-only
      // fixture transaction disables user triggers without weakening production.
      await tx.$executeRawUnsafe(
        'SET LOCAL session_replication_role = replica',
      );
      await tx.mealItem.deleteMany({
        where: { recipeVersionId: { in: versionIds } },
      });
      await tx.recipeIngredient.deleteMany({
        where: { recipeVersionId: { in: versionIds } },
      });
      await tx.recipe.updateMany({
        where: { id: { in: recipeIds } },
        data: { currentVersionId: null },
      });
      await tx.recipeVersion.deleteMany({
        where: { id: { in: versionIds } },
      });
      await tx.recipe.deleteMany({ where: { id: { in: recipeIds } } });
      await tx.food.deleteMany({ where: { id: { in: FIXTURE_FOOD_IDS } } });
      await tx.user.deleteMany({ where: { id: { in: FIXTURE_USER_IDS } } });
    });
  };

  beforeAll(async () => {
    assertSafeTestDatabase();
    jwtSecretWasPresent = process.env.JWT_SECRET !== undefined;
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'recipes-e2e-process-only-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideProvider(GLOBAL_JWT_AUTH_GUARD)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prismaServices = app.get(PrismaService, { each: true });
    prisma = testAdminPrisma();
    prismaServices.push(prisma);
  });

  beforeEach(async () => {
    await deleteFixtures();
    databaseReadyForCleanup = true;
    await prisma.user.createMany({
      data: [
        {
          id: PROFESSIONAL_A,
          name: 'Nutricionista Receitas A',
          email: 'recipes-professional-a@e2e.test',
          password: 'not-used-e2e',
          role: 'NUTRITIONIST',
        },
        {
          id: PROFESSIONAL_B,
          name: 'Nutricionista Receitas B',
          email: 'recipes-professional-b@e2e.test',
          password: 'not-used-e2e',
          role: 'NUTRITIONIST',
        },
      ],
    });
    await prisma.food.createMany({
      data: [
        {
          id: FOOD_A,
          name: 'Aveia receitas E2E',
          baseAmount: 100,
          kcal: 400,
          protein: 20,
          carbs: 60,
          fat: 10,
          fiber: 8,
          sodium: 4,
          calcium: 50,
          iron: 5,
        },
        {
          id: FOOD_B,
          name: 'Banana receitas E2E',
          baseAmount: 100,
          kcal: 100,
          protein: 2,
          carbs: 24,
          fat: 1,
          fiber: 3,
          sodium: 2,
          calcium: 10,
          iron: 1,
        },
      ],
    });
    await prisma.client.create({
      data: {
        id: CLIENT_A,
        professionalId: PROFESSIONAL_A,
        name: 'Cliente Receitas E2E',
      },
    });
  });

  afterAll(async () => {
    try {
      if (prisma && databaseReadyForCleanup) await deleteFixtures();
    } finally {
      try {
        if (app) await app.close();
      } finally {
        await Promise.all(
          prismaServices.map((prismaService) => prismaService.$disconnect()),
        );
        if (jwtSecretWasPresent && originalJwtSecret !== undefined) {
          process.env.JWT_SECRET = originalJwtSecret;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    }
  });

  it('keeps recipes private and preserves optimistic versioning over HTTP', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/recipes')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send(validPayload)
      .expect(201);
    const created = toRecipeResponse(createdResponse.body as unknown);

    expect(created).toMatchObject({
      professionalId: PROFESSIONAL_A,
      status: 'ACTIVE',
    });
    expect(created.currentVersion).toMatchObject({
      version: 1,
      name: validPayload.name,
      kcal: 150,
    });
    expect(created.currentVersion.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    await request(app.getHttpServer())
      .get(`/recipes/${created.id}`)
      .set(asUser(PROFESSIONAL_B, 'NUTRITIONIST'))
      .expect(404);

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/recipes/${created.id}`)
        .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
        .send({ ...validPayload, expectedVersion: 1 }),
      request(app.getHttpServer())
        .patch(`/recipes/${created.id}`)
        .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
        .send({ ...validPayload, expectedVersion: 1 }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const listedResponse = await request(app.getHttpServer())
      .get('/recipes')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .query({
        q: 'mingau',
        category: RecipeCategory.BREAKFAST,
        isGlutenFree: false,
        isLactoseFree: true,
        isVegan: true,
        status: 'ACTIVE',
      })
      .expect(200);
    expect(
      (listedResponse.body as unknown[]).map(
        (value) => toRecipeResponse(value).id,
      ),
    ).toEqual([created.id]);

    const duplicatedResponse = await request(app.getHttpServer())
      .post(`/recipes/${created.id}/duplicate`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(201);
    const duplicated = toRecipeResponse(duplicatedResponse.body as unknown);
    expect(duplicated).toMatchObject({
      professionalId: PROFESSIONAL_A,
      status: 'ACTIVE',
    });
    expect(duplicated.currentVersion.version).toBe(1);
    expect(duplicated.id).not.toBe(created.id);

    const archivedResponse = await request(app.getHttpServer())
      .patch(`/recipes/${created.id}/archive`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200);
    expect(toRecipeResponse(archivedResponse.body as unknown).status).toBe(
      'ARCHIVED',
    );

    const restoredResponse = await request(app.getHttpServer())
      .patch(`/recipes/${created.id}/restore`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200);
    expect(toRecipeResponse(restoredResponse.body as unknown).status).toBe(
      'ACTIVE',
    );
  });

  it('pins a diet plan to recipe version 1 after version 2 and archive', async () => {
    const createdRecipeResponse = await request(app.getHttpServer())
      .post('/recipes')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send(validPayload)
      .expect(201);
    const createdRecipe = toRecipeResponse(
      createdRecipeResponse.body as unknown,
    );
    const version1Id = createdRecipe.currentVersion.id;

    const planResponse = await request(app.getHttpServer())
      .post('/diet-plans')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({
        clientId: CLIENT_A,
        title: 'Plano com receita versionada',
        goal: 'Praticidade',
        targetKcal: 2000,
        proteinG: 120,
        fatG: 60,
        carbsG: 230,
        meals: [
          {
            name: 'Café da manhã',
            items: [
              {
                recipeVersionId: version1Id,
                quantity: 1.5,
                measure: 'porção',
              },
            ],
          },
        ],
      })
      .expect(201);
    const createdPlan = planResponse.body as {
      id: string;
      meals: Array<{
        items: Array<{
          foodId: string | null;
          recipeVersionId: string | null;
          recipeVersion: {
            id: string;
            version: number;
            name: string;
            recipe: { currentVersionId: string; status: string };
            ingredients: Array<{ food: { id: string } }>;
          };
        }>;
      }>;
    };
    expect(createdPlan.meals[0].items[0]).toMatchObject({
      foodId: null,
      recipeVersionId: version1Id,
      recipeVersion: {
        id: version1Id,
        version: 1,
        name: validPayload.name,
      },
    });
    expect(
      createdPlan.meals[0].items[0].recipeVersion.ingredients.map(
        (ingredient) => ingredient.food.id,
      ),
    ).toContain(FOOD_A);

    const updatedRecipeResponse = await request(app.getHttpServer())
      .patch(`/recipes/${createdRecipe.id}`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({
        ...validPayload,
        name: 'Mingau proteico v2',
        expectedVersion: 1,
      })
      .expect(200);
    const updatedRecipe = toRecipeResponse(
      updatedRecipeResponse.body as unknown,
    );
    expect(updatedRecipe.currentVersion.version).toBe(2);
    expect(updatedRecipe.currentVersion.id).not.toBe(version1Id);

    const activePlanResponse = await request(app.getHttpServer())
      .get(`/diet-plans/client/${CLIENT_A}/active`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200);
    const activePlan = activePlanResponse.body as typeof createdPlan;
    expect(activePlan.meals[0].items[0]).toMatchObject({
      foodId: null,
      recipeVersionId: version1Id,
      recipeVersion: {
        id: version1Id,
        version: 1,
        name: validPayload.name,
        recipe: {
          currentVersionId: updatedRecipe.currentVersion.id,
          status: 'ACTIVE',
        },
      },
    });

    await request(app.getHttpServer())
      .patch(`/recipes/${createdRecipe.id}/archive`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200);

    const archivedPlanResponse = await request(app.getHttpServer())
      .get(`/diet-plans/client/${CLIENT_A}/active`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200);
    const archivedPlan = archivedPlanResponse.body as typeof createdPlan;
    expect(archivedPlan.meals[0].items[0]).toMatchObject({
      recipeVersionId: version1Id,
      recipeVersion: {
        id: version1Id,
        version: 1,
        recipe: { status: 'ARCHIVED' },
      },
    });

    await request(app.getHttpServer())
      .patch(`/diet-plans/${createdPlan.id}/save-as-template`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200);
    const duplicatedTemplateResponse = await request(app.getHttpServer())
      .post(`/diet-plans/template/${createdPlan.id}/duplicate`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(201);
    const duplicatedTemplate =
      duplicatedTemplateResponse.body as typeof createdPlan;
    expect(duplicatedTemplate.meals[0].items[0]).toMatchObject({
      foodId: null,
      recipeVersionId: version1Id,
      recipeVersion: {
        id: version1Id,
        version: 1,
        recipe: { status: 'ARCHIVED' },
      },
    });
  });

  it('returns 404 when associating another professional recipe version', async () => {
    const foreignRecipeResponse = await request(app.getHttpServer())
      .post('/recipes')
      .set(asUser(PROFESSIONAL_B, 'NUTRITIONIST'))
      .send(validPayload)
      .expect(201);
    const foreignRecipe = toRecipeResponse(
      foreignRecipeResponse.body as unknown,
    );

    await request(app.getHttpServer())
      .post('/diet-plans')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({
        clientId: CLIENT_A,
        title: 'Plano indevido',
        goal: 'Teste de isolamento',
        targetKcal: 2000,
        proteinG: 120,
        fatG: 60,
        carbsG: 230,
        meals: [
          {
            name: 'Jantar',
            items: [
              {
                recipeVersionId: foreignRecipe.currentVersion.id,
                quantity: 1,
                measure: 'porção',
              },
            ],
          },
        ],
      })
      .expect(404);

    await expect(
      prisma.dietPlan.count({ where: { creatorId: PROFESSIONAL_A } }),
    ).resolves.toBe(0);
  });

  it('rejects undeclared fields and non-nutrition roles before persistence', async () => {
    await request(app.getHttpServer())
      .post('/recipes')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ ...validPayload, professionalId: PROFESSIONAL_B })
      .expect(400);

    await request(app.getHttpServer())
      .post('/recipes')
      .set(asUser(PROFESSIONAL_A, 'PERSONAL'))
      .send(validPayload)
      .expect(403);

    await expect(
      prisma.recipe.count({
        where: { professionalId: { in: FIXTURE_USER_IDS } },
      }),
    ).resolves.toBe(0);
  });
});
