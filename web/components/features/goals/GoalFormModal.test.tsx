import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Client } from "@/types/client"
import type { ClientGoalCommitment } from "@/types/goal"
import { GoalFormModal } from "./GoalFormModal"

const client: Client = {
  id: "client-a", professionalId: "professional-a", name: "Cliente sintético", status: "ACTIVE",
  email: null, phone: null, birthDate: null, gender: null, goal: null, height: null, initialWeight: null,
  allergies: null, pathologies: null, typicalSleep: null, stressLevel: null, foodRelationship: null,
  psychologyHistory: null, exerciseType: null, exerciseFrequency: null, exerciseDuration: null,
  hasPersonal: null, workActivityLevel: null, professionalNotes: null, privacyNotes: null,
  createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z",
}
afterEach(cleanup)
describe("persisted goal form", () => {
  it("keeps the dialog and edits until persistence succeeds, preventing duplicate submits", async () => {
    let fail!: (reason: Error) => void
    const pending = new Promise<ClientGoalCommitment>((_resolve, reject) => { fail = reject })
    const save = vi.fn(() => pending)
    const close = vi.fn()
    render(<GoalFormModal isOpen onSave={save} onClose={close} clients={[client]} />)
    fireEvent.change(screen.getByLabelText("Conduta & Observações Clínicas"), { target: { value: "Rascunho sintético" } })
    const button = screen.getByRole("button", { name: "Salvar Meta Clínica" })
    const form = button.closest("form")!
    fireEvent.submit(form)
    expect(close).not.toHaveBeenCalled()
    expect(button).toBeDisabled()
    fireEvent.submit(form)
    expect(save).toHaveBeenCalledOnce()
    await act(async () => { fail(new Error("API unavailable")); await expect(pending).rejects.toThrow() })
    await waitFor(() => expect(button).not.toBeDisabled())
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Conduta & Observações Clínicas")).toHaveValue("Rascunho sintético")
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar a meta")
  })
  it("does not prefill invented weight or body fat for a Client without assessments", () => {
    render(<GoalFormModal isOpen onSave={vi.fn()} onClose={vi.fn()} clients={[client]} />)
    expect(document.querySelector("#start-weight")).toHaveValue(null)
    expect(document.querySelector("#start-bf")).toHaveValue(null)
  })
  it("clears the previous Client baseline when selecting a Client without a measurement", () => {
    const measured = { ...client, id: "measured", initialWeight: 80 }
    render(<GoalFormModal isOpen onSave={vi.fn()} onClose={vi.fn()} clients={[measured, client]} />)
    expect(document.querySelector("#start-weight")).toHaveValue(80)
    fireEvent.change(screen.getByLabelText("Cliente *"), { target: { value: client.id } })
    expect(document.querySelector("#start-weight")).toHaveValue(null)
  })
});
