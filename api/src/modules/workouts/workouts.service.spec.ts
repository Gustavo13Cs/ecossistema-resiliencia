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
  createFromDraft(
    user: AuthUser,
    data: typeof dto,
    revisionOfId: string | null,
  ): Promise<unknown>;
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
    client: { findFirst: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ id: dto.clientId }]),
    workout: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
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
    tx.$queryRaw.mockResolvedValue([{ id: dto.clientId }]);
    tx.client.findFirst.mockResolvedValue({
      id: dto.clientId,
      status: 'ACTIVE',
    });
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

  it('new_prescription_has_server_finalized_at', async () => {
    const before = Date.now();
    await service.create(user, dto);
    expect(tx.workout.create.mock.calls[0]?.[0]).toMatchObject({
      data: { finalizedAt: expect.any(Date) as unknown, revisionOfId: null },
    });
    const { data } = tx.workout.create.mock.calls[0][0] as {
      data: { finalizedAt: Date };
    };
    expect(data.finalizedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(data.finalizedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it.each([false, true])(
    'cannot_delete_client_prescription_or_legacy_history (template=%s)',
    async (isTemplate) => {
      prisma.workout.findFirst.mockResolvedValue({
        id: 'plan-1',
        clientId: client.id,
        isTemplate,
      });
      await expect(service.remove(user, 'plan-1')).rejects.toMatchObject({
        status: 409,
      });
      expect(prisma.workout.delete).not.toHaveBeenCalled();
    },
  );

  it('creates a revision on the current transaction and returns its clinical detail', async () => {
    tx.workout.findFirst.mockResolvedValue({ id: 'source' });
    const detail = {
      id: 'new-plan',
      clientId: client.id,
      client: { id: client.id },
      splits: [],
    };
    tx.workout.findFirstOrThrow.mockResolvedValue(detail);
    await expect(service.createFromDraft(user, dto, 'source')).resolves.toEqual(
      detail,
    );
    expect(tx.workout.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'source',
        clientId: client.id,
        creatorId: user.sub,
        client: { professionalId: user.sub },
      },
      select: { id: true },
    });
    expect(tx.workout.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        revisionOfId: 'source',
        finalizedAt: expect.any(Date) as unknown,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.workout.create).not.toHaveBeenCalled();
  });

  it('rejects unavailable or mismatched revision sources before deactivation', async () => {
    tx.workout.findFirst.mockResolvedValue(null);
    await expect(
      service.createFromDraft(user, dto, 'foreign'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.workout.updateMany).not.toHaveBeenCalled();
    expect(tx.workout.create).not.toHaveBeenCalled();
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
              position: 0,
              exercises: {
                create: [
                  {
                    name: 'Agachamento',
                    sets: '3',
                    reps: '10',
                    rest: undefined,
                    notes: undefined,
                    position: 0,
                    muscleGroup: undefined,
                    load: undefined,
                    effortType: undefined,
                    effortTarget: undefined,
                    tempo: undefined,
                    method: 'STANDARD',
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

  it('persists split/exercise positions from array indices and advanced exercise parameters', async () => {
    await service.create(user, {
      ...dto,
      splits: [
        {
          name: 'Treino A',
          focus: 'Inferiores',
          exercises: [
            {
              name: 'Agachamento livre',
              sets: '4',
              reps: '6-8',
              rest: '120s',
              notes: 'Amplitude total',
              muscleGroup: 'QUADRICEPS',
              load: '80 kg',
              effortType: 'RIR',
              effortTarget: '2',
              tempo: '3-1-1-0',
              method: 'REST_PAUSE',
            },
            {
              name: 'Cadeira extensora',
              sets: '3',
              reps: '12-15',
              muscleGroup: 'QUADRICEPS',
              method: 'DROP_SET',
            },
          ],
        },
        {
          name: 'Treino B',
          focus: 'Superiores',
          exercises: [{ name: 'Supino reto', sets: '4', reps: '8-10' }],
        },
      ],
    } as typeof dto);

    const creation: unknown = tx.workout.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: {
        splits: {
          create: [
            {
              name: 'Treino A',
              position: 0,
              exercises: {
                create: [
                  {
                    name: 'Agachamento livre',
                    position: 0,
                    muscleGroup: 'QUADRICEPS',
                    load: '80 kg',
                    effortType: 'RIR',
                    effortTarget: '2',
                    tempo: '3-1-1-0',
                    method: 'REST_PAUSE',
                  },
                  {
                    name: 'Cadeira extensora',
                    position: 1,
                    muscleGroup: 'QUADRICEPS',
                    method: 'DROP_SET',
                  },
                ],
              },
            },
            {
              name: 'Treino B',
              position: 1,
              exercises: {
                create: [
                  {
                    name: 'Supino reto',
                    position: 0,
                    method: 'STANDARD',
                  },
                ],
              },
            },
          ],
        },
      },
    });
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

  it('archived_client_does_not_replace_active_workout', async () => {
    tx.client.findFirst.mockResolvedValue({
      id: client.id,
      status: 'ARCHIVED',
    });
    await expect(service.create(user, dto)).rejects.toMatchObject({
      status: 409,
    });
    expect(tx.workout.updateMany).not.toHaveBeenCalled();
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it('fails without replacing the active workout when ownership is lost at the lock', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.workout.updateMany).not.toHaveBeenCalled();
    expect(tx.workout.create).not.toHaveBeenCalled();
  });

  it('does not deactivate the old workout until the current status check completes', async () => {
    let resolveStatus!: (value: { id: string; status: string }) => void;
    tx.client.findFirst.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    const pending = service.create(user, dto);
    for (let step = 0; step < 6; step++) await Promise.resolve();
    expect(tx.workout.updateMany).not.toHaveBeenCalled();
    resolveStatus({ id: client.id, status: 'ARCHIVED' });
    await expect(pending).rejects.toMatchObject({ status: 409 });
    expect(tx.workout.updateMany).not.toHaveBeenCalled();
  });

  it('propagates a child creation failure from the same replacement transaction', async () => {
    const failure = new Error('synthetic write failure');
    tx.workout.create.mockRejectedValueOnce(failure);
    await expect(service.create(user, dto)).rejects.toBe(failure);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.workout.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.workout.updateMany).not.toHaveBeenCalled();
    expect(prisma.workout.create).not.toHaveBeenCalled();
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

  it('keeps save-as-template compatible for an attached legacy prescription', async () => {
    await service.saveAsTemplate(user, 'plan-1');
    expect(prisma.workout.update).toHaveBeenCalledWith({
      where: { id: 'plan-1', creatorId: user.sub, clientId: client.id },
      data: { isTemplate: true },
      select: { id: true, title: true, isTemplate: true },
    });
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
      await expect(
        service.createFromDraft(denied, dto, null),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.listTemplates(denied)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.workout.findMany).not.toHaveBeenCalled();
    },
  );
});
