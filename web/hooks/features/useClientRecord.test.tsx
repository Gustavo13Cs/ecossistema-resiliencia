import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import type { Client } from "@/types/client"
import { useClientRecord } from "./useClientRecord"

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: authState.user, isLoading: false, login: vi.fn(), logout: vi.fn() }),
}))

const http = new AxiosMockAdapter(api)

const client: Client = {
  id: "client-one",
  professionalId: "professional-one",
  name: "Marina Lopes",
  email: null,
  phone: null,
  birthDate: null,
  gender: null,
  goal: null,
  height: null,
  initialWeight: null,
  allergies: null,
  pathologies: null,
  typicalSleep: null,
  stressLevel: null,
  foodRelationship: null,
  psychologyHistory: null,
  exerciseType: null,
  exerciseFrequency: null,
  exerciseDuration: null,
  hasPersonal: null,
  workActivityLevel: null,
  professionalNotes: null,
  privacyNotes: null,
  status: "ACTIVE",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-09-03T12:00:00.000Z",
}

const renderRecordHook = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(() => useClientRecord("client-one"), { wrapper }) }
}

beforeEach(() => {
  authState.user = { sub: "professional-one", role: "PHYSIO", name: "Ana Lima" }
  http.reset()
})

afterEach(() => {
  cleanup()
  authState.user = null
})

describe("useClientRecord", () => {
  it("requests exactly the authorized Client snapshot with a session-scoped key", async () => {
    http.onGet("/clients/client-one").reply(200, client)
    const { queryClient, result } = renderRecordHook()

    await waitFor(() => expect(result.current.status).toBe("ready"))

    expect(result.current.client).toEqual(client)
    expect(http.history.get.map((request) => request.url)).toEqual(["/clients/client-one"])
    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
      ["client", "professional-one", "client-one"],
    ])
  })

  it.each([
    [404, "not-found"],
    [401, "unauthorized"],
    [403, "unauthorized"],
    [503, "server-error"],
  ] as const)("maps HTTP %s to %s without a legacy fallback", async (statusCode, expectedStatus) => {
    http.onGet("/clients/client-one").reply(statusCode)
    const { result } = renderRecordHook()

    await waitFor(() => expect(result.current.status).toBe(expectedStatus))

    expect(result.current.client).toBeNull()
    expect(http.history.get.map((request) => request.url)).toEqual(["/clients/client-one"])
  })

  it("preserves network failure instead of converting it to empty data", async () => {
    http.onGet("/clients/client-one").networkError()
    const { result } = renderRecordHook()

    await waitFor(() => expect(result.current.status).toBe("network-error"))
    expect(result.current.client).toBeNull()
    expect(http.history.get).toHaveLength(1)
  })

  it("does not query without an authenticated professional session", () => {
    authState.user = null
    const { result } = renderRecordHook()

    expect(result.current.status).toBe("unauthorized")
    expect(http.history.get).toHaveLength(0)
  })
})
