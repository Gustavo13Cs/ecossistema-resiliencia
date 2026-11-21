import { RequestMetricsService } from './request-metrics.service';
import { RequestTelemetryLogger } from './request-telemetry.logger';

describe('RequestMetricsService', () => {
  it('computes p50, p95, p99, averages, DB share, and top slow routes order', () => {
    const metrics = new RequestMetricsService();

    for (let i = 1; i <= 100; i += 1) {
      metrics.recordRequest({
        route: 'GET /clients',
        statusCode: 200,
        totalMs: i,
        dbMs: i * 0.5,
        dbQueryCount: 2,
        slow: i >= 95,
        requestId: `req-clients-${i}`,
        traceId: `trace-clients-${i}`,
      });
    }

    metrics.recordRequest({
      route: 'GET /lab-exams',
      statusCode: 500,
      totalMs: 450,
      dbMs: 400,
      dbQueryCount: 5,
      slow: true,
      requestId: 'req-labs-1',
      traceId: 'trace-labs-1',
    });

    const snapshot = metrics.getSnapshot(10);
    expect(snapshot.totals).toEqual({
      requests: 101,
      errors: 1,
      slowRequests: 7,
      trackedRoutes: 2,
    });

    expect(snapshot.topSlowRoutes).toHaveLength(2);
    expect(snapshot.topSlowRoutes[0]).toMatchObject({
      route: 'GET /lab-exams',
      count: 1,
      errors: 1,
      slowCount: 1,
      p50Ms: 450,
      p95Ms: 450,
      p99Ms: 450,
      maxMs: 450,
      dbP95Ms: 400,
      avgDbQueries: 5,
      dbSharePercent: 88.89,
      lastSlowRequest: {
        requestId: 'req-labs-1',
        traceId: 'trace-labs-1',
        totalMs: 450,
        dbMs: 400,
        dbQueryCount: 5,
        statusCode: 500,
      },
    });

    expect(snapshot.topSlowRoutes[1]).toMatchObject({
      route: 'GET /clients',
      count: 100,
      errors: 0,
      slowCount: 6,
      p50Ms: 50,
      p95Ms: 95,
      p99Ms: 99,
      avgMs: 50.5,
      maxMs: 100,
      dbP50Ms: 25,
      dbP95Ms: 47.5,
      dbSharePercent: 50,
      lastSlowRequest: {
        requestId: 'req-clients-100',
        traceId: 'trace-clients-100',
      },
    });
  });

  it('bounds per-route sample window to 256 and caps tracked routes at 200', () => {
    const metrics = new RequestMetricsService();

    for (let i = 1; i <= 300; i += 1) {
      metrics.recordRequest({
        route: 'GET /clients/:id/overview',
        statusCode: 200,
        totalMs: i,
        dbMs: 10,
        dbQueryCount: 1,
        slow: false,
        requestId: `req-${i}`,
        traceId: `trace-${i}`,
      });
    }

    for (let i = 1; i <= 210; i += 1) {
      metrics.recordRequest({
        route: `GET /synthetic-route-${i}`,
        statusCode: 200,
        totalMs: 5,
        dbMs: 1,
        dbQueryCount: 1,
        slow: false,
        requestId: `req-r-${i}`,
        traceId: `trace-r-${i}`,
      });
    }

    const snapshot = metrics.getSnapshot(50);
    expect(snapshot.windowSizePerRoute).toBe(256);
    expect(snapshot.totals.trackedRoutes).toBe(200);
    expect(
      snapshot.topSlowRoutes.find(
        (r) => r.route === 'GET /clients/:id/overview',
      ),
    ).toMatchObject({
      count: 300,
      sampleCount: 256,
      p50Ms: 172,
    });
  });

  it('emits periodic summary when configured and clears interval on destroy', () => {
    jest.useFakeTimers();
    const prevInterval = process.env.OBSERVABILITY_SUMMARY_INTERVAL_MS;
    process.env.OBSERVABILITY_SUMMARY_INTERVAL_MS = '10000';
    const clearSpy = jest.spyOn(global, 'clearInterval');

    const lines: string[] = [];
    const logger = new RequestTelemetryLogger((line) => lines.push(line));
    const metrics = new RequestMetricsService(logger);

    try {
      metrics.onModuleInit();
      metrics.recordRequest({
        route: 'GET /clients',
        statusCode: 200,
        totalMs: 25,
        dbMs: 12,
        dbQueryCount: 2,
        slow: false,
        requestId: 'req-1',
        traceId: 'trace-1',
      });

      jest.advanceTimersByTime(10_000);
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toMatchObject({
        event: 'http_metrics_summary',
        totals: { requests: 1, errors: 0, slowRequests: 0 },
      });

      metrics.onModuleDestroy();
      expect(clearSpy).toHaveBeenCalledTimes(1);
    } finally {
      metrics.onModuleDestroy();
      clearSpy.mockRestore();
      jest.useRealTimers();
      if (prevInterval === undefined) {
        delete process.env.OBSERVABILITY_SUMMARY_INTERVAL_MS;
      } else {
        process.env.OBSERVABILITY_SUMMARY_INTERVAL_MS = prevInterval;
      }
    }
  });
});
