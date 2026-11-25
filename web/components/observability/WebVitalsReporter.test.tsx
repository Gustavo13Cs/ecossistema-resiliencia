import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { WebVitalsReporter } from "./WebVitalsReporter"
import {
  resetWebVitalsEndpointAvailability,
  WEB_VITAL_ENDPOINT,
} from "@/lib/web-vitals"

let mockPathname = "/"
const useReportWebVitalsSpy = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}))

vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (callback: (metric: unknown) => void) => {
    useReportWebVitalsSpy(callback)
  },
}))

describe("WebVitalsReporter", () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    vi.useFakeTimers()
    resetWebVitalsEndpointAvailability()
    useReportWebVitalsSpy.mockReset()
    mockPathname = "/"
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    })
  })

  afterEach(() => {
    cleanup()
    resetWebVitalsEndpointAvailability()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it("keeps callback reference stable across SPA navigations, normalizes routes, ignores FID, and flushes via fetch keepalive", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal("fetch", fetchMock)
    const localGetSpy = vi.spyOn(Storage.prototype, "getItem")

    const { rerender, unmount } = render(<WebVitalsReporter enabled />)
    expect(useReportWebVitalsSpy).toHaveBeenCalledTimes(1)
    const initialCallback = useReportWebVitalsSpy.mock.calls[0]?.[0] as (
      metric: unknown,
    ) => void

    // SPA navigation to sensitive patient detail page should not re-register observer
    mockPathname = "/clientes/11111111-1111-4111-8111-111111111111/nova-dieta"
    rerender(<WebVitalsReporter enabled />)
    expect(useReportWebVitalsSpy.mock.calls[1]?.[0]).toBe(initialCallback)

    act(() => {
      // Deprecated FID should be ignored
      initialCallback({
        id: "fid-1",
        name: "FID",
        value: 12,
        rating: "good",
        delta: 12,
        navigationType: "navigate",
        entries: [],
      })
      // Hard-load LCP belongs to initial route "/"
      initialCallback({
        id: "lcp-1",
        name: "LCP",
        value: 1480.4,
        rating: "good",
        delta: 1480.4,
        navigationType: "navigate",
        entries: [],
      })
      // Interaction INP belongs to current normalized route
      initialCallback({
        id: "inp-1",
        name: "INP",
        value: 110,
        rating: "good",
        delta: 110,
        navigationType: "navigate",
        entries: [],
      })
      // Identical duplicate should not send twice once flushed
    })

    // Flush via timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]!
    expect(fetchMock.mock.calls[0]?.[0]).toBe(WEB_VITAL_ENDPOINT)
    expect(init?.credentials).toBe("omit")
    expect(init?.keepalive).toBe(true)
    const payload = JSON.parse(String(init?.body)) as {
      metrics: Array<{ name: string; route: string; device: string; value: number }>
    }
    expect(payload.metrics).toEqual([
      expect.objectContaining({
        name: "LCP",
        route: "/",
        device: "mobile",
        value: 1480.4,
      }),
      expect.objectContaining({
        name: "INP",
        route: "/clientes/:id/nova-dieta",
        device: "mobile",
        value: 110,
      }),
    ])

    // Duplicate lcp-1 emission with same route & value must be ignored
    act(() => {
      initialCallback({
        id: "lcp-1",
        name: "LCP",
        value: 1480.4,
        rating: "good",
        delta: 1480.4,
        navigationType: "navigate",
        entries: [],
      })
      initialCallback({
        id: "cls-1",
        name: "CLS",
        value: 0.035,
        rating: "good",
        delta: 0.035,
        navigationType: "navigate",
        entries: [],
      })
    })

    // Hidden visibility flushes immediately without waiting for timer
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondPayload = JSON.parse(
      String(fetchMock.mock.calls[1]?.[1]?.body),
    ) as {
      metrics: Array<{ name: string; route: string }>
    }
    expect(secondPayload.metrics).toEqual([
      expect.objectContaining({
        name: "CLS",
        route: "/clientes/:id/nova-dieta",
      }),
    ])
    expect(localGetSpy).not.toHaveBeenCalled()

    unmount()
  })

  it("flushes immediately on batch threshold 5 and handles offline rejections silently", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("Network error"))
    vi.stubGlobal("fetch", fetchMock)
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    })

    render(<WebVitalsReporter enabled />)
    const callback = useReportWebVitalsSpy.mock.calls[0]?.[0] as (
      metric: unknown,
    ) => void

    await act(async () => {
      for (const [index, name] of (
        ["TTFB", "FCP", "LCP", "INP", "CLS"] as const
      ).entries()) {
        callback({
          id: `id-${index}`,
          name,
          value: name === "CLS" ? 0.01 : 100 + index,
          rating: "good",
          delta: name === "CLS" ? 0.01 : 100 + index,
          navigationType: "navigate",
          entries: [],
        })
      }
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("stops queueing and sending further batches once the endpoint returns 404", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }))
    vi.stubGlobal("fetch", fetchMock)

    const { unmount } = render(<WebVitalsReporter enabled />)
    const callback = useReportWebVitalsSpy.mock.calls[0]?.[0] as (
      metric: unknown,
    ) => void

    act(() => {
      callback({
        id: "lcp-404",
        name: "LCP",
        value: 950,
        rating: "good",
        delta: 950,
        navigationType: "navigate",
        entries: [],
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    act(() => {
      callback({
        id: "cls-after-404",
        name: "CLS",
        value: 0.02,
        rating: "good",
        delta: 0.02,
        navigationType: "navigate",
        entries: [],
      })
    })

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    })
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    unmount()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
