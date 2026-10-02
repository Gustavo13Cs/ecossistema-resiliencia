import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { WorkoutsService } from './workouts.service';

const dto = {
  clientId: 'client-1',
  title: 'Treino A',
  durationWeeks: 4,
  splits: [
    {
      name: 'A',
      focus: 'Forca',
      exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
    },
  ],
};

interface WorkoutContract {
  create(user: AuthUser, data: typeof dto): Promise<unknown>;
  findActive(user: AuthUser, clientId: string): Promise<unknown>;
  remove(user: AuthUser, id: string): Promise<unknown>;
  saveAsTemplate(user: AuthUser, id: string): Promise<unknown>;
  listTemplates(user: AuthUser): Promise<unknown>;
  findAllByProfessional(user: AuthUser): Promise<unknown>;
}

describe('WorkoutsService Client ownership', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'PERSONAL' };
  const client = { id: dto.clientId, professionalId: user.sub };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: dto.clientId }]),
    workout: {
      updateMany: jest.fn(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
    },
  };
  const prisma = {
    client: { findFirst: jest.fn() },
    workout: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  let service: WorkoutContract;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<WorkoutContract>(WorkoutsService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue(client);
    prisma.workout.findFirst.mockResolvedValue({
      id: 'plan-1',
      clientId: client.id,
      creatorId: user.sub,
      isTemplate: false,
    });
    prisma.workout.findMany.mockResolvedValue([]);
    tx.workout.updateMany.mockResolvedValue({ count: 1 });
    tx.workout.create.mockResolvedValue({
      id: 'new-plan',
      clientId: client.id,
    });
  });

  it('waits for ownership before opening a transaction', async () => {
    let resolveClient!: (value: typeof client) => void;
    prisma.client.findFirst.mockReturnValue(
      new Promise((resolve) => {
        resolveClient = resolve;
      }),
    );
    const pending = service.create(user, dto);
    await Promise.resolve();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.workout.updateMany).not.toHaveBeenCalled();
    resolveClient(client);
    await pending;
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: client.id, professionalId: user.sub },
    });
    expect(tx.workout.updateMany).toHaveBeenCalledWith({
      where: { clientId: client.id, creatorId: user.sub, isActive: true },
      data: { isActive: false },
    });
    const creation: unknown = tx.workout.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: {
        clientId: client.id,
        creatorId: user.sub,
        userId: null,
        splits: {
          create: [
            {
              name: 'A',
              focus: 'Forca',
              exercises: {
                create: [
                  {
                    name: 'Agachamento',
                    sets: '3',
                    reps: '10',
                    rest: undefined,
                    notes: undefined,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    expect(prisma.workout.create).not.toHaveBeenCalled();
  });

  it('denies a foreign Client before reading or mutating plans', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.findActive(user, 'client-foreign'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    expect(prisma.workout.updateMany).not.toHaveBeenCalled();
  });

  it('scopes the active plan to the Client and its creator', async () => {
    await service.findActive(user, client.id);
    expect(prisma.workout.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
      }),
    );
  });

  it.each(['remove', 'saveAsTemplate'] as const)(
    'denies another creator before %s',
    async (method) => {
      prisma.workout.findFirst.mockResolvedValue(null);
      await expect(
        service[method](user, 'foreign-plan'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.workout.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'foreign-plan', creatorId: user.sub },
        }),
      );
      expect(prisma.workout.delete).not.toHaveBeenCalled();
      expect(prisma.workout.update).not.toHaveBeenCalled();
    },
  );

  it.each(['remove', 'saveAsTemplate'] as const)(
    'verifies attached Client ownership before %s',
    async (method) => {
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(service[method](user, 'plan-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.workout.delete).not.toHaveBeenCalled();
      expect(prisma.workout.update).not.toHaveBeenCalled();
    },
  );

  it('does not expose unassigned legacy clinical plans', async () => {
    prisma.workout.findFirst.mockResolvedValue({
      id: 'legacy',
      creatorId: user.sub,
      clientId: null,
      isTemplate: false,
    });
    await expect(service.remove(user, 'legacy')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.workout.delete).not.toHaveBeenCalled();
  });

  it('preserves standalone templates owned by this professional', async () => {
    prisma.workout.findFirst.mockResolvedValue({
      id: 'template-1',
      creatorId: user.sub,
      clientId: null,
      isTemplate: true,
    });
    await service.remove(user, 'template-1');
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
    expect(prisma.workout.delete).toHaveBeenCalledWith({
      where: { id: 'template-1', creatorId: user.sub, clientId: null },
    });
  });

  it.each(['ADMIN', 'PATIENT', 'NUTRITIONIST', 'PHYSIO'] as const)(
    'denies %s in the service before any resource query',
    async (role) => {
      const denied: AuthUser = { sub: user.sub, role };
      await expect(service.create(denied, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.listTemplates(denied)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.workout.findMany).not.toHaveBeenCalled();
    },
  );
});
