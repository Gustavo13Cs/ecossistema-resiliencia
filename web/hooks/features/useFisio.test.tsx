import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { useFisio } from "./useFisio"

const auth = vi.hoisted(() => ({ user: { sub: "professional-1", role: "PHYSIO" } as { sub: string; role: string } | null }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: auth.user }) }))

describe("useFisio Client isolation", () => {
  let http: AxiosMockAdapter
  beforeEach(() => {
    auth.user = { sub: "professional-1", role: "PHYSIO" }
    http = new AxiosMockAdapter(api)
  })
  afterEach(() => { cleanup(); http.restore() })

  function setup(clientId?: string) {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    return { cache, ...renderHook(({ id }) => useFisio(id), { initialProps: { id: clientId }, wrapper }) }
  }

  it("fetches the Client endpoint with a professional-scoped cache", async () => {
    const plan = { id: "plan-1", title: "Protocolo A", sessions: [] }
    http.onGet("/rehab-plans/client/client-1/active").reply(200, plan)
    const { result, cache } = setup("client-1")
    await waitFor(() => expect(result.current.rehabPlan).toEqual(plan))
    expect(http.history.get.map(entry => entry.url)).toEqual(["/rehab-plans/client/client-1/active"])
    expect(cache.getQueryCache().getAll().map(query => query.queryKey)).toContainEqual(["rehab-plan", "professional-1", "client-1"])
  })

  it("does not fetch without a selected Client or authenticated professional", () => {
    const first = setup()
    expect(first.result.current.loading).toBe(false)
    auth.user = null
    setup("client-1")
    expect(http.history.get).toHaveLength(0)
  })

  it("clears the previous Client plan on a switch and preserves failure feedback", async () => {
    http.onGet("/rehab-plans/client/client-1/active").reply(200, { id: "plan-1", title: "Protocolo A", sessions: [] })
    http.onGet("/rehab-plans/client/client-2/active").reply(503)
    const { result, rerender } = setup("client-1")
    await waitFor(() => expect(result.current.rehabPlan?.id).toBe("plan-1"))
    rerender({ id: "client-2" })
    expect(result.current.rehabPlan).toBeNull()
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.rehabPlan).toBeNull()
  })
})
