import { act, cleanup, render, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useExerciseLibrary } from "./useExerciseLibrary"

const auth = vi.hoisted(() => ({ user: { sub: "owner-a", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
const http = new AxiosMockAdapter(api)
afterEach(() => { cleanup(); http.reset(); auth.user = { sub: "owner-a", role: "PERSONAL" } })

it("equipment_filter_scopes_query_key", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  http.onGet("/workouts/exercise-library").reply(200, [])
  function Probe({ equipment }: { equipment: "BARBELL" | "DUMBBELL" }) { useExerciseLibrary({ equipment }); return null }
  const view = render(<QueryClientProvider client={client}><Probe equipment="BARBELL" /></QueryClientProvider>)
  await waitFor(() => expect(client.getQueryData(queryKeys.exerciseLibrary("owner-a", "", "ALL", "BARBELL"))).toEqual([]))
  view.rerender(<QueryClientProvider client={client}><Probe equipment="DUMBBELL" /></QueryClientProvider>)
  await waitFor(() => expect(client.getQueryData(queryKeys.exerciseLibrary("owner-a", "", "ALL", "DUMBBELL"))).toEqual([]))
  expect(client.getQueryData(queryKeys.exerciseLibrary("owner-a", "", "ALL", "BARBELL"))).toEqual([])
})

it("session_change_aborts_detail", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const seen: { aborted: boolean }[] = []
  http.onGet("/workouts/exercise-library/cat-1").reply(config => new Promise(resolve => { if (config.signal) seen.push(config.signal); config.signal?.addEventListener?.("abort", () => resolve([200, { id: "cat-1", name: "Old" }])) }))
  function Probe() { const { detailQuery } = useExerciseLibrary({ exerciseId: "cat-1", enabled: true }); return <div>{detailQuery.data?.name}</div> }
  const view = render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>)
  await waitFor(() => expect(seen).toHaveLength(1))
  await act(async () => { auth.user = { sub: "owner-b", role: "PERSONAL" }; view.rerender(<QueryClientProvider client={client}><Probe /></QueryClientProvider>) })
  await waitFor(() => expect(seen[0].aborted).toBe(true))
  expect(client.getQueryData(queryKeys.exerciseLibraryDetail("owner-b", "cat-1"))).toBeUndefined()
})

it("updates a custom video with the expected version and invalidates only its owner's library", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const foreignKey = queryKeys.exerciseLibraryDetail("owner-b", "custom-1")
  const ownerKey = queryKeys.exerciseLibraryDetail("owner-a", "custom-1")
  client.setQueryData(foreignKey, { id: "custom-1", demonstration: null })
  client.setQueryData(ownerKey, { id: "custom-1", demonstration: null })
  http.onGet("/workouts/exercise-library").reply(200, [])
  http.onPatch("/workouts/exercise-library/custom-1").reply(config => {
    expect(JSON.parse(config.data)).toEqual({ expectedMediaVersion: 3, videoUrl: null })
    return [200, { id: "custom-1", mediaVersion: 4, demonstration: null }]
  })
  let update!: ReturnType<typeof useExerciseLibrary>["updateVideoMutation"]
  function Probe() { update = useExerciseLibrary().updateVideoMutation; return null }
  render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>)
  await act(async () => { await update.mutateAsync({ id: "custom-1", expectedMediaVersion: 3, videoUrl: null }) })
  expect(client.getQueryState(ownerKey)?.isInvalidated).toBe(true)
  expect(client.getQueryState(foreignKey)?.isInvalidated).toBe(false)
  expect(client.getQueryData(foreignKey)).toEqual({ id: "custom-1", demonstration: null })
})
