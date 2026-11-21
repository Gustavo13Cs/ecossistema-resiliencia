import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { readObservabilityConfig, roundMs } from './observability.config';
import {
  type MetricsSummaryPayload,
  RequestTelemetryLogger,
} from './request-telemetry.logger';

export interface RequestMetricSample {
  route: string;
  statusCode: number;
  totalMs: number;
  dbMs: number;
  dbQueryCount: number;
  slow: boolean;
  requestId: string;
  traceId: string;
}

export interface LastSlowRequestRef {
  requestId: string;
  traceId: string;
  totalMs: number;
  dbMs: number;
  dbQueryCount: number;
  statusCode: number;
  recordedAt: string;
}

export interface RoutePerformanceMetrics {
  route: string;
  count: number;
  errors: number;
  slowCount: number;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  maxMs: number;
  dbP50Ms: number;
  dbP95Ms: number;
  dbMaxMs: number;
  avgDbQueries: number;
  dbSharePercent: number;
  lastSlowRequest: LastSlowRequestRef | null;
}

export interface PerformanceMetricsSnapshot {
  generatedAt: string;
  uptimeSeconds: number;
  windowSizePerRoute: number;
  slowRequestThresholdMs: number;
  slowQueryThresholdMs: number;
  totals: {
    requests: number;
    errors: number;
    slowRequests: number;
    trackedRoutes: number;
  };
  topSlowRoutes: RoutePerformanceMetrics[];
}

const MAX_ROUTES = 200;
const WINDOW_SIZE = 256;

interface RouteBucket {
  route: string;
  count: number;
  errors: number;
  slowCount: number;
  sumTotalMs: number;
  maxMs: number;
  sumDbMs: number;
  maxDbMs: number;
  sumDbQueries: number;
  totalWindow: number[];
  dbWindow: number[];
  cursor: number;
  lastSlowRequest: LastSlowRequestRef | null;
}

function createBucket(route: string): RouteBucket {
  return {
    route,
    count: 0,
    errors: 0,
    slowCount: 0,
    sumTotalMs: 0,
    maxMs: 0,
    sumDbMs: 0,
    maxDbMs: 0,
    sumDbQueries: 0,
    totalWindow: [],
    dbWindow: [],
    cursor: 0,
    lastSlowRequest: null,
  };
}

function nearestRankPercentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return roundMs(sorted[index]);
}

@Injectable()
export class RequestMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly startedAtMs = Date.now();
  private readonly buckets = new Map<string, RouteBucket>();
  private totalRequests = 0;
  private totalErrors = 0;
  private totalSlowRequests = 0;
  private summaryTimer: NodeJS.Timeout | null = null;

  constructor(
    @Optional() private readonly telemetryLogger?: RequestTelemetryLogger,
  ) {}

  onModuleInit(): void {
    const intervalMs = readObservabilityConfig().summaryIntervalMs;
    if (intervalMs > 0 && this.telemetryLogger) {
      this.summaryTimer = setInterval(() => {
        if (this.totalRequests === 0) return;
        const snapshot = this.getSnapshot(10);
        const summary: MetricsSummaryPayload = {
          generatedAt: snapshot.generatedAt,
          uptimeSeconds: snapshot.uptimeSeconds,
          totals: {
            requests: snapshot.totals.requests,
            errors: snapshot.totals.errors,
            slowRequests: snapshot.totals.slowRequests,
          },
          topSlowRoutes: snapshot.topSlowRoutes.map((route) => ({
            route: route.route,
            count: route.count,
            errors: route.errors,
            slowCount: route.slowCount,
            p50Ms: route.p50Ms,
            p95Ms: route.p95Ms,
            p99Ms: route.p99Ms,
            avgMs: route.avgMs,
            maxMs: route.maxMs,
            dbP95Ms: route.dbP95Ms,
            dbSharePercent: route.dbSharePercent,
          })),
        };
        this.telemetryLogger?.logMetricsSummary(summary);
      }, intervalMs);
      this.summaryTimer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }
  }

  reset(): void {
    this.buckets.clear();
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.totalSlowRequests = 0;
  }

  recordRequest(sample: RequestMetricSample): void {
    const totalMs = roundMs(sample.totalMs);
    const dbMs = roundMs(sample.dbMs);
    const dbQueryCount = Math.max(0, Math.trunc(sample.dbQueryCount));
    const isError = sample.statusCode >= 500;

    this.totalRequests += 1;
    if (isError) this.totalErrors += 1;
    if (sample.slow) this.totalSlowRequests += 1;

    const routeKey = this.resolveBucketKey(sample.route);
    let bucket = this.buckets.get(routeKey);
    if (!bucket) {
      bucket = createBucket(routeKey);
      this.buckets.set(routeKey, bucket);
    }

    bucket.count += 1;
    if (isError) bucket.errors += 1;
    if (sample.slow) {
      bucket.slowCount += 1;
      bucket.lastSlowRequest = {
        requestId: sample.requestId,
        traceId: sample.traceId,
        totalMs,
        dbMs,
        dbQueryCount,
        statusCode: sample.statusCode,
        recordedAt: new Date().toISOString(),
      };
    }

    bucket.sumTotalMs += totalMs;
    if (totalMs > bucket.maxMs) bucket.maxMs = totalMs;

    bucket.sumDbMs += dbMs;
    if (dbMs > bucket.maxDbMs) bucket.maxDbMs = dbMs;
    bucket.sumDbQueries += dbQueryCount;

    if (bucket.totalWindow.length < WINDOW_SIZE) {
      bucket.totalWindow.push(totalMs);
      bucket.dbWindow.push(dbMs);
    } else {
      bucket.totalWindow[bucket.cursor] = totalMs;
      bucket.dbWindow[bucket.cursor] = dbMs;
      bucket.cursor = (bucket.cursor + 1) % WINDOW_SIZE;
    }
  }

  getSnapshot(top = 10): PerformanceMetricsSnapshot {
    const config = readObservabilityConfig();
    const limit = Math.min(50, Math.max(1, Math.trunc(top) || 10));

    const routes: RoutePerformanceMetrics[] = Array.from(
      this.buckets.values(),
    ).map((bucket) => {
      const sortedTotal = [...bucket.totalWindow].sort((a, b) => a - b);
      const sortedDb = [...bucket.dbWindow].sort((a, b) => a - b);
      const count = bucket.count;
      return {
        route: bucket.route,
        count,
        errors: bucket.errors,
        slowCount: bucket.slowCount,
        sampleCount: sortedTotal.length,
        p50Ms: nearestRankPercentile(sortedTotal, 50),
        p95Ms: nearestRankPercentile(sortedTotal, 95),
        p99Ms: nearestRankPercentile(sortedTotal, 99),
        avgMs: roundMs(bucket.sumTotalMs / Math.max(1, count)),
        maxMs: roundMs(bucket.maxMs),
        dbP50Ms: nearestRankPercentile(sortedDb, 50),
        dbP95Ms: nearestRankPercentile(sortedDb, 95),
        dbMaxMs: roundMs(bucket.maxDbMs),
        avgDbQueries: roundMs(bucket.sumDbQueries / Math.max(1, count)),
        dbSharePercent: Math.min(
          100,
          roundMs((bucket.sumDbMs / Math.max(bucket.sumTotalMs, 0.001)) * 100),
        ),
        lastSlowRequest: bucket.lastSlowRequest,
      };
    });

    routes.sort(
      (a, b) => b.p95Ms - a.p95Ms || b.maxMs - a.maxMs || b.count - a.count,
    );

    return {
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.max(
        0,
        Math.floor((Date.now() - this.startedAtMs) / 1000),
      ),
      windowSizePerRoute: WINDOW_SIZE,
      slowRequestThresholdMs: config.slowRequestMs,
      slowQueryThresholdMs: config.slowQueryMs,
      totals: {
        requests: this.totalRequests,
        errors: this.totalErrors,
        slowRequests: this.totalSlowRequests,
        trackedRoutes: this.buckets.size,
      },
      topSlowRoutes: routes.slice(0, limit),
    };
  }

  private resolveBucketKey(route: string): string {
    const normalized = route.trim() || 'UNKNOWN /';
    if (this.buckets.has(normalized)) return normalized;
    if (this.buckets.size < MAX_ROUTES - 1) return normalized;
    return 'OTHER';
  }
}
