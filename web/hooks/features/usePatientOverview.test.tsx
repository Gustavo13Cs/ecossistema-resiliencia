import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import { usePatientOverview } from "./usePatientOverview"

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: authState.user, isLoading: false, login: vi.fn(), logout: vi.fn() }),
}))

const http = new AxiosMockAdapter(api)
const overview = {
  client: {
    id: "client-1",
    name: "Ana Cliente",
    goal: null,
    allergies: null,
    pathologies: null,
    height: null,
    initialWeight: null,
    gender: null,
    birthDate: null,
  },
  activeDietPlan: null,
  activeWorkout: null,
  activeRehabPlan: null,
  latestAssessment: null,
  previousAssessment: null,
  weightDelta: null,
  latestLabExam: null,
  activeAlerts: [],
  latestPhysioAssessment: null,
  conflictWarning: null,
  recentTimeline: [],
}

function renderOverviewHook(clientId = "client-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return {
    queryClient,
    ...renderHook(() => usePatientOverview(clientId), { wrapper }),
  }
}

beforeEach(() => {
  authState.user = {
    sub: "professional-1",
    role: "NUTRITIONIST",
    name: "Dra. Carla",
  }
  http.reset()
})

afterEach(() => {
  cleanup()
  authState.user = null
})

describe("usePatientOverview", () => {
  it("loads the overview only from the owned Client endpoint", async () => {
    http.onGet("/clients/client-1/overview").reply(200, overview)
    const { queryClient, result } = renderOverviewHook()

    await waitFor(() => expect(result.current.overview).toEqual(overview))

    const requestedUrls = http.history.get.map((request) => request.url)
    expect(requestedUrls).toEqual(["/clients/client-1/overview"])
    expect(requestedUrls.some((url) => url?.startsWith("/users/"))).toBe(false)
    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
      ["patient-overview", "professional-1", "client-1"],
    ])
  })

  it("does not query without an authenticated professional", () => {
    authState.user = null
    const { result } = renderOverviewHook()

    expect(result.current.overview).toBeNull()
    expect(http.history.get).toHaveLength(0)
  })
})
