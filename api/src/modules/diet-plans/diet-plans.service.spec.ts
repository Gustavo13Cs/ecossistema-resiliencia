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
});
