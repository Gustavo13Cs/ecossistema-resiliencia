import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { FoodsController } from '../src/modules/foods/foods.controller';
import { FoodsService } from '../src/modules/foods/foods.service';

const owner = '93000000-0000-4000-8000-000000000001';
const other = '93000000-0000-4000-8000-000000000002';
const foodId = '93000000-0000-4000-8000-000000000003';

// Identidade sintética somente nesta suíte; roles, DTOs, controller e service reais.
class FixtureAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user: AuthUser;
    }>();
    req.user = { sub: req.headers['x-test-user-id'], role: 'NUTRITIONIST' };
    return true;
  }
}

describe('Foods security HTTP contract', () => {
  let app: INestApplication<App>;
  const food = {
    id: foodId,
    source: 'MANUAL',
    name: 'Synthetic food',
    kcal: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    baseUnit: '100g',
    baseAmount: 100,
  };
  const prisma = {
    food: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    mealItem: { findFirst: jest.fn() },
    recipeIngredient: { findFirst: jest.fn() },
    foodPreference: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const asOwner = { 'x-test-user-id': owner };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FoodsController],
      providers: [
        FoodsService,
        RolesGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FixtureAuthGuard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (work: (tx: typeof prisma) => Promise<unknown>) => work(prisma),
    );
    prisma.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray) =>
        strings.join('').includes('food_in_use')
          ? [
              {
                used: Boolean(
                  (await prisma.mealItem.findFirst()) ||
                  (await prisma.recipeIngredient.findFirst()),
                ),
              },
            ]
          : [{ id: foodId }],
    );
    prisma.food.findUnique.mockResolvedValue(food);
    prisma.food.update.mockResolvedValue({ ...food, kcal: 120 });
    prisma.food.create.mockResolvedValue(food);
    prisma.food.delete.mockResolvedValue(food);
    prisma.mealItem.findFirst.mockResolvedValue(null);
    prisma.recipeIngredient.findFirst.mockResolvedValue(null);
    prisma.foodPreference.findUnique.mockImplementation(
      (args: {
        where: { nutritionistId_foodId_quantity: { nutritionistId: string } };
      }) =>
        Promise.resolve({
          measure: args.where.nutritionistId_foodId_quantity.nutritionistId,
        }),
    );
  });

  it.each([
    { mealItems: { updateMany: { where: {}, data: { quantity: 9999 } } } },
    { mealItems: { deleteMany: {} } },
    { recipeIngredients: { deleteMany: {} } },
    { id: other },
    { createdAt: '2000-01-01T00:00:00Z' },
    { kcal: { increment: 1 } },
    { baseAmount: 0 },
    { protein: -1 },
    { kcal: null },
    { name: null },
    { source: 'TACO' },
  ])(
    'rejects malicious or invalid update body %j before writing',
    async (body) => {
      await request(app.getHttpServer())
        .put(`/foods/${foodId}`)
        .set(asOwner)
        .send(body)
        .expect(400);
      expect(prisma.food.update).not.toHaveBeenCalled();
    },
  );

  it('preserves valid partial scalar editing of an unused manual food', async () => {
    await request(app.getHttpServer())
      .put(`/foods/${foodId}`)
      .set(asOwner)
      .send({ kcal: 120, source: 'MANUAL' })
      .expect(200);
    expect(prisma.food.update).toHaveBeenCalled();
  });
  it('rejects mutation of persisted official source, even with MANUAL in body', async () => {
    prisma.food.findUnique.mockResolvedValue({ ...food, source: 'TACO' });
    await request(app.getHttpServer())
      .put(`/foods/${foodId}`)
      .set(asOwner)
      .send({ kcal: 120, source: 'MANUAL' })
      .expect(403);
    expect(prisma.food.update).not.toHaveBeenCalled();
  });
  it('rejects removal of an official food even when unused', async () => {
    prisma.food.findUnique.mockResolvedValue({ ...food, source: 'IBGE' });
    await request(app.getHttpServer())
      .delete(`/foods/${foodId}`)
      .set(asOwner)
      .expect(403);
    expect(prisma.food.delete).not.toHaveBeenCalled();
  });
  it('rejects creation pretending to be an official source', async () => {
    await request(app.getHttpServer())
      .post('/foods')
      .set(asOwner)
      .send({
        name: 'Synthetic',
        kcal: 1,
        protein: 0,
        carbs: 0,
        fat: 0,
        source: 'TBCA',
      })
      .expect(400);
    expect(prisma.food.create).not.toHaveBeenCalled();
  });
  it.each(['mealItem', 'recipeIngredient'] as const)(
    'prevents silent changes when food is referenced by %s',
    async (relation) => {
      prisma[relation].findFirst.mockResolvedValue({
        id: 'synthetic-reference',
      });
      await request(app.getHttpServer())
        .put(`/foods/${foodId}`)
        .set(asOwner)
        .send({ kcal: 1 })
        .expect(409);
      expect(prisma.food.update).not.toHaveBeenCalled();
    },
  );
  it('gets preference from session identity without public owner parameter', async () => {
    const response = await request(app.getHttpServer())
      .get(`/foods/${foodId}/preference?quantity=100`)
      .set(asOwner)
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({ measure: owner });
  });
  it('rejects another professional in the legacy owner query', async () => {
    await request(app.getHttpServer())
      .get(`/foods/${foodId}/preference?quantity=100&nutritionistId=${other}`)
      .set(asOwner)
      .expect(403);
    expect(prisma.foodPreference.findUnique).not.toHaveBeenCalled();
  });
  it('preserves matching legacy owner query without trusting it', async () => {
    await request(app.getHttpServer())
      .get(`/foods/${foodId}/preference?quantity=100&nutritionistId=${owner}`)
      .set(asOwner)
      .expect(200);
    expect(prisma.foodPreference.findUnique).toHaveBeenCalledWith({
      where: {
        nutritionistId_foodId_quantity: {
          nutritionistId: owner,
          foodId,
          quantity: 100,
        },
      },
    });
  });
  it.each(['', 'NaN', 'Infinity', '-1'])(
    'rejects invalid preference quantity %s',
    async (quantity) => {
      await request(app.getHttpServer())
        .get(`/foods/${foodId}/preference?quantity=${quantity}`)
        .set(asOwner)
        .expect(400);
      expect(prisma.foodPreference.findUnique).not.toHaveBeenCalled();
    },
  );
});
