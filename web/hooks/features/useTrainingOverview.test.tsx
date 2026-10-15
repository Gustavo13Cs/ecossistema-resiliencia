import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useTrainingOverview } from "./useTrainingOverview"
const auth = vi.hoisted(() => ({ user: { sub: "pro-a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))
const overview = (id: string) => ({ client: { id, status: "ACTIVE" }, activeWorkout: null, recentAssessments: [] })
describe("useTrainingOverview", () => {
  let http: AxiosMockAdapter
  const caches: QueryClient[] = []
  beforeEach(() => { auth.user = { sub: "pro-a", role: "PERSONAL" }; http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); caches.forEach(cache => cache.clear()); caches.length = 0; http.restore() })
  function setup(id?: string, enabled = true) {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }); caches.push(cache)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(({ id, enabled }) => useTrainingOverview(id, { enabled }), { initialProps: { id, enabled }, wrapper }) }
  }
  it("does_not_query_before_owned_client_is_ready", async () => {
    setup("c1", false); setup()
    await act(async () => {}); expect(http.history.get).toHaveLength(0)
  })
  it("does_not_query_outside_personal_role", async () => {
    auth.user.role = "NUTRITIONIST"; setup("c1")
    await act(async () => {}); expect(http.history.get).toHaveLength(0)
  })
  it("scopes overview and forwards cancellation", async () => {
    http.onGet("/workouts/client/c1/overview").reply(200, overview("c1"))
    const { result } = setup("c1")
    await waitFor(() => expect(result.current.data).toEqual(overview("c1")))
    expect(http.history.get[0].signal).toBeDefined()
    expect(queryKeys.trainingOverview("pro-a", "c1")).not.toEqual(queryKeys.trainingOverview("pro-b", "c1"))
  })
  it("ignores late Client response without replacing current Client", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/workouts/client/c1/overview").reply(() => new Promise(resolve => { finish = resolve }))
    http.onGet("/workouts/client/c2/overview").reply(200, overview("c2"))
    const { result, rerender } = setup("c1")
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    rerender({ id: "c2", enabled: true })
    await waitFor(() => expect(result.current.data?.client.id).toBe("c2"))
    await act(async () => { finish([200, overview("c1")]) })
    expect(result.current.data?.client.id).toBe("c2")
    expect(http.history.get[0].signal?.aborted).toBe(true)
  })
  it("preserves 404 as an error", async () => {
    http.onGet("/workouts/client/missing/overview").reply(404)
    const { result } = setup("missing")
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
  it.each([401, 403])("discards prior overview on %i", async status => {
    http.onGet("/workouts/client/c1/overview").replyOnce(200, overview("c1"))
    http.onGet("/workouts/client/c1/overview").reply(status)
    http.onGet("/auth/csrf").reply(401)
    const { result, cache } = setup("c1")
    await waitFor(() => expect(result.current.data).toBeTruthy())
    await act(async () => { await result.current.refetch() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.data).toBeUndefined()
    expect(cache.getQueryData(queryKeys.trainingOverview("pro-a", "c1"))).toBeNull()
  })
})
