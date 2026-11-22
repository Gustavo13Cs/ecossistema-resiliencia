import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  detectDeviceCategory,
  formatWebVitalValue,
  isSupportedWebVitalName,
  isWebVitalsEndpointUnavailable,
  normalizeNavigationType,
  normalizeWebVitalRoute,
  resetWebVitalsEndpointAvailability,
  sendWebVitalsBatch,
  WEB_VITAL_ENDPOINT,
} from "./web-vitals"

describe("web-vitals helpers", () => {
  beforeEach(() => {
    resetWebVitalsEndpointAvailability()
  })

  afterEach(() => {
    resetWebVitalsEndpointAvailability()
  })
  it("normalizes static, dynamic client, and unknown routes without clinical identifiers", () => {
    expect(normalizeWebVitalRoute("/")).toBe("/")
    expect(normalizeWebVitalRoute("/auth/register?ref=home#form")).toBe(
      "/auth/register",
    )
    expect(normalizeWebVitalRoute("/clientes/novo")).toBe("/clientes/novo")
    expect(
      normalizeWebVitalRoute(
        "/clientes/11111111-1111-4111-8111-111111111111/nova-dieta?q=whey",
      ),
    ).toBe("/clientes/:id/nova-dieta")
    expect(
      normalizeWebVitalRoute("/clientes/abc/treinos/wrk-12"),
    ).toBe("/clientes/:id/treinos/:workoutId")
    expect(normalizeWebVitalRoute("/rota-desconhecida/123")).toBe("/other")
  })

  it("classifies desktop, tablet, and mobile viewports", () => {
    expect(detectDeviceCategory(390)).toBe("mobile")
    expect(detectDeviceCategory(767)).toBe("mobile")
    expect(detectDeviceCategory(768)).toBe("tablet")
    expect(detectDeviceCategory(1023)).toBe("tablet")
    expect(detectDeviceCategory(1024)).toBe("desktop")
    expect(detectDeviceCategory(1440)).toBe("desktop")
  })

  it("validates metric names, formats pt-BR values, and ignores invalid entries", () => {
    expect(isSupportedWebVitalName("LCP")).toBe(true)
    expect(isSupportedWebVitalName("INP")).toBe(true)
    expect(isSupportedWebVitalName("CLS")).toBe(true)
    expect(isSupportedWebVitalName("FCP")).toBe(true)
    expect(isSupportedWebVitalName("TTFB")).toBe(true)
    expect(isSupportedWebVitalName("FID")).toBe(false)

    expect(normalizeNavigationType("back-forward-cache")).toBe(
      "back-forward-cache",
    )
    expect(normalizeNavigationType("custom")).toBe("unknown")

    expect(formatWebVitalValue("LCP", 2420.4)).toBe("2.420 ms")
    expect(formatWebVitalValue("CLS", 0.0423)).toBe("0,042")
    expect(formatWebVitalValue("INP", null)).toBe("—")
  })

  it("sends batches with credentials omitted, keepalive enabled, and swallows failures silently", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockRejectedValueOnce(new Error("offline"))

    await sendWebVitalsBatch(
      [
        {
          name: "LCP",
          value: 1450,
          route: "/",
          device: "desktop",
        },
      ],
      fetchMock,
    )

    expect(fetchMock).toHaveBeenCalledWith(WEB_VITAL_ENDPOINT, {
      method: "POST",
      keepalive: true,
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics: [
          {
            name: "LCP",
            value: 1450,
            route: "/",
            device: "desktop",
          },
        ],
      }),
    })

    await expect(
      sendWebVitalsBatch(
        [{ name: "CLS", value: 0.02, route: "/home", device: "mobile" }],
        fetchMock,
      ),
    ).resolves.toBeUndefined()
  })

  it("disables subsequent RUM requests after 404/405 but keeps retrying across transient 5xx or network errors", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))

    const item = { name: "LCP" as const, value: 1200, route: "/", device: "desktop" as const }

    await sendWebVitalsBatch([item], fetchMock)
    expect(isWebVitalsEndpointUnavailable()).toBe(false)

    await sendWebVitalsBatch([item], fetchMock)
    expect(isWebVitalsEndpointUnavailable()).toBe(false)

    await sendWebVitalsBatch([item], fetchMock)
    expect(isWebVitalsEndpointUnavailable()).toBe(true)

    await sendWebVitalsBatch([item], fetchMock)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
