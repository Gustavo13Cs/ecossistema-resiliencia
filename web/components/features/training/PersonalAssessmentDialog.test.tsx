import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { AssessmentModal } from "@/components/AssessmentModal"
import { PersonalAssessmentDialog } from "./PersonalAssessmentDialog"

const auth = vi.hoisted(() => ({ user: { sub: "personal", role: "PERSONAL" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))
const http = new AxiosMockAdapter(api)
beforeEach(() => { http.reset(); auth.user = { sub: "personal", role: "PERSONAL" } })
afterEach(cleanup)
function mount(viaModal = false) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  const onSuccess = vi.fn()
  function Harness() {
    const [open, setOpen] = useState(false)
    const Component = viaModal ? AssessmentModal : PersonalAssessmentDialog
    return <><button onClick={() => setOpen(true)}>Avaliar</button><Component isOpen={open} clientId="c1" onClose={() => setOpen(false)} onSuccess={onSuccess} /></>
  }
  return { cache, onSuccess, ...render(<QueryClientProvider client={cache}><Harness /></QueryClientProvider>) }
}
it("saves_force_without_weight_and_invalidates_committed_reads", async () => {
  const user = userEvent.setup()
  http.onPost("/assessments").reply(201, { id: "a1" })
  const { cache, onSuccess } = mount(true)
  const affected = [queryKeys.assessments("personal", "c1"), queryKeys.trainingOverview("personal", "c1")]
  const unrelated = queryKeys.assessments("other", "c1")
  ;[...affected, unrelated].forEach(key => cache.setQueryData(key, { old: true }))
  await user.click(screen.getByRole("button", { name: "Avaliar" }))
  await user.type(screen.getByLabelText("Agachamento 1RM informado (kg)"), "80,5")
  await user.click(screen.getByRole("button", { name: "Salvar avaliação física" }))
  await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
  expect(JSON.parse(http.history.post[0].data)).toEqual({ clientId: "c1", squat1RM: 80.5 })
  affected.forEach(key => expect(cache.getQueryState(key)?.isInvalidated).toBe(true))
  expect(cache.getQueryState(unrelated)?.isInvalidated).toBe(false)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})
it("does_not_capture_ambiguous_unit_fields", async () => {
  const user = userEvent.setup()
  mount(true)
  await user.click(screen.getByRole("button", { name: "Avaliar" }))
  expect(screen.queryByText(/massa muscular|vo2|vo₂/i)).not.toBeInTheDocument()
  expect(screen.getByLabelText("Peso (kg)")).toBeVisible()
  expect(screen.getByLabelText("Dobra tricipital (mm)")).toBeVisible()
  expect(screen.getByRole("button", { name: "Salvar avaliação física" })).toBeDisabled()
  await user.type(screen.getByLabelText("Observações"), "Somente nota")
  expect(screen.getByRole("button", { name: "Salvar avaliação física" })).toBeDisabled()
})
it("contains_focus_supports_escape_restores_trigger_and_discards_closed_input", async () => {
  const user = userEvent.setup()
  mount()
  const trigger = screen.getByRole("button", { name: "Avaliar" })
  await user.click(trigger)
  const dialog = screen.getByRole("dialog", { name: "Nova avaliação física" })
  expect(dialog).toContainElement(document.activeElement as HTMLElement)
  await user.type(screen.getByLabelText("Peso (kg)"), "70")
  await user.click(screen.getByRole("button", { name: "Fechar avaliação" }))
  await user.keyboard("{Tab}")
  await user.click(trigger)
  expect(screen.getByLabelText("Peso (kg)")).toHaveValue("")
  await user.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  expect(trigger).toHaveFocus()
})
it.each([409, 503])("keeps_editable_input_after_%s_without_success", async status => {
  const user = userEvent.setup()
  http.onPost("/assessments").reply(status)
  const { onSuccess } = mount()
  await user.click(screen.getByRole("button", { name: "Avaliar" }))
  await user.type(screen.getByLabelText("Agachamento 1RM informado (kg)"), "80")
  await user.click(screen.getByRole("button", { name: "Salvar avaliação física" }))
  expect(await screen.findByRole("alert")).toBeVisible()
  expect(screen.getByLabelText("Agachamento 1RM informado (kg)")).toHaveValue("80")
  expect(onSuccess).not.toHaveBeenCalled()
})
it.each([401, 403])("removes_editable_clinical_values_after_%s", async status => {
  const user = userEvent.setup()
  http.onGet("/auth/csrf").reply(401)
  http.onPost("/assessments").reply(status)
  mount()
  await user.click(screen.getByRole("button", { name: "Avaliar" }))
  await user.type(screen.getByLabelText("Agachamento 1RM informado (kg)"), "80")
  await user.click(screen.getByRole("button", { name: "Salvar avaliação física" }))
  expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible()
  expect(screen.queryByRole("textbox", { name: /agachamento/i })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Salvar avaliação física" })).not.toBeInTheDocument()
})
it("shows_field_errors_and_blocks_invalid_numbers", async () => {
  const user = userEvent.setup()
  mount()
  await user.click(screen.getByRole("button", { name: "Avaliar" }))
  fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: "-1" } })
  expect(screen.getByLabelText("Peso (kg)")).toHaveAttribute("aria-invalid", "true")
  expect(screen.getByRole("button", { name: "Salvar avaliação física" })).toBeDisabled()
  expect(http.history.post).toHaveLength(0)
})
it("preserves_shared_assessment_modal_for_nutritionist", async () => {
  auth.user = { sub: "nutri", role: "NUTRITIONIST" }
  const user = userEvent.setup()
  http.onPost("/assessments").reply(201, { id: "a-nutri" })
  const { onSuccess } = mount(true)
  await user.click(screen.getByRole("button", { name: "Avaliar" }))
  expect(screen.getByRole("heading", { name: "Nova Avaliação Corporal" })).toBeVisible()
  expect(screen.getByText("Músculo (kg ou %)")).toBeVisible()
  const saveButton = screen.getByRole("button", { name: /salvar avaliação/i })
  expect(saveButton).toBeDisabled()
  await user.type(screen.getByLabelText(/peso \(kg\)/i), "68.4")
  expect(saveButton).toBeEnabled()
  await user.click(saveButton)
  await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
  expect(JSON.parse(http.history.post[0].data)).toEqual({ clientId: "c1", weight: 68.4 })
})
