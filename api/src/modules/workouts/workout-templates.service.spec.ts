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
            source: 'CUSTOM',
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
    const customRow = {
      id,
      name: 'Exercise',
      muscleGroup: 'CHEST',
      equipment: null,
      notes: 'Atual',
      videoUrl: 'https://vimeo.com/222',
      mediaVersion: 2,
    };
    const prisma = {
      customExercise: {
        findFirst: jest.fn().mockResolvedValue(customRow),
        findMany: jest.fn().mockResolvedValue([customRow]),
      },
      workoutTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
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
    const library = new ExerciseLibraryService(
      prisma as unknown as PrismaService,
    );
    const service = new WorkoutTemplatesService(
      prisma as unknown as PrismaService,
      access as unknown as ClientAccessService,
      drafts as unknown as WorkoutDraftsService,
      library,
    );
    return { prisma, access, drafts, library, service };
  }
  it('imports a deep copy through drafts.create with current authorized media and untouched textual prescriptions', async () => {
    const { service, prisma, drafts } = setup();
    prisma.workoutTemplate.findFirst.mockResolvedValue({
      id,
      professionalId: null,
      goal: 'MUSCLE_GAIN',
      content,
      schemaVersion: 3,
    });
    await service.createDraft(user, id, { clientId: id });
    expect(prisma.customExercise.findMany).toHaveBeenCalledTimes(1);
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
  it('refreshes repeated custom references across splits with one authorized batch', async () => {
    const { service, prisma, drafts } = setup();
    const secondId = '74000000-0000-4000-8000-000000000003';
    const savedContent = structuredClone(content);
    savedContent.splits.push(structuredClone(savedContent.splits[0]));
    savedContent.splits[1].exercises.push({
      ...structuredClone(savedContent.splits[0].exercises[0]),
      libraryReference: {
        source: 'CUSTOM',
        exerciseId: secondId,
        demonstrationRevision: '1',
      },
    });
    const rows = [
      {
        id: secondId,
        name: 'Segundo',
        muscleGroup: 'CHEST',
        equipment: null,
        notes: null,
        videoUrl: null,
        mediaVersion: 4,
      },
      {
        id,
        name: 'Exercise',
        muscleGroup: 'CHEST',
        equipment: null,
        notes: null,
        videoUrl: 'https://vimeo.com/222',
        mediaVersion: 2,
      },
    ];
    prisma.customExercise.findMany.mockResolvedValue(rows);
    prisma.customExercise.findFirst.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(rows.find((row) => row.id === where.id)),
    );
    prisma.workoutTemplate.findFirst.mockResolvedValue({
      id,
      goal: 'STRENGTH',
      content: savedContent,
      schemaVersion: 3,
    });
    await service.createDraft(user, id, { clientId: id });
    const [, importedDraft] = drafts.create.mock.calls[0] as [
      unknown,
      { content: typeof savedContent },
    ];
    const imported = importedDraft.content;
    expect(
      imported.splits.map((split) =>
        split.exercises.map(
          (exercise) => exercise.libraryReference.demonstrationRevision,
        ),
      ),
    ).toEqual([['2'], ['2', null]]);
    expect(prisma.customExercise.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.customExercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { professionalId: user.sub, id: { in: [id, secondId] } },
      }),
    );
    expect(prisma.customExercise.findFirst).not.toHaveBeenCalled();
    expect(
      savedContent.splits[1].exercises[1].libraryReference
        .demonstrationRevision,
    ).toBe('1');
  });
  it.each([
    { name: 'catalog before custom', ids: ['cat-chest-99', id], queries: 0 },
    { name: 'custom before catalog', ids: [id, 'cat-chest-99'], queries: 1 },
  ])(
    'keeps unavailable references atomic and ordered: $name',
    async ({ ids, queries }) => {
      const { service, prisma, drafts } = setup();
      const savedContent = structuredClone(content);
      savedContent.splits[0].exercises = ids.map((exerciseId) => ({
        ...structuredClone(content.splits[0].exercises[0]),
        libraryReference: {
          source: exerciseId.startsWith('cat-') ? 'CATALOG' : 'CUSTOM',
          exerciseId,
          demonstrationRevision: '1',
        },
      }));
      prisma.workoutTemplate.findFirst.mockResolvedValue({
        id,
        goal: 'STRENGTH',
        content: savedContent,
        schemaVersion: 3,
      });
      prisma.customExercise.findMany.mockResolvedValue([]);
      await expect(
        service.createDraft(user, id, { clientId: id }),
      ).rejects.toMatchObject({
        status: 409,
        response: { code: 'TEMPLATE_REFERENCE_UNAVAILABLE' },
      });
      expect(prisma.customExercise.findMany).toHaveBeenCalledTimes(queries);
      expect(drafts.create).not.toHaveBeenCalled();
      expect(
        savedContent.splits[0].exercises[0].libraryReference
          .demonstrationRevision,
      ).toBe('1');
    },
  );
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
      const snapshot = { id, goal, content: savedContent, schemaVersion: 3 };
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
    const { service, prisma, drafts } = setup();
    prisma.workoutTemplate.findFirst.mockResolvedValue({
      id,
      content,
      schemaVersion: 3,
    });
    prisma.customExercise.findFirst.mockResolvedValue(null);
    prisma.customExercise.findMany.mockResolvedValue([]);
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
});
