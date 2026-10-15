import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useTrainingWorkspace } from "./useTrainingWorkspace"

const auth = vi.hoisted(() => ({ user: { sub: "pro-a", role: "PERSONAL" } as { sub: string; role: string } | null }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))
const workspace = { counts: { activeStudents: 1, archivedStudents: 0, withoutActiveWorkout: 1 }, items: [{ clientId: "c1", name: "Aluno A", goal: null, updatedAt: "2026-10-14T12:00:00.000Z", section: "RECENT" }] }

describe("useTrainingWorkspace", () => {
  let http: AxiosMockAdapter
  const caches: QueryClient[] = []
  beforeEach(() => { auth.user = { sub: "pro-a", role: "PERSONAL" }; http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); caches.forEach(cache => cache.clear()); caches.length = 0; http.restore() })
  function setup() {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }); caches.push(cache)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(() => useTrainingWorkspace(), { wrapper }) }
  }
  it("does_not_query_outside_personal_role", async () => {
    auth.user = { sub: "nutrition", role: "NUTRITIONIST" }; setup()
    await act(async () => {}); expect(http.history.get).toHaveLength(0)
  })
  it("fetches workspace with signal and session key", async () => {
    http.onGet("/workouts/workspace").reply(200, workspace)
    const { result, cache } = setup()
    await waitFor(() => expect(result.current.data).toEqual(workspace))
    expect(http.history.get[0].signal).toBeDefined()
    expect(cache.getQueryData(["training-workspace", "pro-a"])).toEqual(workspace)
  })
  it("ignores_late_response_after_account_switch", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/workouts/workspace").replyOnce(() => new Promise(resolve => { finish = resolve }))
    http.onGet("/workouts/workspace").reply(200, { ...workspace, items: [] })
    const { result, rerender, cache } = setup()
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    auth.user = { sub: "pro-b", role: "PERSONAL" }; rerender()
    await waitFor(() => expect(result.current.data?.items).toEqual([]))
    await act(async () => { finish([200, workspace]) })
    expect(result.current.data?.items).toEqual([])
    expect(http.history.get[0].signal?.aborted).toBe(true)
    expect(cache.getQueryData(queryKeys.trainingWorkspace("pro-a"))).toBeUndefined()
  })
  it.each([401, 403])("removes cached workspace after %i", async status => {
    http.onGet("/workouts/workspace").replyOnce(200, workspace)
    http.onGet("/workouts/workspace").reply(status)
    http.onGet("/auth/csrf").reply(401)
    const { result, cache } = setup()
    await waitFor(() => expect(result.current.data).toEqual(workspace))
    await act(async () => { await result.current.refetch() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.data).toBeUndefined()
    expect(cache.getQueryData(queryKeys.trainingWorkspace("pro-a"))).toBeNull()
  })
  it("hides cached workspace when role loses permission", async () => {
    http.onGet("/workouts/workspace").reply(200, workspace)
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.data).toEqual(workspace))
    auth.user = { sub: "pro-a", role: "PHYSIO" }; rerender()
    expect(result.current.data).toBeUndefined()
  })
})
