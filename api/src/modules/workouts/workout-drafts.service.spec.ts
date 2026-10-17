import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { normalizeDraftContent } from './workout-draft-content';
import { WorkoutDraftsService } from './workout-drafts.service';
import { WorkoutsService } from './workouts.service';
const user: AuthUser = { sub: randomUUID(), role: 'PERSONAL' };
const clientId = randomUUID();
const sourceId = randomUUID();
const content = normalizeDraftContent({
  title: 'Saved',
  splits: [
    { name: 'A', exercises: [{ name: 'Squat', sets: '3', reps: '10' }] },
  ],
});
describe('WorkoutDraftsService', () => {
  let service: WorkoutDraftsService;
  let row: Record<string, unknown>;
  let activeId: string | null;
  let tx: {
    $queryRaw: jest.Mock;
    client: { findFirst: jest.Mock };
    workoutDraft: { findFirst: jest.Mock; update: jest.Mock };
    workout: { findFirst: jest.Mock };
  };
  let workouts: { createFromDraft: jest.Mock };
  const id = randomUUID();
  beforeEach(() => {
    activeId = sourceId;
    row = {
      id,
      professionalId: user.sub,
      clientId,
      status: 'OPEN',
      version: 1,
      schemaVersion: 1,
      content,
      sourceWorkoutId: null,
      baseActiveWorkoutId: sourceId,
      finalizedWorkoutId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: clientId }]),
      client: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: clientId, status: 'ACTIVE' }),
      },
      workoutDraft: {
        findFirst: jest
          .fn()
          .mockImplementation(() => Promise.resolve({ ...row })),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) => {
            row = {
              ...row,
              ...data,
              content:
                data.content === Prisma.DbNull
                  ? null
                  : (data.content ?? row.content),
              version: (row.version as number) + 1,
            };
            return Promise.resolve({ ...row });
          }),
      },
      workout: {
        findFirst: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve(
              activeId ? { id: activeId, clientId, creatorId: user.sub } : null,
            ),
          ),
      },
    };
    const prisma = {
      ...tx,
      $transaction: (fn: (db: typeof tx) => unknown) => fn(tx),
    } as unknown as PrismaService;
    workouts = {
      createFromDraft: jest.fn().mockResolvedValue({
        id: randomUUID(),
        clientId,
        client: { id: clientId, name: 'Synthetic', status: 'ACTIVE' },
      }),
    };
    service = new WorkoutDraftsService(
      prisma,
      {
        getOwnedClient: jest.fn().mockResolvedValue({ id: clientId }),
      } as unknown as ClientAccessService,
      workouts as unknown as WorkoutsService,
    );
  });
  it('save_does_not_replace_active', async () => {
    const saved = await service.update(user, id, {
      expectedVersion: 1,
      content: { title: '', splits: [] },
    });
    expect(saved).toMatchObject({
      version: 2,
      content: { title: '', splits: [] },
      baseActiveWorkoutId: sourceId,
    });
    expect(workouts.createFromDraft).not.toHaveBeenCalled();
    expect(activeId).toBe(sourceId);
  });
  it('stale_version_keeps_server_content', async () => {
    await expect(
      service.update(user, id, {
        expectedVersion: 2,
        content: { title: 'stale', splits: [] },
      }),
    ).rejects.toMatchObject({ response: { code: 'DRAFT_VERSION_CONFLICT' } });
    expect(row.content).toBe(content);
    expect(tx.workoutDraft.update).not.toHaveBeenCalled();
  });
  it('retry_same_finalize_returns_same_workout', async () => {
    const result = await service.finalize(user, id, { expectedVersion: 1 });
    tx.workout.findFirst.mockResolvedValue(result.workout);
    expect(await service.finalize(user, id, { expectedVersion: 1 })).toEqual(
      result,
    );
    expect(result).toMatchObject({
      status: 'FINALIZED',
      version: 2,
      clientId,
      finalizedWorkoutId: result.workout.id,
    });
    expect(workouts.createFromDraft).toHaveBeenCalledTimes(1);
    expect(row.content).toBeNull();
  });
  it('different_finalize_version_conflicts', async () => {
    await service.finalize(user, id, { expectedVersion: 1 });
    await expect(
      service.finalize(user, id, { expectedVersion: 2 }),
    ).rejects.toMatchObject({ response: { code: 'DRAFT_VERSION_CONFLICT' } });
    expect(workouts.createFromDraft).toHaveBeenCalledTimes(1);
  });
  it('rebase_checks_active_again', async () => {
    activeId = randomUUID();
    await expect(
      service.rebase(user, id, {
        expectedVersion: 1,
        expectedActiveWorkoutId: sourceId,
      }),
    ).rejects.toMatchObject({ response: { code: 'ACTIVE_WORKOUT_CHANGED' } });
    expect(row.baseActiveWorkoutId).toBe(sourceId);
    expect(
      await service.rebase(user, id, {
        expectedVersion: 1,
        expectedActiveWorkoutId: activeId,
      }),
    ).toMatchObject({ version: 2, baseActiveWorkoutId: activeId, content });
  });
  it('discard_clears_content_and_retries_only_matching_terminal_version', async () => {
    const ack = await service.discard(user, id, { expectedVersion: 1 });
    expect(ack).toEqual({ id, clientId, status: 'DISCARDED', version: 2 });
    expect(row.content).toBeNull();
    expect(await service.discard(user, id, { expectedVersion: 1 })).toEqual(
      ack,
    );
    await expect(
      service.discard(user, id, { expectedVersion: 2 }),
    ).rejects.toMatchObject({ response: { code: 'DRAFT_VERSION_CONFLICT' } });
    await expect(
      service.finalize(user, id, { expectedVersion: 1 }),
    ).rejects.toMatchObject({ response: { code: 'DRAFT_CLOSED' } });
  });
  it('archive_blocks_every_mutation', async () => {
    tx.client.findFirst.mockResolvedValue({ id: clientId, status: 'ARCHIVED' });
    for (const run of [
      () => service.update(user, id, { expectedVersion: 1, content }),
      () => service.finalize(user, id, { expectedVersion: 1 }),
      () =>
        service.rebase(user, id, {
          expectedVersion: 1,
          expectedActiveWorkoutId: null,
        }),
      () => service.discard(user, id, { expectedVersion: 1 }),
    ])
      await expect(run()).rejects.toMatchObject({
        response: { code: 'CLIENT_ARCHIVED' },
      });
    expect(tx.workoutDraft.update).not.toHaveBeenCalled();
  });
  it('rejects_non_personal_before_database_access', async () => {
    await expect(
      service.get({ ...user, role: 'NUTRITIONIST' }, id),
    ).rejects.toMatchObject({ status: 403 });
    expect(tx.workoutDraft.findFirst).not.toHaveBeenCalled();
  });
  it('invalid_finalization_never_creates_workout', async () => {
    row.content = normalizeDraftContent({ title: '', splits: [] });
    await expect(
      service.finalize(user, id, { expectedVersion: 1 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(workouts.createFromDraft).not.toHaveBeenCalled();
    expect(row.status).toBe('OPEN');
  });
});
