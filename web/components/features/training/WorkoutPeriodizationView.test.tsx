import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { WorkoutPeriodizationView } from "./WorkoutPeriodizationView"
import { suggestPeriodization } from "@/lib/workout-periodization"
import { summarizeWeeklyVolume } from "@/lib/workout-volume"
import type { WorkoutDetail } from "@/types/workout"
afterEach(() => { cleanup(); vi.unstubAllEnvs() })
describe("régua e impressão do mesociclo", () => {
  it("mostra semana escolhida, deload e links que solicitam projeção ao servidor", () => {
    const periodization = { ...suggestPeriodization(8), startsOn: "2026-10-23" }
    const workout = { id: "w1", clientId: "c1", durationWeeks: 8, periodization, splits: [], weekProjection: { week:8,planWeek:{week:5,status:"ACTIVE",today:"2026-11-20"},phase:periodization.phases[3],volume:summarizeWeeklyVolume([]),exercises:[] } } as unknown as WorkoutDetail
    render(<WorkoutPeriodizationView workout={workout} />)
    expect(screen.getByText("Semana 8 de 8 · Deload")).toBeInTheDocument()
    expect(screen.getByText(/Semana atual: 5/)).toBeInTheDocument()
    expect(screen.getByRole("link",{name:"Semana 3 · Sobrecarga"})).toHaveAttribute("href","/clientes/c1/treinos/w1?week=3")
    expect(screen.getByText(/Semana de recuperação/)).toBeInTheDocument()
    expect(screen.getByText(/2026-10-23/)).toBeInTheDocument()
    const dates = screen.getByText(/Período da semana consultada:/)
    expect(dates).toHaveTextContent("11/12/2026 a 17/12/2026")
    expect(dates.closest(".print\\:hidden")).toBeNull()
  })
  it.each([
    ["2026-10-23", 1, "23/10/2026 a 29/10/2026", "America/Sao_Paulo"],
    ["2026-03-08", 2, "15/03/2026 a 21/03/2026", "America/New_York"],
    ["2018-11-04", 1, "04/11/2018 a 10/11/2018", "America/Sao_Paulo"],
    ["2026-12-28", 2, "04/01/2027 a 10/01/2027", "Pacific/Kiritimati"],
  ])("exibe datas civis de %s/semana %s sem deslocamento de fuso ou DST", (startsOn, week, expected, timeZone) => {
    vi.stubEnv("TZ", timeZone)
    const periodization = { ...suggestPeriodization(8), startsOn, timeZone }
    const workout = { id: "w1", clientId: "c1", durationWeeks: 8, periodization, splits: [], weekProjection: { week, planWeek: { week: 5, status: "ACTIVE", today: "2026-11-20" }, phase: periodization.phases[0], volume: summarizeWeeklyVolume([]), exercises: [] } } as unknown as WorkoutDetail
    render(<WorkoutPeriodizationView workout={workout} />)
    expect(screen.getByText(/Período da semana consultada:/)).toHaveTextContent(expected)
  })
  it.each(["", "2026-02-30", "não é data"])("informa datas pendentes para início incompleto/inválido %s", startsOn => {
    const periodization = { ...suggestPeriodization(8), startsOn }
    const workout = { durationWeeks: 8, periodization, splits: [], weekProjection: { week: 1, planWeek: { week: 1, status: "NOT_STARTED" }, phase: periodization.phases[0], volume: summarizeWeeklyVolume([]) } } as unknown as WorkoutDetail
    render(<WorkoutPeriodizationView workout={workout} />)
    expect(screen.getByText("Período da semana consultada: data de início pendente.")).toBeVisible()
  })
})
