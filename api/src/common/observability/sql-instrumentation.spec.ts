import { PrismaClient } from '@prisma/client';
import {
  createRequestTelemetry,
  getTotalDbMs,
  runWithRequestTelemetry,
} from './request-telemetry.context';
import { RequestTelemetryLogger } from './request-telemetry.logger';
import {
  instrumentDriverAdapterFactory,
  type InstrumentableAdapterFactory,
} from './sql-instrumentation';

function createFakeAdapterFactory(options: {
  queryDelayMs?: number;
  failSqlMatch?: string;
}): InstrumentableAdapterFactory {
  const delay = async () => {
    if (options.queryDelayMs && options.queryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.queryDelayMs));
    }
  };

  return {
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
    connect() {
      return Promise.resolve({
        provider: 'postgres',
        adapterName: '@prisma/adapter-pg',
        async queryRaw(query) {
          await delay();
          if (
            options.failSqlMatch &&
            query.sql.includes(options.failSqlMatch)
          ) {
            throw new Error('simulated query failure');
          }
          return { columnNames: ['n'], columnTypes: [0], rows: [[1]] };
        },
        async executeRaw() {
          await delay();
          return 1;
        },
        executeScript() {
          return Promise.resolve();
        },
        async startTransaction() {
          await delay();
          return {
            provider: 'postgres',
            adapterName: '@prisma/adapter-pg',
            options: { usePhantomQuery: false },
            async queryRaw(query) {
              await delay();
              if (
                options.failSqlMatch &&
                query.sql.includes(options.failSqlMatch)
              ) {
                throw new Error('simulated tx failure');
              }
              return { columnNames: ['n'], columnTypes: [0], rows: [[1]] };
            },
            async executeRaw() {
              await delay();
              return 1;
            },
            commit() {
              return Promise.resolve();
            },
            rollback() {
              return Promise.resolve();
            },
          };
        },
        dispose() {
          return Promise.resolve();
        },
      });
    },
  };
}

describe('SQL driver-adapter instrumentation', () => {
  const prevSlowQuery = process.env.OBSERVABILITY_SLOW_QUERY_MS;
  const prevLogMode = process.env.OBSERVABILITY_LOG_REQUESTS;

  afterEach(() => {
    if (prevSlowQuery === undefined) {
      delete process.env.OBSERVABILITY_SLOW_QUERY_MS;
    } else {
      process.env.OBSERVABILITY_SLOW_QUERY_MS = prevSlowQuery;
    }
    if (prevLogMode === undefined) {
      delete process.env.OBSERVABILITY_LOG_REQUESTS;
    } else {
      process.env.OBSERVABILITY_LOG_REQUESTS = prevLogMode;
    }
  });

  it('attributes query timings and transaction spans to the active request without cross-request bleed', async () => {
    process.env.OBSERVABILITY_SLOW_QUERY_MS = '5000';
    const client = new PrismaClient({
      adapter: instrumentDriverAdapterFactory(
        createFakeAdapterFactory({ queryDelayMs: 12 }),
        'clinical',
      ),
    });

    try {
      const storeA = createRequestTelemetry({
        requestId: 'req-A',
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        method: 'GET',
        route: 'GET /clients',
        policy: 'client',
        role: 'NUTRITIONIST',
      });
      const storeB = createRequestTelemetry({
        requestId: 'req-B',
        traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        spanId: 'bbbbbbbbbbbbbbbb',
        method: 'GET',
        route: 'GET /lab-exams',
        policy: 'resource-page',
        role: 'NUTRITIONIST',
      });

      await Promise.all([
        runWithRequestTelemetry(storeA, async () => {
          await client.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "public"."Client" WHERE "name" = ${'Paciente Confidencial A'}`;
            await tx.$executeRaw`UPDATE "public"."Client" SET "notes" = ${'Anotação Sigilosa'}`;
          });
        }),
        runWithRequestTelemetry(storeB, async () => {
          await client.$queryRaw`SELECT id FROM "public"."LabExam" WHERE "notes" = ${'Exame B'}`;
        }),
      ]);

      expect(storeA.db.queryCount).toBe(2);
      expect(storeA.db.txAcquireMs).toBeGreaterThan(0);
      expect(storeA.db.commitMs).toBeGreaterThanOrEqual(0);
      expect(getTotalDbMs(storeA)).toBeGreaterThan(0);
      expect(Array.from(storeA.db.sources)).toEqual(['clinical']);

      expect(storeB.db.queryCount).toBe(1);
      expect(storeB.db.slowestOperation).toBe('SELECT');
      expect(storeB.db.slowestTarget).toBe('LabExam');
    } finally {
      await client.$disconnect();
    }
  });

  it('logs slow queries correlated to requestId/traceId without leaking clinical args and rethrows errors untouched', async () => {
    process.env.OBSERVABILITY_SLOW_QUERY_MS = '5';
    process.env.OBSERVABILITY_LOG_REQUESTS = 'all';

    const logs: Array<{ line: string; level: string }> = [];
    const logger = new RequestTelemetryLogger((line, level) =>
      logs.push({ line, level }),
    );
    logger.onModuleInit();

    const client = new PrismaClient({
      adapter: instrumentDriverAdapterFactory(
        createFakeAdapterFactory({
          queryDelayMs: 15,
          failSqlMatch: 'FailTable',
        }),
        'clinical',
      ),
    });

    try {
      const store = createRequestTelemetry({
        requestId: 'req-slow-1',
        traceId: '11111111111111111111111111111111',
        spanId: '2222222222222222',
        method: 'GET',
        route: 'GET /clients/:id/overview',
        policy: 'overview',
        role: 'NUTRITIONIST',
      });

      await runWithRequestTelemetry(store, async () => {
        await client.$queryRaw`SELECT id FROM "public"."Client" WHERE "name" = ${'Maria Confidencial'}`;
        await expect(
          client.$queryRaw`SELECT id FROM "public"."FailTable"`,
        ).rejects.toThrow('simulated query failure');
      });

      expect(store.db.slowQueryCount).toBe(2);
      expect(logs).toHaveLength(2);
      const firstLog = JSON.parse(logs[0].line) as Record<string, unknown>;
      expect(logs[0].level).toBe('warn');
      expect(firstLog).toMatchObject({
        event: 'db_slow_query',
        requestId: 'req-slow-1',
        traceId: '11111111111111111111111111111111',
        spanId: '2222222222222222',
        route: 'GET /clients/:id/overview',
        source: 'clinical',
        operation: 'SELECT',
        target: 'Client',
        ok: true,
      });
      expect(logs[0].line).not.toContain('Maria Confidencial');

      const secondLog = JSON.parse(logs[1].line) as Record<string, unknown>;
      expect(secondLog).toMatchObject({
        event: 'db_slow_query',
        target: 'FailTable',
        ok: false,
      });
    } finally {
      logger.onModuleDestroy();
      await client.$disconnect();
    }
  });
});
