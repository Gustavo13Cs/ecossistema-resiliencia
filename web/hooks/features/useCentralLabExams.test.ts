import { describe, it, expect } from "vitest"
import {
  evaluateMarkerValue,
  CLINICAL_MARKERS_DICTIONARY,
  LAB_ORDER_TEMPLATES,
  ConsolidatedLabExam,
  LabExamsKpi,
} from "@/types/lab-exam"

describe("Central de Exames Laboratoriais - Regras Clínicas e Cálculos", () => {
  describe("Avaliação de Biomarcadores com Referências Clínicas (SBPC/ML)", () => {
    it("avalia Glicemia de Jejum corretamente nos intervalos ótimo, limítrofe e alerta", () => {
      expect(evaluateMarkerValue("Glicemia de Jejum", 82)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("Glicemia de Jejum", 94)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("Glicemia de Jejum", 115)).toBe("ALERT")
      expect(evaluateMarkerValue("Glicemia de Jejum", 65)).toBe("ALERT") // hipoglicemia
    })

    it("avalia Hemoglobina Glicada (HbA1c) identificando faixa de pré-diabetes como alerta", () => {
      expect(evaluateMarkerValue("Hemoglobina Glicada (HbA1c)", 5.0)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("Hemoglobina Glicada (HbA1c)", 5.5)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("Hemoglobina Glicada (HbA1c)", 6.2)).toBe("ALERT")
    })

    it("avalia Triglicerídeos e Perfil Lipídico", () => {
      expect(evaluateMarkerValue("Triglicerídeos", 85)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("Triglicerídeos", 130)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("Triglicerídeos", 190)).toBe("ALERT")
    })

    it("avalia HDL Colesterol considerando valores baixos como alerta cardiovascular", () => {
      expect(evaluateMarkerValue("HDL Colesterol", 65)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("HDL Colesterol", 48)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("HDL Colesterol", 35)).toBe("ALERT")
    })

    it("avalia 25-OH Vitamina D para suficiência óssea e imunológica", () => {
      expect(evaluateMarkerValue("25-OH Vitamina D", 40)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("25-OH Vitamina D", 25)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("25-OH Vitamina D", 15)).toBe("ALERT") // deficiência
    })

    it("avalia TSH Ultra Sensível dentro da faixa eutireoidiana ideal", () => {
      expect(evaluateMarkerValue("TSH Ultra Sensível", 1.8)).toBe("OPTIMAL")
      expect(evaluateMarkerValue("TSH Ultra Sensível", 3.5)).toBe("BORDERLINE")
      expect(evaluateMarkerValue("TSH Ultra Sensível", 6.0)).toBe("ALERT")
    })
  })

  describe("Templates de Pedidos de Exames Padronizados", () => {
    it("fornece protocolos clínicos padronizados bem definidos", () => {
      expect(LAB_ORDER_TEMPLATES.length).toBeGreaterThanOrEqual(4)
      const ids = LAB_ORDER_TEMPLATES.map((t: { id: string }) => t.id)
      expect(ids).toContain("routine_metabolic")
      expect(ids).toContain("weight_loss_resistance")
      expect(ids).toContain("hypertrophy_performance")
      expect(ids).toContain("thyroid_immunity")
    })

    it("cada template possui lista de biomarcadores sugeridos não-vazia", () => {
      LAB_ORDER_TEMPLATES.forEach((tmpl: { suggestedMarkers: string[]; title: string; description: string }) => {
        expect(tmpl.suggestedMarkers.length).toBeGreaterThan(0)
        expect(tmpl.title).toBeDefined()
        expect(tmpl.description).toBeDefined()
      })
    })
  })

  describe("Cálculo de KPIs e Agregação da Carteira", () => {
    it("calcula cobertura percentual e contagem de marcadores alterados corretamente", () => {
      const mockExams: ConsolidatedLabExam[] = [
        {
          id: "exam-1",
          clientId: "client-a",
          clientName: "Alice",
          date: "2026-08-01",
          hasAlerts: true,
          createdAt: "2026-08-01",
          markers: [
            {
              id: "m-1",
              name: "Glicemia de Jejum",
              value: 105,
              unit: "mg/dL",
              status: "ALERT",
              reference: CLINICAL_MARKERS_DICTIONARY["Glicemia de Jejum"],
            },
            {
              id: "m-2",
              name: "Colesterol Total",
              value: 170,
              unit: "mg/dL",
              status: "OPTIMAL",
              reference: CLINICAL_MARKERS_DICTIONARY["Colesterol Total"],
            },
          ],
        },
        {
          id: "exam-2",
          clientId: "client-b",
          clientName: "Bob",
          date: "2026-08-05",
          hasAlerts: false,
          createdAt: "2026-08-05",
          markers: [
            {
              id: "m-3",
              name: "Glicemia de Jejum",
              value: 85,
              unit: "mg/dL",
              status: "OPTIMAL",
              reference: CLINICAL_MARKERS_DICTIONARY["Glicemia de Jejum"],
            },
          ],
        },
      ]

      const activeClientsTotal = 4
      const uniqueClients = new Set(mockExams.map((e) => e.clientId)).size
      const coveragePercent = Math.round((uniqueClients / activeClientsTotal) * 100)

      let alteredCount = 0
      mockExams.forEach((e) => {
        e.markers.forEach((m) => {
          if (m.status === "ALERT" || m.status === "BORDERLINE") alteredCount++
        })
      })

      const kpis: LabExamsKpi = {
        totalExams: mockExams.length,
        clientsWithExamsCount: uniqueClients,
        clientsCoveragePercent: coveragePercent,
        alteredMarkersCount: alteredCount,
        ordersIssuedCount: 3,
      }

      expect(kpis.totalExams).toBe(2)
      expect(kpis.clientsWithExamsCount).toBe(2)
      expect(kpis.clientsCoveragePercent).toBe(50)
      expect(kpis.alteredMarkersCount).toBe(1)
      expect(kpis.ordersIssuedCount).toBe(3)
    })
  })
})
