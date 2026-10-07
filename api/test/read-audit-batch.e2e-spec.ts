import { performance } from 'node:perf_hooks';
import { PrismaService } from '../src/infra/database/prisma.service';
import { ReadAuditService } from '../src/modules/read-audit/read-audit.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Local audit batch and bounded transaction proof', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let clinical: PrismaService;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    clinical = new PrismaService();
    await clinical.onModuleInit();
    await db.prisma.user.create({
      data: {
        id: 'batch-owner',
        name: 'Synthetic',
        email: 'batch@fixture.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.client.createMany({
      data: Array.from({ length: 500 }, (_, i) => ({
        id: 'batch-' + i,
        name: 'Synthetic',
        professionalId: 'batch-owner',
      })),
    });
  });
  afterAll(async () => {
    await clinical?.$disconnect();
    urls?.restore();
    await db?.close();
  });
  const principal = {
    sub: 'batch-owner',
    role: 'NUTRITIONIST' as const,
    sessionId: 'validated-fixture',
  };
  it('records all 500 returned Clients in batches and commits under concurrent principals', async () => {
    const audit = new ReadAuditService(clinical);
    const samples: number[] = [];
    const request = async (id: string) => {
      const start = performance.now();
      await clinical.runAsProfessional(principal, id, async () => {
        const result = await clinical.client.findMany({ select: { id: true } });
        await audit.record({ domain: 'CLIENT', shape: 'client' }, result, []);
      });
      samples.push(performance.now() - start);
    };
    for (let i = 0; i < 4; i++) await request('sequential-' + i);
    await Promise.all(
      Array.from({ length: 4 }, (_, i) => request('concurrent-' + i)),
    );
    expect(await db.prisma.clientReadAuditEvent.count()).toBe(4000);
    expect(await db.prisma.auditDeliveryState.count()).toBe(4000);
    samples.sort((a, b) => a - b);
    const version = (
      await db.pool.query<{ server_version: string }>('SHOW server_version')
    ).rows[0].server_version;
    console.info(
      JSON.stringify({
        localBenchmark: true,
        postgres: version,
        clientsPerRequest: 500,
        requests: 8,
        concurrency: 4,
        medianMs: Math.round(samples[4]),
        maxMs: Math.round(samples[7]),
      }),
    );
    const plan = await db.pool.query<Record<string, unknown>>(
      `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM clients WHERE "professionalId"='batch-owner'`,
    );
    expect(plan.rows).toHaveLength(1);
  });
  it('rejects an over-wide response before recording a partial trail', async () => {
    const audit = new ReadAuditService(clinical);
    await expect(
      clinical.runAsProfessional(principal, 'too-wide', () =>
        audit.record(
          { domain: 'CLIENT', shape: 'client' },
          Array.from({ length: 1001 }, (_, i) => ({ id: 'batch-' + i })),
          [],
        ),
      ),
    ).rejects.toThrow('Consulta muito ampla');
    expect(
      await db.prisma.clientReadAuditEvent.count({
        where: { requestId: 'too-wide' },
      }),
    ).toBe(0);
  });
  it('rolls back a timed-out transaction and closes the contextual delegates', async () => {
    const before = process.env.CLINICAL_TRANSACTION_TIMEOUT_MS;
    process.env.CLINICAL_TRANSACTION_TIMEOUT_MS = '100';
    const short = new PrismaService();
    if (before === undefined)
      delete process.env.CLINICAL_TRANSACTION_TIMEOUT_MS;
    else process.env.CLINICAL_TRANSACTION_TIMEOUT_MS = before;
    try {
      await expect(
        short.runAsProfessional(principal, 'timeout', async () => {
          await short.client.update({
            where: { id: 'batch-0' },
            data: { name: 'Should roll back' },
          });
          await short.$queryRaw`SELECT pg_sleep(0.3)`;
        }),
      ).rejects.toThrow();
      expect(
        (await db.prisma.client.findUniqueOrThrow({ where: { id: 'batch-0' } }))
          .name,
      ).toBe('Synthetic');
      expect(() => short.client).toThrow('Clinical database context required');
    } finally {
      await short.$disconnect();
    }
  });
});
