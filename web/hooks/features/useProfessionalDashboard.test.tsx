import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import type { Client, ClientStatus } from "@/types/client"
import { useProfessionalDashboard } from "./useProfessionalDashboard"

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const http = new AxiosMockAdapter(api)

const makeClient = (
  id: string,
  status: ClientStatus,
  updatedAt: string,
): Client => ({
  id,
  professionalId: "professional-one",
  name: `Cliente ${id}`,
  email: `${id}@example.test`,
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
  status,
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt,
})

const renderDashboardHook = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return {
    queryClient,
    ...renderHook(() => useProfessionalDashboard(), { wrapper }),
  }
}

const replyWithEmptyLists = () => {
  http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [])
  http.onGet("/clients", { params: { status: "ARCHIVED" } }).reply(200, [])
}

describe("useProfessionalDashboard", () => {
  beforeEach(() => {
    authState.user = {
      sub: "professional-one",
      role: "NUTRITIONIST",
      name: "Ana Lima",
      email: "ana@example.test",
    }
    http.reset()
  })

  afterEach(() => {
    cleanup()
    authState.user = null
  })

  it("derives honest counts and the five most recently updated active clients", async () => {
    const activeClients = [
      makeClient("invalid-first", "ACTIVE", "not-a-date"),
      makeClient("older", "ACTIVE", "2026-08-20T12:00:00.000Z"),
      makeClient("latest", "ACTIVE", "2026-08-30T12:00:00.000Z"),
      makeClient("invalid-second", "ACTIVE", "also-invalid"),
      makeClient("middle", "ACTIVE", "2026-08-25T12:00:00.000Z"),
      makeClient("invalid-third", "ACTIVE", "invalid-three"),
    ]
    const archivedClients = [
      makeClient("archived", "ARCHIVED", "2026-08-10T12:00:00.000Z"),
    ]
    http
      .onGet("/clients", { params: { status: "ACTIVE" } })
      .reply(200, activeClients)
    http
      .onGet("/clients", { params: { status: "ARCHIVED" } })
      .reply(200, archivedClients)

    const { result } = renderDashboardHook()

    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current.activeClients).toHaveLength(6)
    expect(result.current.archivedClients).toHaveLength(1)
    expect(result.current.recentClients.map((client) => client.id)).toEqual([
      "latest",
      "middle",
      "older",
      "invalid-first",
      "invalid-second",
    ])
  })

  it("keeps both client queries scoped to the signed-in session", async () => {
    replyWithEmptyLists()

    const { queryClient, result } = renderDashboardHook()

    await waitFor(() => expect(result.current.status).toBe("empty"))
    expect(
      queryClient.getQueryCache().getAll().map((query) => query.queryKey),
    ).toEqual([
      ["clients", "professional-one", "ACTIVE"],
      ["clients", "professional-one", "ARCHIVED"],
    ])
  })

  it("reports loading while the real client queries are in flight", () => {
    replyWithEmptyLists()

    const { result } = renderDashboardHook()

    expect(result.current.status).toBe("loading")
  })

  it("reports empty only after both real lists load successfully without records", async () => {
    replyWithEmptyLists()

    const { result } = renderDashboardHook()

    await waitFor(() => expect(result.current.status).toBe("empty"))
  })

  it.each([401, 403, 404])(
    "maps HTTP %s to the private unavailable state instead of empty data",
    async (statusCode) => {
      http
        .onGet("/clients", { params: { status: "ACTIVE" } })
        .reply(statusCode)
      http
        .onGet("/clients", { params: { status: "ARCHIVED" } })
        .reply(200, [])

      const { result } = renderDashboardHook()

      await waitFor(() => expect(result.current.status).toBe("unauthorized"))
      expect(result.current.status).not.toBe("empty")
    },
  )

  it("distinguishes a network failure from an empty client base", async () => {
    http
      .onGet("/clients", { params: { status: "ACTIVE" } })
      .networkError()
    http
      .onGet("/clients", { params: { status: "ARCHIVED" } })
      .reply(200, [])

    const { result } = renderDashboardHook()

    await waitFor(() => expect(result.current.status).toBe("network-error"))
    expect(result.current.status).not.toBe("empty")
  })

  it("distinguishes a server failure from an empty client base", async () => {
    http
      .onGet("/clients", { params: { status: "ACTIVE" } })
      .reply(503)
    http
      .onGet("/clients", { params: { status: "ARCHIVED" } })
      .reply(200, [])

    const { result } = renderDashboardHook()

    await waitFor(() => expect(result.current.status).toBe("server-error"))
    expect(result.current.status).not.toBe("empty")
  })
})
