import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import HomePage from "@/app/home/page"
import { api } from "@/lib/api"
import type { WebVitalsSnapshot } from "@/types/observability"
import { AdminWebVitalsDashboard } from "./AdminWebVitalsDashboard"

const mockUseAuth = vi.fn()

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/components/features/dashboard/ProfessionalDashboard", () => ({
  ProfessionalDashboard: () => <div data-testid="professional-dashboard" />,
}))

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const SAMPLE_SNAPSHOT: WebVitalsSnapshot = {
  generatedAt: "2026-11-21T16:40:00.000Z",
  windowSizePerBucket: 256,
  availableRoutes: ["/", "/clientes/:id/nova-dieta"],
  filters: { route: null, device: null },
  totals: {
    samples: 6,
    goodSamples: 4,
    needsImprovementSamples: 1,
    poorSamples: 1,
    trackedRoutes: 2,
    trackedSegments: 2,
  },
  summary: {
    LCP: {
      count: 2,
      sampleCount: 2,
      p50: 1420,
      p75: 2950,
      p95: 2950,
      avg: 2185,
      max: 2950,
      goodPercent: 50,
      rating: "needs-improvement",
    },
    INP: {
      count: 2,
      sampleCount: 2,
      p50: 120,
      p75: 180,
      p95: 180,
      avg: 150,
      max: 180,
      goodPercent: 100,
      rating: "good",
    },
    CLS: {
      count: 2,
      sampleCount: 2,
      p50: 0.04,
      p75: 0.042,
      p95: 0.042,
      avg: 0.041,
      max: 0.042,
      goodPercent: 100,
      rating: "good",
    },
    FCP: null,
    TTFB: null,
  },
  byDevice: [
    {
      device: "desktop",
      samples: 3,
      metrics: {
        LCP: {
          count: 1,
          sampleCount: 1,
          p50: 1420,
          p75: 1420,
          p95: 1420,
          avg: 1420,
          max: 1420,
          goodPercent: 100,
          rating: "good",
        },
        INP: {
          count: 1,
          sampleCount: 1,
          p50: 120,
          p75: 120,
          p95: 120,
          avg: 120,
          max: 120,
          goodPercent: 100,
          rating: "good",
        },
        CLS: {
          count: 1,
          sampleCount: 1,
          p50: 0.04,
          p75: 0.04,
          p95: 0.04,
          avg: 0.04,
          max: 0.04,
          goodPercent: 100,
          rating: "good",
        },
        FCP: null,
        TTFB: null,
      },
    },
    {
      device: "tablet",
      samples: 0,
      metrics: { LCP: null, INP: null, CLS: null, FCP: null, TTFB: null },
    },
    {
      device: "mobile",
      samples: 3,
      metrics: {
        LCP: {
          count: 1,
          sampleCount: 1,
          p50: 2950,
          p75: 2950,
          p95: 2950,
          avg: 2950,
          max: 2950,
          goodPercent: 0,
          rating: "needs-improvement",
        },
        INP: {
          count: 1,
          sampleCount: 1,
          p50: 180,
          p75: 180,
          p95: 180,
          avg: 180,
          max: 180,
          goodPercent: 100,
          rating: "good",
        },
        CLS: {
          count: 1,
          sampleCount: 1,
          p50: 0.042,
          p75: 0.042,
          p95: 0.042,
          avg: 0.042,
          max: 0.042,
          goodPercent: 100,
          rating: "good",
        },
        FCP: null,
        TTFB: null,
      },
    },
  ],
  segments: [
    {
      route: "/clientes/:id/nova-dieta",
      device: "mobile",
      samples: 3,
      poorSamples: 0,
      needsImprovementSamples: 1,
      lastRecordedAt: "2026-11-21T16:40:00.000Z",
      metrics: {
        LCP: {
          count: 1,
          sampleCount: 1,
          p50: 2950,
          p75: 2950,
          p95: 2950,
          avg: 2950,
          max: 2950,
          goodPercent: 0,
          rating: "needs-improvement",
        },
        INP: {
          count: 1,
          sampleCount: 1,
          p50: 180,
          p75: 180,
          p95: 180,
          avg: 180,
          max: 180,
          goodPercent: 100,
          rating: "good",
        },
        CLS: {
          count: 1,
          sampleCount: 1,
          p50: 0.042,
          p75: 0.042,
          p95: 0.042,
          avg: 0.042,
          max: 0.042,
          goodPercent: 100,
          rating: "good",
        },
        FCP: null,
        TTFB: null,
      },
    },
    {
      route: "/",
      device: "desktop",
      samples: 3,
      poorSamples: 0,
      needsImprovementSamples: 0,
      lastRecordedAt: "2026-11-21T16:39:00.000Z",
      metrics: {
        LCP: {
          count: 1,
          sampleCount: 1,
          p50: 1420,
          p75: 1420,
          p95: 1420,
          avg: 1420,
          max: 1420,
          goodPercent: 100,
          rating: "good",
        },
        INP: {
          count: 1,
          sampleCount: 1,
          p50: 120,
          p75: 120,
          p95: 120,
          avg: 120,
          max: 120,
          goodPercent: 100,
          rating: "good",
        },
        CLS: {
          count: 1,
          sampleCount: 1,
          p50: 0.04,
          p75: 0.04,
          p95: 0.04,
          avg: 0.04,
          max: 0.04,
          goodPercent: 100,
          rating: "good",
        },
        FCP: null,
        TTFB: null,
      },
    },
  ],
}

describe("AdminWebVitalsDashboard & HomePage integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseAuth.mockReturnValue({
      user: { sub: "admin-1", role: "ADMIN", name: "Admin SafeMove" },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("renders segmented Web Vitals metrics and filters by device and route", async () => {
    const user = userEvent.setup()
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: SAMPLE_SNAPSHOT,
    })

    render(<AdminWebVitalsDashboard />, { wrapper: createWrapper() })

    expect(
      await screen.findByText("Web Vitals em produção (RUM)"),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole("cell", { name: "/clientes/:id/nova-dieta" }),
    ).toBeInTheDocument()
    expect(screen.getAllByText("2.950 ms").length).toBeGreaterThan(0)
    expect(screen.getAllByText("0,042").length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "Mobile" }))
    await waitFor(() =>
      expect(getSpy).toHaveBeenCalledWith("/observability/web-vitals", {
        params: { top: 25, device: "mobile" },
      }),
    )

    await user.selectOptions(
      screen.getByLabelText("Filtrar por rota"),
      "/clientes/:id/nova-dieta",
    )
    await waitFor(() =>
      expect(getSpy).toHaveBeenCalledWith("/observability/web-vitals", {
        params: {
          top: 25,
          device: "mobile",
          route: "/clientes/:id/nova-dieta",
        },
      }),
    )
  })

  it("renders honest empty state and recoverable error retry without synthetic data", async () => {
    const user = userEvent.setup()
    const getSpy = vi
      .spyOn(api, "get")
      .mockRejectedValueOnce(new Error("Server error"))
      .mockResolvedValueOnce({
        data: {
          ...SAMPLE_SNAPSHOT,
          availableRoutes: [],
          totals: {
            samples: 0,
            goodSamples: 0,
            needsImprovementSamples: 0,
            poorSamples: 0,
            trackedRoutes: 0,
            trackedSegments: 0,
          },
          segments: [],
        } satisfies WebVitalsSnapshot,
      })

    render(<AdminWebVitalsDashboard />, { wrapper: createWrapper() })

    expect(
      await screen.findByText("Não foi possível carregar os Web Vitals"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(
      await screen.findByText("Nenhuma métrica Web Vitals recebida ainda"),
    ).toBeInTheDocument()
    expect(getSpy).toHaveBeenCalledTimes(2)
  })

  it("mounts AdminWebVitalsDashboard in HomePage only for ADMIN while preserving registration E2E invariants", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: SAMPLE_SNAPSHOT,
    })

    const { container, rerender } = render(<HomePage />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText("Painel administrativo")).toBeInTheDocument()
    expect(
      await screen.findByText("Web Vitals em produção (RUM)"),
    ).toBeInTheDocument()
    expect(container.querySelector("aside")).toBeNull()
    expect(screen.queryByText("Clientes")).toBeNull()

    mockUseAuth.mockReturnValue({
      user: { sub: "nutri-1", role: "NUTRITIONIST", name: "Dra. Nutri" },
    })
    getSpy.mockClear()
    rerender(<HomePage />)

    expect(screen.getByTestId("professional-dashboard")).toBeInTheDocument()
    expect(getSpy).not.toHaveBeenCalled()
  })
})
