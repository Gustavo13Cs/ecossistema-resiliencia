export type WebVitalMetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB"

export type WebVitalDeviceCategory = "desktop" | "tablet" | "mobile"

export type WebVitalRating = "good" | "needs-improvement" | "poor"

export type WebVitalNavigationType =
  | "navigate"
  | "reload"
  | "back-forward"
  | "back-forward-cache"
  | "prerender"
  | "restore"
  | "unknown"

export interface WebVitalReportItem {
  name: WebVitalMetricName
  value: number
  delta?: number
  route: string
  device: WebVitalDeviceCategory
  rating?: WebVitalRating
  navigationType?: WebVitalNavigationType
}

export interface WebVitalMetricStats {
  count: number
  sampleCount: number
  p50: number
  p75: number
  p95: number
  avg: number
  max: number
  goodPercent: number
  rating: WebVitalRating
}

export interface WebVitalDeviceBreakdown {
  device: WebVitalDeviceCategory
  samples: number
  metrics: Record<WebVitalMetricName, WebVitalMetricStats | null>
}

export interface WebVitalRouteSegment {
  route: string
  device: WebVitalDeviceCategory
  samples: number
  poorSamples: number
  needsImprovementSamples: number
  lastRecordedAt: string
  metrics: Record<WebVitalMetricName, WebVitalMetricStats | null>
}

export interface WebVitalsSnapshot {
  generatedAt: string
  windowSizePerBucket: number
  availableRoutes: string[]
  filters: {
    route: string | null
    device: WebVitalDeviceCategory | null
  }
  totals: {
    samples: number
    goodSamples: number
    needsImprovementSamples: number
    poorSamples: number
    trackedRoutes: number
    trackedSegments: number
  }
  summary: Record<WebVitalMetricName, WebVitalMetricStats | null>
  byDevice: WebVitalDeviceBreakdown[]
  segments: WebVitalRouteSegment[]
}
