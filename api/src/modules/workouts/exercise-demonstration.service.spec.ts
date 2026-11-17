import {
  assertDraftContentSize,
  normalizeDraftContent,
} from './workout-draft-content';
import {
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ExerciseDemonstrationService } from './exercise-demonstration.service';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  DemonstrationSnapshot,
  LibraryReference,
} from './exercise-demonstration.types';
import { findCatalogDemonstration } from './exercise-demonstration';
const user = { sub: 'owner', role: 'PERSONAL' as const };
const reference: LibraryReference = {
  source: 'CUSTOM',
  exerciseId: '91000000-0000-4000-8000-000000000001',
  demonstrationRevision: '1',
};
describe('ExerciseDemonstrationService', () => {
  const findFirst = jest.fn();
  const findMany = jest.fn();
  const service = new ExerciseDemonstrationService({
    customExercise: { findFirst, findMany },
  } as unknown as PrismaService);
  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset();
  });
  it('preserves exact case when matching exercise identifiers stored as text', async () => {
    const exerciseId = 'abcdef00-0000-4000-8000-000000000001';
    findMany.mockResolvedValue([
      { id: exerciseId, videoUrl: null, mediaVersion: 1, notes: null },
    ]);
    await expect(
      service.resolveWorkoutDemonstrations(user, {
        splits: [
          {
            exercises: [
              {
                libraryReference: {
                  source: 'CUSTOM',
                  exerciseId,
                  demonstrationRevision: null,
                },
              },
              {
                libraryReference: {
                  source: 'CUSTOM',
                  exerciseId: exerciseId.toUpperCase(),
                  demonstrationRevision: null,
                },
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);
  });
  it('batches distinct custom selections while preserving split order and independent snapshots', async () => {
    const second = {
      ...reference,
      exerciseId: '91000000-0000-4000-8000-000000000002',
    };
    const rows = [
      {
        id: second.exerciseId,
        videoUrl: 'https://vimeo.com/222',
        mediaVersion: 1,
        notes: 'Segundo',
      },
      {
        id: reference.exerciseId,
        videoUrl: 'https://vimeo.com/111',
        mediaVersion: 1,
        notes: 'Primeiro',
      },
    ];
    findMany.mockResolvedValue(rows);
    findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(rows.find((row) => row.id === where.id)),
    );
    const resolved = await service.resolveWorkoutDemonstrations(user, {
      splits: [
        { exercises: [{ libraryReference: reference }, {}] },
        {
          exercises: [
            { libraryReference: second },
            { libraryReference: reference },
          ],
        },
      ],
    });
    expect(resolved.splits).toEqual([
      {
        exercises: [
          {
            libraryReference: reference,
            demonstrationSnapshot: {
              revision: '1',
              instruction: 'Primeiro',
              personalVideoUrl: 'https://vimeo.com/111',
            },
          },
          { libraryReference: null, demonstrationSnapshot: null },
        ],
      },
      {
        exercises: [
          {
            libraryReference: second,
            demonstrationSnapshot: {
              revision: '1',
              instruction: 'Segundo',
              personalVideoUrl: 'https://vimeo.com/222',
            },
          },
          {
            libraryReference: reference,
            demonstrationSnapshot: {
              revision: '1',
              instruction: 'Primeiro',
              personalVideoUrl: 'https://vimeo.com/111',
            },
          },
        ],
      },
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        professionalId: user.sub,
        id: { in: [reference.exerciseId, second.exerciseId] },
      },
      select: { id: true, videoUrl: true, notes: true, mediaVersion: true },
    });
    expect(findFirst).not.toHaveBeenCalled();
    const first = resolved.splits[0].exercises[0].demonstrationSnapshot!;
    const duplicate = resolved.splits[1].exercises[1].demonstrationSnapshot!;
    first.instruction = 'Alterado';
    expect(duplicate.instruction).toBe('Primeiro');
  });
  it.each([
    {
      name: 'stale before invalid',
      references: [reference, { ...reference, exerciseId: 'invalid' }],
      status: 409,
      queries: 1,
    },
    {
      name: 'invalid before stale',
      references: [{ ...reference, exerciseId: 'invalid' }, reference],
      status: 400,
      queries: 0,
    },
    {
      name: 'missing before invalid',
      references: [
        { ...reference, exerciseId: '91000000-0000-4000-8000-000000000099' },
        { ...reference, exerciseId: 'invalid' },
      ],
      status: 404,
      queries: 1,
    },
    {
      name: 'unknown catalog before custom',
      references: [
        {
          source: 'CATALOG' as const,
          exerciseId: 'cat-chest-99',
          demonstrationRevision: null,
        },
        reference,
      ],
      status: 404,
      queries: 0,
    },
    {
      name: 'stale before unknown catalog',
      references: [
        reference,
        {
          source: 'CATALOG' as const,
          exerciseId: 'cat-chest-99',
          demonstrationRevision: null,
        },
      ],
      status: 409,
      queries: 1,
    },
  ])(
    'preserves the first error: $name',
    async ({ references, status, queries }) => {
      findMany.mockResolvedValue([
        {
          id: reference.exerciseId,
          videoUrl: 'https://vimeo.com/222',
          mediaVersion: 2,
          notes: null,
        },
      ]);
      await expect(
        service.resolveWorkoutDemonstrations(user, {
          splits: references.map((libraryReference) => ({
            exercises: [{ libraryReference }],
          })),
        }),
      ).rejects.toMatchObject({ status });
      expect(findMany).toHaveBeenCalledTimes(queries);
      expect(findFirst).not.toHaveBeenCalled();
    },
  );
  it('reuses the first authorized snapshot and saved null after deletion without sharing nested objects', async () => {
    const snapshot: DemonstrationSnapshot = {
      revision: '1',
      instruction: 'Salvo',
      assets: [
        {
          id: 'saved',
          type: 'IMAGE',
          url: 'https://example.com/saved.svg',
          alt: 'Salvo',
          sourcePageUrl: 'https://example.com/source',
          author: 'Autor',
          licenseName: 'Licença',
          licenseUrl: 'https://example.com/license',
        },
      ],
    };
    const noMedia = {
      ...reference,
      exerciseId: '91000000-0000-4000-8000-000000000002',
      demonstrationRevision: null,
    };
    const resolved = await service.resolveWorkoutDemonstrations(
      user,
      {
        splits: [
          {
            exercises: [
              { libraryReference: reference },
              { libraryReference: reference },
              { libraryReference: noMedia },
            ],
          },
        ],
      },
      [
        { reference, snapshot },
        {
          reference,
          snapshot: { revision: '1', instruction: 'Não deve substituir' },
        },
        { reference: noMedia, snapshot: null },
      ],
    );
    const [first, duplicate, savedNull] = resolved.splits[0].exercises;
    expect(first.demonstrationSnapshot).toEqual(snapshot);
    expect(duplicate.demonstrationSnapshot).toEqual(snapshot);
    expect(savedNull.demonstrationSnapshot).toBeNull();
    first.demonstrationSnapshot!.assets![0].alt = 'Alterado';
    expect(duplicate.demonstrationSnapshot!.assets![0].alt).toBe('Salvo');
    expect(snapshot.assets![0].alt).toBe('Salvo');
    expect(findMany).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('loads a new revision even when another revision is reusable', async () => {
    findMany.mockResolvedValue([]);
    await expect(
      service.resolveWorkoutDemonstrations(
        user,
        {
          splits: [{ exercises: [{ libraryReference: reference }] }],
        },
        [
          {
            reference: { ...reference, demonstrationRevision: 'previous' },
            snapshot: null,
          },
        ],
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(findMany).toHaveBeenCalledTimes(1);
  });
  it('checks the role before loading custom selections and allows content without references', async () => {
    const denied = { ...user, role: 'NUTRITIONIST' as const };
    await expect(
      service.resolveWorkoutDemonstrations(denied, {
        splits: [{ exercises: [{ libraryReference: reference }] }],
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await service.resolveWorkoutDemonstrations(denied, {
        splits: [{ exercises: [{}] }],
      }),
    ).toEqual({
      splits: [
        {
          exercises: [{ libraryReference: null, demonstrationSnapshot: null }],
        },
      ],
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('persists_server_resolved_snapshot', async () => {
    const snapshot = findCatalogDemonstration('cat-chest-01')!;
    expect(
      await service.resolveDemonstrationReference(
        user,
        {
          source: 'CATALOG',
          exerciseId: 'cat-chest-01',
          demonstrationRevision: snapshot.revision,
        },
        [],
      ),
    ).toEqual(snapshot);
  });
  it('foreign_custom_reference_is_404', async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      service.resolveDemonstrationReference(user, reference, []),
    ).rejects.toThrow(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: reference.exerciseId, professionalId: user.sub },
      }),
    );
  });
  it('stale_new_selection_is_409', async () => {
    findFirst.mockResolvedValue({
      videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      mediaVersion: 2,
      notes: '',
    });
    await expect(
      service.resolveDemonstrationReference(user, reference, []),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'DEMONSTRATION_SELECTION_STALE' },
    });
  });
  it('duplicate_reference_reuses_same_authorized_snapshot', async () => {
    const snapshot = {
      revision: '1',
      instruction: 'saved',
      personalVideoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    };
    for (let i = 0; i < 2; i++)
      expect(
        await service.resolveDemonstrationReference(user, reference, [
          { reference, snapshot },
        ]),
      ).toEqual(snapshot);
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('deleted_custom_item_keeps_existing_authorized_snapshot', async () => {
    const snapshot = {
      revision: '1',
      instruction: 'saved',
      personalVideoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    };
    expect(
      await service.resolveDemonstrationReference(user, reference, [
        { reference, snapshot },
      ]),
    ).toEqual(snapshot);
    expect(findFirst).not.toHaveBeenCalled();
  });
  it('same_revision_for_different_exercise_does_not_authorize_foreign_reference', async () => {
    findFirst.mockResolvedValue(null);
    const authorized = {
      reference: {
        ...reference,
        exerciseId: '91000000-0000-4000-8000-000000000002',
      },
      snapshot: null,
    };
    await expect(
      service.resolveDemonstrationReference(user, reference, [authorized]),
    ).rejects.toThrow(NotFoundException);
  });
  it('saved_null_snapshot_keeps_reference_after_deletion_or_later_link', async () => {
    const noMedia = { ...reference, demonstrationRevision: null };
    findFirst.mockResolvedValue({
      videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      mediaVersion: 2,
    });
    expect(
      await service.resolveDemonstrationReference(user, noMedia, [
        { reference: noMedia, snapshot: null },
      ]),
    ).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
    await expect(
      service.resolveDemonstrationReference(user, noMedia, []),
    ).rejects.toThrow(ConflictException);
  });
});

it('resolved_snapshot_counts_toward_65536_bytes', async () => {
  const service = new ExerciseDemonstrationService({} as PrismaService);
  const reference = {
    source: 'CATALOG' as const,
    exerciseId: 'cat-chest-01',
    demonstrationRevision: findCatalogDemonstration('cat-chest-01')!.revision,
  };
  const content = normalizeDraftContent({
    title: 'x',
    splits: [
      {
        name: 'A',
        exercises: Array.from({ length: 40 }, () => ({
          name: 'Supino',
          sets: '3',
          reps: '10',
          notes: 'x'.repeat(1000),
          libraryReference: reference,
        })),
      },
    ],
  });
  expect(Buffer.byteLength(JSON.stringify(content))).toBeLessThan(65536);
  const resolved = await service.resolveContent(user, content);
  expect(() => assertDraftContentSize(resolved)).toThrow(
    PayloadTooLargeException,
  );
});
