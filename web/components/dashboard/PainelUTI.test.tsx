import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PainelUTI } from "./PainelUTI"

vi.mock("@/hooks/features/useProfessionalAlerts", () => ({
  useProfessionalAlerts: () => ({ loadingAlerts: false, alerts: [{
    id: "alert-1", type: "INACTIVE_5_DAYS", severity: "HIGH", message: "Sem registro recente",
    client: { id: "client-a", name: "Cliente privado", phone: null },
  }] }),
}))

describe("Client-owned alert dashboard", () => {
  afterEach(cleanup)
  it("renders owned Client identity and safely handles missing contact", () => {
    render(<PainelUTI />)
    expect(screen.getByText("Cliente privado")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ajustar treino/i })).toHaveAttribute("href", "/clientes/client-a")
    expect(screen.getByRole("button", { name: /cobrar aluno/i })).toBeDisabled()
  })
})
