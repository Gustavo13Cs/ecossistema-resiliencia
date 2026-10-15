import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useClientAssessments } from "./useClientAssessments"
const auth = vi.hoisted(() => ({ user: { sub: "pro-a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))
const assessment = { id: "a1", clientId: "c1", userId: null, date: "2026-10-14T12:00:00.000Z", weight: null, bodyFat: null, muscleMass: null, waist: null, abdomen: null, hips: null, thorax: null, armLeft: null, armRight: null, thighLeft: null, thighRight: null, calfLeft: null, calfRight: null, skinfoldTriceps: null, skinfoldSubscapular: null, skinfoldChest: null, skinfoldAxillary: null, skinfoldSuprailiac: null, skinfoldAbdominal: null, skinfoldThigh: null, benchPress1RM: 60, squat1RM: null, deadlift1RM: null, vo2Max: null, notes: null, createdAt: "2026-10-14T12:00:00.000Z", updatedAt: "2026-10-14T12:00:00.000Z" }
describe("useClientAssessments", () => {
  let http: AxiosMockAdapter
  const caches: QueryClient[] = []
  beforeEach(() => { auth.user = { sub: "pro-a", role: "PERSONAL" }; http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); caches.forEach(cache => cache.clear()); caches.length = 0; http.restore() })
  function setup(enabled = true) {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }); caches.push(cache)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(({ id }) => useClientAssessments(id, { enabled }), { initialProps: { id: "c1" }, wrapper }) }
  }
  it("rejects a non-clinical role for reads and writes", async () => {
    auth.user.role = "ADMIN"
    const { result } = setup()
    await act(async () => {})
    expect(http.history.get).toHaveLength(0)
    await act(async () => { await expect(result.current.createMutation.mutateAsync({ benchPress1RM: 60 })).rejects.toThrow() })
    expect(http.history.post).toHaveLength(0)
  })
  it("does_not_query_before_owned_client_is_ready", async () => { setup(false); await act(async () => {}); expect(http.history.get).toHaveLength(0) })
  it.each(["PERSONAL", "NUTRITIONIST", "PHYSIO"])("preserves shared %s assessment reads and real strength fields", async role => {
    auth.user.role = role; http.onGet("/assessments/client/c1").reply(200, [assessment])
    const { result } = setup()
    await waitFor(() => expect(result.current.assessments).toEqual([assessment]))
    expect(result.current.assessments[0].benchPress1RM).toBe(60)
    expect(http.history.get[0].signal).toBeDefined()
  })
  it.each([401, 403])("discards cached assessments on %i", async status => {
    http.onGet("/assessments/client/c1").replyOnce(200, [assessment])
    http.onGet("/assessments/client/c1").reply(status); http.onGet("/auth/csrf").reply(401)
    const { result, cache } = setup()
    await waitFor(() => expect(result.current.assessments).toHaveLength(1))
    await act(async () => { await result.current.refetch() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.assessments).toEqual([])
    expect(cache.getQueryData(queryKeys.assessments("pro-a", "c1"))).toBeNull()
  })
  it("ignores late assessments after Client switch and distinguishes cancellation from empty data", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/assessments/client/c1").reply(() => new Promise(resolve => { finish = resolve }))
    http.onGet("/assessments/client/c2").reply(200, [{ ...assessment, id: "a2", clientId: "c2" }])
    const { result, rerender, cache } = setup()
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    rerender({ id: "c2" })
    await waitFor(() => expect(result.current.assessments[0]?.id).toBe("a2"))
    await act(async () => { finish([200, [assessment]]) })
    expect(result.current.assessments[0]?.id).toBe("a2")
    expect(http.history.get[0].signal?.aborted).toBe(true)
    expect(cache.getQueryData(queryKeys.assessments("pro-a", "c1"))).toBeUndefined()
  })
  it("does not treat an assessment 404 as an empty successful read", async () => {
    http.onGet("/assessments/client/c1").reply(404)
    const { result } = setup()
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.assessments).toEqual([])
    expect(result.current.loading).toBe(false)
  })
  it("invalidates assessments and overview after a strength-only assessment", async () => {
    http.onPost("/assessments").reply(201, assessment)
    const { result, cache } = setup(false)
    const affected = [queryKeys.assessments("pro-a", "c1"), queryKeys.trainingOverview("pro-a", "c1"), queryKeys.patientOverview("pro-a", "c1")]
    const isolated = [queryKeys.assessments("pro-b", "c1"), queryKeys.trainingOverview("pro-a", "c2")]
    ;[...affected, ...isolated].forEach(key => cache.setQueryData(key, { marker: "old" }))
    await act(async () => { await result.current.createMutation.mutateAsync({ benchPress1RM: 60 }) })
    expect(JSON.parse(http.history.post[0].data)).toEqual({ clientId: "c1", benchPress1RM: 60 })
    affected.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(true))
    isolated.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(false))
  })
})
