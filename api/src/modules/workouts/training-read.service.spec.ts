import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { ClinicalResponseValidator } from '../../common/clinical-context/clinical-response.validator';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { TrainingReadService } from './training-read.service';

describe('Training read contracts', () => {
  const user: AuthUser = { sub: 'personal-1', role: 'PERSONAL' };
  const students = Array.from({ length: 7 }, (_, index) => ({
    id: `student-${index + 1}`,
    professionalId: user.sub,
    name: `Aluno ${index + 1}`,
    status: 'ACTIVE',
    goal: index === 0 ? null : 'Força',
    updatedAt: new Date('2026-10-14T12:00:00Z'),
  }));
  const clients = [
    ...students,
    { ...students[0], id: 'archived', status: 'ARCHIVED' },
    { ...students[0], id: 'foreign', professionalId: 'personal-2' },
  ];
  const workouts = [
    {
      id: 'active',
      clientId: 'student-1',
      creatorId: user.sub,
      isActive: true,
      isTemplate: true,
    },
    {
      id: 'duplicate',
      clientId: 'student-1',
      creatorId: user.sub,
      isActive: true,
      isTemplate: true,
    },
    {
      id: 'foreign-creator',
      clientId: 'student-2',
      creatorId: 'personal-2',
      isActive: true,
      isTemplate: false,
    },
    {
      id: 'standalone',
      clientId: null,
      creatorId: user.sub,
      isActive: true,
      isTemplate: true,
    },
  ];
  const ownedClient = { ...students[0], status: 'ARCHIVED' };
  const plan = {
    id: 'previous-workout',
    clientId: 'student-1',
    title: 'Ficha anterior',
    goal: null,
    durationWeeks: 4,
    isActive: false,
    isTemplate: false,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-02T12:00:00Z'),
    finalizedAt: null,
    revisionOfId: null,
    notes: 'Nota da ficha',
    client: { id: 'student-1', name: 'Aluno 1', status: 'ARCHIVED' },
    splits: [
      {
        id: 'split-1',
        name: 'A',
        focus: null,
        position: 0,
        exercises: [
          {
            id: 'exercise-1',
            name: 'Agachamento',
            sets: '3',
            reps: '8',
            rest: '60s',
            notes: null,
            position: 0,
            muscleGroup: 'QUADRICEPS' as const,
            load: '60 kg',
            effortType: 'RIR' as const,
            effortTarget: '2',
            tempo: '3-0-1-0',
            method: 'STANDARD' as const,
          },
        ],
      },
    ],
  };
  const activePlan = {
    finalizedAt: new Date('2026-10-14T12:00:00Z'),
    revisionOfId: 'previous-workout',
    id: 'active-workout',
    clientId: 'student-1',
    title: 'Ficha ativa',
    goal: 'Força',
    durationWeeks: 4,
    isActive: true,
    createdAt: new Date('2026-10-14T12:00:00Z'),
    updatedAt: new Date('2026-10-14T12:00:00Z'),
  };
  const emptyAssessmentMeasurements = {
    weight: null,
    bodyFat: null,
    muscleMass: null,
    waist: null,
    abdomen: null,
    hips: null,
    thorax: null,
    armLeft: null,
    armRight: null,
    thighLeft: null,
    thighRight: null,
    calfLeft: null,
    calfRight: null,
    skinfoldTriceps: null,
    skinfoldSubscapular: null,
    skinfoldChest: null,
    skinfoldAxillary: null,
    skinfoldSuprailiac: null,
    skinfoldAbdominal: null,
    skinfoldThigh: null,
    squat1RM: null,
    deadlift1RM: null,
    vo2Max: null,
    notes: null,
  };
  const prisma = {
    client: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    workout: { findFirst: jest.fn(), count: jest.fn() },
    physicalAssessment: { findMany: jest.fn() },
    dietPlan: { findFirst: jest.fn() },
    labExam: { findMany: jest.fn() },
    physioAssessment: { findFirst: jest.fn() },
    rehabPlan: { findFirst: jest.fn() },
    dailyTracking: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const access = new ClientAccessService(prisma as unknown as PrismaService);
  const service = new TrainingReadService(
    prisma as unknown as PrismaService,
    access,
  );

  // Simula apenas os filtros do delegate; expectativas são fixtures literais.
  const matchingClients = (where: Prisma.ClientWhereInput) =>
    clients.filter((client) => {
      if (
        client.professionalId !== where.professionalId ||
        client.status !== where.status
      )
        return false;
      const none = where.workouts?.none;
      return (
        !none ||
        !workouts.some(
          (workout) =>
            workout.clientId === client.id &&
            workout.creatorId === none.creatorId &&
            workout.isActive === none.isActive &&
            (none.isTemplate === undefined ||
              workout.isTemplate === none.isTemplate),
        )
      );
    });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.client.count.mockImplementation(
      ({ where }: { where: Prisma.ClientWhereInput }) =>
        Promise.resolve(matchingClients(where).length),
    );
    prisma.client.findMany.mockImplementation(
      ({ where, take }: { where: Prisma.ClientWhereInput; take: number }) =>
        Promise.resolve(
          matchingClients(where)
            .sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, take)
            .map(({ id, name, goal, updatedAt }) => ({
              id,
              name,
              goal,
              updatedAt,
            })),
        ),
    );
    prisma.client.findFirst.mockResolvedValue(ownedClient);
    prisma.workout.findFirst.mockImplementation(
      ({ select }: { select: Prisma.WorkoutSelect }) =>
        Promise.resolve(
          select.splits
            ? plan
            : select.title
              ? activePlan
              : { id: plan.id, clientId: plan.clientId },
        ),
    );
    prisma.physicalAssessment.findMany.mockImplementation(
      ({ take }: { take: number }) =>
        Promise.resolve(
          [
            {
              ...emptyAssessmentMeasurements,
              id: 'assessment-3',
              clientId: 'student-1',
              date: new Date('2026-10-14'),
              benchPress1RM: 50,
              weight: null,
              notes: null,
            },
            {
              ...emptyAssessmentMeasurements,
              id: 'assessment-2',
              clientId: 'student-1',
              date: new Date('2026-10-13'),
              benchPress1RM: 40,
              weight: null,
              notes: null,
            },
            {
              ...emptyAssessmentMeasurements,
              id: 'assessment-1',
              clientId: 'student-1',
              date: new Date('2026-10-12'),
              benchPress1RM: 30,
              weight: null,
              notes: null,
            },
          ].slice(0, take),
        ),
    );
  });

  it('counts_students_not_workouts', async () => {
    const result = await service.getWorkspace(user);
    expect(result.counts).toEqual({
      activeStudents: 7,
      archivedStudents: 1,
      withoutActiveWorkout: 6,
    });
    expect(prisma.workout.count).not.toHaveBeenCalled();
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
  });

  it('limits_each_preview_to_five', async () => {
    const result = await service.getWorkspace(user);
    expect(result.items.filter((row) => row.section === 'RECENT')).toHaveLength(
      5,
    );
    expect(
      result.items.filter((row) => row.section === 'WITHOUT_ACTIVE_WORKOUT'),
    ).toHaveLength(5);
    expect(result.items).toHaveLength(10);
    expect(
      result.items.filter((row) => row.clientId === 'student-2'),
    ).toHaveLength(2);
    expect(result.items.map((row) => row.clientId)).not.toContain('foreign');
    expect(prisma.client.findMany).toHaveBeenCalledTimes(2);
    for (const [query] of prisma.client.findMany.mock.calls) {
      expect(query).toMatchObject({
        take: 5,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      });
      expect(query).toMatchObject({
        select: { id: true, name: true, goal: true, updatedAt: true },
      });
    }
    const validator = new ClinicalResponseValidator({} as PrismaService);
    expect(validator.extract({ shape: 'resource-page' }, result)).toHaveLength(
      10,
    );
  });

  it('keeps_legacy_template_workout_active', async () => {
    const result = await service.getWorkspace(user);
    expect(result.counts.withoutActiveWorkout).toBe(6);
    expect(
      result.items
        .filter((row) => row.section === 'WITHOUT_ACTIVE_WORKOUT')
        .map((row) => row.clientId),
    ).not.toContain('student-1');
    await service.getClientOverview(user, 'student-1');
    expect(prisma.workout.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'student-1', creatorId: user.sub, isActive: true },
      }),
    );
  });

  it('denies_foreign_client_before_aggregates', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(
      service.getClientOverview(user, 'foreign'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.findMany).not.toHaveBeenCalled();
  });

  it('resolves ownership before querying the overview and limits assessments to two', async () => {
    let resolveClient!: (client: typeof ownedClient) => void;
    prisma.client.findFirst.mockReturnValue(
      new Promise((resolve) => {
        resolveClient = resolve;
      }),
    );
    const pending = service.getClientOverview(user, 'student-1');
    await Promise.resolve();
    expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.findMany).not.toHaveBeenCalled();
    resolveClient(ownedClient);
    const result = await pending;
    expect(result.client).toEqual({ id: 'student-1', status: 'ARCHIVED' });
    expect(result.recentAssessments).toHaveLength(2);
    expect(result.recentAssessments.map((row) => row.id)).toEqual([
      'assessment-3',
      'assessment-2',
    ]);
    expect(prisma.physicalAssessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'student-1', client: { professionalId: user.sub } },
        take: 2,
        orderBy: [{ date: 'desc' }, { id: 'asc' }],
      }),
    );
    expect(result.activeWorkout).toMatchObject({
      id: 'active-workout',
      clientId: 'student-1',
    });
    expect(result.activeWorkout).not.toHaveProperty('splits');
    expect(result.activeWorkout).not.toHaveProperty('notes');
    expect(prisma.workout.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          clientId: true,
          title: true,
          goal: true,
          durationWeeks: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
          finalizedAt: true,
          revisionOfId: true,
        },
      }),
    );
    expect(
      new ClinicalResponseValidator({} as PrismaService).extract(
        { shape: 'overview' },
        result,
      ),
    ).toEqual(['student-1']);
  });

  it('represents an empty overview explicitly', async () => {
    prisma.workout.findFirst.mockResolvedValue(null);
    prisma.physicalAssessment.findMany.mockResolvedValue([]);
    expect(await service.getClientOverview(user, 'student-1')).toEqual({
      client: { id: 'student-1', status: 'ARCHIVED' },
      activeWorkout: null,
      recentAssessments: [],
    });
  });

  it('opens_selected_workout_and_omits_foreign_records', async () => {
    const result = await service.getWorkout(user, 'previous-workout');
    expect(result).toEqual(plan);
    expect(result).toMatchObject({ finalizedAt: null, revisionOfId: null });
    expect(prisma.workout.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          finalizedAt: true,
          revisionOfId: true,
        }) as unknown,
      }),
    );
    expect(result.isActive).toBe(false);
    expect(prisma.workout.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: 'previous-workout',
          creatorId: user.sub,
          client: { professionalId: user.sub },
        },
        select: { id: true, clientId: true },
      }),
    );
    expect(prisma.workout.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          id: 'previous-workout',
          clientId: 'student-1',
          creatorId: user.sub,
          client: { professionalId: user.sub },
        },
      }),
    );
    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'student-1', professionalId: user.sub },
    });
    expect(
      new ClinicalResponseValidator({} as PrismaService).extract(
        { shape: 'resource' },
        result,
      ),
    ).toEqual(['student-1']);
  });

  it.each([null, { id: 'standalone', clientId: null }])(
    'denies unavailable or standalone workouts %j',
    async (record) => {
      prisma.workout.findFirst.mockResolvedValue(record);
      await expect(service.getWorkout(user, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.workout.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
    },
  );

  it('denies a foreign associated Client before fetching workout content', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(
      service.getWorkout(user, 'previous-workout'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workout.findFirst).toHaveBeenCalledTimes(1);
  });

  it('never_queries_other_domains', async () => {
    await service.getWorkspace(user);
    await service.getClientOverview(user, 'student-1');
    await service.getWorkout(user, 'previous-workout');
    expect(prisma.dietPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.labExam.findMany).not.toHaveBeenCalled();
    expect(prisma.physioAssessment.findFirst).not.toHaveBeenCalled();
    expect(prisma.rehabPlan.findFirst).not.toHaveBeenCalled();
    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'PATIENT', 'NUTRITIONIST', 'PHYSIO'] as const)(
    'denies %s before queries',
    async (role) => {
      const denied = { ...user, role };
      await expect(service.getWorkspace(denied)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.getClientOverview(denied, 'student-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getWorkout(denied, 'previous-workout'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.client.count).not.toHaveBeenCalled();
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
      expect(prisma.workout.findFirst).not.toHaveBeenCalled();
    },
  );
});
