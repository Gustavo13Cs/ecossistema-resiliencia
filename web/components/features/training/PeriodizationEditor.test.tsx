import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PeriodizationEditor } from "./PeriodizationEditor"
import { suggestPeriodization } from "@/lib/workout-periodization"
import { createWorkoutExercise, createWorkoutSplit } from "@/lib/workout-form"

describe("configurador de periodização", () => {
  afterEach(cleanup)
  it("habilita explicitamente e sugere fases sem inventar data", () => {
    const onChange = vi.fn()
    render(<PeriodizationEditor durationWeeks="8" value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button",{name:"Configurar periodização"}))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({startsOn:"",phases:expect.any(Array)}),"8")
  })
  it("edita data e progressão sem alterar a configuração original", () => {
    const value = suggestPeriodization(8)
    const onChange = vi.fn()
    render(<PeriodizationEditor durationWeeks="8" value={value} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("Data de início"),{target:{value:"2026-10-23"}})
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({startsOn:"2026-10-23"}))
    expect(value.startsOn).toBe("")
    fireEvent.click(screen.getByLabelText("Ativar progressão programada"))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({progression:{intervalWeeks:2,repsDelta:1,effortDelta:1}}))
  })
  it("bloqueia alterações em prontuário somente leitura", () => {
    render(<PeriodizationEditor durationWeeks="8" value={suggestPeriodization(8)} onChange={vi.fn()} disabled />)
    expect(screen.getByLabelText("Data de início")).toBeDisabled()
    expect(screen.getByRole("button",{name:"Desativar periodização"})).toBeDisabled()
  })
  it("prevê progressão e deload com valores base intactos, reagindo às fases e regras", () => {
    const value = { ...suggestPeriodization(8), startsOn: "2026-10-23", progression: { intervalWeeks: 2, repsDelta: 1, effortDelta: 1 } }
    const splits = [{ ...createWorkoutSplit(), exercises: [{ ...createWorkoutExercise(), name: "Supino", sets: "4", reps: "6-8", effortType: "RIR" as const, effortTarget: "3" }] }]
    const original = JSON.stringify({ value, splits })
    function Editor() {
      const [config, setConfig] = useState<typeof value | null>(value)
      return <PeriodizationEditor durationWeeks="8" value={config} splits={splits} onChange={next => setConfig(next as typeof value | null)} />
    }
    render(<Editor />)
    const preview = screen.getByRole("region", { name: "Prévia semanal da prescrição" })
    fireEvent.change(within(preview).getByLabelText("Semana da prévia"), { target: { value: "3" } })
    expect(within(preview).getByText("Semana 3 · Sobrecarga")).toBeVisible()
    expect(within(preview).getByText("Base: 4 séries · 6-8 repetições · RIR 3")).toBeVisible()
    expect(within(preview).getByText("Projetado: 4 séries · 7-9 repetições · RIR 2")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Meta da fase 2"), { target: { value: "1" } })
    expect(within(preview).getByText("Projetado: 4 séries · 7-9 repetições · RIR 1")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Repetições por ciclo"), { target: { value: "2" } })
    expect(within(preview).getByText("Projetado: 4 séries · 8-10 repetições · RIR 1")).toBeVisible()
    fireEvent.change(within(preview).getByLabelText("Semana da prévia"), { target: { value: "8" } })
    expect(within(preview).getByText("Semana 8 · Deload")).toBeVisible()
    expect(within(preview).getByText("Projetado: 2 séries · 6-8 repetições · RIR 4-5")).toBeVisible()
    expect(within(preview).getByText(/aproximadamente 40%/)).toBeVisible()
    expect(JSON.stringify({ value, splits })).toBe(original)
    fireEvent.click(screen.getByRole("button", { name: "Desativar periodização" }))
    fireEvent.click(screen.getByRole("button", { name: "Configurar periodização" }))
    expect(screen.getByText(/Complete a configuração para consultar a prévia/)).toBeVisible()
  })
  it("preserva prescrições textuais com avisos de revisão manual e aceita esforço vazio", () => {
    const value = { ...suggestPeriodization(8), startsOn: "2026-10-23" }
    const splits = [{ ...createWorkoutSplit(), exercises: [{ ...createWorkoutExercise(), name: "Prancha", sets: "cluster", reps: "30s" }] }]
    render(<PeriodizationEditor durationWeeks="8" value={value} splits={splits} onChange={vi.fn()} />)
    const preview = screen.getByRole("region", { name: "Prévia semanal da prescrição" })
    fireEvent.change(within(preview).getByLabelText("Semana da prévia"), { target: { value: "8" } })
    expect(within(preview).getByText(/Projetado: cluster séries · 30s repetições · RIR 4-5/)).toBeVisible()
    expect(within(preview).getByText("Séries: ajuste manual no deload.")).toBeVisible()
    expect(within(preview).getByText("Repetições textuais: revisão manual.")).toBeVisible()
    expect(splits[0].exercises[0].effortType).toBe("")
  })
  it("mantém exercícios vazios editáveis sem inventar alvos e limita a semana ao mudar a duração", () => {
    const value = { ...suggestPeriodization(8), startsOn: "2026-10-23" }
    const split = createWorkoutSplit()
    const { rerender } = render(<PeriodizationEditor durationWeeks="8" value={value} splits={[split]} onChange={vi.fn()} />)
    expect(screen.getByText("Adicione exercícios para consultar os alvos da semana.")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Semana da prévia"), { target: { value: "8" } })
    const shorter = { ...suggestPeriodization(4), startsOn: value.startsOn }
    rerender(<PeriodizationEditor durationWeeks="4" value={shorter} splits={[{ ...split, exercises: [createWorkoutExercise()] }]} onChange={vi.fn()} />)
    expect(screen.getByLabelText("Semana da prévia")).toHaveValue("4")
    expect(screen.getByText("Semana 4 · Deload")).toBeVisible()
    expect(screen.getByText("Preencha séries e repetições para projetar este exercício.")).toBeVisible()
    expect(screen.queryByText(/^Projetado:/)).not.toBeInTheDocument()
  })
  it("preserva esforço textual do exercício quando a fase não tem meta própria", () => {
    const value = { ...suggestPeriodization(8), startsOn: "2026-10-23" }
    value.phases = value.phases.map(phase => ({ ...phase, effortType: null, effortTarget: "" }))
    const splits = [{ ...createWorkoutSplit(), exercises: [{ ...createWorkoutExercise(), name: "Prancha", sets: "3", reps: "30s", effortTarget: "confortável" }] }]
    render(<PeriodizationEditor durationWeeks="8" value={value} splits={splits} onChange={vi.fn()} />)
    const preview = screen.getByRole("region", { name: "Prévia semanal da prescrição" })
    expect(within(preview).getByText("Projetado: 3 séries · 30s repetições · confortável")).toBeVisible()
    expect(within(preview).getByText("Esforço textual: revisão manual.")).toBeVisible()
    expect(splits[0].exercises[0].effortType).toBe("")
  })
})
