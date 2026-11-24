import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RehabItemCategory } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { RehabPlansService } from './rehab-plans.service';

const dto = {
  clientId: 'client-1',
  title: 'Treino A',
  durationWeeks: 4,
  sessions: [
    {
      name: 'A',
      focus: 'Forca',
      exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
    },
  ],
};

interface RehabContract {
  create(user: AuthUser, data: typeof dto): Promise<unknown>;
  update(
    user: AuthUser,
    id: string,
    data: Omit<typeof dto, 'clientId'> & { currentPhaseIndex?: number },
  ): Promise<unknown>;
  updateCurrentPhase(
    user: AuthUser,
    id: string,
    data: { currentPhaseIndex: number },
  ): Promise<unknown>;
  createTemplate(
    user: AuthUser,
    data: Omit<typeof dto, 'clientId'>,
  ): Promise<unknown>;
  getProtocolCatalog(user: AuthUser): unknown[];
  getExerciseCatalog(
    user: AuthUser,
    query?: { q?: string; onlyWithIllustration?: 'true' | 'false' },
  ): unknown[];
  findActive(user: AuthUser, clientId: string): Promise<unknown>;
  remove(user: AuthUser, id: string): Promise<unknown>;
  saveAsTemplate(user: AuthUser, id: string): Promise<unknown>;
  listTemplates(user: AuthUser): Promise<unknown>;
  findAllByProfessional(user: AuthUser): Promise<unknown>;
}

describe('RehabPlansService Client ownership', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'PHYSIO' };
  const client = { id: dto.clientId, professionalId: user.sub };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: dto.clientId }]),
    client: {
      findFirst: jest.fn(),
    },
    rehabPlan: {
      updateMany: jest.fn(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
      update: jest.fn<Promise<unknown>, [unknown]>(),
    },
    rehabSession: {
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const prisma = {
    client: { findFirst: jest.fn() },
    rehabPlan: {
      updateMany: jest.fn(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  let service: RehabContract;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RehabPlansService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<RehabContract>(RehabPlansService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue(client);
    tx.client.findFirst.mockResolvedValue({ status: 'ACTIVE' });
    prisma.rehabPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      clientId: client.id,
      creatorId: user.sub,
      isTemplate: false,
    });
    prisma.rehabPlan.findMany.mockResolvedValue([]);
    tx.rehabPlan.updateMany.mockResolvedValue({ count: 1 });
    tx.rehabPlan.create.mockResolvedValue({
      id: 'new-plan',
      clientId: client.id,
    });
    tx.rehabPlan.update.mockResolvedValue({
      id: 'plan-1',
      clientId: client.id,
      currentPhaseIndex: 0,
      sessions: [],
    });
    tx.rehabSession.deleteMany.mockResolvedValue({ count: 1 });
    tx.rehabSession.count.mockResolvedValue(2);
    prisma.rehabPlan.create.mockResolvedValue({
      id: 'template-created-1',
      clientId: null,
      isTemplate: true,
      sessions: [],
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
    expect(prisma.rehabPlan.updateMany).not.toHaveBeenCalled();
    resolveClient(client);
    await pending;
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: client.id, professionalId: user.sub },
    });
    expect(tx.rehabPlan.updateMany).toHaveBeenCalledWith({
      where: { clientId: client.id, creatorId: user.sub, isActive: true },
      data: { isActive: false },
    });
    const creation: unknown = tx.rehabPlan.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: {
        clientId: client.id,
        creatorId: user.sub,
        userId: null,
        sessions: {
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
                    notes: undefined,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    expect(prisma.rehabPlan.create).not.toHaveBeenCalled();
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
    expect(prisma.rehabPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.rehabPlan.updateMany).not.toHaveBeenCalled();
  });

  it('rejects creating a protocol for an archived Client', async () => {
    tx.client.findFirst.mockResolvedValueOnce({ status: 'ARCHIVED' });
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.rehabPlan.create).not.toHaveBeenCalled();
  });

  it('scopes the active plan to the Client and its creator', async () => {
    await service.findActive(user, client.id);
    expect(prisma.rehabPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
      }),
    );
  });

  it.each(['remove', 'saveAsTemplate'] as const)(
    'denies another creator before %s',
    async (method) => {
      prisma.rehabPlan.findFirst.mockResolvedValue(null);
      await expect(
        service[method](user, 'foreign-plan'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.rehabPlan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'foreign-plan', creatorId: user.sub },
        }),
      );
      expect(prisma.rehabPlan.delete).not.toHaveBeenCalled();
      expect(prisma.rehabPlan.update).not.toHaveBeenCalled();
    },
  );

  it.each(['remove', 'saveAsTemplate'] as const)(
    'verifies attached Client ownership before %s',
    async (method) => {
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(service[method](user, 'plan-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.rehabPlan.delete).not.toHaveBeenCalled();
      expect(prisma.rehabPlan.update).not.toHaveBeenCalled();
    },
  );

  it('does not expose unassigned legacy clinical plans', async () => {
    prisma.rehabPlan.findFirst.mockResolvedValue({
      id: 'legacy',
      creatorId: user.sub,
      clientId: null,
      isTemplate: false,
    });
    await expect(service.remove(user, 'legacy')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.rehabPlan.delete).not.toHaveBeenCalled();
  });

  it('preserves standalone templates owned by this professional', async () => {
    prisma.rehabPlan.findFirst.mockResolvedValue({
      id: 'template-1',
      creatorId: user.sub,
      clientId: null,
      isTemplate: true,
    });
    await service.remove(user, 'template-1');
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
    expect(prisma.rehabPlan.delete).toHaveBeenCalledWith({
      where: { id: 'template-1', creatorId: user.sub, clientId: null },
    });
  });

  it.each(['ADMIN', 'PATIENT', 'NUTRITIONIST', 'PERSONAL'] as const)(
    'denies %s in the service before any resource query',
    async (role) => {
      const denied: AuthUser = { sub: user.sub, role };
      await expect(service.create(denied, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.listTemplates(denied)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.update(denied, 'plan-1', {
          title: dto.title,
          durationWeeks: dto.durationWeeks,
          sessions: dto.sessions,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.createTemplate(denied, {
          title: dto.title,
          durationWeeks: dto.durationWeeks,
          sessions: dto.sessions,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(() => service.getProtocolCatalog(denied)).toThrow(
        ForbiddenException,
      );
      expect(() => service.getExerciseCatalog(denied)).toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.rehabPlan.findMany).not.toHaveBeenCalled();
    },
  );

  it('updates an active protocol in-place preserving plan id and rejecting archived clients', async () => {
    await service.update(user, 'plan-1', {
      title: 'Protocolo Editado',
      durationWeeks: 6,
      currentPhaseIndex: 0,
      sessions: [
        {
          name: 'Fase 1',
          focus: 'Analgesia',
          exercises: [
            {
              name: 'Dead bug',
              sets: '3',
              reps: '10',
              category: RehabItemCategory.KINESIOTHERAPY,
              isHomeExercise: true,
              homeFrequency: '1x ao dia',
              patientInstructions: 'Movimento lento',
              catalogExerciseId: 'cat-core-10',
            } as unknown as (typeof dto.sessions)[0]['exercises'][0],
          ],
        },
      ],
    });
    expect(tx.rehabSession.deleteMany).toHaveBeenCalledWith({
      where: { rehabPlanId: 'plan-1' },
    });
    const updateArg = tx.rehabPlan.update.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: {
        sessions: {
          create: Array<{
            exercises: { create: Array<Record<string, unknown>> };
          }>;
        };
      };
    };
    expect(updateArg.where).toEqual({
      id: 'plan-1',
      creatorId: user.sub,
      clientId: client.id,
    });
    const savedExercise = updateArg.data.sessions.create[0].exercises.create[0];
    expect(savedExercise).toMatchObject({
      catalogExerciseId: 'cat-core-10',
      isHomeExercise: true,
      homeFrequency: '1x ao dia',
    });
    const snapshot = savedExercise.demonstrationSnapshot as
      | { revision?: unknown }
      | undefined;
    expect(typeof snapshot?.revision).toBe('string');

    tx.client.findFirst.mockResolvedValueOnce({ status: 'ARCHIVED' });
    await expect(
      service.update(user, 'plan-1', {
        title: 'Protocolo Editado',
        durationWeeks: 6,
        sessions: dto.sessions,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects out-of-bounds currentPhaseIndex and unknown catalogExerciseId', async () => {
    await expect(
      service.create(user, {
        ...dto,
        currentPhaseIndex: 3,
      } as unknown as typeof dto),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(user, {
        ...dto,
        sessions: [
          {
            name: 'Fase 1',
            focus: 'Teste',
            exercises: [
              {
                name: 'Desconhecido',
                catalogExerciseId: 'cat-chest-99',
              } as unknown as (typeof dto.sessions)[0]['exercises'][0],
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.rehabSession.count.mockResolvedValueOnce(1);
    await expect(
      service.updateCurrentPhase(user, 'plan-1', { currentPhaseIndex: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates standalone custom templates and lists curated catalogs for PHYSIO', async () => {
    await service.createTemplate(user, {
      title: 'Modelo LCA Personalizado',
      durationWeeks: 12,
      sessions: dto.sessions,
    });
    const createdTemplateArg = prisma.rehabPlan.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createdTemplateArg.data).toMatchObject({
      clientId: null,
      userId: null,
      creatorId: user.sub,
      isActive: false,
      isTemplate: true,
    });

    const protocols = service.getProtocolCatalog(user);
    expect(protocols.length).toBeGreaterThanOrEqual(6);

    const illustrated = service.getExerciseCatalog(user, {
      onlyWithIllustration: 'true',
    });
    expect(illustrated.length).toBe(20);
  });
});
