import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { PhysioFunctionalScaleDialog } from "./PhysioFunctionalScaleDialog"
import { PhysioFunctionalScalesSection } from "./PhysioFunctionalScalesSection"

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { sub: "physio-1", role: "PHYSIO" } }),
}))

const http = new AxiosMockAdapter(api)

const scalesFixture = [
  {
    id: "sc-1",
    clientId: "c1",
    scaleType: "PSFS",
    evaluatedAt: "2026-11-20T10:00:00Z",
    answers: { activities: [{ description: "Subir escada", score: 7 }] },
    rawScore: 7,
    normalizedScore: 70,
    scoreUnit: "/10",
    classification: "Boa capacidade funcional",
    notes: "Sem dor ao subir",
    createdAt: "2026-11-20T10:00:00Z",
    updatedAt: "2026-11-20T10:00:00Z",
  },
  {
    id: "sc-2",
    clientId: "c1",
    scaleType: "TUG",
    evaluatedAt: "2026-11-10T10:00:00Z",
    answers: { timeSeconds: 12.5, assistiveDevice: "NONE" },
    rawScore: 12.5,
    normalizedScore: 12.5,
    scoreUnit: "s",
    classification: "Bom equilíbrio funcional",
    notes: null,
    createdAt: "2026-11-10T10:00:00Z",
    updatedAt: "2026-11-10T10:00:00Z",
  },
]

function wrap(ui: React.ReactElement) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={cache}>{ui}</QueryClientProvider>,
  )
}

describe("PhysioFunctionalScales", () => {
  beforeEach(() => {
    http.reset()
  })

  afterEach(cleanup)

  it("calculates live PSFS and TUG scores and submits to API", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    http.onPost("/rehab-plans/scales").reply(201, scalesFixture[1])

    wrap(
      <PhysioFunctionalScaleDialog
        open
        onOpenChange={onOpenChange}
        clientId="c1"
        clientName="Marina"
      />,
    )

    // PSFS default
    await user.type(screen.getByLabelText("Atividade 1"), "Agachar")
    fireEvent.change(screen.getByLabelText("Nota (0 a 10)"), {
      target: { value: "8" },
    })
    expect(screen.getByText("8/10")).toBeVisible()
    expect(screen.getByText("Boa capacidade funcional")).toBeVisible()

    // Switch to TUG and submit
    await user.selectOptions(
      screen.getByLabelText("Instrumento clínico"),
      "TUG",
    )
    await user.type(screen.getByLabelText("Tempo observado (segundos)"), "12.5")
    expect(screen.getByText("12.5s")).toBeVisible()
    expect(screen.getByText("Bom equilíbrio funcional")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Salvar escala" }))

    await waitFor(() => expect(http.history.post).toHaveLength(1))
    expect(JSON.parse(http.history.post[0].data as string)).toMatchObject({
      clientId: "c1",
      scaleType: "TUG",
      answers: { timeSeconds: 12.5, assistiveDevice: "NONE" },
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("filters applied scales, switches to table view, and deletes with confirmation", async () => {
    const user = userEvent.setup()
    http.onGet("/rehab-plans/scales/client/c1").reply(200, scalesFixture)
    http.onDelete("/rehab-plans/scales/sc-1").reply(200, {
      id: "sc-1",
      clientId: "c1",
    })

    wrap(
      <PhysioFunctionalScalesSection
        clientId="c1"
        blocked={false}
        onOpenDialog={vi.fn()}
      />,
    )

    expect(await screen.findByText("Boa capacidade funcional")).toBeVisible()
    expect(screen.getByText("Bom equilíbrio funcional")).toBeVisible()

    await user.selectOptions(
      screen.getByLabelText("Filtrar por escala funcional"),
      "TUG",
    )
    expect(screen.queryByText("Boa capacidade funcional")).not.toBeInTheDocument()
    expect(screen.getByText("Bom equilíbrio funcional")).toBeVisible()

    await user.selectOptions(
      screen.getByLabelText("Filtrar por escala funcional"),
      "ALL",
    )
    await user.click(screen.getByRole("button", { name: "Tabela" }))
    const table = screen.getByRole("table")
    expect(within(table).getByText("7/10")).toBeVisible()
    expect(within(table).getByText("12.5s")).toBeVisible()

    await user.click(screen.getByRole("button", { name: /Excluir escala PSFS/i }))
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }))
    await waitFor(() => expect(http.history.delete).toHaveLength(1))
  })
})
