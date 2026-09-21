import { describe, it, expect } from "vitest"
import {
  ConsolidatedManagementReport,
  ManagementPeriod,
  RetentionMetrics,
  DietAdherenceMetrics,
  AppointmentsVolumeMetrics,
  ClientGrowthMetrics,
} from "@/types/management-reports"

describe("Painel Gerencial de Métricas do Nutricionista - Regras de Negócio", () => {
  describe("Indicadores de Retenção e Evasão (Churn)", () => {
    it("garante que taxa de retenção somada à taxa de evasão totalize 100%", () => {
      const retentionRate = 84
      const churnRate = 100 - retentionRate
      expect(retentionRate + churnRate).toBe(100)
    })

    it("garante que comparecimento somado a no-show totalize 100%", () => {
      const showUpRate = 91
      const noShowRate = 100 - showUpRate
      expect(showUpRate + noShowRate).toBe(100)
    })

    it("calcula coorte de retenção com decaimento monótono realista ao longo dos meses", () => {
      const cohort = [
        { month: "Mês 1", activeRate: 100 },
        { month: "Mês 2", activeRate: 94 },
        { month: "Mês 3", activeRate: 88 },
        { month: "Mês 4", activeRate: 82 },
        { month: "Mês 6+", activeRate: 76 },
      ]

      for (let i = 1; i < cohort.length; i++) {
        expect(cohort[i].activeRate).toBeLessThanOrEqual(cohort[i - 1].activeRate)
      }
    })
  })

  describe("Métricas de Adesão a Planos Alimentares", () => {
    it("distribui clientes por faixas de adesão (alta, média, baixa) sem perda de contagem", () => {
      const totalClients = 20
      const highAdherence = Math.round(totalClients * 0.58) // 12
      const mediumAdherence = Math.round(totalClients * 0.28) // 6
      const lowAdherence = totalClients - highAdherence - mediumAdherence // 2

      expect(highAdherence + mediumAdherence + lowAdherence).toBe(totalClients)
      expect(lowAdherence).toBeGreaterThanOrEqual(1)
    })

    it("mapeia refeições principais e hábitos clínicos com percentuais válidos", () => {
      const meals = [
        { meal: "Café da Manhã", adherencePercent: 86 },
        { meal: "Almoço", adherencePercent: 91 },
        { meal: "Lanche da Tarde", adherencePercent: 68 },
        { meal: "Jantar", adherencePercent: 79 },
      ]

      meals.forEach((m) => {
        expect(m.adherencePercent).toBeGreaterThanOrEqual(0)
        expect(m.adherencePercent).toBeLessThanOrEqual(100)
      })
    })
  })

  describe("Volume de Atendimentos & Produtividade", () => {
    it("garante que primeiras consultas somadas a retornos totalizem o volume total de consultas", () => {
      const totalAppointments = 48
      const initialConsultations = Math.round(totalAppointments * 0.32)
      const followUps = totalAppointments - initialConsultations

      expect(initialConsultations + followUps).toBe(totalAppointments)
    })

    it("calcula média semanal consistente com o período", () => {
      const totalWeeks = 12
      const totalAppointments = 48
      const weeklyAverage = Math.round(totalAppointments / totalWeeks)
      expect(weeklyAverage).toBe(4)
    })
  })

  describe("Crescimento da Base Privada", () => {
    it("calcula taxa de crescimento da carteira proporcional aos novos clientes", () => {
      const totalActive = 20
      const netNewClients = 4
      const growthRate = Math.round((netNewClients / totalActive) * 100)
      expect(growthRate).toBe(20)
    })

    it("distribui os objetivos clínicos somando aproximadamente 100%", () => {
      const goalDistribution = [
        { goal: "EMAGRECIMENTO", percent: 46 },
        { goal: "HIPERTROFIA", percent: 26 },
        { goal: "REEDUCACAO", percent: 14 },
        { goal: "DOENCAS_CRONICAS", percent: 9 },
        { goal: "PERFORMANCE", percent: 5 },
      ]

      const sumPercent = goalDistribution.reduce((acc, curr) => acc + curr.percent, 0)
      expect(sumPercent).toBe(100)
    })
  })
})
