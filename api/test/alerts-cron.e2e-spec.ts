import { PrismaService } from '../src/infra/database/prisma.service';
import { AlertsCronService } from '../src/modules/alerts/alerts.cron.service';
import { AlertsController } from '../src/modules/alerts/alerts.controller';
import { isolatedPostgres } from './fixtures/isolated-postgres';

describe('Atomic alert snapshots (isolated PostgreSQL)', () => {
  jest.setTimeout(60_000);
  let database: Awaited<ReturnType<typeof isolatedPostgres>>;
  let prisma: PrismaService;
  let service: AlertsCronService;
  const now = new Date('2026-10-01T12:00:00Z');
  const snapshot = () =>
    prisma.patientAlert.findMany({ orderBy: { id: 'asc' } });
  beforeAll(async () => {
    database = await isolatedPostgres();
    prisma = database.prisma;
    service = new AlertsCronService(prisma);
    for (const id of ['a', 'b'])
      await prisma.user.create({
        data: {
          id,
          name: 'Fixture',
          email: `${id}@alerts.test`,
          password: 'unused',
          role: 'PERSONAL',
        },
      });
    await prisma.client.create({
      data: { id: 'client-a', professionalId: 'a', name: 'Private A' },
    });
    await prisma.client.create({
      data: { id: 'client-b', professionalId: 'b', name: 'Private B' },
    });
    // Uma linha com autor incorreto não pode alterar as métricas do dono.
    await prisma.dailyTracking.create({
      data: {
        clientId: 'client-a',
        professionalId: 'b',
        type: 'WORKOUT',
        itemName: 'Fixture',
        completedAt: now,
      },
    });
  });
  beforeEach(async () => {
    await prisma.patientAlert.deleteMany();
    await prisma.patientAlert.create({
      data: {
        id: 'previous',
        clientId: 'client-a',
        professionalId: 'a',
        type: 'INACTIVE_5_DAYS',
        severity: 'HIGH',
        message: 'Prior snapshot',
        createdAt: now,
      },
    });
  });
  afterAll(async () => {
    await database?.close();
  });
  it('preserves the byte-for-byte prior snapshot on calculation failure', async () => {
    const before = await snapshot();
    await database.pool.query(
      'ALTER TABLE "DailyTracking" RENAME TO fixture_hidden_tracking',
    );
    try {
      await expect(service.generateDailyAlerts()).rejects.toThrow();
    } finally {
      await database.pool.query(
        'ALTER TABLE fixture_hidden_tracking RENAME TO "DailyTracking"',
      );
    }
    expect(await snapshot()).toEqual(before);
  });
  it('rolls back deletion when an insert fails', async () => {
    const before = await snapshot();
    await database.pool
      .query(`CREATE FUNCTION fixture_reject_alert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture write failure'; END $$;
      CREATE TRIGGER fixture_reject_alert BEFORE INSERT ON patient_alerts FOR EACH ROW EXECUTE FUNCTION fixture_reject_alert()`);
    try {
      await expect(service.generateDailyAlerts()).rejects.toThrow();
    } finally {
      await database.pool.query(
        'DROP TRIGGER fixture_reject_alert ON patient_alerts; DROP FUNCTION fixture_reject_alert()',
      );
    }
    expect(await snapshot()).toEqual(before);
  });
  it('blocks two instances behind the same advisory transaction lock and replaces without duplicates', async () => {
    const holder = await database.pool.connect();
    await holder.query('BEGIN');
    await holder.query('SELECT pg_advisory_xact_lock($1::bigint)', [
      0x534146454d4f5645n.toString(),
    ]);
    let completions = 0;
    const calls = [
      service.generateDailyAlerts(),
      service.generateDailyAlerts(),
    ].map((call) =>
      call.finally(() => {
        completions++;
      }),
    );
    try {
      let waiting = 0;
      const deadline = Date.now() + 3000;
      while (waiting < 2 && Date.now() < deadline) {
        waiting = Number(
          (
            await database.pool.query<{ count: string }>(
              `SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())`,
            )
          ).rows[0].count,
        );
        if (waiting < 2)
          await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(2);
      expect(completions).toBe(0);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    const results = await Promise.all(calls);
    expect(results).toEqual([
      { generated: 2, skipped: false },
      { generated: 2, skipped: false },
    ]);
    const alerts = await snapshot();
    expect(alerts).toHaveLength(2);
    expect(alerts.every((alert) => alert.patientId === null)).toBe(true);
    expect(alerts.map((alert) => alert.clientId).sort()).toEqual([
      'client-a',
      'client-b',
    ]);
  });
  it('dashboard returns only currently owned Client rows, without patient credentials', async () => {
    await prisma.patientAlert.create({
      data: {
        clientId: 'client-b',
        professionalId: 'a',
        type: 'INACTIVE_5_DAYS',
        severity: 'HIGH',
        message: 'Incorrect owner',
      },
    });
    const controller = new AlertsController(prisma);
    const result = await controller.getProfessionalAlerts({
      user: { sub: 'a', role: 'PERSONAL' },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      client: { id: 'client-a', name: 'Private A' },
    });
    expect(result[0]).not.toHaveProperty('patient');
  });
});
