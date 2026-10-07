import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AuditDeliveryWorker } from '../src/modules/read-audit/audit-delivery.worker';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Independent audit copy from committed outbox', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let delivery: PrismaClient;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    delivery = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: urls.values.AUDIT_DELIVERY_DATABASE_URL,
      }),
    });
    await db.prisma.user.create({
      data: {
        id: 'copy-owner',
        name: 'Synthetic',
        email: 'copy@fixture.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.client.create({
      data: {
        id: 'copy-client',
        name: 'Synthetic',
        professionalId: 'copy-owner',
      },
    });
  });
  afterAll(async () => {
    await delivery?.$disconnect();
    urls?.restore();
    await db?.close();
  });
  const event = (id: string) => ({
    id,
    tenantProfessionalId: 'copy-owner',
    clientId: 'copy-client',
    actorType: 'PROFESSIONAL' as const,
    actorProfessionalId: 'copy-owner',
    sessionId: 'synthetic-validated',
    requestId: id,
    action: 'READ' as const,
    domain: 'CLIENT' as const,
  });
  it('cannot copy an uncommitted event and delivers after the transaction commits', async () => {
    const copied = new Set<string>();
    const worker = new AuditDeliveryWorker(delivery, {
      putIfAbsent: (row) => {
        copied.add(row.id);
        return Promise.resolve();
      },
    });
    await db.prisma.$transaction(async (tx) => {
      await tx.clientReadAuditEvent.create({ data: event('copy-first') });
      await tx.auditDeliveryState.create({ data: { eventId: 'copy-first' } });
      expect(await worker.deliverBatch()).toEqual({ delivered: 0, failed: 0 });
      expect(copied.size).toBe(0);
    });
    expect(await worker.deliverBatch()).toEqual({ delivered: 1, failed: 0 });
    expect(copied.has('copy-first')).toBe(true);
    expect(
      (
        await db.prisma.auditDeliveryState.findUniqueOrThrow({
          where: { eventId: 'copy-first' },
        })
      ).deliveredAt,
    ).toBeInstanceOf(Date);
  });
  it('retries with the same event ID after a receiver committed but confirmation was lost', async () => {
    await db.prisma.clientReadAuditEvent.create({ data: event('copy-retry') });
    await db.prisma.auditDeliveryState.create({
      data: { eventId: 'copy-retry' },
    });
    const copied = new Set<string>();
    let first = true;
    const worker = new AuditDeliveryWorker(delivery, {
      putIfAbsent: (row) => {
        copied.add(row.id);
        if (first) {
          first = false;
          return Promise.reject(new Error('synthetic network failure'));
        }
        return Promise.resolve();
      },
    });
    expect(await worker.deliverBatch()).toEqual({ delivered: 0, failed: 1 });
    expect(await worker.deliverBatch()).toEqual({ delivered: 1, failed: 0 });
    expect(copied.size).toBe(1);
    expect(
      (
        await db.prisma.auditDeliveryState.findUniqueOrThrow({
          where: { eventId: 'copy-retry' },
        })
      ).attempts,
    ).toBe(2);
    await expect(delivery.client.findMany()).rejects.toThrow();
  });

  it('does not misreport delivery after an expired claim was acquired by another worker', async () => {
    await db.prisma.clientReadAuditEvent.create({ data: event('copy-stale') });
    await db.prisma.auditDeliveryState.create({
      data: { eventId: 'copy-stale' },
    });
    let release!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const old = new AuditDeliveryWorker(delivery, {
      putIfAbsent: async () => {
        entered();
        await waiting;
      },
    });
    const running = old.deliverBatch(1);
    await started;
    try {
      await db.prisma.auditDeliveryState.update({
        where: { eventId: 'copy-stale' },
        data: { leaseUntil: new Date(0) },
      });
      const current = new AuditDeliveryWorker(delivery, {
        putIfAbsent: () => Promise.resolve(),
      });
      expect(await current.deliverBatch(1)).toEqual({
        delivered: 1,
        failed: 0,
      });
    } finally {
      release();
    }
    expect(await running).toEqual({ delivered: 0, failed: 0 });
  });
});
