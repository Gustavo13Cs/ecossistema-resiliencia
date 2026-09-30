import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { PhysioAssessmentModal } from "./PhysioAssessmentModal"

const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: notices }))

describe("PhysioAssessmentModal Client payload", () => {
  let http: AxiosMockAdapter
  beforeEach(() => { vi.clearAllMocks(); http = new AxiosMockAdapter(api) })
  afterEach(() => { cleanup(); http.restore() })
  function setup() {
    const callbacks = { onClose: vi.fn(), onSuccess: vi.fn() }
    render(<PhysioAssessmentModal isOpen clientId="client-1" {...callbacks} />)
    fireEvent.change(screen.getByPlaceholderText(/dor no joelho/i), { target: { value: "Dor ao caminhar" } })
    return callbacks
  }
  it("sends only Client identity and clinical fields", async () => {
    http.onPost("/physio-assessments").reply(201, { id: "assessment-1" })
    const callbacks = setup()
    fireEvent.change(screen.getByPlaceholderText("Ex: 7"), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: /salvar avaliação/i }))
    await waitFor(() => expect(callbacks.onSuccess).toHaveBeenCalledOnce())
    const payload: Record<string, unknown> = JSON.parse(http.history.post[0].data as string)
    expect(payload).toMatchObject({ clientId: "client-1", chiefComplaint: "Dor ao caminhar", painLevel: 0 })
    for (const field of ["userId", "patientId", "creatorId", "professionalId"]) expect(payload).not.toHaveProperty(field)
    expect(callbacks.onClose).toHaveBeenCalledOnce()
  })
  it("preserves the form and avoids success feedback after a failed save", async () => {
    http.onPost("/physio-assessments").reply(503)
    const callbacks = setup()
    fireEvent.click(screen.getByRole("button", { name: /salvar avaliação/i }))
    await waitFor(() => expect(notices.error).toHaveBeenCalled())
    expect(callbacks.onClose).not.toHaveBeenCalled()
    expect(callbacks.onSuccess).not.toHaveBeenCalled()
    expect(notices.success).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/dor no joelho/i)).toHaveValue("Dor ao caminhar")
  })
})
