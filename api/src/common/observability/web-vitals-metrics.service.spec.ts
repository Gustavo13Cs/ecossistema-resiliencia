import { RequestTelemetryLogger } from './request-telemetry.logger';
import {
  classifyWebVitalRating,
  normalizeWebVitalRoute,
  roundWebVitalValue,
} from './web-vitals-routes';
import { WebVitalsMetricsService } from './web-vitals-metrics.service';

describe('web-vitals-routes & WebVitalsMetricsService', () => {
  it('normalizes routes strictly to the App Router allowlist and strips query/ids', () => {
    expect(normalizeWebVitalRoute('/')).toBe('/');
    expect(normalizeWebVitalRoute('/auth/login?next=/clientes')).toBe(
      '/auth/login',
    );
    expect(normalizeWebVitalRoute('/clientes/novo')).toBe('/clientes/novo');
    expect(
      normalizeWebVitalRoute('/clientes/11111111-1111-4111-8111-111111111111'),
    ).toBe('/clientes/:id');
    expect(
      normalizeWebVitalRoute(
        '/clientes/11111111-1111-4111-8111-111111111111/nova-dieta?patient=Maria',
      ),
    ).toBe('/clientes/:id/nova-dieta');
    expect(
      normalizeWebVitalRoute('/clientes/paciente-joao/rascunhos/draft-99/'),
    ).toBe('/clientes/:id/rascunhos/:draftId');
    expect(
      normalizeWebVitalRoute('/clientes/:id/treinos/:workoutId#semana-2'),
    ).toBe('/clientes/:id/treinos/:workoutId');
    expect(normalizeWebVitalRoute('/secret/patient-data?cpf=123')).toBe(
      '/other',
    );
    expect(normalizeWebVitalRoute('')).toBe('/other');
  });

  it('applies authoritative CWV thresholds and metric-specific rounding', () => {
    expect(classifyWebVitalRating('LCP', 2500)).toBe('good');
    expect(classifyWebVitalRating('LCP', 2501)).toBe('needs-improvement');
    expect(classifyWebVitalRating('LCP', 4001)).toBe('poor');
    expect(classifyWebVitalRating('INP', 200)).toBe('good');
    expect(classifyWebVitalRating('INP', 501)).toBe('poor');
    expect(classifyWebVitalRating('CLS', 0.1)).toBe('good');
    expect(classifyWebVitalRating('CLS', 0.251)).toBe('poor');
    expect(roundWebVitalValue('CLS', 0.042678)).toBe(0.0427);
    expect(roundWebVitalValue('LCP', 1234.567)).toBe(1234.57);
  });

  it('computes p50/p75/p95 across bounded sliding windows and filters by route and device', () => {
    const service = new WebVitalsMetricsService();

    // Feed 300 sequential values (1..300 ms) so ring buffer (256) retains 45..300
    service.recordBatch(
      Array.from({ length: 300 }, (_, index) => ({
        name: 'INP' as const,
        value: index + 1,
        route: '/clientes/999/nova-dieta',
        device: 'desktop' as const,
        navigationType: 'navigate' as const,
      })),
    );
    service.recordBatch([
      {
        name: 'LCP',
        value: 4300,
        route: '/clientes/999/nova-dieta',
        device: 'mobile',
        navigationType: 'navigate',
      },
      {
        name: 'CLS',
        value: 0.04,
        route: '/auth/login',
        device: 'mobile',
        navigationType: 'reload',
      },
    ]);

    const fullSnapshot = service.getSnapshot();
    expect(fullSnapshot.windowSizePerBucket).toBe(256);
    expect(fullSnapshot.availableRoutes).toEqual([
      '/auth/login',
      '/clientes/:id/nova-dieta',
    ]);
    expect(fullSnapshot.totals.samples).toBe(302);
    expect(fullSnapshot.summary.INP).toMatchObject({
      count: 300,
      sampleCount: 256,
      // Nearest-rank percentiles on 45..300 (256 items):
      // p50 -> index 127 => 172, p75 -> index 191 => 236, p95 -> index 243 => 288
      p50: 172,
      p75: 236,
      p95: 288,
      rating: 'needs-improvement',
    });
    expect(fullSnapshot.segments[0]).toMatchObject({
      route: '/clientes/:id/nova-dieta',
      device: 'mobile',
    });

    const filteredMobile = service.getSnapshot({
      route: '/clientes/any-id/nova-dieta?leak=1',
      device: 'mobile',
    });
    expect(filteredMobile.filters).toEqual({
      route: '/clientes/:id/nova-dieta',
      device: 'mobile',
    });
    expect(filteredMobile.totals.samples).toBe(1);
    expect(filteredMobile.segments).toHaveLength(1);
    expect(filteredMobile.summary.LCP?.p75).toBe(4300);
    expect(filteredMobile.summary.INP).toBeNull();
  });

  it('logs sanitized telemetry lines using metric key without leaking client ids or redacting metric name', () => {
    const lines: Array<{ line: string; level: string }> = [];
    const logger = new RequestTelemetryLogger((line, level) => {
      lines.push({ line, level });
    });
    const service = new WebVitalsMetricsService(logger);

    const prevMode = process.env.OBSERVABILITY_LOG_REQUESTS;
    process.env.OBSERVABILITY_LOG_REQUESTS = 'all';
    try {
      service.recordBatch([
        {
          name: 'LCP',
          value: 4500,
          route: '/clientes/secret-patient-uuid/visao-360?name=Maria',
          device: 'mobile',
          navigationType: 'navigate',
        },
        {
          name: 'CLS',
          value: 0.02,
          route: '/home',
          device: 'desktop',
        },
      ]);
    } finally {
      if (prevMode === undefined) delete process.env.OBSERVABILITY_LOG_REQUESTS;
      else process.env.OBSERVABILITY_LOG_REQUESTS = prevMode;
    }

    expect(lines).toHaveLength(2);
    expect(lines[0].level).toBe('warn');
    const first = JSON.parse(lines[0].line) as Record<string, unknown>;
    expect(first).toMatchObject({
      event: 'web_vital_recorded',
      metric: 'LCP',
      route: '/clientes/:id/visao-360',
      device: 'mobile',
      rating: 'poor',
      value: 4500,
      navigationType: 'navigate',
    });
    expect(lines[0].line).not.toContain('secret-patient-uuid');
    expect(lines[0].line).not.toContain('Maria');
    expect(lines[1].level).toBe('info');
  });
});
