import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { createQueryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import { useFisio, type RehabPlan } from "@/hooks/features/useFisio"
import NovaReabilitacaoPage from "./page"
import ReabilitacaoPage from "@/app/reabilitacao/page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-1" }), useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "professional-1", role: "PHYSIO" } }) }))

describe("rehab Client contracts", () => {
  let http: AxiosMockAdapter
  let cache: QueryClient
  const planKey = queryKeys.rehabPlan("professional-1", "client-1")
  const activeUrl = "/rehab-plans/client/client-1/active"
  const previousPlan: RehabPlan = {
    id: "rehab-1", title: "Protocolo anterior", goal: "Objetivo anterior", notes: "Orientações anteriores",
    sessions: [{ id: "session-1", name: "Fase 1", exercises: [{ id: "exercise-1", name: "Terapia anterior" }] }],
  }
  const updatedPlan: RehabPlan = {
    ...previousPlan, id: "rehab-2", title: "Protocolo atualizado", notes: "Orientações atualizadas",
    sessions: [{ id: "session-2", name: "Fase 1", exercises: [{ id: "exercise-2", name: "Terapia atualizada" }] }],
  }
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
  }
  function renderPage(page: ReactNode) { return render(page, { wrapper }) }
  async function selectClient() {
    await screen.findByRole("option", { name: "Cliente de reabilitação" })
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "client-1" } })
  }
  beforeEach(() => {
    vi.clearAllMocks()
    cache = createQueryClient()
    http = new AxiosMockAdapter(api)
    http.onGet("/clients/client-1").reply(200, { id: "client-1", name: "Cliente de reabilitação" })
    http.onGet("/rehab-plans/client/client-1/active").reply(200, null)
    http.onGet("/clients").reply(200, [{ id: "client-1", name: "Cliente de reabilitação", status: "ACTIVE" }])
    http.onGet("/rehab-plans").reply(200, [{ id: "rehab-1", clientId: "client-1", userId: "legacy-user", client: { name: "Cliente de reabilitação" }, user: { name: "Legado" }, title: "Treino A", createdAt: "2026-09-30T12:00:00Z" }])
  })
  afterEach(() => { cleanup(); cache.clear(); http.restore() })

  it("loads and saves a prescription using only the Client identifier", async () => {
    http.onPost("/rehab-plans").reply(201, { id: "rehab-1", clientId: "client-1" })
    renderPage(<NovaReabilitacaoPage />)
    await screen.findByText("Cliente de reabilitação")
    fireEvent.click(screen.getByRole("button", { name: /finalizar protocolo/i }))
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"))
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload.clientId).toBe("client-1")
    for (const field of ["userId", "patientId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
    expect(http.history.get.map(request => request.url)).toEqual(["/clients/client-1", "/rehab-plans/client/client-1/active"])
  })

  it("keeps the editor open without success feedback when saving fails", async () => {
    cache.setQueryData(planKey, previousPlan)
    http.onGet(activeUrl).reply(200, previousPlan)
    http.onPost("/rehab-plans").reply(503)
    renderPage(<NovaReabilitacaoPage />)
    await screen.findByDisplayValue(previousPlan.title)
    fireEvent.click(screen.getByRole("button", { name: /finalizar protocolo/i }))
    await waitFor(() => expect(notices.error).toHaveBeenCalled())
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
    expect(cache.getQueryData(planKey)).toEqual(previousPlan)
    expect(cache.getQueryState(planKey)?.isInvalidated).toBe(false)
  })

  it("queries the selected Client instead of the signed-in professional", async () => {
    renderPage(<ReabilitacaoPage />)
    await screen.findByRole("option", { name: "Cliente de reabilitação" })
    expect(http.history.get.some(request => request.url?.includes("/active"))).toBe(false)
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "client-1" } })
    await waitFor(() => expect(http.history.get.some(request => request.url === "/rehab-plans/client/client-1/active")).toBe(true))
    expect(http.history.get.some(request => request.url?.includes("professional-1"))).toBe(false)
    expect(screen.getByRole("link", { name: /prescrever protocolo/i })).toHaveAttribute("href", "/clientes/client-1/nova-reabilitacao")
  })

  it.each([
    ["creates the first protocol", null],
    ["replaces an existing protocol", previousPlan],
  ] as const)("reopens the latest prescription before the cache expires when it %s", async (_scenario, initialPlan) => {
    let persisted: RehabPlan | null = initialPlan
    http.onGet(activeUrl).reply(() => [200, persisted])
    http.onPost("/rehab-plans").reply(() => { persisted = updatedPlan; return [201, updatedPlan] })
    const unrelatedKeys = [queryKeys.rehabPlan("professional-2", "client-1"), queryKeys.rehabPlan("professional-1", "client-2")]
    for (const key of unrelatedKeys) cache.setQueryData(key, previousPlan)

    const firstVisit = renderPage(<ReabilitacaoPage />)
    await selectClient()
    if (initialPlan) await screen.findByText(initialPlan.title)
    else await screen.findByText("Este cliente não possui protocolo de reabilitação ativo.")
    await waitFor(() => expect(cache.getQueryData(planKey)).toEqual(initialPlan))
    firstVisit.unmount()

    const editor = renderPage(<NovaReabilitacaoPage />)
    await screen.findByText("Cliente de reabilitação")
    if (initialPlan) await screen.findByDisplayValue(initialPlan.title)
    fireEvent.change(screen.getByPlaceholderText("Ex: Pós-Op LCA"), { target: { value: updatedPlan.title } })
    fireEvent.change(screen.getByPlaceholderText("Nome da terapia/exercício..."), { target: { value: "Terapia atualizada" } })
    fireEvent.change(screen.getByPlaceholderText("Orientações sobre gelo, restrições de movimento, ergonomia..."), { target: { value: updatedPlan.notes } })
    let invalidatedAtNavigation = false
    navigation.push.mockImplementationOnce(() => { invalidatedAtNavigation = cache.getQueryState(planKey)?.isInvalidated ?? false })
    fireEvent.click(screen.getByRole("button", { name: /finalizar protocolo/i }))
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"))
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "client-1", title: updatedPlan.title, notes: updatedPlan.notes,
      sessions: [{ exercises: [{ name: "Terapia atualizada" }] }],
    })
    expect(Date.now() - (cache.getQueryState(planKey)?.dataUpdatedAt ?? 0)).toBeLessThan(60_000)
    editor.unmount()

    renderPage(<ReabilitacaoPage />)
    await selectClient()
    await screen.findByText(updatedPlan.title)
    expect(screen.getByText("Terapia atualizada")).toBeVisible()
    expect(screen.getByText("Orientações atualizadas")).toBeVisible()
    expect(screen.queryByText("Este cliente não possui protocolo de reabilitação ativo.")).not.toBeInTheDocument()
    expect(screen.queryByText("Terapia anterior")).not.toBeInTheDocument()
    expect(screen.queryByText("Orientações anteriores")).not.toBeInTheDocument()
    expect(http.history.get.filter(request => request.url === activeUrl)).toHaveLength(3)
    expect(invalidatedAtNavigation).toBe(true)
    for (const key of unrelatedKeys) {
      expect(cache.getQueryData(key)).toEqual(previousPlan)
      expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
    }
  })

  it("refreshes a mounted protocol query before navigating after saving", async () => {
    let persisted = previousPlan
    http.onGet(activeUrl).reply(() => [200, persisted])
    http.onPost("/rehab-plans").reply(() => { persisted = updatedPlan; return [201, updatedPlan] })
    const reader = renderHook(() => useFisio("client-1"), { wrapper })
    await waitFor(() => expect(reader.result.current.rehabPlan).toEqual(previousPlan))
    renderPage(<NovaReabilitacaoPage />)
    await screen.findByDisplayValue(previousPlan.title)
    let planAtNavigation: RehabPlan | null | undefined
    navigation.push.mockImplementationOnce(() => { planAtNavigation = cache.getQueryData<RehabPlan | null>(planKey) })
    fireEvent.change(screen.getByPlaceholderText("Ex: Pós-Op LCA"), { target: { value: updatedPlan.title } })
    fireEvent.change(screen.getByPlaceholderText("Nome da terapia/exercício..."), { target: { value: "Terapia atualizada" } })
    fireEvent.change(screen.getByPlaceholderText("Orientações sobre gelo, restrições de movimento, ergonomia..."), { target: { value: updatedPlan.notes } })
    fireEvent.click(screen.getByRole("button", { name: /finalizar protocolo/i }))
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"))
    await waitFor(() => expect(reader.result.current.rehabPlan).toEqual(updatedPlan))
    expect(planAtNavigation).toEqual(updatedPlan)
    expect(http.history.get.filter(request => request.url === activeUrl)).toHaveLength(3)
  })
})
