import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ExamOrderIssuerModal } from "./ExamOrderIssuerModal"
import { ExamRegistryModal } from "./ExamRegistryModal"
import { LabExamDetailDrawer } from "./LabExamDetailDrawer"
import type { ConsolidatedLabExam } from "@/types/lab-exam"

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const clients = [{ id: "client-a", name: "Synthetic Client" }]
describe("persisted lab dialogs", () => {
  it("does not export drafts and waits for a saved order before closing", async () => {
    let reject!: (error: Error) => void
    const pending = new Promise<never>((_resolve, fail) => { reject = fail })
    const save = vi.fn(() => pending), close = vi.fn()
    render(<ExamOrderIssuerModal isOpen onClose={close} clients={clients} onSubmit={save} />)
    expect(screen.queryAllByRole("button", { name: /Copiar|WhatsApp|Imprimir|PDF/ })).toHaveLength(0)
    const form = screen.getByRole("button", { name: "Registrar Pedido" }).closest("form")!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(save).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()
    await act(async () => { reject(new Error("API unavailable")); await expect(pending).rejects.toThrow() })
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar"))
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
  it("does not invent measured values or offer a simulated PDF upload", () => {
    render(<ExamRegistryModal isOpen onClose={vi.fn()} clients={clients} onSubmit={vi.fn()} />)
    for (const input of document.querySelectorAll('input[type="number"]')) expect(input).toHaveValue(null)
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(screen.queryByText("Armazenamento seguro do laudo escaneado ou original emitido pelo laboratório")).toBeNull()
  })
  it("keeps the exam draft and stays open after a failed save", async () => {
    const save = vi.fn().mockRejectedValue(new Error("API unavailable")), close = vi.fn()
    render(<ExamRegistryModal isOpen onClose={close} clients={clients} onSubmit={save} />)
    fireEvent.change(document.querySelector('input[type="number"]')!, { target: { value: "89" } })
    const notes = document.querySelector("textarea")!
    fireEvent.change(notes, { target: { value: "Synthetic draft" } })
    fireEvent.submit(screen.getByRole("button", { name: "Registrar Laudo" }).closest("form")!)
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar o exame"))
    expect(close).not.toHaveBeenCalled()
    expect(notes).toHaveValue("Synthetic draft")
  })
  it("keeps the exam drawer open when deletion fails", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("API unavailable")), close = vi.fn()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const exam: ConsolidatedLabExam = { id: "exam", clientId: clients[0].id, clientName: clients[0].name, date: "2026-10-01", createdAt: "2026-10-01", markers: [], hasAlerts: false }
    render(<LabExamDetailDrawer exam={exam} isOpen onClose={close} onDelete={remove} />)
    fireEvent.click(screen.getByRole("button", { name: /Excluir/ }))
    await waitFor(() => expect(remove).toHaveBeenCalledOnce())
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})

