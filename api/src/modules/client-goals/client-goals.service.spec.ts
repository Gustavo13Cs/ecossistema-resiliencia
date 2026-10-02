import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { ClientGoalsService } from './client-goals.service';

const user: AuthUser = { sub: 'professional-a', role: 'NUTRITIONIST' };
const dto = {
  category: 'WEIGHT_LOSS' as const,
  status: 'PENDING' as const,
  startDate: '2026-10-01',
  targetDate: '2026-12-01',
  targetWeightKg: 80,
  habits: {
    waterTargetMl: 2500,
    sleepTargetHours: 8,
    mealsAdherencePercent: 90,
    dailyStepsTarget: 8000,
    habitsNotes: 'Synthetic habit',
  },
};

describe('ClientGoalsService ownership', () => {
  const prisma = {
    client: { findFirst: jest.fn() },
    clientGoal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn<Promise<unknown>, [unknown]>(),
      deleteMany: jest.fn(),
    },
  };
  let service: {
    list(user: AuthUser): Promise<unknown>;
    findOne(user: AuthUser, clientId: string): Promise<unknown>;
    upsert(
      user: AuthUser,
      clientId: string,
      data: typeof dto,
    ): Promise<unknown>;
    remove(user: AuthUser, clientId: string): Promise<unknown>;
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClientGoalsService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ClientGoalsService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({ id: 'client-a' });
    prisma.clientGoal.findMany.mockResolvedValue([]);
    prisma.clientGoal.findFirst.mockResolvedValue(null);
    prisma.clientGoal.upsert.mockResolvedValue({
      id: 'goal-a',
      clientId: 'client-a',
      professionalId: user.sub,
      ...dto,
      ...dto.habits,
    });
    prisma.clientGoal.deleteMany.mockResolvedValue({ count: 1 });
  });
  it('lists only goals whose professional and Client owner match the JWT', async () => {
    expect(await service.list(user)).toEqual([]);
    expect(prisma.clientGoal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          professionalId: user.sub,
          client: { professionalId: user.sub },
        },
      }),
    );
  });
  it('returns no invented goal for an owned Client without a commitment', async () => {
    expect(await service.findOne(user, 'client-a')).toBeNull();
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-a', professionalId: user.sub },
    });
    expect(prisma.clientGoal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'client-a', professionalId: user.sub },
      }),
    );
    expect(prisma.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.clientGoal.findFirst.mock.invocationCallOrder[0],
    );
  });
  it('upserts the unique Client goal with JWT ownership and nested habit response', async () => {
    expect(await service.upsert(user, 'client-a', dto)).toMatchObject({
      clientId: 'client-a',
      habits: dto.habits,
    });
    const upsert: unknown = prisma.clientGoal.upsert.mock.calls[0]?.[0];
    expect(upsert).toMatchObject({
      where: { clientId: 'client-a', professionalId: user.sub },
      create: {
        clientId: 'client-a',
        professionalId: user.sub,
        waterTargetMl: 2500,
        startDate: new Date(dto.startDate),
      },
      update: {
        waterTargetMl: 2500,
        targetWeightKg: 80,
      },
    });
    expect(prisma.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.clientGoal.upsert.mock.invocationCallOrder[0],
    );
  });
  it('deletes only the current owned Client goal', async () => {
    await service.remove(user, 'client-a');
    expect(prisma.clientGoal.deleteMany).toHaveBeenCalledWith({
      where: { clientId: 'client-a', professionalId: user.sub },
    });
    expect(prisma.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.clientGoal.deleteMany.mock.invocationCallOrder[0],
    );
  });
  it('denies foreign Clients before goal reads or writes', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.findOne(user, 'client-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.upsert(user, 'client-b', dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(user, 'client-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    for (const method of Object.values(prisma.clientGoal))
      expect(method).not.toHaveBeenCalled();
  });
  it('rejects reversed date ranges without writing a goal', async () => {
    await expect(
      service.upsert(user, 'client-a', { ...dto, targetDate: '2026-09-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.clientGoal.upsert).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'PATIENT', 'PERSONAL', 'PHYSIO'] as const)(
    'denies %s for every operation',
    async (role) => {
      const other = { ...user, role };
      await expect(service.list(other)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.findOne(other, 'client-a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.upsert(other, 'client-a', dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove(other, 'client-a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
    },
  );
});
