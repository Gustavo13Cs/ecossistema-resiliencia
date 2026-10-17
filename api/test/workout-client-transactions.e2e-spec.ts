import { Prisma } from '@prisma/client';
import { isolationPort } from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';
import { ClientAccessService } from '../src/common/client-access/client-access.service';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { WorkoutDetail } from '../src/modules/workouts/training-read.types';
import { WorkoutsService } from '../src/modules/workouts/workouts.service';

describe('Client workout transactions (PostgreSQL)', () => {
  const database = `postgresql://postgres:postgres@localhost:${isolationPort}/ecossistema_resiliencia_test`;
  const owner: AuthUser = {
    sub: '71000000-0000-4000-8000-000000000001',
    role: 'PERSONAL',
    sessionId: 'synthetic-workout-session',
  };
  const other: AuthUser = {
    sub: '71000000-0000-4000-8000-000000000002',
    role: 'PERSONAL',
  };
  const clientId = '71000000-0000-4000-8000-000000000003';
  const siblingClientId = '71000000-0000-4000-8000-000000000007';
  const otherClientId = '71000000-0000-4000-8000-000000000004';
  const previousId = '71000000-0000-4000-8000-000000000005';
  const otherPlanId = '71000000-0000-4000-8000-000000000006';
  const dto = {
    clientId,
    title: 'Novo treino',
    splits: [
      {
        name: 'A',
        exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
      },
    ],
  };
  let prisma: PrismaService;
  let clinical: PrismaService;
  let service: {
    create(user: AuthUser, data: typeof dto): Promise<unknown>;
    createFromDraft(
      user: AuthUser,
      data: typeof dto,
      revisionOfId: string | null,
    ): Promise<WorkoutDetail>;
    remove(user: AuthUser, id: string): Promise<unknown>;
  };
  const scoped = <T>(operation: () => Promise<T>) =>
    clinical.runAsProfessional(owner, 'synthetic-workout-request', operation);
  const snapshot = (id = previousId) =>
    prisma.workout.findUniqueOrThrow({
      where: { id },
      include: { splits: { include: { exercises: true } } },
    });

  beforeAll(async () => {
    expect(process.env.DATABASE_URL).toBe(database);
    expect(process.env.DIRECT_URL).toBe(database);
    prisma = testAdminPrisma();
    clinical = new PrismaService();
    service = new WorkoutsService(clinical, new ClientAccessService(clinical));
    await clinical.onModuleInit();
    await prisma.$connect();
  });

  const clearFixtures = async () => {
    await prisma.workoutDraft.deleteMany({
      where: { professionalId: { in: [owner.sub, other.sub] } },
    });
    await prisma.workout.deleteMany({
      where: { creatorId: { in: [owner.sub, other.sub] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId, siblingClientId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.sub, other.sub] } },
    });
  };

  beforeEach(async () => {
    await clearFixtures();
    await prisma.user.createMany({
      data: [owner, other].map((user) => ({
        id: user.sub,
        name: 'Fixture professional',
        email: `${user.sub}@workout-test.invalid`,
        password: 'test-only-not-a-login',
        role: user.role,
      })),
    });
    await prisma.client.createMany({
      data: [
        { id: clientId, name: 'Fixture A', professionalId: owner.sub },
        { id: otherClientId, name: 'Fixture B', professionalId: other.sub },
      ],
    });
    await prisma.workout.createMany({
      data: [
        {
          id: previousId,
          title: 'Anterior A',
          clientId,
          creatorId: owner.sub,
          isActive: true,
        },
        {
          id: otherPlanId,
          title: 'Anterior B',
          clientId: otherClientId,
          creatorId: other.sub,
          isActive: true,
        },
      ],
    });
    await prisma.workoutSplit.create({
      data: {
        id: 'synthetic-history-split',
        workoutId: previousId,
        name: 'Original A',
        position: 0,
        exercises: {
          create: {
            name: 'Original exercise',
            sets: '4',
            reps: '8',
            load: '70 kg',
            position: 0,
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      try {
        await clearFixtures();
      } finally {
        await clinical?.$disconnect();
        await prisma.$disconnect();
      }
    }
  });

  it('new_prescription_has_server_finalized_at', async () => {
    const before = Date.now();
    const result = await scoped(() => service.create(owner, dto));
    const active = await prisma.workout.findFirstOrThrow({
      where: { clientId, isActive: true },
    });
    expect(result).toEqual(active);
    expect(active.finalizedAt).toBeInstanceOf(Date);
    expect(active.finalizedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(active.finalizedAt!.getTime()).toBeLessThanOrEqual(Date.now());
    expect(active.revisionOfId).toBeNull();
    expect((await snapshot()).finalizedAt).toBeNull();
  });

  it('draft_revision_preserves_source_content', async () => {
    const before = await snapshot();
    const result = await scoped(() =>
      service.createFromDraft(owner, dto, previousId),
    );
    expect(result).toMatchObject({
      clientId,
      revisionOfId: previousId,
      finalizedAt: expect.any(Date) as unknown,
      client: { id: clientId },
      splits: [
        {
          name: 'A',
          exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
        },
      ],
    });
    expect(await snapshot()).toEqual({
      ...before,
      isActive: false,
      updatedAt: expect.any(Date) as unknown,
    });
    expect(
      await prisma.workout.count({ where: { creatorId: owner.sub } }),
    ).toBe(2);
    expect((await snapshot(otherPlanId)).isActive).toBe(true);
  });

  it.each([false, true])(
    'cannot_delete_client_prescription_or_legacy_history (finalized=%s)',
    async (finalized) => {
      const id = finalized
        ? (await scoped(() => service.createFromDraft(owner, dto, null))).id
        : previousId;
      const before = await snapshot(id);
      const count = await prisma.workout.count({
        where: { creatorId: owner.sub },
      });
      await expect(
        scoped(() => service.remove(owner, id)),
      ).rejects.toMatchObject({ status: 409 });
      expect(await snapshot(id)).toEqual(before);
      expect(
        await prisma.workout.count({ where: { creatorId: owner.sub } }),
      ).toBe(count);
    },
  );

  it('rejects source from another account without changing either prescription', async () => {
    const before = await snapshot();
    const foreign = await snapshot(otherPlanId);
    await expect(
      scoped(() => service.createFromDraft(owner, dto, otherPlanId)),
    ).rejects.toMatchObject({ status: 404 });
    expect(await snapshot()).toEqual(before);
    expect(await snapshot(otherPlanId)).toEqual(foreign);
    expect(
      await prisma.workout.count({ where: { creatorId: owner.sub } }),
    ).toBe(1);
  });

  it('rejects source belonging to another Client of the same account', async () => {
    await prisma.client.create({
      data: {
        id: siblingClientId,
        name: 'Sibling fixture',
        professionalId: owner.sub,
      },
    });
    const sibling = await prisma.workout.create({
      data: {
        title: 'Sibling source',
        creatorId: owner.sub,
        clientId: siblingClientId,
      },
    });
    const before = await snapshot();
    await expect(
      scoped(() => service.createFromDraft(owner, dto, sibling.id)),
    ).rejects.toMatchObject({ status: 404 });
    expect(await snapshot()).toEqual(before);
    expect(
      await prisma.workout.count({ where: { creatorId: owner.sub } }),
    ).toBe(2);
  });

  it('rolls back the revision when the outer clinical operation fails after creation', async () => {
    const before = await snapshot();
    const failure = new Error('Synthetic failure after creating prescription');
    await expect(
      scoped(async () => {
        const detail = await service.createFromDraft(owner, dto, previousId);
        expect(detail.clientId).toBe(clientId);
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(await snapshot()).toEqual(before);
    expect(
      await prisma.workout.count({ where: { creatorId: owner.sub } }),
    ).toBe(1);
  });

  it('nested_failure_preserves_previous_active', async () => {
    const invalid = {
      ...dto,
      splits: [
        {
          name: 'A',
          exercises: [
            {
              name: 'Agachamento',
              sets: undefined as unknown as string,
              reps: '10',
            },
          ],
        },
      ],
    };
    const before = await snapshot();
    await expect(
      scoped(() => service.create(owner, invalid)),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError);
    expect(await snapshot()).toEqual(before);
    await expect(
      scoped(() => service.createFromDraft(owner, invalid, previousId)),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError);
    expect(await snapshot()).toEqual(before);
    expect(
      await prisma.workout.findUnique({
        where: { id: previousId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    expect(
      await prisma.workout.findUnique({
        where: { id: otherPlanId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    expect(
      await prisma.workout.count({ where: { creatorId: owner.sub } }),
    ).toBe(1);
  });

  it('replaces only the owned Client plan and stores the nested exercises', async () => {
    await scoped(() => service.create(owner, dto));
    expect(
      await prisma.workout.findUnique({
        where: { id: previousId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });
    expect(
      await prisma.workout.findUnique({
        where: { id: otherPlanId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    const active = await prisma.workout.findFirstOrThrow({
      where: { clientId, creatorId: owner.sub, isActive: true },
      include: { splits: { include: { exercises: true } } },
    });
    expect(active.userId).toBeNull();
    expect(active.splits[0].exercises[0]).toMatchObject({
      name: 'Agachamento',
      sets: '3',
      reps: '10',
    });
  });
});
