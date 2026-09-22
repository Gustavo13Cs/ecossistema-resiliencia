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
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/infra/database/prisma.service';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';
const PROFESSIONAL_A = '40000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '40000000-0000-4000-8000-000000000002';
const FOOD_A = '40000000-0000-4000-8000-000000000003';
const FOOD_B = '40000000-0000-4000-8000-000000000004';
const FIXTURE_USER_IDS = [PROFESSIONAL_A, PROFESSIONAL_B];
const FIXTURE_FOOD_IDS = [FOOD_A, FOOD_B];

type TestRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: Role };
};

type RecipeResponse = {
  id: string;
  professionalId: string;
  status: string;
  currentVersion: {
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
    expect(SAFE_TEST_DATABASE_URL).toMatch(/localhost:5434\/.*_test$/);
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);
  };

  const deleteFixtures = async () => {
    assertSafeTestDatabase();
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
    prisma = prismaServices[0];
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
    expect(created.currentVersion).toEqual({
      version: 1,
      name: validPayload.name,
      kcal: 150,
    });

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
