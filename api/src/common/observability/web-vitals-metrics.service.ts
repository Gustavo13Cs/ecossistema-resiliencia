import { Injectable, Optional } from '@nestjs/common';
import { RequestTelemetryLogger } from './request-telemetry.logger';
import {
  classifyWebVitalRating,
  normalizeWebVitalRoute,
  roundWebVitalValue,
  WEB_VITAL_DEVICES,
  WEB_VITAL_METRICS,
  type WebVitalDeviceCategory,
  type WebVitalMetricName,
  type WebVitalNavigationType,
  type WebVitalRating,
} from './web-vitals-routes';

export interface WebVitalInput {
  name: WebVitalMetricName;
  value: number;
  route: string;
  device: WebVitalDeviceCategory;
  navigationType?: WebVitalNavigationType;
}

export interface WebVitalMetricStats {
  count: number;
  sampleCount: number;
  p50: number;
  p75: number;
  p95: number;
  avg: number;
  max: number;
  goodPercent: number;
  rating: WebVitalRating;
}

export interface WebVitalDeviceBreakdown {
  device: WebVitalDeviceCategory;
  samples: number;
  metrics: Record<WebVitalMetricName, WebVitalMetricStats | null>;
}

export interface WebVitalRouteSegment {
  route: string;
  device: WebVitalDeviceCategory;
  samples: number;
  poorSamples: number;
  needsImprovementSamples: number;
  lastRecordedAt: string;
  metrics: Record<WebVitalMetricName, WebVitalMetricStats | null>;
}

export interface WebVitalsSnapshot {
  generatedAt: string;
  windowSizePerBucket: number;
  availableRoutes: string[];
  filters: {
    route: string | null;
    device: WebVitalDeviceCategory | null;
  };
  totals: {
    samples: number;
    goodSamples: number;
    needsImprovementSamples: number;
    poorSamples: number;
    trackedRoutes: number;
    trackedSegments: number;
  };
  summary: Record<WebVitalMetricName, WebVitalMetricStats | null>;
  byDevice: WebVitalDeviceBreakdown[];
  segments: WebVitalRouteSegment[];
}

const WINDOW_SIZE = 256;

interface MetricBucket {
  route: string;
  device: WebVitalDeviceCategory;
  metric: WebVitalMetricName;
  count: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
  sum: number;
  max: number;
  window: number[];
  cursor: number;
  lastRecordedAt: string;
}

function nearestRankPercentile(
  sorted: readonly number[],
  p: number,
  metric: WebVitalMetricName,
): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return roundWebVitalValue(metric, sorted[index]);
}

function emptyMetricMap(): Record<
  WebVitalMetricName,
  WebVitalMetricStats | null
> {
  return {
    LCP: null,
    INP: null,
    CLS: null,
    FCP: null,
    TTFB: null,
  };
}

function aggregateBucketStats(
  metric: WebVitalMetricName,
  buckets: readonly MetricBucket[],
): WebVitalMetricStats | null {
  if (buckets.length === 0) return null;

  let count = 0;
  let goodCount = 0;
  let sum = 0;
  let max = 0;
  const samples: number[] = [];

  for (const bucket of buckets) {
    count += bucket.count;
    goodCount += bucket.goodCount;
    sum += bucket.sum;
    if (bucket.max > max) max = bucket.max;
    for (const sample of bucket.window) {
      samples.push(sample);
    }
  }

  if (count === 0) return null;

  const sorted = samples.sort((a, b) => a - b);
  const p50 = nearestRankPercentile(sorted, 50, metric);
  const p75 = nearestRankPercentile(sorted, 75, metric);
  const p95 = nearestRankPercentile(sorted, 95, metric);

  return {
    count,
    sampleCount: sorted.length,
    p50,
    p75,
    p95,
    avg: roundWebVitalValue(metric, sum / count),
    max: roundWebVitalValue(metric, max),
    goodPercent: Math.round((goodCount / count) * 1000) / 10,
    rating: classifyWebVitalRating(metric, p75),
  };
}

function severityScore(segment: WebVitalRouteSegment): number {
  let score = segment.poorSamples * 10 + segment.needsImprovementSamples * 2;
  for (const metricName of ['LCP', 'INP', 'CLS'] as const) {
    const rating = segment.metrics[metricName]?.rating;
    if (rating === 'poor') score += 10_000;
    else if (rating === 'needs-improvement') score += 1_000;
  }
  return score;
}

@Injectable()
export class WebVitalsMetricsService {
  private readonly buckets = new Map<string, MetricBucket>();

  constructor(
    @Optional() private readonly telemetryLogger?: RequestTelemetryLogger,
  ) {}

  reset(): void {
    this.buckets.clear();
  }

  recordBatch(items: readonly WebVitalInput[]): number {
    const recordedAt = new Date().toISOString();

    for (const item of items) {
      const route = normalizeWebVitalRoute(item.route);
      const value = roundWebVitalValue(item.name, item.value);
      const rating = classifyWebVitalRating(item.name, value);
      const key = `${route}|${item.device}|${item.name}`;

      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = {
          route,
          device: item.device,
          metric: item.name,
          count: 0,
          goodCount: 0,
          needsImprovementCount: 0,
          poorCount: 0,
          sum: 0,
          max: 0,
          window: [],
          cursor: 0,
          lastRecordedAt: recordedAt,
        };
        this.buckets.set(key, bucket);
      }

      bucket.count += 1;
      if (rating === 'good') bucket.goodCount += 1;
      else if (rating === 'needs-improvement')
        bucket.needsImprovementCount += 1;
      else bucket.poorCount += 1;

      bucket.sum += value;
      if (value > bucket.max) bucket.max = value;
      bucket.lastRecordedAt = recordedAt;

      if (bucket.window.length < WINDOW_SIZE) {
        bucket.window.push(value);
      } else {
        bucket.window[bucket.cursor] = value;
        bucket.cursor = (bucket.cursor + 1) % WINDOW_SIZE;
      }

      this.telemetryLogger?.logWebVital({
        metric: item.name,
        route,
        device: item.device,
        rating,
        value,
        navigationType: item.navigationType ?? 'unknown',
      });
    }

    return items.length;
  }

  getSnapshot(filters?: {
    route?: string;
    device?: WebVitalDeviceCategory;
    top?: number;
  }): WebVitalsSnapshot {
    const routeFilter = filters?.route
      ? normalizeWebVitalRoute(filters.route)
      : null;
    const deviceFilter = filters?.device ?? null;
    const limit = Math.min(
      50,
      Math.max(1, Math.trunc(filters?.top ?? 25) || 25),
    );

    const allBuckets = Array.from(this.buckets.values());
    const availableRoutes = Array.from(
      new Set(allBuckets.map((bucket) => bucket.route)),
    ).sort((a, b) => a.localeCompare(b));

    const matchingBuckets = allBuckets.filter((bucket) => {
      if (routeFilter && bucket.route !== routeFilter) return false;
      if (deviceFilter && bucket.device !== deviceFilter) return false;
      return true;
    });

    const summary = emptyMetricMap();
    for (const metricName of WEB_VITAL_METRICS) {
      summary[metricName] = aggregateBucketStats(
        metricName,
        matchingBuckets.filter((bucket) => bucket.metric === metricName),
      );
    }

    const byDevice: WebVitalDeviceBreakdown[] = WEB_VITAL_DEVICES.map(
      (device) => {
        const deviceBuckets = allBuckets.filter(
          (bucket) =>
            bucket.device === device &&
            (!routeFilter || bucket.route === routeFilter),
        );
        const metrics = emptyMetricMap();
        for (const metricName of WEB_VITAL_METRICS) {
          metrics[metricName] = aggregateBucketStats(
            metricName,
            deviceBuckets.filter((bucket) => bucket.metric === metricName),
          );
        }
        return {
          device,
          samples: deviceBuckets.reduce((acc, b) => acc + b.count, 0),
          metrics,
        };
      },
    );

    const segmentBuckets = new Map<string, MetricBucket[]>();
    for (const bucket of matchingBuckets) {
      const segKey = `${bucket.route}|${bucket.device}`;
      const list = segmentBuckets.get(segKey);
      if (list) list.push(bucket);
      else segmentBuckets.set(segKey, [bucket]);
    }

    const segments: WebVitalRouteSegment[] = Array.from(
      segmentBuckets.values(),
    ).map((group) => {
      const first = group[0];
      const metrics = emptyMetricMap();
      for (const metricName of WEB_VITAL_METRICS) {
        metrics[metricName] = aggregateBucketStats(
          metricName,
          group.filter((bucket) => bucket.metric === metricName),
        );
      }
      let samples = 0;
      let poorSamples = 0;
      let needsImprovementSamples = 0;
      let lastRecordedAt = first.lastRecordedAt;

      for (const bucket of group) {
        samples += bucket.count;
        poorSamples += bucket.poorCount;
        needsImprovementSamples += bucket.needsImprovementCount;
        if (bucket.lastRecordedAt > lastRecordedAt) {
          lastRecordedAt = bucket.lastRecordedAt;
        }
      }

      return {
        route: first.route,
        device: first.device,
        samples,
        poorSamples,
        needsImprovementSamples,
        lastRecordedAt,
        metrics,
      };
    });

    segments.sort((a, b) => {
      const severityDiff = severityScore(b) - severityScore(a);
      if (severityDiff !== 0) return severityDiff;
      const lcpDiff = (b.metrics.LCP?.p75 ?? 0) - (a.metrics.LCP?.p75 ?? 0);
      if (lcpDiff !== 0) return lcpDiff;
      const inpDiff = (b.metrics.INP?.p75 ?? 0) - (a.metrics.INP?.p75 ?? 0);
      if (inpDiff !== 0) return inpDiff;
      const clsDiff = (b.metrics.CLS?.p75 ?? 0) - (a.metrics.CLS?.p75 ?? 0);
      if (clsDiff !== 0) return clsDiff;
      const sampleDiff = b.samples - a.samples;
      if (sampleDiff !== 0) return sampleDiff;
      return a.route.localeCompare(b.route);
    });

    let totalSamples = 0;
    let goodSamples = 0;
    let needsImprovementSamples = 0;
    let poorSamples = 0;
    const trackedRouteSet = new Set<string>();

    for (const bucket of matchingBuckets) {
      totalSamples += bucket.count;
      goodSamples += bucket.goodCount;
      needsImprovementSamples += bucket.needsImprovementCount;
      poorSamples += bucket.poorCount;
      trackedRouteSet.add(bucket.route);
    }

    return {
      generatedAt: new Date().toISOString(),
      windowSizePerBucket: WINDOW_SIZE,
      availableRoutes,
      filters: {
        route: routeFilter,
        device: deviceFilter,
      },
      totals: {
        samples: totalSamples,
        goodSamples,
        needsImprovementSamples,
        poorSamples,
        trackedRoutes: trackedRouteSet.size,
        trackedSegments: segments.length,
      },
      summary,
      byDevice,
      segments: segments.slice(0, limit),
    };
  }
}
