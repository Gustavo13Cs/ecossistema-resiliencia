import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { WorkoutPeriodizationView } from "./WorkoutPeriodizationView"
import { suggestPeriodization } from "@/lib/workout-periodization"
import { summarizeWeeklyVolume } from "@/lib/workout-volume"
import type { WorkoutDetail } from "@/types/workout"
afterEach(cleanup)
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
  })
})
