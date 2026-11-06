import { NotFoundException } from '@nestjs/common';
import { WorkoutTemplatesService } from './workout-templates.service';
import { PrismaService } from '../../infra/database/prisma.service';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { WorkoutDraftsService } from './workout-drafts.service';
import { ExerciseLibraryService } from './exercise-library.service';

const user = {
  sub: '74000000-0000-4000-8000-000000000001',
  role: 'PERSONAL' as const,
};
const id = '74000000-0000-4000-8000-000000000002';
const content = {
  title: 'Base',
  goal: '',
  durationWeeks: 8,
  notes: '',
  splits: [
    {
      name: 'A',
      focus: '',
      exercises: [
        {
          name: 'Exercise',
          sets: '3+2',
          reps: 'AMRAP',
          rest: '60s',
          notes: '',
          muscleGroup: null,
          load: '',
          effortType: null,
          effortTarget: '',
          tempo: '',
          method: null,
          libraryReference: {
            source: 'CUSTOM' as const,
            exerciseId: id,
            demonstrationRevision: '1',
          },
        },
      ],
    },
  ],
};

describe('WorkoutTemplatesService', () => {
  function setup() {
    const prisma = {
      workoutTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
      workout: { findFirst: jest.fn() },
      client: { findFirst: jest.fn() },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    const access = { getOwnedClient: jest.fn() };
    const drafts = {
      create: jest.fn().mockResolvedValue({ id: 'draft', clientId: id }),
    };
    const library = {
      get: jest.fn().mockResolvedValue({
        source: 'CUSTOM',
        mediaVersion: 2,
        demonstration: { revision: '2' },
      }),
    };
    const service = new WorkoutTemplatesService(
      prisma as unknown as PrismaService,
      access as unknown as ClientAccessService,
      drafts as unknown as WorkoutDraftsService,
      library as unknown as ExerciseLibraryService,
    );
    return { prisma, access, drafts, library, service };
  }

  it('imports a deep copy through drafts.create with current authorized media and untouched textual prescriptions', async () => {
    const { service, prisma, drafts, library } = setup();
    prisma.workoutTemplate.findFirst.mockResolvedValue({
      id,
      professionalId: null,
      archivedAt: null,
      goal: 'MUSCLE_GAIN',
      content,
      schemaVersion: 3,
    });
    await service.createDraft(user, id, { clientId: id });
    expect(library.get).toHaveBeenCalledWith(user, id);
    const expected = structuredClone(content);
    expected.goal = 'Hipertrofia';
    expected.splits[0].exercises[0].libraryReference.demonstrationRevision =
      '2';
    expect(drafts.create).toHaveBeenCalledWith(user, {
      clientId: id,
      content: expected,
    });
    expect(
      content.splits[0].exercises[0].libraryReference.demonstrationRevision,
    ).toBe('1');
  });

  it.each([
    ['MUSCLE_GAIN', 'Hipertrofia'],
    ['STRENGTH', 'Força'],
    ['WEIGHT_LOSS', 'Emagrecimento'],
    ['CONDITIONING', 'Condicionamento'],
  ])(
    'imports %s as %s without mutating the template snapshot',
    async (goal, label) => {
      const { service, prisma, drafts } = setup();
      const savedContent = { ...structuredClone(content), goal };
      const snapshot = {
        id,
        archivedAt: null,
        goal,
        content: savedContent,
        schemaVersion: 3,
      };
      const before = structuredClone(snapshot);
      prisma.workoutTemplate.findFirst.mockResolvedValue(snapshot);
      await service.createDraft(user, id, { clientId: id });
      const expected = structuredClone(savedContent);
      expected.goal = label;
      expected.splits[0].exercises[0].libraryReference.demonstrationRevision =
        '2';
      expect(drafts.create).toHaveBeenCalledWith(user, {
        clientId: id,
        content: expected,
      });
      expect(snapshot).toEqual(before);
    },
  );

  it('fails atomically on an inaccessible reference and never calls the draft service', async () => {
    const { service, prisma, drafts, library } = setup();
    prisma.workoutTemplate.findFirst.mockResolvedValue({
      id,
      archivedAt: null,
      content,
      schemaVersion: 3,
    });
    library.get.mockRejectedValue(new NotFoundException());
    await expect(
      service.createDraft(user, id, { clientId: id }),
    ).rejects.toMatchObject({ status: 409 });
    expect(drafts.create).not.toHaveBeenCalled();
  });

  it('blocks importing an archived template until restored', async () => {
    const { service, prisma, drafts } = setup();
    prisma.workoutTemplate.findFirst.mockResolvedValue({
      id,
      professionalId: user.sub,
      archivedAt: new Date('2026-11-06T12:00:00Z'),
      goal: 'MUSCLE_GAIN',
      content,
      schemaVersion: 3,
    });
    await expect(
      service.createDraft(user, id, { clientId: id }),
    ).rejects.toMatchObject({ status: 409 });
    expect(drafts.create).not.toHaveBeenCalled();
  });

  it('never returns a foreign model or permits a non-PERSONAL caller', async () => {
    const { service, prisma } = setup();
    prisma.workoutTemplate.findFirst.mockResolvedValue(null);
    await expect(service.get(user, id)).rejects.toMatchObject({ status: 404 });
    expect(prisma.workoutTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id,
          OR: [{ professionalId: user.sub }, { professionalId: null }],
        },
      }),
    );
    await expect(
      service.list({ ...user, role: 'NUTRITIONIST' }, {}),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('creates a standalone private template while stripping loads, notes, focus and startsOn', async () => {
    const { service, prisma } = setup();
    const now = new Date('2026-11-06T15:00:00Z');
    prisma.workoutTemplate.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id,
        ...data,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const created = await service.create(user, {
      title: '  Upper/Lower Condomínio  ',
      description: '  Foco em halteres e cabos  ',
      goal: 'MUSCLE_GAIN',
      level: 'INTERMEDIATE',
      targetAudience: 'Adultos ocupados',
      environment: 'CONDO_GYM',
      content: {
        title: 'Ignored title',
        goal: 'Sensitive goal',
        durationWeeks: 6,
        notes: 'Nota privada que não deve ir ao modelo',
        splits: [
          {
            name: 'Upper',
            focus: 'Foco sensível',
            weeklyFrequency: 2,
            exercises: [
              {
                name: 'Supino reto com halteres',
                sets: '4',
                reps: '8-10',
                rest: '90s',
                load: '32 kg',
                notes: 'Dor leve no ombro',
                muscleGroup: 'CHEST',
              },
            ],
          },
        ],
      },
    });
    expect(created).toMatchObject({
      id,
      title: 'Upper/Lower Condomínio',
      description: 'Foco em halteres e cabos',
      environment: 'CONDO_GYM',
      estimatedWeeks: 6,
      isGlobal: false,
      archivedAt: null,
    });
    expect(created).not.toHaveProperty('professionalId');
    expect(created.content).toMatchObject({
      title: 'Upper/Lower Condomínio',
      goal: 'MUSCLE_GAIN',
      notes: '',
      splits: [
        {
          name: 'Upper',
          focus: '',
          weeklyFrequency: 2,
          exercises: [
            {
              name: 'Supino reto com halteres',
              load: '',
              notes: '',
            },
          ],
        },
      ],
    });
  });

  it('updates, duplicates, archives and restores only private templates, returning 404 on global/foreign mutation', async () => {
    const { service, prisma } = setup();
    const now = new Date('2026-11-06T15:00:00Z');
    // Global/foreign template returns null on ownedPrivate lookup (where: { id, professionalId: user.sub })
    prisma.workoutTemplate.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.update(user, id, { title: 'Mutate global' }),
    ).rejects.toMatchObject({ status: 404 });

    prisma.workoutTemplate.findFirst.mockResolvedValueOnce(null);
    await expect(service.archive(user, id)).rejects.toMatchObject({
      status: 404,
    });

    // Duplicating a global template creates a private editable copy
    prisma.workoutTemplate.findFirst.mockResolvedValueOnce({
      id,
      professionalId: null,
      title: 'PPL 3x',
      description: 'Base global',
      goal: 'MUSCLE_GAIN',
      level: 'INTERMEDIATE',
      targetAudience: null,
      environment: 'FULL_GYM',
      estimatedWeeks: 8,
      schemaVersion: 3,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      content,
    });
    prisma.workoutTemplate.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: '74000000-0000-4000-8000-000000000099',
        ...data,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const copy = await service.duplicate(user, id, {});
    expect(copy).toMatchObject({
      title: 'Cópia de PPL 3x',
      isGlobal: false,
      archivedAt: null,
      environment: 'FULL_GYM',
    });
  });
});
