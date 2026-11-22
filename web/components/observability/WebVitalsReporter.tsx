"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useReportWebVitals } from "next/web-vitals"
import type {
  WebVitalMetricName,
  WebVitalRating,
  WebVitalReportItem,
} from "@/types/observability"
import {
  detectDeviceCategory,
  isSupportedWebVitalName,
  isWebVitalsEndpointUnavailable,
  normalizeNavigationType,
  normalizeWebVitalRoute,
  roundWebVitalValue,
  sendWebVitalsBatch,
} from "@/lib/web-vitals"

const FLUSH_INTERVAL_MS = 2000
const MAX_BATCH_SIZE = 10
const HARD_LOAD_METRICS = new Set<WebVitalMetricName>(["TTFB", "FCP", "LCP"])
const VALID_RATINGS = new Set<string>(["good", "needs-improvement", "poor"])

type ReportWebVitalsMetric = Parameters<
  Parameters<typeof useReportWebVitals>[0]
>[0]

function toValidRating(rating?: string): WebVitalRating | undefined {
  if (rating && VALID_RATINGS.has(rating)) {
    return rating as WebVitalRating
  }
  return undefined
}

export function WebVitalsReporter({
  enabled = process.env.NODE_ENV !== "test" &&
    process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED !== "false",
}: {
  enabled?: boolean
}) {
  const pathname = usePathname()
  const enabledRef = useRef(enabled)
  const pathnameRef = useRef(pathname)
  const initialRouteRef = useRef(normalizeWebVitalRoute(pathname))
  const queueRef = useRef<Map<string, WebVitalReportItem>>(new Map())
  const sentSignatureRef = useRef<Map<string, string>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  const clearFlushTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(() => {
    clearFlushTimer()
    if (
      !enabledRef.current ||
      isWebVitalsEndpointUnavailable() ||
      queueRef.current.size === 0
    ) {
      queueRef.current.clear()
      return
    }

    const entries = Array.from(queueRef.current.entries())
    queueRef.current.clear()

    for (let offset = 0; offset < entries.length; offset += MAX_BATCH_SIZE) {
      const slice = entries.slice(offset, offset + MAX_BATCH_SIZE)
      const batch: WebVitalReportItem[] = []
      for (const [metricId, item] of slice) {
        sentSignatureRef.current.set(metricId, `${item.route}:${item.value}`)
        batch.push(item)
      }
      void sendWebVitalsBatch(batch)
    }
  }, [clearFlushTimer])

  const handleWebVital = useCallback(
    (metric: ReportWebVitalsMetric) => {
      if (
        !enabledRef.current ||
        isWebVitalsEndpointUnavailable() ||
        typeof window === "undefined"
      ) {
        return
      }
      if (!isSupportedWebVitalName(metric.name)) {
        return
      }
      if (!Number.isFinite(metric.value) || metric.value < 0) {
        return
      }

      const route = HARD_LOAD_METRICS.has(metric.name)
        ? initialRouteRef.current
        : normalizeWebVitalRoute(pathnameRef.current)
      const value = Math.min(60_000, roundWebVitalValue(metric.name, metric.value))
      if (metric.name === "CLS" && value > 100) {
        return
      }

      const signature = `${route}:${value}`
      if (sentSignatureRef.current.get(metric.id) === signature) {
        return
      }

      const delta =
        typeof metric.delta === "number" &&
        Number.isFinite(metric.delta) &&
        metric.delta >= 0
          ? Math.min(60_000, roundWebVitalValue(metric.name, metric.delta))
          : undefined

      const item: WebVitalReportItem = {
        name: metric.name,
        value,
        ...(delta !== undefined ? { delta } : {}),
        route,
        device: detectDeviceCategory(window.innerWidth),
        rating: toValidRating(metric.rating),
        navigationType: normalizeNavigationType(metric.navigationType),
      }

      queueRef.current.set(metric.id, item)

      if (queueRef.current.size >= 5) {
        flush()
        return
      }

      if (timerRef.current === null) {
        timerRef.current = setTimeout(flush, FLUSH_INTERVAL_MS)
      }
    },
    [flush],
  )

  useReportWebVitals(handleWebVital)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush()
      }
    }
    const handlePageHide = () => {
      flush()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      flush()
    }
  }, [flush])

  return null
}
