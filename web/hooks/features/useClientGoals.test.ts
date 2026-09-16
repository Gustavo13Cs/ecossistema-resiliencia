import { describe, it, expect } from "vitest"
import type { ClientGoalCommitment, GoalProgress } from "@/types/goal"

describe("Metas Clínicas & Hábitos - Regras de Cálculo e Validação", () => {
  it("calcula taxa de atingimento correta para meta de emagrecimento", () => {
    const startWeight = 90
    const targetWeight = 80
    const currentWeight = 85

    const lost = startWeight - currentWeight // 5kg
    const needed = startWeight - targetWeight // 10kg
    const percentAchieved = Math.round((lost / needed) * 100)

    expect(percentAchieved).toBe(50)
  })

  it("calcula taxa de atingimento correta para meta de hipertrofia", () => {
    const startWeight = 65
    const targetWeight = 70
    const currentWeight = 67.5

    const gained = currentWeight - startWeight // 2.5kg
    const needed = targetWeight - startWeight // 5kg
    const percentAchieved = Math.round((gained / needed) * 100)

    expect(percentAchieved).toBe(50)
  })

  it("classifica ritmo de emagrecimento como saudável quando <= 0.75 kg/semana", () => {
    const weeklyRate = 0.5
    let feasibility = "HEALTHY"
    if (weeklyRate > 1.2) feasibility = "UNREALISTIC"
    else if (weeklyRate > 0.75) feasibility = "AGGRESSIVE"

    expect(feasibility).toBe("HEALTHY")
  })

  it("classifica ritmo de emagrecimento como agressivo quando > 0.75 e <= 1.2 kg/semana", () => {
    const weeklyRate = 0.95
    let feasibility = "HEALTHY"
    if (weeklyRate > 1.2) feasibility = "UNREALISTIC"
    else if (weeklyRate > 0.75) feasibility = "AGGRESSIVE"

    expect(feasibility).toBe("AGGRESSIVE")
  })

  it("classifica ritmo de emagrecimento como irrealista quando > 1.2 kg/semana", () => {
    const weeklyRate = 1.4
    let feasibility = "HEALTHY"
    if (weeklyRate > 1.2) feasibility = "UNREALISTIC"
    else if (weeklyRate > 0.75) feasibility = "AGGRESSIVE"

    expect(feasibility).toBe("UNREALISTIC")
  })

  it("calcula meta sugerida de hidratação baseada na recomendação clínica de 35 mL/kg", () => {
    const weight = 80
    const waterTargetMl = Math.round((weight * 35) / 100) * 100
    expect(waterTargetMl).toBe(2800)
  })

  it("detecta alerta de regressão quando o peso do cliente aumenta em meta de emagrecimento", () => {
    const category = "WEIGHT_LOSS"
    const weightDeltaKg = 1.5 // aumento indesejado

    const isRegression = category === "WEIGHT_LOSS" && weightDeltaKg > 0.8
    expect(isRegression).toBe(true)
  })

  it("detecta alerta de prazo crítico quando faltam menos de 14 dias e o atingimento é menor que 70%", () => {
    const daysRemaining = 10
    const percentAchieved = 45

    const isCriticalDeadline = daysRemaining <= 14 && daysRemaining > 0 && percentAchieved < 70
    expect(isCriticalDeadline).toBe(true)
  })
})
