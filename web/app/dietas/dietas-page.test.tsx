import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import DietasHubPage from "./page"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const clients = vi.hoisted(() => [
  {
    id: "client-1",
    professionalId: "professional-1",
    name: "Cliente do prontuário",
    email: null,
    phone: null,
    birthDate: null,
    gender: null,
    goal: "Saúde",
    height: null,
    initialWeight: null,
    allergies: null,
    pathologies: null,
    typicalSleep: null,
    stressLevel: null,
    foodRelationship: null,
    psychologyHistory: null,
    exerciseType: null,
    exerciseFrequency: null,
    exerciseDuration: null,
    hasPersonal: null,
    workActivityLevel: null,
    professionalNotes: null,
    privacyNotes: null,
    status: "ACTIVE" as const,
    createdAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
  },
])

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}))

vi.mock("@/hooks/features/useClients", () => ({
  useClients: () => ({
    data: clients,
    isPending: false,
    isError: false,
  }),
}))

describe("DietasHubPage Client routing", () => {
  let mock: AxiosMockAdapter

  beforeEach(() => {
    mock = new AxiosMockAdapter(api)
    navigation.push.mockReset()
    mock.onGet("/diet-plans").reply(200, [
      {
        id: "diet-1",
        clientId: "client-1",
        title: "Plano inicial",
        goal: "Saúde",
        createdAt: "2026-09-09T00:00:00.000Z",
        isTemplate: false,
        client: { id: "client-1", name: "Cliente do prontuário" },
        user: { name: "Paciente legado" },
      },
    ])
  })

  afterEach(() => {
    cleanup()
    mock.restore()
  })

  it("opens an existing prescription with the professional-owned Client id", async () => {
    render(<DietasHubPage />)

    fireEvent.click(await screen.findByRole("button", { name: /abrir prescrição/i }))

    expect(navigation.push).toHaveBeenCalledWith(
      "/clientes/client-1/nova-dieta",
    )
    expect(navigation.push).not.toHaveBeenCalledWith(
      expect.stringContaining("legacy"),
    )
  })

  it("starts a new prescription from the private Client directory", async () => {
    render(<DietasHubPage />)

    fireEvent.click(screen.getByRole("button", { name: /nova prescrição/i }))
    fireEvent.click(await screen.findByText("Cliente do prontuário"))

    expect(navigation.push).toHaveBeenCalledWith(
      "/clientes/client-1/nova-dieta",
    )
  })
})
