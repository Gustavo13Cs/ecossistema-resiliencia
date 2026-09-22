import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { DietPlansService } from './diet-plans.service';

const PROFESSIONAL_ID = 'professional-1';
const CLIENT_ID = 'client-1';
const FOOD_ID = '10000000-0000-4000-8000-000000000001';
const VERSION_1_ID = '10000000-0000-4000-8000-000000000002';

const ownedArchivedRecipeVersion = {
  id: VERSION_1_ID,
  recipeId: 'recipe-1',
  version: 1,
  recipe: {
    id: 'recipe-1',
    currentVersionId: VERSION_1_ID,
    status: 'ARCHIVED',
  },
  ingredients: [],
};

const createDto = {
  clientId: CLIENT_ID,
  title: 'Plano inicial',
  goal: 'Saúde',
  targetKcal: 2000,
  proteinG: 120,
  fatG: 60,
  carbsG: 230,
  meals: [],
} as unknown as CreateDietPlanDto;

describe('DietPlansService professional ownership', () => {
  const prisma = {
    client: { findFirst: jest.fn() },
    professionalPatientLink: { findFirst: jest.fn(), findUnique: jest.fn() },
    dietPlan: {
      updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
      create: jest.fn<Promise<{ id: string }>, [unknown]>(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    meal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    mealItem: { deleteMany: jest.fn() },
    food: { findFirst: jest.fn(), create: jest.fn() },
    foodPreference: { upsert: jest.fn() },
    recipeVersion: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: DietPlansService;
  let capturedDietCreateArgs: unknown;
  let capturedDietUpdateArgs: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      professionalId: PROFESSIONAL_ID,
    });
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);
    prisma.recipeVersion.findMany.mockResolvedValue([]);
    prisma.meal.findMany.mockResolvedValue([]);
    prisma.food.findFirst.mockResolvedValue({ id: 'resolved-food' });
    capturedDietCreateArgs = undefined;
    capturedDietUpdateArgs = undefined;
    prisma.dietPlan.updateMany.mockImplementation((args) => {
      capturedDietUpdateArgs = args;
      return Promise.resolve({ count: 0 });
    });
    prisma.dietPlan.create.mockImplementation((args) => {
      capturedDietCreateArgs = args;
      return Promise.resolve({ id: 'diet-1' });
    });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    service = new DietPlansService(prisma as unknown as PrismaService);
  });

  it('creates a plan against an owned Client and scopes replacement to its creator', async () => {
    await service.create(createDto, PROFESSIONAL_ID);

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, professionalId: PROFESSIONAL_ID },
      select: { id: true },
    });
    const updateCall = capturedDietUpdateArgs as {
      where: { clientId: string; creatorId: string; isActive: boolean };
      data: { isActive: boolean };
    };
    expect(updateCall).toEqual({
      where: {
        clientId: CLIENT_ID,
        creatorId: PROFESSIONAL_ID,
        isActive: true,
      },
      data: { isActive: false },
    });
    const createCall = capturedDietCreateArgs as {
      data: { clientId: string; creatorId: string };
      include: object;
    };
    expect(createCall.data.clientId).toBe(CLIENT_ID);
    expect(createCall.data.creatorId).toBe(PROFESSIONAL_ID);
    expect(createCall.include).toBeDefined();
  });

  it('rejects a Client from another professional before mutating plans', async () => {
    prisma.client.findFirst.mockResolvedValue(null);

    await expect(
      service.create(createDto, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dietPlan.updateMany).not.toHaveBeenCalled();
    expect(prisma.dietPlan.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'both food and recipe version ids',
      item: { foodId: FOOD_ID, recipeVersionId: VERSION_1_ID },
    },
    { label: 'neither food nor recipe version id', item: {} },
  ])('rejects a meal item with $label before writing', async ({ item }) => {
    const invalidDto = {
      ...createDto,
      meals: [
        {
          name: 'Almoço',
          items: [{ ...item, quantity: 1, measure: 'porção' }],
        },
      ],
    } as unknown as CreateDietPlanDto;

    await expect(
      service.create(invalidDto, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dietPlan.updateMany).not.toHaveBeenCalled();
    expect(prisma.dietPlan.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a recipe version not owned by the plan creator', async () => {
    const foreignRecipeDto = {
      ...createDto,
      meals: [
        {
          name: 'Jantar',
          items: [
            {
              recipeVersionId: VERSION_1_ID,
              quantity: 1,
              measure: 'porção',
            },
          ],
        },
      ],
    } as unknown as CreateDietPlanDto;

    await expect(
      service.create(foreignRecipeDto, PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.recipeVersion.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [VERSION_1_ID] },
        recipe: { professionalId: PROFESSIONAL_ID },
      },
      include: {
        recipe: {
          select: { id: true, currentVersionId: true, status: true },
        },
        ingredients: { include: { food: true } },
      },
    });
    expect(prisma.dietPlan.updateMany).not.toHaveBeenCalled();
    expect(prisma.dietPlan.create).not.toHaveBeenCalled();
  });

  it('creates a mixed plan with a pinned archived recipe snapshot and a legacy food', async () => {
    prisma.recipeVersion.findMany.mockResolvedValue([
      ownedArchivedRecipeVersion,
    ]);
    const createdPlan = {
      id: 'diet-1',
      meals: [
        {
          items: [
            {
              foodId: null,
              recipeVersionId: VERSION_1_ID,
              quantity: 1.5,
              recipeVersion: ownedArchivedRecipeVersion,
            },
            {
              foodId: FOOD_ID,
              recipeVersionId: null,
              quantity: 100,
            },
          ],
        },
      ],
    };
    prisma.dietPlan.create.mockImplementationOnce((args) => {
      capturedDietCreateArgs = args;
      return Promise.resolve(createdPlan);
    });
    const mixedDto = {
      ...createDto,
      meals: [
        {
          name: 'Almoço',
          items: [
            {
              recipeVersionId: VERSION_1_ID,
              quantity: 1.5,
              measure: 'porção',
            },
            {
              foodId: FOOD_ID,
              quantity: 100,
              measure: 'xícara',
            },
          ],
        },
      ],
    } as unknown as CreateDietPlanDto;

    const result = await service.create(mixedDto, PROFESSIONAL_ID);

    expect(result.meals[0].items[0]).toMatchObject({
      foodId: null,
      recipeVersionId: VERSION_1_ID,
      quantity: 1.5,
    });
    const createCall = capturedDietCreateArgs as {
      data: {
        meals: {
          create: Array<{
            items: {
              create: Array<{
                foodId: string | null;
                recipeVersionId: string | null;
                quantity: number;
              }>;
            };
          }>;
        };
      };
      include: unknown;
    };
    expect(createCall.data.meals.create[0].items.create).toEqual([
      expect.objectContaining({
        foodId: null,
        recipeVersionId: VERSION_1_ID,
        quantity: 1.5,
      }),
      expect.objectContaining({
        foodId: FOOD_ID,
        recipeVersionId: null,
        quantity: 100,
      }),
    ]);
    expect(createCall.include).toEqual({
      meals: {
        include: {
          items: {
            include: {
              food: true,
              recipeVersion: {
                include: {
                  recipe: {
                    select: {
                      id: true,
                      currentVersionId: true,
                      status: true,
                    },
                  },
                  ingredients: { include: { food: true } },
                },
              },
            },
          },
        },
      },
    });
    expect(prisma.foodPreference.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.foodPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ foodId: FOOD_ID }),
      }),
    );
  });

  it('does not let another nutritionist toggle a meal they did not create', async () => {
    prisma.meal.findUnique.mockResolvedValue({
      id: 'meal-1',
      isConsumed: false,
      dietPlan: { userId: 'legacy-patient', creatorId: 'another-professional' },
    });

    await expect(
      service.toggleMealStatus('meal-1', PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.meal.update).not.toHaveBeenCalled();
  });

  it('creates a custom template with a recipe version', async () => {
    prisma.recipeVersion.findMany.mockResolvedValue([
      ownedArchivedRecipeVersion,
    ]);
    const templateDto = {
      title: 'Modelo Hipertrofia V1',
      goal: 'Ganho de Massa',
      targetKcal: 2500,
      proteinG: 180,
      fatG: 70,
      carbsG: 280,
      meals: [
        {
          name: 'Café da manhã',
          items: [
            {
              recipeVersionId: VERSION_1_ID,
              quantity: 1,
              measure: 'porção',
            },
          ],
        },
      ],
    };

    await service.createTemplate(templateDto, PROFESSIONAL_ID);

    expect(prisma.dietPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Modelo Hipertrofia V1',
          creatorId: PROFESSIONAL_ID,
          isTemplate: true,
          isActive: true,
          meals: {
            create: [
              expect.objectContaining({
                items: {
                  create: [
                    expect.objectContaining({
                      foodId: null,
                      recipeVersionId: VERSION_1_ID,
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  it('updates a template while preserving its selected recipe version', async () => {
    prisma.dietPlan.findUnique.mockResolvedValue({
      id: 'tpl-1',
      creatorId: PROFESSIONAL_ID,
    });
    prisma.recipeVersion.findMany.mockResolvedValue([
      ownedArchivedRecipeVersion,
    ]);
    prisma.dietPlan.update.mockResolvedValue({ id: 'tpl-1' });

    await service.updateTemplate(
      'tpl-1',
      {
        meals: [
          {
            name: 'Jantar',
            items: [
              {
                recipeVersionId: VERSION_1_ID,
                quantity: 2,
                measure: 'porção',
              },
            ],
          },
        ],
      },
      PROFESSIONAL_ID,
    );

    expect(prisma.dietPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          meals: {
            create: [
              expect.objectContaining({
                items: {
                  create: [
                    expect.objectContaining({
                      foodId: null,
                      recipeVersionId: VERSION_1_ID,
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  it('duplicates a template incrementing the version title', async () => {
    prisma.dietPlan.findUnique.mockResolvedValue({
      id: 'tpl-1',
      title: 'Low Carb V1',
      goal: 'Definição',
      targetKcal: 1800,
      proteinG: 140,
      fatG: 60,
      carbsG: 120,
      creatorId: PROFESSIONAL_ID,
      meals: [],
    });

    await service.duplicateTemplate('tpl-1', PROFESSIONAL_ID);

    expect(prisma.dietPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Low Carb V2',
          creatorId: PROFESSIONAL_ID,
          isTemplate: true,
        }),
      }),
    );
  });

  it('duplicates a template that references an archived owned recipe version', async () => {
    prisma.recipeVersion.findMany.mockResolvedValue([
      ownedArchivedRecipeVersion,
    ]);
    prisma.dietPlan.findUnique.mockResolvedValue({
      id: 'tpl-recipe',
      title: 'Receitas V1',
      goal: 'Praticidade',
      targetKcal: 1800,
      proteinG: 120,
      fatG: 50,
      carbsG: 180,
      creatorId: PROFESSIONAL_ID,
      meals: [
        {
          name: 'Jantar',
          time: null,
          notes: null,
          items: [
            {
              quantity: 1,
              measure: 'porção',
              notes: null,
              foodId: null,
              recipeVersionId: VERSION_1_ID,
              recipeVersion: ownedArchivedRecipeVersion,
            },
          ],
        },
      ],
    });

    await service.duplicateTemplate('tpl-recipe', PROFESSIONAL_ID);

    expect(prisma.dietPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Receitas V2',
          meals: {
            create: [
              expect.objectContaining({
                items: {
                  create: [
                    expect.objectContaining({
                      foodId: null,
                      recipeVersionId: VERSION_1_ID,
                    }),
                  ],
                },
              }),
            ],
          },
        }),
      }),
    );
  });

  it('toggles archive status of a template', async () => {
    prisma.dietPlan.findUnique.mockResolvedValue({
      id: 'tpl-1',
      isActive: true,
      creatorId: PROFESSIONAL_ID,
    });
    prisma.dietPlan.update.mockResolvedValue({
      id: 'tpl-1',
      isActive: false,
    });

    await service.toggleArchiveTemplate('tpl-1', PROFESSIONAL_ID);

    expect(prisma.dietPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tpl-1' },
        data: { isActive: false },
      }),
    );
  });

  it('imports a template to an owned client with auto-scaling of portions and macros', async () => {
    prisma.recipeVersion.findMany.mockResolvedValue([
      ownedArchivedRecipeVersion,
    ]);
    prisma.dietPlan.findUnique.mockResolvedValue({
      id: 'tpl-base',
      title: 'Base Normocalórica',
      goal: 'Manutenção',
      targetKcal: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
      fiberG: 30,
      durationDays: 30,
      creatorId: PROFESSIONAL_ID,
      meals: [
        {
          name: 'Almoço',
          time: '12:00',
          notes: null,
          items: [
            {
              quantity: 100,
              measure: 'g',
              foodId: 'food-frango',
              notes: 'Grelhado',
            },
            {
              quantity: 2,
              measure: 'unidades',
              foodId: 'food-ovo',
              notes: null,
            },
            {
              quantity: 2,
              measure: 'porções',
              foodId: null,
              recipeVersionId: VERSION_1_ID,
              notes: null,
              recipeVersion: ownedArchivedRecipeVersion,
            },
          ],
        },
      ],
    });

    await service.importTemplateToClient(
      'tpl-base',
      {
        clientId: CLIENT_ID,
        targetKcal: 1600, // 0.8x scale
        title: 'Plano Adaptado para João',
      },
      PROFESSIONAL_ID,
    );

    // Deve desativar planos ativos anteriores do cliente
    expect(prisma.dietPlan.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: CLIENT_ID,
        creatorId: PROFESSIONAL_ID,
        isActive: true,
      },
      data: { isActive: false },
    });

    // Deve criar o novo plano com os macros recalculados na proporção de 0.8x
    const createCall = capturedDietCreateArgs as {
      data: {
        title: string;
        targetKcal: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
        fiberG: number;
        clientId: string;
        isTemplate: boolean;
        isActive: boolean;
        meals: {
          create: Array<{
            name: string;
            items: {
              create: Array<{
                quantity: number;
                measure: string;
              }>;
            };
          }>;
        };
      };
    };

    expect(createCall.data.title).toBe('Plano Adaptado para João');
    expect(createCall.data.targetKcal).toBe(1600);
    expect(createCall.data.proteinG).toBe(120); // 150 * 0.8 = 120
    expect(createCall.data.carbsG).toBe(160); // 200 * 0.8 = 160
    expect(createCall.data.fatG).toBe(48); // 60 * 0.8 = 48
    expect(createCall.data.fiberG).toBe(24); // 30 * 0.8 = 24
    expect(createCall.data.clientId).toBe(CLIENT_ID);
    expect(createCall.data.isTemplate).toBe(false);
    expect(createCall.data.isActive).toBe(true);

    // Verifica auto-scaling das porções:
    // 100g * 0.8 = 80g
    expect(createCall.data.meals.create[0].items.create[0].quantity).toBe(80);
    // 2 unidades * 0.8 = 1.6 -> arredondado para 1.5 unidades
    expect(createCall.data.meals.create[0].items.create[1].quantity).toBe(1.5);
    expect(createCall.data.meals.create[0].items.create[2]).toMatchObject({
      quantity: 1.5,
      foodId: null,
      recipeVersionId: VERSION_1_ID,
    });
  });

  it('validates recipe ownership before deactivating a plan during import', async () => {
    prisma.dietPlan.findUnique.mockResolvedValue({
      id: 'tpl-foreign-recipe',
      title: 'Template inconsistente',
      goal: 'Teste de isolamento',
      targetKcal: 2000,
      proteinG: 120,
      carbsG: 230,
      fatG: 60,
      creatorId: PROFESSIONAL_ID,
      meals: [
        {
          name: 'Jantar',
          items: [
            {
              quantity: 1,
              measure: 'porção',
              foodId: null,
              recipeVersionId: VERSION_1_ID,
            },
          ],
        },
      ],
    });
    prisma.recipeVersion.findMany.mockResolvedValue([]);

    await expect(
      service.importTemplateToClient(
        'tpl-foreign-recipe',
        { clientId: CLIENT_ID },
        PROFESSIONAL_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.dietPlan.updateMany).not.toHaveBeenCalled();
    expect(prisma.dietPlan.create).not.toHaveBeenCalled();
  });
});
