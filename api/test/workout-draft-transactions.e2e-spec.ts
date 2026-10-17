import { randomUUID } from 'node:crypto';
import { ClientAccessService } from '../src/common/client-access/client-access.service';
import { lockOwnedClient } from '../src/common/client-access/lock-owned-client';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { ClientsService } from '../src/modules/clients/clients.service';
import { normalizeDraftContent } from '../src/modules/workouts/workout-draft-content';
import { WorkoutDraftsService } from '../src/modules/workouts/workout-drafts.service';
import { WorkoutsService } from '../src/modules/workouts/workouts.service';
import { assertIsolationDatabase } from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';

const uuid = (n: number) =>
  `72000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner: AuthUser = {
  sub: uuid(1),
  role: 'PERSONAL',
  sessionId: 'synthetic-draft-session',
};
const other: AuthUser = {
  sub: uuid(2),
  role: 'PERSONAL',
  sessionId: 'synthetic-other-session',
};
const clientId = uuid(3),
  siblingId = uuid(4),
  foreignClientId = uuid(5);
const previousId = uuid(6),
  siblingWorkoutId = uuid(7),
  foreignWorkoutId = uuid(8);
const content = normalizeDraftContent({
  title: 'Synthetic draft',
  goal: 'Goal',
  notes: 'General',
  durationWeeks: 8,
  splits: [
    {
      name: 'A',
      focus: 'Legs',
      exercises: [
        {
          name: 'Squat',
          sets: '3',
          reps: '10',
          load: '60 kg',
          tempo: '3-1-1-0',
          effortType: 'RIR',
          effortTarget: '2',
          method: 'STANDARD',
        },
      ],
    },
  ],
});
const directInput = {
  clientId,
  title: 'Direct synthetic prescription',
  splits: [
    { name: 'A', exercises: [{ name: 'Squat', sets: '3', reps: '10' }] },
  ],
};
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('Workout draft lifecycle transactions (PostgreSQL)', () => {
  let admin: PrismaService, clinical: PrismaService;
  let drafts: WorkoutDraftsService,
    workouts: WorkoutsService,
    clients: ClientsService;
  const scoped = <T>(operation: () => Promise<T>, user = owner) =>
    clinical.runAsProfessional(user, 'draft-test-' + randomUUID(), operation);
  const create = () =>
    scoped(() => drafts.create(owner, { clientId, content }));
  const snapshot = () =>
    admin.workout.findUniqueOrThrow({
      where: { id: previousId },
      include: { splits: { include: { exercises: true } } },
    });
  const clear = async () => {
    await admin.workoutDraft.deleteMany({
      where: { professionalId: { in: [owner.sub, other.sub] } },
    });
    await admin.workout.deleteMany({
      where: { creatorId: { in: [owner.sub, other.sub] } },
    });
    await admin.clientAuditEvent.deleteMany({
      where: { professionalId: { in: [owner.sub, other.sub] } },
    });
    await admin.client.deleteMany({
      where: { professionalId: { in: [owner.sub, other.sub] } },
    });
    await admin.user.deleteMany({
      where: { id: { in: [owner.sub, other.sub] } },
    });
  };
  beforeAll(async () => {
    assertIsolationDatabase();
    expect(process.env.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test',
    );
    admin = testAdminPrisma();
    clinical = new PrismaService();
    await admin.$connect();
    await clinical.onModuleInit();
    const access = new ClientAccessService(clinical);
    workouts = new WorkoutsService(clinical, access);
    drafts = new WorkoutDraftsService(clinical, access, workouts);
    clients = new ClientsService(clinical, access);
  });
  beforeEach(async () => {
    await clear();
    await admin.user.createMany({
      data: [owner, other].map((user) => ({
        id: user.sub,
        role: user.role,
        name: 'Synthetic',
        email: `${user.sub}@draft-test.invalid`,
        password: 'not-a-login',
      })),
    });
    await admin.client.createMany({
      data: [
        { id: clientId, professionalId: owner.sub, name: 'Synthetic A' },
        { id: siblingId, professionalId: owner.sub, name: 'Synthetic sibling' },
        {
          id: foreignClientId,
          professionalId: other.sub,
          name: 'Synthetic foreign',
        },
      ],
    });
    for (const [id, client, creator] of [
      [previousId, clientId, owner.sub],
      [siblingWorkoutId, siblingId, owner.sub],
      [foreignWorkoutId, foreignClientId, other.sub],
    ]) {
      await admin.workout.create({
        data: {
          id,
          clientId: client,
          creatorId: creator,
          title: 'Previous synthetic',
          isActive: true,
          splits: {
            create: {
              name: 'Original',
              focus: 'Original focus',
              position: 0,
              exercises: {
                create: {
                  name: 'Original exercise',
                  sets: '4',
                  reps: '8',
                  position: 0,
                  load: '50 kg',
                },
              },
            },
          },
        },
      });
    }
  });
  afterAll(async () => {
    if (admin) {
      try {
        await clear();
      } finally {
        await clinical?.$disconnect();
        await admin.$disconnect();
      }
    }
  });

  // A conexão 1 detém o Client. Só libera após observar pg_blocking_pids na
  // conexão 2; nenhuma espera por tempo é usada como prova da corrida.
  async function queued<A, B>(
    first: () => Promise<A>,
    second: () => Promise<B>,
  ) {
    const acquired = deferred<number>(),
      release = deferred<void>();
    const firstRun = scoped(async () => {
      await clinical.$transaction((tx) =>
        lockOwnedClient(tx, clientId, owner.sub),
      );
      const [{ pid }] = await clinical.$queryRaw<
        Array<{ pid: number }>
      >`SELECT pg_backend_pid() AS pid`;
      acquired.resolve(pid);
      await release.promise;
      return first();
    });
    const pid = await acquired.promise;
    const secondRun = scoped(second);
    const settled = Promise.allSettled([firstRun, secondRun]);
    try {
      let blocked = false;
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const rows = await admin.$queryRaw<
          Array<{ blocked: boolean }>
        >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))) AS blocked`;
        if (rows[0].blocked) {
          blocked = true;
          break;
        }
      }
      expect(blocked).toBe(true);
    } finally {
      release.resolve();
    }
    return settled;
  }
  const expectSingleActive = async () =>
    expect(
      await admin.workout.count({ where: { clientId, isActive: true } }),
    ).toBe(1);

  it('save_does_not_replace_active', async () => {
    const before = await snapshot();
    const draft = await scoped(() =>
      drafts.create(owner, { clientId, content: { title: '', splits: [] } }),
    );
    expect(draft).toMatchObject({
      version: 1,
      schemaVersion: 1,
      baseActiveWorkoutId: previousId,
      content: { title: '', splits: [] },
    });
    const saved = await scoped(() =>
      drafts.update(owner, draft.id, { expectedVersion: 1, content }),
    );
    expect(saved.version).toBe(2);
    expect((await scoped(() => drafts.get(owner, draft.id))).content).toEqual(
      content,
    );
    expect(await snapshot()).toEqual(before);
  });
  it('concurrent_create_has_exactly_one_open_and_returns_existing_id', async () => {
    const results = await queued(
      () => drafts.create(owner, { clientId, content }),
      () => drafts.create(owner, { clientId, content }),
    );
    expect(results[0].status).toBe('fulfilled');
    const existing = await admin.workoutDraft.findFirstOrThrow({
      where: { clientId, status: 'OPEN' },
    });
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: {
        status: 409,
        response: { code: 'DRAFT_EXISTS', id: existing.id },
      },
    });
    expect(
      await admin.workoutDraft.count({ where: { clientId, status: 'OPEN' } }),
    ).toBe(1);
    await expectSingleActive();
  });
  it('stale_version_keeps_server_content_under_concurrent_saves', async () => {
    const draft = await create();
    const firstContent = { ...content, title: 'Winner' };
    const results = await queued(
      () =>
        drafts.update(owner, draft.id, {
          expectedVersion: 1,
          content: firstContent,
        }),
      () =>
        drafts.update(owner, draft.id, {
          expectedVersion: 1,
          content: { ...content, title: 'Stale' },
        }),
    );
    expect(results[0].status).toBe('fulfilled');
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: { response: { code: 'DRAFT_VERSION_CONFLICT' } },
    });
    expect(await scoped(() => drafts.get(owner, draft.id))).toMatchObject({
      version: 2,
      content: firstContent,
    });
  });
  it('retry_same_finalize_returns_same_workout_under_concurrency', async () => {
    const draft = await scoped(() =>
      drafts.create(owner, { clientId, sourceWorkoutId: previousId }),
    );
    const previous = await snapshot();
    const results = await queued(
      () => drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
      () => drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
    );
    expect(results[0].status).toBe('fulfilled');
    expect(results[1]).toEqual(results[0]);
    if (results[0].status !== 'fulfilled')
      throw new Error('Expected finalization');
    const result = results[0].value;
    expect(Object.keys(result).sort()).toEqual(
      [
        'id',
        'clientId',
        'status',
        'version',
        'finalizedWorkoutId',
        'workout',
      ].sort(),
    );
    expect(result).toMatchObject({
      id: draft.id,
      clientId,
      status: 'FINALIZED',
      version: 2,
      workout: {
        clientId,
        revisionOfId: previousId,
        splits: [{ name: 'Original', exercises: [{ load: '50 kg' }] }],
      },
    });
    expect(await admin.workout.count({ where: { clientId } })).toBe(2);
    await expectSingleActive();
    expect(await snapshot()).toEqual({
      ...previous,
      isActive: false,
      updatedAt: expect.any(Date) as unknown,
    });
    expect(await scoped(() => drafts.get(owner, draft.id))).toMatchObject({
      content: null,
      finalizedWorkoutId: result.workout.id,
    });
    const sqlNull = await admin.$queryRaw<
      Array<{ empty: boolean }>
    >`SELECT content IS NULL AS empty FROM workout_drafts WHERE id=${draft.id}`;
    expect(sqlNull).toEqual([{ empty: true }]);
    await expect(
      scoped(() => drafts.discard(owner, draft.id, { expectedVersion: 1 })),
    ).rejects.toMatchObject({ response: { code: 'DRAFT_CLOSED' } });
  });
  it('different_finalize_version_conflicts', async () => {
    const draft = await create();
    await scoped(() =>
      drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
    );
    for (const expectedVersion of [2, 3])
      await expect(
        scoped(() => drafts.finalize(owner, draft.id, { expectedVersion })),
      ).rejects.toMatchObject({ response: { code: 'DRAFT_VERSION_CONFLICT' } });
    expect(await admin.workout.count({ where: { clientId } })).toBe(2);
  });
  it('rebase_checks_active_again_and_preserves_content_and_origin', async () => {
    const draft = await create();
    const replacement = await scoped(() => workouts.create(owner, directInput));
    await expect(
      scoped(() => drafts.finalize(owner, draft.id, { expectedVersion: 1 })),
    ).rejects.toMatchObject({ response: { code: 'ACTIVE_WORKOUT_CHANGED' } });
    await expect(
      scoped(() =>
        drafts.rebase(owner, draft.id, {
          expectedVersion: 1,
          expectedActiveWorkoutId: previousId,
        }),
      ),
    ).rejects.toMatchObject({ response: { code: 'ACTIVE_WORKOUT_CHANGED' } });
    const newest = await scoped(() => workouts.create(owner, directInput));
    await expect(
      scoped(() =>
        drafts.rebase(owner, draft.id, {
          expectedVersion: 1,
          expectedActiveWorkoutId: replacement.id,
        }),
      ),
    ).rejects.toMatchObject({ response: { code: 'ACTIVE_WORKOUT_CHANGED' } });
    expect(
      await scoped(() =>
        drafts.rebase(owner, draft.id, {
          expectedVersion: 1,
          expectedActiveWorkoutId: newest.id,
        }),
      ),
    ).toMatchObject({
      version: 2,
      baseActiveWorkoutId: newest.id,
      sourceWorkoutId: null,
      content,
    });
    await scoped(() =>
      drafts.finalize(owner, draft.id, { expectedVersion: 2 }),
    );
    await expectSingleActive();
  });
  it.each([true, false])(
    'archive_serializes_with_finalize (archiveFirst=%s)',
    async (archiveFirst) => {
      const draft = await create();
      const archive = () => clients.setStatus(owner, clientId, 'ARCHIVED');
      const finalize = () =>
        drafts.finalize(owner, draft.id, { expectedVersion: 1 });
      if (archiveFirst) {
        const results = await queued(archive, finalize);
        expect(results[0].status).toBe('fulfilled');
        expect(results[1]).toMatchObject({
          status: 'rejected',
          reason: { response: { code: 'CLIENT_ARCHIVED' } },
        });
        expect(await scoped(() => drafts.get(owner, draft.id))).toMatchObject({
          status: 'OPEN',
          version: 1,
          content,
        });
      } else {
        const results = await queued(finalize, archive);
        expect(results.map((r) => r.status)).toEqual([
          'fulfilled',
          'fulfilled',
        ]);
        expect(await scoped(() => drafts.get(owner, draft.id))).toMatchObject({
          status: 'FINALIZED',
          version: 2,
          content: null,
        });
      }
      expect(
        (await admin.client.findUniqueOrThrow({ where: { id: clientId } }))
          .status,
      ).toBe('ARCHIVED');
      await expectSingleActive();
      for (const operation of [
        () => drafts.update(owner, draft.id, { expectedVersion: 1, content }),
        () =>
          drafts.rebase(owner, draft.id, {
            expectedVersion: 1,
            expectedActiveWorkoutId: previousId,
          }),
        () => drafts.discard(owner, draft.id, { expectedVersion: 1 }),
        () => drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
        () => drafts.create(owner, { clientId, content }),
      ])
        await expect(scoped(operation)).rejects.toMatchObject({
          response: { code: 'CLIENT_ARCHIVED' },
        });
    },
  );
  it.each([true, false])(
    'direct_creation_serializes_with_finalize (directFirst=%s)',
    async (directFirst) => {
      const draft = await create();
      if (directFirst) {
        const results = await queued(
          () => workouts.create(owner, directInput),
          () => drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
        );
        expect(results[0].status).toBe('fulfilled');
        expect(results[1]).toMatchObject({
          status: 'rejected',
          reason: { response: { code: 'ACTIVE_WORKOUT_CHANGED' } },
        });
        expect((await scoped(() => drafts.get(owner, draft.id))).status).toBe(
          'OPEN',
        );
      } else {
        const results = await queued(
          () => drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
          () => workouts.create(owner, directInput),
        );
        expect(results.map((r) => r.status)).toEqual([
          'fulfilled',
          'fulfilled',
        ]);
        const terminal = await scoped(() => drafts.get(owner, draft.id));
        expect(terminal.status).toBe('FINALIZED');
        expect(
          (
            await scoped(() =>
              drafts.finalize(owner, draft.id, { expectedVersion: 1 }),
            )
          ).workout.id,
        ).toBe(terminal.finalizedWorkoutId);
      }
      await expectSingleActive();
    },
  );
  it('rollback_keeps_open_content_after_workout_and_children_are_created', async () => {
    const draft = await create(),
      before = await snapshot();
    const failure = new Error('Synthetic failure after children');
    const original = workouts.createFromDraft.bind(workouts);
    const injected = jest
      .spyOn(workouts, 'createFromDraft')
      .mockImplementation(async (...args) => {
        const result = await original(...args);
        expect(result.splits[0].exercises[0].name).toBe('Squat');
        expect(await clinical.workout.count({ where: { clientId } })).toBe(2);
        throw failure;
      });
    try {
      await expect(
        scoped(() => drafts.finalize(owner, draft.id, { expectedVersion: 1 })),
      ).rejects.toBe(failure);
    } finally {
      injected.mockRestore();
    }
    expect(await scoped(() => drafts.get(owner, draft.id))).toEqual(draft);
    expect(await snapshot()).toEqual(before);
    expect(await admin.workout.count({ where: { clientId } })).toBe(1);
    expect(
      await admin.workoutExercise.count({
        where: { split: { workout: { clientId } } },
      }),
    ).toBe(1);
  });
  it('rejects_foreign_account_and_sibling_source_or_base_without_disclosing_content', async () => {
    for (const sourceWorkoutId of [siblingWorkoutId, foreignWorkoutId])
      await expect(
        scoped(() => drafts.create(owner, { clientId, sourceWorkoutId })),
      ).rejects.toMatchObject({ status: 404 });
    const draft = await create();
    for (const expectedActiveWorkoutId of [siblingWorkoutId, foreignWorkoutId])
      await expect(
        scoped(() =>
          drafts.rebase(owner, draft.id, {
            expectedVersion: 1,
            expectedActiveWorkoutId,
          }),
        ),
      ).rejects.toMatchObject({ response: { code: 'ACTIVE_WORKOUT_CHANGED' } });
    for (const operation of [
      () => drafts.get(other, draft.id),
      () => drafts.update(other, draft.id, { expectedVersion: 1, content }),
      () => drafts.finalize(other, draft.id, { expectedVersion: 1 }),
      () =>
        drafts.rebase(other, draft.id, {
          expectedVersion: 1,
          expectedActiveWorkoutId: null,
        }),
      () => drafts.discard(other, draft.id, { expectedVersion: 1 }),
    ])
      await expect(scoped(operation, other)).rejects.toMatchObject({
        status: 404,
      });
    await expect(
      scoped(() =>
        drafts.create(owner, { clientId: foreignClientId, content }),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(await scoped(() => drafts.get(owner, draft.id))).toEqual(draft);
  });
  it('discard_is_idempotent_sql_null_and_allows_new_open_draft', async () => {
    const draft = await create();
    const ack = await scoped(() =>
      drafts.discard(owner, draft.id, { expectedVersion: 1 }),
    );
    expect(ack).toEqual({
      id: draft.id,
      clientId,
      status: 'DISCARDED',
      version: 2,
    });
    expect(
      await scoped(() =>
        drafts.discard(owner, draft.id, { expectedVersion: 1 }),
      ),
    ).toEqual(ack);
    await expect(
      scoped(() => drafts.discard(owner, draft.id, { expectedVersion: 2 })),
    ).rejects.toMatchObject({ response: { code: 'DRAFT_VERSION_CONFLICT' } });
    expect(
      await admin.$queryRaw`SELECT content IS NULL AS empty FROM workout_drafts WHERE id=${draft.id}`,
    ).toEqual([{ empty: true }]);
    expect((await create()).id).not.toBe(draft.id);
  });
  it('list_cursor_is_scoped_and_stable_with_updated_at_ties', async () => {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const ids: string[] = [];
    for (let n = 20; n < 43; n++) {
      const client = uuid(n),
        id = uuid(n + 100);
      ids.push(id);
      await admin.client.create({
        data: { id: client, name: 'Page synthetic', professionalId: owner.sub },
      });
      await admin.workoutDraft.create({
        data: {
          id,
          professionalId: owner.sub,
          clientId: client,
          content,
          updatedAt: timestamp,
        },
      });
    }
    const foreign = await scoped(
      () => drafts.create(other, { clientId: foreignClientId, content }),
      other,
    );
    const page = await scoped(() => drafts.list(owner, {}));
    expect(page.items.map((r) => r.id)).toEqual(ids.slice(0, 20));
    expect(
      page.items.every(
        (r) =>
          !('content' in r) &&
          r.client.id === r.clientId &&
          r.title === content.title,
      ),
    ).toBe(true);
    expect(page.nextCursor).not.toBeNull();
    const cursor = JSON.parse(
      Buffer.from(page.nextCursor!, 'base64url').toString(),
    ) as { updatedAt: string; id: string };
    expect(cursor).toEqual({ updatedAt: timestamp.toISOString(), id: ids[19] });
    expect(
      (
        await scoped(() => drafts.list(owner, { cursor: page.nextCursor! }))
      ).items.map((r) => r.id),
    ).toEqual(ids.slice(20));
    expect(
      (await scoped(() => drafts.list(owner, { cursor: page.nextCursor! })))
        .nextCursor,
    ).toBeNull();
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    for (const invalid of [
      '!',
      page.nextCursor! + '=',
      encode({ ...cursor, professionalId: other.sub }),
      encode({ updatedAt: cursor.updatedAt, id: randomUUID() }),
      encode({ updatedAt: 'invalid', id: cursor.id }),
      encode({ updatedAt: timestamp.toISOString(), id: foreign.id }),
      encode({ updatedAt: '2026-01-02T00:00:00.000Z', id: cursor.id }),
    ])
      await expect(
        scoped(() => drafts.list(owner, { cursor: invalid })),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      scoped(() => drafts.list(other, { cursor: page.nextCursor! }), other),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      scoped(() =>
        drafts.list(owner, { cursor: page.nextCursor!, clientId: siblingId }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      scoped(() => drafts.list(owner, { clientId: foreignClientId })),
    ).rejects.toMatchObject({ status: 404 });
    const filtered = await scoped(() =>
      drafts.list(owner, { clientId: uuid(20), limit: 1 }),
    );
    expect(filtered.items.map((r) => r.id)).toEqual([ids[0]]);
    expect(filtered.nextCursor).toBeNull();
    await expect(
      scoped(() => drafts.list(owner, { limit: 21 })),
    ).rejects.toMatchObject({ status: 400 });
  });
});
