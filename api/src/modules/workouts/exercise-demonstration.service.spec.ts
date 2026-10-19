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
import { LibraryReference } from './exercise-demonstration.types';
import { findCatalogDemonstration } from './exercise-demonstration';
const user = { sub: 'owner', role: 'PERSONAL' as const };
const reference: LibraryReference = {
  source: 'CUSTOM',
  exerciseId: '91000000-0000-4000-8000-000000000001',
  demonstrationRevision: '1',
};
describe('ExerciseDemonstrationService', () => {
  const findFirst = jest.fn();
  const service = new ExerciseDemonstrationService({
    customExercise: { findFirst },
  } as unknown as PrismaService);
  beforeEach(() => findFirst.mockReset());
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
