import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateDietPlanDto } from './dto/create-diet-plan.dto';
import { DietPlansService } from './diet-plans.service';

const PROFESSIONAL_ID = 'professional-1';
const CLIENT_ID = 'client-1';

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
    meal: { findUnique: jest.fn(), update: jest.fn() },
    foodPreference: { upsert: jest.fn() },
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

  it('creates a custom template with isTemplate=true', async () => {
    const templateDto = {
      title: 'Modelo Hipertrofia V1',
      goal: 'Ganho de Massa',
      targetKcal: 2500,
      proteinG: 180,
      fatG: 70,
      carbsG: 280,
      meals: [],
    };

    await service.createTemplate(templateDto, PROFESSIONAL_ID);

    expect(prisma.dietPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Modelo Hipertrofia V1',
          creatorId: PROFESSIONAL_ID,
          isTemplate: true,
          isActive: true,
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
      where: { clientId: CLIENT_ID, creatorId: PROFESSIONAL_ID, isActive: true },
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
  });
});
