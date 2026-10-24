import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { useWorkoutTemplates } from "./useWorkoutTemplates"
const auth = vi.hoisted(() => ({ user: { sub: "a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
const template = { id: "t1", title: "Base", isGlobal: false, content: { splits: [] } }
const draft = { id: "d1", clientId: "c1", status: "OPEN" }
describe("useWorkoutTemplates", () => {
  let http: AxiosMockAdapter
  const caches: QueryClient[] = []
  beforeEach(() => { auth.user = { sub: "a", role: "PERSONAL" }; http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); caches.forEach(cache => cache.clear()); caches.length = 0; http.restore() })
  function setup(options: Parameters<typeof useWorkoutTemplates>[0] = {}, sharedCache?: QueryClient) {
    const cache = sharedCache ?? new QueryClient({ defaultOptions: { queries: { retry: false } } }); caches.push(cache)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(props => useWorkoutTemplates(props), { initialProps: options, wrapper }) }
  }
  it("reads filtered pages and preview with abort signal and validates detail identity", async () => {
    http.onGet("/workouts/templates").reply(200, { items: [template], nextCursor: "next" })
    http.onGet("/workouts/templates/t1").reply(200, template)
    http.onGet("/workouts/templates/bad").reply(200, template)
    const { result, rerender } = setup({ filters: { origin: "global", goal: "STRENGTH", level: "BEGINNER" }, cursor: "page" })
    await waitFor(() => expect(result.current.listQuery.data?.nextCursor).toBe("next"))
    expect(http.history.get[0].params).toEqual({ origin: "global", goal: "STRENGTH", level: "BEGINNER", cursor: "page", limit: 20 })
    expect(http.history.get[0].signal).toBeDefined()
    rerender({ templateId: "t1" }); await waitFor(() => expect(result.current.detailQuery.data?.id).toBe("t1"))
    rerender({ templateId: "bad" }); await waitFor(() => expect(result.current.detailQuery.isError).toBe(true))
  })
  it("imports only a draft and saves snapshot with exact payload and client checks", async () => {
    http.onPost("/workouts/templates/t1/create-draft").reply(201, draft)
    http.onPost("/workouts/templates/from-workout/w1").reply(201, { clientId: "c1", template })
    const { result } = setup({ clientId: "c1", workoutId: "w1", enabled: false })
    await act(async () => { expect(await result.current.importMutation.mutateAsync("t1")).toMatchObject(draft) })
    const input = { title: "Base", goal: "STRENGTH" as const, level: "BEGINNER" as const }
    await act(async () => { expect(await result.current.saveMutation.mutateAsync(input)).toMatchObject({ template }) })
    expect(http.history.post.map(r => [r.url, JSON.parse(r.data)])).toEqual([["/workouts/templates/t1/create-draft", { clientId: "c1" }], ["/workouts/templates/from-workout/w1", input]])
    http.onPost("/workouts/templates/t1/create-draft").reply(201, { ...draft, clientId: "c2" })
    await act(async () => { await expect(result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
  })
  it("verifies OPEN conflict before exposing recovery and rejects wrong client", async () => {
    http.onPost("/workouts/templates/t1/create-draft").reply(409, { code: "DRAFT_EXISTS", id: "d1", clientId: "c1" })
    http.onGet("/workouts/drafts/d1").reply(200, draft)
    const { result } = setup({ clientId: "c1", enabled: false })
    await act(async () => { await expect(result.current.importMutation.mutateAsync("t1")).resolves.toMatchObject(draft) })
    http.onGet("/workouts/drafts/d1").reply(200, { ...draft, clientId: "c2" })
    await act(async () => { await expect(result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
  })
  it.each(["import", "save"] as const)("rejects late %s after account change and resets mutation payload", async operation => {
    let finish!: (value: [number, unknown]) => void
    http.onPost(/templates/).reply(() => new Promise(resolve => { finish = resolve }))
    const { result, rerender } = setup({ clientId: "c1", workoutId: "w1", enabled: false })
    let pending!: Promise<unknown>
    await act(async () => { pending = (operation === "import" ? result.current.importMutation.mutateAsync("t1") : result.current.saveMutation.mutateAsync({ title: "Private A", goal: "STRENGTH", level: "BEGINNER" })).catch(error => error) })
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    auth.user = { sub: "b", role: "PERSONAL" }; rerender({ clientId: "c1", workoutId: "w1", enabled: false })
    await waitFor(() => expect(result.current.saveMutation.variables).toBeUndefined())
    expect(http.history.post[0].signal?.aborted).toBe(true)
    await act(async () => { finish([201, operation === "import" ? draft : { clientId: "c1", template }]); expect(await pending).toBeInstanceOf(Error) })
    expect(result.current.importMutation.data).toBeUndefined(); expect(result.current.saveMutation.data).toBeUndefined()
  })
  it("rejects a delayed mutation after changing Client and blocks non PERSONAL calls", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onPost(/templates/).reply(() => new Promise(resolve => { finish = resolve }))
    const { result, rerender } = setup({ clientId: "c1", enabled: false })
    let pending!: Promise<unknown>
    await act(async () => { pending = result.current.importMutation.mutateAsync("t1").catch(error => error) })
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    rerender({ clientId: "c2", enabled: false })
    expect(http.history.post[0].signal?.aborted).toBe(true)
    await act(async () => { finish([201, draft]); expect(await pending).toBeInstanceOf(Error) })
    auth.user.role = "NUTRITIONIST"; rerender({ clientId: "c2", enabled: false })
    expect(http.history.post[0].signal?.aborted).toBe(true)
    await act(async () => { await expect(result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
    expect(http.history.post).toHaveLength(1)
  })
  it("denial in a peer cancels late private reads and prevents manual refetch and new writes", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/workouts/templates/t1").reply(() => new Promise(resolve => { finish = resolve }))
    http.onPost(/templates/).reply(403)
    const first = setup({ templateId: "t1", clientId: "c1" })
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    const peer = setup({ clientId: "c1", enabled: false }, first.cache)
    await act(async () => { await expect(peer.result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
    await act(async () => { finish([200, template]) })
    await waitFor(() => expect(first.result.current.accessDenied).toBe(true))
    expect(first.result.current.detailQuery.data).toBeUndefined()
    expect(http.history.get[0].signal?.aborted).toBe(true)
    await act(async () => { await first.result.current.detailQuery.refetch(); await expect(first.result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
    expect(http.history.get).toHaveLength(1); expect(http.history.post).toHaveLength(1)
  })
  it("clears private payload and notifies access state when refresh ends with 401", async () => {
    http.onGet("/workouts/templates").reply(200, { items: [template], nextCursor: null })
    http.onPost(/templates/).reply(401)
    http.onGet("/auth/csrf").reply(401)
    const { result } = setup({ clientId: "c1" })
    await waitFor(() => expect(result.current.listQuery.data?.items[0].title).toBe("Base"))
    await act(async () => { await expect(result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
    await waitFor(() => expect(result.current.accessDenied).toBe(true))
    expect(result.current.listQuery.data).toBeUndefined()
    expect(result.current.importMutation.variables).toBeUndefined()
  })
  it("aborts old account read and clears owner data on 403", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/workouts/templates").replyOnce(() => new Promise(resolve => { finish = resolve }))
    http.onGet("/workouts/templates").reply(200, { items: [{ ...template, title: "B" }], nextCursor: null })
    const { result, rerender, cache } = setup()
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    auth.user = { sub: "b", role: "PERSONAL" }; rerender({})
    await waitFor(() => expect(result.current.listQuery.data?.items[0].title).toBe("B"))
    await act(async () => { finish([200, { items: [template], nextCursor: null }]) })
    expect(http.history.get[0].signal?.aborted).toBe(true)
    http.onPost(/templates/).reply(403)
    rerender({ clientId: "c1" })
    await act(async () => { await expect(result.current.importMutation.mutateAsync("t1")).rejects.toThrow() })
    await waitFor(() => expect(result.current.accessDenied).toBe(true))
    expect(result.current.listQuery.data).toBeUndefined()
    expect(cache.getQueryData(["workout-templates", "b", "list", {}, "first"])).toBeNull()
  })
})
