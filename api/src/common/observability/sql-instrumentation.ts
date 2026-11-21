import type { Prisma } from '@prisma/client';
import { extractSafeSqlOperation } from './log-redaction';
import { elapsedMs } from './observability.config';
import {
  type DatabaseSource,
  recordDatabaseSpan,
  recordTxAcquire,
} from './request-telemetry.context';

type AdapterFactory = NonNullable<Prisma.PrismaClientOptions['adapter']>;
type DriverAdapter = Awaited<ReturnType<AdapterFactory['connect']>>;
type DriverTransaction = Awaited<ReturnType<DriverAdapter['startTransaction']>>;
type DriverQuery = Parameters<DriverAdapter['queryRaw']>[0];
type IsolationLevel = Parameters<DriverAdapter['startTransaction']>[0];

export type InstrumentableAdapterFactory = AdapterFactory & {
  connectToShadowDb?: () => Promise<DriverAdapter>;
};

async function executeTimedQuery<R>(
  source: DatabaseSource,
  query: DriverQuery,
  run: () => Promise<R>,
): Promise<R> {
  const startedAtNs = process.hrtime.bigint();
  const { operation, target } = extractSafeSqlOperation(query.sql);
  let ok = true;
  try {
    return await run();
  } catch (error) {
    ok = false;
    throw error;
  } finally {
    recordDatabaseSpan({
      source,
      operation,
      target,
      durationMs: elapsedMs(startedAtNs),
      ok,
    });
  }
}

function wrapTransaction(
  tx: DriverTransaction,
  source: DatabaseSource,
): DriverTransaction {
  return {
    provider: tx.provider,
    adapterName: tx.adapterName,
    options: tx.options,
    queryRaw(query: DriverQuery) {
      return executeTimedQuery(source, query, () => tx.queryRaw(query));
    },
    executeRaw(query: DriverQuery) {
      return executeTimedQuery(source, query, () => tx.executeRaw(query));
    },
    commit() {
      return tx.commit();
    },
    rollback() {
      return tx.rollback();
    },
    ...(tx.createSavepoint
      ? {
          createSavepoint: (name: string) =>
            tx.createSavepoint ? tx.createSavepoint(name) : Promise.resolve(),
        }
      : {}),
    ...(tx.rollbackToSavepoint
      ? {
          rollbackToSavepoint: (name: string) =>
            tx.rollbackToSavepoint
              ? tx.rollbackToSavepoint(name)
              : Promise.resolve(),
        }
      : {}),
    ...(tx.releaseSavepoint
      ? {
          releaseSavepoint: (name: string) =>
            tx.releaseSavepoint ? tx.releaseSavepoint(name) : Promise.resolve(),
        }
      : {}),
  };
}

function wrapAdapter(
  adapter: DriverAdapter,
  source: DatabaseSource,
): DriverAdapter {
  const wrapped: DriverAdapter = {
    provider: adapter.provider,
    adapterName: adapter.adapterName,
    queryRaw(query: DriverQuery) {
      return executeTimedQuery(source, query, () => adapter.queryRaw(query));
    },
    executeRaw(query: DriverQuery) {
      return executeTimedQuery(source, query, () => adapter.executeRaw(query));
    },
    executeScript(script: string) {
      return adapter.executeScript(script);
    },
    async startTransaction(isolationLevel?: IsolationLevel) {
      const startedAtNs = process.hrtime.bigint();
      let tx: DriverTransaction;
      try {
        tx = await adapter.startTransaction(isolationLevel);
      } finally {
        recordTxAcquire(source, elapsedMs(startedAtNs));
      }
      return wrapTransaction(tx, source);
    },
    dispose() {
      return adapter.dispose();
    },
    ...(adapter.getConnectionInfo
      ? {
          getConnectionInfo: () =>
            adapter.getConnectionInfo
              ? adapter.getConnectionInfo()
              : { supportsRelationJoins: false },
        }
      : {}),
  };

  type AdapterWithDriver = DriverAdapter & {
    underlyingDriver?: () => unknown;
  };
  const adapterWithDriver = adapter as AdapterWithDriver;
  if (typeof adapterWithDriver.underlyingDriver === 'function') {
    (wrapped as AdapterWithDriver).underlyingDriver = () =>
      adapterWithDriver.underlyingDriver?.();
  }

  return wrapped;
}

export function instrumentDriverAdapterFactory(
  factory: InstrumentableAdapterFactory,
  source: DatabaseSource,
): InstrumentableAdapterFactory {
  return {
    provider: factory.provider,
    adapterName: factory.adapterName,
    async connect() {
      const adapter = await factory.connect();
      return wrapAdapter(adapter, source);
    },
    ...(factory.connectToShadowDb
      ? {
          connectToShadowDb: async () => {
            if (!factory.connectToShadowDb) {
              throw new Error('connectToShadowDb unavailable');
            }
            const adapter = await factory.connectToShadowDb();
            return wrapAdapter(adapter, source);
          },
        }
      : {}),
  };
}
