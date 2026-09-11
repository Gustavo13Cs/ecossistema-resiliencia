import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import AvaliacoesHubPage from "./page"

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
    goal: "Melhorar composição corporal",
    height: null,
    initialWeight: 72,
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
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
])

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: {
      sub: "professional-1",
      name: "Profissional",
      role: "NUTRITIONIST",
    },
  }),
}))

vi.mock("@/hooks/features/useClients", () => ({
  useClients: () => ({
    data: clients,
    isPending: false,
    isError: false,
  }),
}))

describe("AvaliacoesHubPage Client flow", () => {
  let mock: AxiosMockAdapter

  beforeEach(() => {
    mock = new AxiosMockAdapter(api)
    navigation.push.mockReset()
    mock.onGet("/assessments").reply(200, [])
    mock.onPost("/assessments").reply(201, { id: "assessment-1" })
  })

  afterEach(() => {
    cleanup()
    mock.restore()
  })

  it("creates an assessment for an active professional-owned Client", async () => {
    render(<AvaliacoesHubPage />)

    fireEvent.click(screen.getByRole("button", { name: /nova avaliação/i }))
    fireEvent.click(await screen.findByRole("button", { name: /cliente do prontuário/i }))

    fireEvent.change(screen.getByLabelText(/peso \(kg\)/i), {
      target: { value: "72.4" },
    })
    fireEvent.click(screen.getByRole("button", { name: /salvar avaliação/i }))

    await waitFor(() => expect(mock.history.post).toHaveLength(1))
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual(
      expect.objectContaining({ clientId: "client-1", weight: 72.4 }),
    )
    expect(JSON.parse(mock.history.post[0].data as string)).not.toHaveProperty("userId")
    expect(navigation.push).not.toHaveBeenCalled()
  })
})
