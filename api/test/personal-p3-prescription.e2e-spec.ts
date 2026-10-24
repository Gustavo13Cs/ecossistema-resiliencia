import { PrismaService } from '../src/infra/database/prisma.service';
import { ClientAccessService } from '../src/common/client-access/client-access.service';
import { WorkoutsService } from '../src/modules/workouts/workouts.service';
import { WorkoutDraftsService } from '../src/modules/workouts/workout-drafts.service';
import { TrainingReadService } from '../src/modules/workouts/training-read.service';
import { suggestPeriodization } from '../src/modules/workouts/workout-periodization';
import { testAdminPrisma } from './fixtures/test-admin';
import type { WeeklyVolumeSummary } from '../src/modules/workouts/workout-p3.types';

describe('Personal P3 persisted prescription (synthetic PostgreSQL)', () => {
  const owner = {
    sub: '73000000-0000-4000-8000-000000000001',
    role: 'PERSONAL' as const,
    sessionId: 'synthetic-p3',
  };
  const clientId = '73000000-0000-4000-8000-000000000002';
  let admin: PrismaService;
  let clinical: PrismaService;
  let drafts: WorkoutDraftsService;
  let reads: TrainingReadService;
  const scoped = <T>(operation: () => Promise<T>) =>
    clinical.runAsProfessional(owner, 'synthetic-p3-request', operation);
  beforeAll(async () => {
    admin = testAdminPrisma();
    clinical = new PrismaService();
    await clinical.onModuleInit();
    const access = new ClientAccessService(clinical);
    const workouts = new WorkoutsService(clinical, access);
    drafts = new WorkoutDraftsService(clinical, access, workouts);
    reads = new TrainingReadService(clinical, access);
    await admin.user.create({
      data: {
        id: owner.sub,
        name: 'Synthetic P3',
        email: 'p3-prescription@synthetic.invalid',
        password: 'unused',
        role: 'PERSONAL',
      },
    });
    await admin.client.create({
      data: {
        id: clientId,
        professionalId: owner.sub,
        name: 'Synthetic P3 Client',
      },
    });
  });
  afterAll(async () => {
    if (admin) {
      await admin.workoutDraft.deleteMany({
        where: { professionalId: owner.sub },
      });
      await admin.workout.deleteMany({ where: { creatorId: owner.sub } });
      await admin.client.deleteMany({ where: { id: clientId } });
      await admin.user.deleteMany({ where: { id: owner.sub } });
      await admin.$disconnect();
    }
    await clinical?.$disconnect();
  });
  it('saves V3, finalizes authoritative volume, projects deload and copies metadata into revision', async () => {
    const content = {
      title: 'P3 real',
      durationWeeks: 8,
      periodization: {
        ...suggestPeriodization(8),
        startsOn: '2026-10-23',
        progression: { intervalWeeks: 2, repsDelta: 1, effortDelta: 1 },
      },
      splits: [
        {
          name: 'A',
          weeklyFrequency: 2,
          exercises: [
            {
              name: 'Supino',
              sets: '4',
              reps: '6-8',
              muscleGroup: 'CHEST' as const,
              secondaryMuscles: [{ muscleGroup: 'TRICEPS', weight: 0.5 }],
            },
          ],
        },
      ],
    };
    const draft = await scoped(() =>
      drafts.create(owner, { clientId, content }),
    );
    expect(draft.schemaVersion).toBe(3);
    const reopened = await scoped(() => drafts.get(owner, draft.id));
    expect(reopened.content).toMatchObject(content);
    const finalized = await scoped(() =>
      drafts.finalize(owner, draft.id, { expectedVersion: draft.version }),
    );
    const saved = await admin.workout.findFirstOrThrow({
      where: { id: finalized.finalizedWorkoutId },
    });
    const volume = saved.weeklyVolumeSnapshot as unknown as WeeklyVolumeSummary;
    expect(volume.algorithmVersion).toBe(1);
    expect(volume.complete).toBe(true);
    expect(volume.rows.find((row) => row.muscleGroup === 'CHEST')).toEqual({
      muscleGroup: 'CHEST',
      direct: 8,
      synergistic: 0,
      total: 8,
      landmark: 'MEV',
    });
    const read = await scoped(() => reads.getWorkout(owner, saved.id, 8));
    expect(read.weekProjection).toMatchObject({
      week: 8,
      phase: { type: 'DELOAD' },
      exercises: [{ sets: '2', reps: '6-8', effortTarget: '4-5' }],
    });
    expect(read.splits[0].exercises[0].sets).toBe('4');
    await expect(
      scoped(() => reads.getWorkout(owner, saved.id, 9)),
    ).rejects.toMatchObject({ status: 400 });
    const revision = await scoped(() =>
      drafts.create(owner, { clientId, sourceWorkoutId: saved.id }),
    );
    expect(revision.content).toMatchObject(content);
    expect(
      (await admin.workout.findFirstOrThrow({ where: { id: saved.id } }))
        .weeklyVolumeSnapshot,
    ).toEqual(saved.weeklyVolumeSnapshot);
  });
});
