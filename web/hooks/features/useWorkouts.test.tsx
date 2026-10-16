import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useWorkouts } from "./useWorkouts"
const auth = vi.hoisted(() => ({ user: { sub: "pro-a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))
const prescription = { id: "w1", clientId: "c1", title: "Treino A", goal: null, createdAt: "2026-10-14T12:00:00.000Z", updatedAt: "2026-10-14T12:00:00.000Z", isActive: true, isTemplate: false, durationWeeks: null, notes: null, splits: [] }
const detail = { ...prescription, client: { id: "c1", name: "Aluno", status: "ACTIVE" } }
const input = { clientId: "c1", title: "Treino A", splits: [{ name: "A", exercises: [{ name: "Agachamento", sets: "3", reps: "10" }] }] }
describe("useWorkouts", () => {
  let http: AxiosMockAdapter
  const caches: QueryClient[] = []
  beforeEach(() => { auth.user = { sub: "pro-a", role: "PERSONAL" }; http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); caches.forEach(cache => cache.clear()); caches.length = 0; http.restore() })
  function setup(options: { clientId?: string; workoutId?: string; enabled?: boolean } = {}) {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }); caches.push(cache)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(props => useWorkouts(props), { initialProps: options, wrapper }) }
  }
  it("does_not_query_outside_personal_role", async () => {
    auth.user.role = "NUTRITIONIST"; setup(); setup({ clientId: "c1" }); setup({ clientId: "c1", workoutId: "w1" })
    await act(async () => {}); expect(http.history.get).toHaveLength(0)
  })
  it("does_not_query_before_owned_client_is_ready", async () => {
    setup({ clientId: "c1", workoutId: "w1", enabled: false }); setup({ workoutId: "w1" })
    await act(async () => {}); expect(http.history.get).toHaveLength(0)
  })
  it.each([
    [{}, "/workouts", "listQuery"],
    [{ clientId: "c1" }, "/workouts/client/c1/active", "activeQuery"],
    [{ clientId: "c1", workoutId: "w1" }, "/workouts/w1", "detailQuery"],
  ] as const)("only reads selected operation %j", async (options, url, operation) => {
    http.onGet(url).reply(200, operation === "listQuery" ? [detail] : operation === "detailQuery" ? detail : prescription)
    const { result } = setup(options)
    await waitFor(() => expect(result.current[operation].isSuccess).toBe(true))
    expect(http.history.get.map(entry => entry.url)).toEqual([url])
    expect(http.history.get[0].signal).toBeDefined()
    if (operation === "detailQuery") expect(result.current.detailQuery.data?.id).toBe("w1")
  })
  it("rejects detail belonging to a different Client", async () => {
    http.onGet("/workouts/w1").reply(200, { ...detail, clientId: "other" })
    const { result } = setup({ clientId: "c1", workoutId: "w1" })
    await waitFor(() => expect(result.current.detailQuery.isError).toBe(true))
    expect(result.current.detailQuery.data).toBeUndefined()
  })
  it("ignores late detail after Client switch", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/workouts/w1").reply(() => new Promise(resolve => { finish = resolve }))
    http.onGet("/workouts/w2").reply(200, { ...detail, id: "w2", clientId: "c2", client: { ...detail.client, id: "c2" } })
    const { result, rerender } = setup({ clientId: "c1", workoutId: "w1" })
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    rerender({ clientId: "c2", workoutId: "w2" })
    await waitFor(() => expect(result.current.detailQuery.data?.id).toBe("w2"))
    await act(async () => { finish([200, detail]) })
    expect(result.current.detailQuery.data?.id).toBe("w2")
    expect(http.history.get[0].signal?.aborted).toBe(true)
  })
  it.each([401, 403])("discards cached detail on %i", async status => {
    http.onGet("/workouts/w1").replyOnce(200, detail)
    http.onGet("/workouts/w1").reply(status); http.onGet("/auth/csrf").reply(401)
    const { result, cache } = setup({ clientId: "c1", workoutId: "w1" })
    await waitFor(() => expect(result.current.detailQuery.data?.id).toBe("w1"))
    await act(async () => { await result.current.detailQuery.refetch() })
    await waitFor(() => expect(result.current.detailQuery.error).toBeTruthy())
    expect(result.current.detailQuery.data).toBeUndefined()
    expect(cache.getQueryData(queryKeys.workout("pro-a", "c1", "w1"))).toBeNull()
  })
  it("preserves missing detail error and an empty active workout as different states", async () => {
    http.onGet("/workouts/w1").reply(404)
    http.onGet("/workouts/client/c1/active").reply(200, null)
    const { result, rerender } = setup({ clientId: "c1", workoutId: "w1" })
    await waitFor(() => expect(result.current.detailQuery.isError).toBe(true))
    rerender({ clientId: "c1" })
    await waitFor(() => expect(result.current.activeQuery.isSuccess).toBe(true))
    expect(result.current.activeQuery.data).toBeNull()
  })
  it("invalidates_training_views_after_mutation", async () => {
    http.onPost("/workouts").reply(201, prescription)
    const { result, cache } = setup({ enabled: false })
    const affected = [queryKeys.trainingWorkspace("pro-a"), queryKeys.workouts("pro-a"), queryKeys.trainingOverview("pro-a", "c1"), queryKeys.activeWorkout("pro-a", "c1"), queryKeys.workout("pro-a", "c1", "w1")]
    const isolated = [queryKeys.trainingWorkspace("pro-b"), queryKeys.trainingOverview("pro-a", "c2")]
    ;[...affected, ...isolated].forEach(key => cache.setQueryData(key, { marker: "old" }))
    await act(async () => { expect(await result.current.createMutation.mutateAsync(input)).toEqual(prescription) })
    affected.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(true))
    isolated.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(false))
    expect(http.history.post[0].data).toBe(JSON.stringify(input))
  })
  it("rejects create outside Personal before HTTP", async () => {
    auth.user.role = "NUTRITIONIST"
    const { result } = setup({ enabled: false })
    await act(async () => { await expect(result.current.createMutation.mutateAsync(input)).rejects.toThrow() })
    expect(http.history.post).toHaveLength(0)
  })
})
