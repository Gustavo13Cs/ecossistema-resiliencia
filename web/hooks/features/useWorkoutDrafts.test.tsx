import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useWorkoutDrafts } from "./useWorkoutDrafts"
const auth = vi.hoisted(() => ({ user: { sub: "pro-a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))
const content = { title: "", goal: "", durationWeeks: null, notes: "", splits: [] }
const draft = { id: "d1", clientId: "c1", status: "OPEN", version: 1, schemaVersion: 1, content, sourceWorkoutId: null, baseActiveWorkoutId: null, finalizedWorkoutId: null, createdAt: "2026-10-17T12:00:00Z", updatedAt: "2026-10-17T12:00:00Z", closedAt: null }

describe("useWorkoutDrafts", () => {
  let http: AxiosMockAdapter
  const caches: QueryClient[] = []
  beforeEach(() => { auth.user = { sub: "pro-a", role: "PERSONAL" }; http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); caches.forEach(cache => cache.clear()); caches.length = 0; http.restore() })
  function setup(options: { clientId?: string; draftId?: string; cursor?: string; enabled?: boolean } = {}, sharedCache?: QueryClient) {
    const cache = sharedCache ?? new QueryClient({ defaultOptions: { queries: { retry: false } } }); if (!sharedCache) caches.push(cache)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(props => useWorkoutDrafts(props), { initialProps: options, wrapper }) }
  }
  it("reads_selected_operation_with_signal_and_pagination", async () => {
    http.onGet("/workouts/drafts").reply(200, { items: [], nextCursor: null })
    const { result, rerender } = setup({ clientId: "c1", cursor: "cursor" })
    await waitFor(() => expect(result.current.listQuery.isSuccess).toBe(true))
    expect(http.history.get[0].params).toEqual({ clientId: "c1", cursor: "cursor", limit: 20 })
    expect(http.history.get[0].signal).toBeDefined()
    http.onGet("/workouts/drafts/d1").reply(200, draft)
    rerender({ clientId: "c1", draftId: "d1" })
    await waitFor(() => expect(result.current.detailQuery.data?.id).toBe("d1"))
    expect(http.history.get).toHaveLength(2)
  })
  it.each(["unmount", "change_options"] as const)("shared_read_succeeds_for_remaining_observer_after_initiator_%s", async departure => {
    let finish!: (response: [number, unknown]) => void
    http.onGet("/workouts/drafts/d1").reply(() => new Promise(resolve => { finish = resolve }))
    const initiator = setup({ clientId: "c1", draftId: "d1" })
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    const remaining = setup({ clientId: "c1", draftId: "d1" }, initiator.cache)
    expect(remaining.result.current.detailQuery.isFetching).toBe(true)

    if (departure === "unmount") initiator.unmount()
    else initiator.rerender({ clientId: "c2", draftId: "d2", enabled: false })
    expect(http.history.get[0].signal?.aborted).toBe(false)
    await act(async () => { finish([200, draft]) })

    await waitFor(() => expect(remaining.result.current.detailQuery.isSuccess).toBe(true))
    expect(remaining.result.current.detailQuery.data).toEqual(draft)
    expect(remaining.result.current.detailQuery.error).toBeNull()
    expect(initiator.cache.getQueryData(queryKeys.workoutDraft("pro-a", "c1", "d1"))).toEqual(draft)
    expect(http.history.get).toHaveLength(1)
    if (departure === "change_options") expect(initiator.result.current.detailQuery.data).toBeUndefined()
  })
  it("late_response_does_not_cross_session", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onGet("/workouts/drafts/d1").replyOnce(() => new Promise(resolve => { finish = resolve }))
    http.onGet("/workouts/drafts/d1").reply(200, { ...draft, content: { ...content, title: "Conta B" } })
    const { result, cache, rerender } = setup({ clientId: "c1", draftId: "d1" })
    await waitFor(() => expect(http.history.get).toHaveLength(1))
    auth.user.sub = "pro-b"; rerender({ clientId: "c1", draftId: "d1" })
    await waitFor(() => expect(result.current.detailQuery.data?.content?.title).toBe("Conta B"))
    await act(async () => { finish([200, draft]) })
    expect(result.current.detailQuery.data?.content?.title).toBe("Conta B")
    expect(http.history.get[0].signal?.aborted).toBe(true)
    expect(cache.getQueryData(queryKeys.workoutDraft("pro-b", "c1", "d1"))).toMatchObject({ content: { title: "Conta B" } })
  })
  it("keeps_other_account_cache_untouched_on_save_and_finalize", async () => {
    http.onPut("/workouts/drafts/d1").reply(200, { ...draft, version: 2 })
    http.onPost("/workouts/drafts/d1/finalize").reply(200, { id: "d1", clientId: "c1", status: "FINALIZED", version: 3, finalizedWorkoutId: "w1", workout: { id: "w1", clientId: "c1" } })
    const { result, cache } = setup({ clientId: "c1", draftId: "d1", enabled: false })
    const affected = [queryKeys.workoutDrafts("pro-a", "c1"), queryKeys.trainingOverview("pro-a", "c1"), queryKeys.client("pro-a", "c1")]
    const isolated = [queryKeys.workoutDrafts("pro-b", "c1"), queryKeys.trainingWorkspace("pro-b"), queryKeys.client("pro-a", "c2")]
    ;[...affected, ...isolated, queryKeys.activeWorkout("pro-a", "c1"), queryKeys.workout("pro-a", "c1", "w1"), queryKeys.activeWorkout("pro-a", "c2"), queryKeys.workout("pro-a", "c2", "w2")].forEach(key => cache.setQueryData(key, { marker: "old" }))
    await act(async () => { await result.current.saveMutation.mutateAsync({ expectedVersion: 1, content }) })
    affected.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(true))
    await act(async () => { await result.current.finalizeMutation.mutateAsync({ expectedVersion: 2 }) })
    expect(cache.getQueryState(queryKeys.activeWorkout("pro-a", "c1"))?.isInvalidated).toBe(true)
    expect(cache.getQueryState(queryKeys.workout("pro-a", "c1", "w1"))?.isInvalidated).toBe(true)
    isolated.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(false))
    expect(cache.getQueryState(queryKeys.activeWorkout("pro-a", "c2"))?.isInvalidated).toBe(false)
    expect(cache.getQueryState(queryKeys.workout("pro-a", "c2", "w2"))?.isInvalidated).toBe(false)
  })
  it("rejects_wrong_identity_and_does_not_read_without_personal_or_owned_client", async () => {
    http.onGet("/workouts/drafts/d1").reply(200, { ...draft, clientId: "other" })
    const { result, rerender } = setup({ clientId: "c1", draftId: "d1" })
    await waitFor(() => expect(result.current.detailQuery.isError).toBe(true))
    auth.user.role = "NUTRITIONIST"; rerender({ clientId: "c2", draftId: "d2" })
    await act(async () => { await expect(result.current.createMutation.mutateAsync({ content })).rejects.toThrow() })
    expect(http.history.get).toHaveLength(1); expect(http.history.post).toHaveLength(0)
  })
  it("creates_then_finalizes_in_the_same_authorized_hook_context", async () => {
    http.onPost("/workouts/drafts").reply(201, draft)
    http.onPost("/workouts/drafts/d1/finalize").reply(200, { id: "d1", clientId: "c1", status: "FINALIZED", version: 2, finalizedWorkoutId: "w1", workout: { id: "w1", clientId: "c1" } })
    const { result } = setup({ clientId: "c1", enabled: false })
    await act(async () => {
      const created = await result.current.createMutation.mutateAsync({ content })
      await expect(result.current.finalizeMutation.mutateAsync({ expectedVersion: created.version })).resolves.toMatchObject({ finalizedWorkoutId: "w1" })
    })
    expect(http.history.post.map(request => [request.url, JSON.parse(request.data as string)])).toEqual([
      ["/workouts/drafts", { clientId: "c1", content }],
      ["/workouts/drafts/d1/finalize", { expectedVersion: 1 }],
    ])
  })
  it("late_mutation_does_not_expose_variables_or_adopt_id_in_another_session", async () => {
    let finish!: (value: [number, unknown]) => void
    http.onPost("/workouts/drafts").reply(() => new Promise(resolve => { finish = resolve }))
    const { result, cache, rerender } = setup({ clientId: "c1", enabled: false })
    cache.setQueryData(queryKeys.workoutDrafts("pro-b", "c1"), { marker: "safe" })
    let response!: Promise<unknown>
    await act(async () => { response = result.current.createMutation.mutateAsync({ content: { ...content, title: "Privado A" } }).catch(error => error) })
    await waitFor(() => expect(http.history.post).toHaveLength(1))
    auth.user.sub = "pro-b"; rerender({ clientId: "c1", enabled: false })
    await waitFor(() => expect(result.current.createMutation.variables).toBeUndefined())
    await act(async () => { finish([201, draft]); expect(await response).toBeInstanceOf(Error) })
    expect(result.current.createMutation.data).toBeUndefined()
    expect(cache.getQueryData(queryKeys.workoutDrafts("pro-b", "c1"))).toEqual({ marker: "safe" })
    expect(cache.getQueryState(queryKeys.workoutDrafts("pro-b", "c1"))?.isInvalidated).toBe(false)
    await act(async () => { await expect(result.current.finalizeMutation.mutateAsync({ expectedVersion: 1 })).rejects.toThrow() })
    expect(http.history.post).toHaveLength(1)
  })
  it("does_not_reuse_an_adopted_draft_after_switching_client", async () => {
    http.onPost("/workouts/drafts").reply(201, draft)
    const { result, rerender } = setup({ clientId: "c1", enabled: false })
    await act(async () => { await result.current.createMutation.mutateAsync({ sourceWorkoutId: "w-source" }) })
    expect(JSON.parse(http.history.post[0].data as string)).toEqual({ clientId: "c1", sourceWorkoutId: "w-source" })
    rerender({ clientId: "c2", enabled: false })
    await act(async () => { await expect(result.current.finalizeMutation.mutateAsync({ expectedVersion: 1 })).rejects.toThrow() })
    expect(http.history.post).toHaveLength(1)
  })
  it("uses_exact_versioned_routes_and_erases_only_this_accounts_payload_on_mutation_403", async () => {
    http.onPost("/workouts/drafts/d1/rebase").reply(200, { ...draft, version: 2 })
    http.onPost("/workouts/drafts/d1/discard").reply(200, { id: "d1", clientId: "c1", status: "DISCARDED", version: 3 })
    http.onPut("/workouts/drafts/d1").reply(403)
    const { result, cache } = setup({ clientId: "c1", draftId: "d1", enabled: false })
    cache.setQueryData(queryKeys.workoutDraft("pro-a", "c1", "d1"), draft)
    cache.setQueryData(queryKeys.workoutDrafts("pro-b", "c1"), { marker: "safe" })
    await act(async () => {
      await result.current.rebaseMutation.mutateAsync({ expectedVersion: 1, expectedActiveWorkoutId: null })
      await result.current.discardMutation.mutateAsync({ expectedVersion: 2 })
      await expect(result.current.saveMutation.mutateAsync({ expectedVersion: 3, content })).rejects.toThrow()
    })
    expect(http.history.post.map(request => [request.url, JSON.parse(request.data as string)])).toEqual([
      ["/workouts/drafts/d1/rebase", { expectedVersion: 1, expectedActiveWorkoutId: null }],
      ["/workouts/drafts/d1/discard", { expectedVersion: 2 }],
    ])
    expect(cache.getQueryData(queryKeys.workoutDraft("pro-a", "c1", "d1"))).toBeNull()
    await waitFor(() => expect(result.current.saveMutation.variables).toBeUndefined())
    expect(cache.getQueryData(queryKeys.workoutDrafts("pro-b", "c1"))).toEqual({ marker: "safe" })
  })
  it("mutation_403_cancels_and_blocks_late_reads_refetch_and_other_instances_of_the_owner", async () => {
    let finishPrimary!: (response: [number, unknown]) => void
    let finishPeer!: (response: [number, unknown]) => void
    http.onGet("/workouts/drafts/d1").replyOnce(() => new Promise(resolve => { finishPrimary = resolve }))
    http.onGet("/workouts/drafts/d2").replyOnce(() => new Promise(resolve => { finishPeer = resolve }))
    http.onGet("/workouts/drafts").reply(200, { items: [{ ...draft, title: "Lista privada", client: { id: "c1", name: "Ana", status: "ACTIVE" } }], nextCursor: null })
    http.onPut("/workouts/drafts/d1").reply(403)
    const primary = setup({ clientId: "c1", draftId: "d1" })
    const peer = setup({ clientId: "c2", draftId: "d2" }, primary.cache)
    const list = setup({}, primary.cache)
    const otherAccountKey = queryKeys.workoutDraft("pro-b", "c1", "d1")
    primary.cache.setQueryData(otherAccountKey, { marker: "outra conta" })
    await waitFor(() => expect(list.result.current.listQuery.data?.items[0].title).toBe("Lista privada"))
    await waitFor(() => expect(http.history.get).toHaveLength(3))
    await act(async () => { await expect(primary.result.current.saveMutation.mutateAsync({ expectedVersion: 1, content })).rejects.toThrow() })
    await act(async () => {
      finishPrimary([200, { ...draft, content: { ...content, title: "Privado tardio" } }])
      finishPeer([200, { ...draft, id: "d2", clientId: "c2" }])
    })
    expect(primary.cache.getQueryData(queryKeys.workoutDraft("pro-a", "c1", "d1"))).toBeNull()
    await waitFor(() => expect(list.result.current.listQuery.data).toBeUndefined())
    expect(primary.result.current.detailQuery.data).toBeUndefined()
    expect(peer.result.current.detailQuery.data).toBeUndefined()
    expect(http.history.get.filter(request => request.url !== "/workouts/drafts").every(request => request.signal?.aborted)).toBe(true)
    expect(primary.cache.getQueryData(queryKeys.workoutDraft("pro-a", "c2", "d2"))).toBeNull()
    expect(primary.cache.getQueryData(queryKeys.workoutDrafts("pro-a"))).toBeNull()
    http.onGet("/workouts/drafts/d1").reply(200, draft)
    http.onGet("/workouts/drafts/d2").reply(200, { ...draft, id: "d2", clientId: "c2" })
    await act(async () => { await Promise.all([primary.result.current.detailQuery.refetch(), peer.result.current.detailQuery.refetch(), list.result.current.listQuery.refetch()]) })
    expect(http.history.get).toHaveLength(3)
    expect(primary.result.current.detailQuery.data).toBeUndefined()
    expect(peer.result.current.detailQuery.data).toBeUndefined()
    expect(list.result.current.listQuery.data).toBeUndefined()
    expect(peer.result.current.detailQuery.error).toMatchObject({ response: { status: 403 } })
    expect(peer.result.current.detailQuery.isError).toBe(true)
    for (const key of [queryKeys.workoutDraft("pro-a", "c1", "d1"), queryKeys.workoutDraft("pro-a", "c2", "d2"), queryKeys.workoutDrafts("pro-a")]) {
      expect(primary.cache.getQueryData(key)).toBeNull()
    }
    primary.unmount()
    const reopened = setup({ clientId: "c1", draftId: "d1" }, primary.cache)
    await act(async () => {})
    expect(reopened.result.current.detailQuery.data).toBeUndefined()
    expect(primary.cache.getQueryData(queryKeys.workoutDraft("pro-a", "c1", "d1"))).toBeNull()
    expect(primary.cache.getQueryData(otherAccountKey)).toEqual({ marker: "outra conta" })
    expect(primary.cache.getQueryState(otherAccountKey)?.isInvalidated).toBe(false)
    expect(http.history.get).toHaveLength(3)
  })
  it("removes_only_denied_draft_payload_on_403", async () => {
    http.onGet("/workouts/drafts/d1").replyOnce(200, draft)
    http.onGet("/workouts/drafts/d1").reply(403)
    const { result, cache } = setup({ clientId: "c1", draftId: "d1" })
    cache.setQueryData(queryKeys.workoutDraft("pro-b", "c1", "d1"), { marker: "safe" })
    await waitFor(() => expect(result.current.detailQuery.data?.id).toBe("d1"))
    await act(async () => { await result.current.detailQuery.refetch() })
    await waitFor(() => expect(result.current.detailQuery.isError).toBe(true))
    expect(result.current.detailQuery.data).toBeUndefined()
    expect(cache.getQueryData(queryKeys.workoutDraft("pro-a", "c1", "d1"))).toBeNull()
    expect(cache.getQueryData(queryKeys.workoutDraft("pro-b", "c1", "d1"))).toEqual({ marker: "safe" })
  })
})
