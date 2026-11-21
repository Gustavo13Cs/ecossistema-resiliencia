import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { redactLogRecord, type SqlOperation } from './log-redaction';
import {
  readObservabilityConfig,
  type ObservabilityConfig,
} from './observability.config';
import {
  type DatabaseSource,
  setSlowQueryListener,
  type SlowQueryEvent,
} from './request-telemetry.context';

export const OBSERVABILITY_LOG_WRITER = 'OBSERVABILITY_LOG_WRITER';

export type LogWriter = (
  line: string,
  level: 'info' | 'warn' | 'error',
) => void;

export interface RequestCompletedLogPayload {
  requestId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  method: string;
  route: string;
  policy: string;
  role: string;
  statusCode: number;
  totalMs: number;
  dbMs: number;
  dbQueryCount: number;
  slowQueryCount: number;
  slowestQueryMs: number;
  slowestOperation?: SqlOperation;
  slowestTarget?: string;
  dbSources: DatabaseSource[];
  txAcquireMs?: number;
  rlsContextMs?: number;
  handlerMs?: number;
  validationMs?: number;
  txCommitMs?: number;
  slow: boolean;
  errorCode?: string;
}

export interface MetricsSummaryPayload {
  generatedAt: string;
  uptimeSeconds: number;
  totals: {
    requests: number;
    errors: number;
    slowRequests: number;
  };
  topSlowRoutes: Array<{
    route: string;
    count: number;
    errors: number;
    slowCount: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgMs: number;
    maxMs: number;
    dbP95Ms: number;
    dbSharePercent: number;
  }>;
}

function defaultWriter(line: string, level: 'info' | 'warn' | 'error'): void {
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

@Injectable()
export class RequestTelemetryLogger implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Optional()
    @Inject(OBSERVABILITY_LOG_WRITER)
    private readonly writer?: LogWriter,
  ) {}

  onModuleInit(): void {
    setSlowQueryListener((event) => {
      this.logSlowQuery(event);
    });
  }

  onModuleDestroy(): void {
    setSlowQueryListener(null);
  }

  logRequestCompleted(
    payload: RequestCompletedLogPayload,
    config: ObservabilityConfig = readObservabilityConfig(),
  ): void {
    if (config.logRequests === 'none') return;
    if (
      config.logRequests === 'slow' &&
      !payload.slow &&
      payload.statusCode < 500
    ) {
      return;
    }

    const level: 'info' | 'warn' | 'error' =
      payload.statusCode >= 500 ? 'error' : payload.slow ? 'warn' : 'info';

    this.emit(
      {
        event: 'http_request_completed',
        timestamp: new Date().toISOString(),
        ...payload,
      },
      level,
    );
  }

  logSlowQuery(
    event: SlowQueryEvent,
    config: ObservabilityConfig = readObservabilityConfig(),
  ): void {
    if (config.logRequests === 'none') return;
    this.emit(
      {
        event: 'db_slow_query',
        timestamp: new Date().toISOString(),
        ...event,
      },
      'warn',
    );
  }

  logMetricsSummary(summary: MetricsSummaryPayload): void {
    this.emit(
      {
        event: 'http_metrics_summary',
        timestamp: summary.generatedAt,
        uptimeSeconds: summary.uptimeSeconds,
        totals: summary.totals,
        topSlowRoutes: summary.topSlowRoutes,
      },
      'info',
    );
  }

  private emit(
    record: Record<string, unknown>,
    level: 'info' | 'warn' | 'error',
  ): void {
    const line = JSON.stringify(redactLogRecord(record));
    const write = this.writer ?? defaultWriter;
    write(line, level);
  }
}
