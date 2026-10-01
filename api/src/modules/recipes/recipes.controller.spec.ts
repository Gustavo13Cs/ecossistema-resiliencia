import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RecipeCategory, RecipeStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

const PROFESSIONAL_ID = '11111111-1111-4111-8111-111111111111';
const RECIPE_ID = '22222222-2222-4222-8222-222222222222';
const FOOD_ID = '33333333-3333-4333-8333-333333333333';

const validPayload = {
  name: 'Mingau proteico',
  description: 'Café da manhã',
  category: RecipeCategory.BREAKFAST,
  servings: 2,
  instructions: 'Misture e cozinhe.',
  isGlutenFree: false,
  isLactoseFree: true,
  isVegan: true,
  ingredients: [{ foodId: FOOD_ID, quantity: 50, measure: 'g' }],
};

describe('RecipesController', () => {
  const recipesService = {
    list: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    duplicate: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
  };

  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [{ provide: RecipesService, useValue: recipesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          context.switchToHttp().getRequest().user = {
            sub: PROFESSIONAL_ID,
            role: 'NUTRITIONIST',
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(recipesService).forEach((method) =>
      method.mockResolvedValue({ id: RECIPE_ID }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes request.user.sub to every recipe operation', async () => {
    await request(app.getHttpServer())
      .get('/recipes')
      .query({
        q: 'mingau',
        category: RecipeCategory.BREAKFAST,
        isGlutenFree: 'false',
        isLactoseFree: 'true',
        isVegan: 'true',
        status: RecipeStatus.ACTIVE,
      })
      .expect(200);
    expect(recipesService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'mingau',
        category: RecipeCategory.BREAKFAST,
        isGlutenFree: false,
        isLactoseFree: true,
        isVegan: true,
        status: RecipeStatus.ACTIVE,
      }),
      PROFESSIONAL_ID,
    );

    await request(app.getHttpServer())
      .post('/recipes')
      .send(validPayload)
      .expect(201);
    expect(recipesService.create).toHaveBeenCalledWith(
      expect.objectContaining(validPayload),
      PROFESSIONAL_ID,
    );

    await request(app.getHttpServer()).get(`/recipes/${RECIPE_ID}`).expect(200);
    expect(recipesService.findOne).toHaveBeenCalledWith(
      RECIPE_ID,
      PROFESSIONAL_ID,
    );

    const updatePayload = { ...validPayload, expectedVersion: 1 };
    await request(app.getHttpServer())
      .patch(`/recipes/${RECIPE_ID}`)
      .send(updatePayload)
      .expect(200);
    expect(recipesService.update).toHaveBeenCalledWith(
      RECIPE_ID,
      expect.objectContaining(updatePayload),
      PROFESSIONAL_ID,
    );

    await request(app.getHttpServer())
      .post(`/recipes/${RECIPE_ID}/duplicate`)
      .expect(201);
    expect(recipesService.duplicate).toHaveBeenCalledWith(
      RECIPE_ID,
      PROFESSIONAL_ID,
    );

    await request(app.getHttpServer())
      .patch(`/recipes/${RECIPE_ID}/archive`)
      .expect(200);
    expect(recipesService.archive).toHaveBeenCalledWith(
      RECIPE_ID,
      PROFESSIONAL_ID,
    );

    await request(app.getHttpServer())
      .patch(`/recipes/${RECIPE_ID}/restore`)
      .expect(200);
    expect(recipesService.restore).toHaveBeenCalledWith(
      RECIPE_ID,
      PROFESSIONAL_ID,
    );
  });

  it('rejects undeclared fields before invoking recipe creation', async () => {
    await request(app.getHttpServer())
      .post('/recipes')
      .send({ ...validPayload, professionalId: 'attacker-controlled' })
      .expect(400);

    expect(recipesService.create).not.toHaveBeenCalled();
  });
});
