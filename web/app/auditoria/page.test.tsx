import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AuditPage from "./page"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: vi.fn() }))
afterEach(cleanup)
const row = (clientId: string) => ({ id: clientId, clientId, occurredAt: "2026-10-06T12:00:00Z", actorType: "PROFESSIONAL", domain: "CLIENT", action: "READ" })
const mount = (queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}})) => render(<QueryClientProvider client={queryClient}><AuditPage /></QueryClientProvider>)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({user: {sub: "owner-a",role: "NUTRITIONIST"}} as ReturnType<typeof useAuth>)
})
describe("Own audit consultation", () => {
  it("paginates persisted accesses and identifies system reads without displaying session IDs", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({data: {items: [row("client-a")],nextCursor: "cursor-a"}})
      .mockResolvedValueOnce({data: {items: [{...row("client-b"),actorType: "SYSTEM",domain: "ALERT",sessionId: "hidden-session"}],nextCursor: null}})
    mount()
    expect(await screen.findByRole("link", {name: "Abrir prontuário client-a"})).toHaveAttribute("href", "/clientes/client-a")
    await userEvent.click(screen.getByRole("button", {name: "Próxima página"}))
    expect(await screen.findByText(/Rotina de alertas/)).toBeVisible()
    expect(screen.queryByText("hidden-session")).not.toBeInTheDocument()
    expect(vi.mocked(api.get).mock.calls[1][1]).toMatchObject({params: {cursor: "cursor-a",limit: 50}})
  })
  it("keeps another professional's cache out after a session change", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({data: {items: [row("client-a")],nextCursor: null}})
      .mockResolvedValueOnce({data: {items: [row("client-b")],nextCursor: null}})
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}})
    const view = mount(client)
    await screen.findByRole("link", {name: "Abrir prontuário client-a"})
    vi.mocked(useAuth).mockReturnValue({user: {sub: "owner-b",role: "NUTRITIONIST"}} as ReturnType<typeof useAuth>)
    view.rerender(<QueryClientProvider client={client}><AuditPage /></QueryClientProvider>)
    await screen.findByRole("link", {name: "Abrir prontuário client-b"})
    expect(screen.queryByRole("link", {name: "Abrir prontuário client-a"})).not.toBeInTheDocument()
  })
  it("shows a retryable error and sends no audit request for ADMIN", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("synthetic"))
    const view = mount()
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível consultar os acessos")
    await userEvent.click(screen.getByRole("button", {name: "Tentar novamente"}))
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    view.unmount()
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({user: {sub: "admin",role: "ADMIN"}} as ReturnType<typeof useAuth>)
    mount()
    expect(await screen.findByText("Área profissional indisponível")).toBeVisible()
    expect(api.get).not.toHaveBeenCalled()
  })
})
