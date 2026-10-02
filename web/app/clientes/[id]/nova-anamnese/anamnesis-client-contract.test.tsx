import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import NovaAnamnesePage from "./page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-1" }), useRouter: () => navigation }))
vi.mock("sonner", () => ({ toast: notices }))

describe("anamnesis Client contract", () => {
  let http: AxiosMockAdapter
  beforeEach(() => {
    vi.clearAllMocks()
    http = new AxiosMockAdapter(api)
    http.onGet("/clients/client-1").reply(200, { id: "client-1", name: "Cliente de teste", updatedAt: "2026-09-30T12:00:00Z" })
  })
  afterEach(() => { cleanup(); http.restore() })
  it("saves through the Client contract", async () => {
    http.onPost("/anamneses").reply(201, { id: "record-1" })
    render(<NovaAnamnesePage />)
    await screen.findByText("Cliente de teste")
    fireEvent.click(screen.getByRole("button", { name: /selar e guardar/i }))
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"))
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload.clientId).toBe("client-1")
    for (const field of ["patientId", "userId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
  })
  it("does not write fallback Client notes or report success after a failed save", async () => {
    http.onPost("/anamneses").reply(503)
    http.onPatch("/clients/client-1").reply(200, { id: "client-1" })
    render(<NovaAnamnesePage />)
    await screen.findByText("Cliente de teste")
    fireEvent.change(screen.getByPlaceholderText(/apendicite em 2015/i), { target: { value: "Histórico preenchido" } })
    fireEvent.click(screen.getByRole("button", { name: /selar e guardar/i }))
    await waitFor(() => expect(notices.error).toHaveBeenCalled())
    expect(http.history.patch).toHaveLength(0)
    expect(notices.success).not.toHaveBeenCalled()
    expect(navigation.push).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/apendicite em 2015/i)).toHaveValue("Histórico preenchido")
  })
})
