import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlOperation } from './log-redaction';
import { readObservabilityConfig, roundMs } from './observability.config';

export type DatabaseSource = 'clinical' | 'auth' | 'jobs';

export interface RequestStages {
  txAcquireMs?: number;
  rlsContextMs?: number;
  handlerMs?: number;
  validationMs?: number;
  txCommitMs?: number;
}

export interface RequestDatabaseTelemetry {
  queryCount: number;
  queryMs: number;
  txAcquireMs: number;
  commitMs: number;
  slowestQueryMs: number;
  slowestOperation?: SqlOperation;
  slowestTarget?: string;
  slowQueryCount: number;
  sources: Set<DatabaseSource>;
}

export interface RequestTelemetryStore {
  requestId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  method: string;
  route: string;
  policy: string;
  role: string;
  startedAtNs: bigint;
  stages: RequestStages;
  db: RequestDatabaseTelemetry;
}

export interface SlowQueryEvent {
  requestId: string | null;
  traceId: string | null;
  spanId: string | null;
  route: string;
  source: DatabaseSource;
  operation: SqlOperation;
  target: string;
  durationMs: number;
  thresholdMs: number;
  ok: boolean;
}

type SlowQueryListener = (event: SlowQueryEvent) => void;

const telemetryStorage = new AsyncLocalStorage<RequestTelemetryStore>();
let activeSlowQueryListener: SlowQueryListener | null = null;

export function setSlowQueryListener(listener: SlowQueryListener | null): void {
  activeSlowQueryListener = listener;
}

export function createRequestTelemetry(input: {
  requestId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  method: string;
  route: string;
  policy: string;
  role: string;
  startedAtNs?: bigint;
}): RequestTelemetryStore {
  return {
    requestId: input.requestId,
    traceId: input.traceId,
    spanId: input.spanId,
    parentSpanId: input.parentSpanId,
    method: input.method,
    route: input.route,
    policy: input.policy,
    role: input.role,
    startedAtNs: input.startedAtNs ?? process.hrtime.bigint(),
    stages: {},
    db: {
      queryCount: 0,
      queryMs: 0,
      txAcquireMs: 0,
      commitMs: 0,
      slowestQueryMs: 0,
      slowQueryCount: 0,
      sources: new Set<DatabaseSource>(),
    },
  };
}

export function runWithRequestTelemetry<T>(
  store: RequestTelemetryStore,
  fn: () => T,
): T {
  return telemetryStorage.run(store, fn);
}

export function getActiveRequestTelemetry(): RequestTelemetryStore | undefined {
  return telemetryStorage.getStore();
}

export function recordStageDuration(
  stage: keyof RequestStages,
  durationMs: number,
): void {
  const store = telemetryStorage.getStore();
  if (!store) return;
  store.stages[stage] = roundMs(durationMs);
}

export function recordTxAcquire(
  source: DatabaseSource,
  durationMs: number,
): void {
  const store = telemetryStorage.getStore();
  if (!store) return;
  const rounded = roundMs(durationMs);
  store.db.sources.add(source);
  store.db.txAcquireMs = roundMs(store.db.txAcquireMs + rounded);
  store.stages.txAcquireMs = store.db.txAcquireMs;
}

export function recordDatabaseSpan(input: {
  source: DatabaseSource;
  operation: SqlOperation;
  target: string;
  durationMs: number;
  ok: boolean;
}): void {
  const store = telemetryStorage.getStore();
  const durationMs = roundMs(input.durationMs);

  if (store) {
    store.db.sources.add(input.source);
    if (input.operation === 'COMMIT' || input.operation === 'ROLLBACK') {
      store.db.commitMs = roundMs(store.db.commitMs + durationMs);
      store.stages.txCommitMs = store.db.commitMs;
    } else {
      store.db.queryCount += 1;
      store.db.queryMs = roundMs(store.db.queryMs + durationMs);
      if (
        durationMs >= store.db.slowestQueryMs ||
        store.db.slowestOperation === undefined
      ) {
        store.db.slowestQueryMs = durationMs;
        store.db.slowestOperation = input.operation;
        store.db.slowestTarget = input.target;
      }
    }
  }

  const thresholdMs = readObservabilityConfig().slowQueryMs;
  if (durationMs >= thresholdMs) {
    if (store) {
      store.db.slowQueryCount += 1;
    }
    activeSlowQueryListener?.({
      requestId: store?.requestId ?? null,
      traceId: store?.traceId ?? null,
      spanId: store?.spanId ?? null,
      route: store?.route ?? 'background_or_guard',
      source: input.source,
      operation: input.operation,
      target: input.target,
      durationMs,
      thresholdMs,
      ok: input.ok,
    });
  }
}

export function getTotalDbMs(store: RequestTelemetryStore): number {
  return roundMs(store.db.txAcquireMs + store.db.queryMs + store.db.commitMs);
}
