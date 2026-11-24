import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  it("supports structured body pain map, goniometry with asymmetry alert, MRC strength, and orthopedic tests", async () => {
    const user = userEvent.setup()
    http.onPost("/physio-assessments").reply(201, { id: "assessment-2" })
    const callbacks = setup()

    // Mark knee pain region on SVG map
    await user.click(
      screen.getByRole("button", { name: "Joelho direito (Vista Anterior)" }),
    )
    expect(screen.getByText("1 região marcada")).toBeVisible()

    // Switch to ADM & Força tab
    await user.click(screen.getByRole("tab", { name: "ADM & Força" }))
    await user.type(screen.getByLabelText("ADM Ativa (°)"), "95")
    await user.click(screen.getByRole("button", { name: /Adicionar ADM/i }))
    await user.selectOptions(screen.getByLabelText("Lado", { selector: "#rom-side" }), "LEFT")
    await user.type(screen.getByLabelText("ADM Ativa (°)"), "135")
    await user.click(screen.getByRole("button", { name: /Adicionar ADM/i }))
    expect(
      screen.getByText(/Assimetria em Joelho \(Flexão\): Direito 95° vs Esquerdo 135°/i),
    ).toBeVisible()

    await user.click(screen.getByRole("button", { name: /Adicionar força/i }))
    expect(screen.getByText("Grau 4/5")).toBeVisible()

    // Switch to Testes & Exame tab
    await user.click(screen.getByRole("tab", { name: "Testes & Exame" }))
    await user.click(screen.getByRole("button", { name: "+ Positivo" }))

    await user.click(screen.getByRole("button", { name: /salvar avaliação/i }))
    await waitFor(() => expect(callbacks.onSuccess).toHaveBeenCalledOnce())

    const payload = JSON.parse(http.history.post[0].data as string) as Record<
      string,
      unknown
    >
    expect(payload.bodyPainMap).toEqual([
      {
        region: "Joelho direito",
        view: "ANTERIOR",
        intensity: 5,
        symptomType: "ACHING",
      },
    ])
    expect(payload.goniometry).toHaveLength(2)
    expect(payload.muscleStrength).toHaveLength(1)
    expect(payload.orthopedicTestItems).toEqual([
      {
        region: "Joelho",
        testName: "Lachman",
        side: "RIGHT",
        result: "POSITIVE",
      },
    ])
  })
})
