import { describe, expect, it } from "vitest"
import {
  aggregatePersonalEvolutions,
  comparePersonalAssessments,
  enrichAssessment,
  type PersonalAssessmentRaw,
} from "./usePersonalEvolution"
import { buildPersonalEvolutionPrintDocument } from "@/lib/evolution-print-document"

const baseAssessments: PersonalAssessmentRaw[] = [
  {
    id: "a1",
    clientId: "c1",
    date: "2026-09-01T12:00:00.000Z",
    weight: 60,
    bodyFat: 24,
    waist: 70,
    hips: 96,
    benchPress1RM: 40,
    squat1RM: 75,
    deadlift1RM: 90,
    skinfoldTriceps: 15,
    skinfoldAbdominal: 18,
    client: { id: "c1", name: "Mariana Costa" },
  },
  {
    id: "a2",
    clientId: "c1",
    date: "2026-11-01T12:00:00.000Z",
    weight: 62.5,
    bodyFat: 21.5,
    waist: 67.5,
    hips: 99,
    benchPress1RM: 46,
    squat1RM: 93.75,
    deadlift1RM: 110,
    skinfoldTriceps: 13,
    skinfoldAbdominal: 15,
    client: { id: "c1", name: "Mariana Costa" },
  },
]

describe("usePersonalEvolution domain logic", () => {
  it("enriches assessment with skinfold sum, powerlifting total and relative 1RM", () => {
    const enriched = enrichAssessment(baseAssessments[1])
    expect(enriched.skinfoldSum).toBe(28)
    expect(enriched.powerliftingTotal).toBe(249.8)
    expect(enriched.relativeSquat).toBe(1.5)
    expect(enriched.relativeDeadlift).toBe(1.76)
  })

  it("aggregates student evolutions and computes deltas accurately", () => {
    const { clientEvolutions, summary } =
      aggregatePersonalEvolutions(baseAssessments)
    expect(summary.totalClients).toBe(1)
    expect(summary.totalAssessments).toBe(2)
    expect(summary.averageSquatDelta).toBe(18.8)
    expect(summary.averageBodyFatDelta).toBe(-2.5)

    const mariana = clientEvolutions[0]
    expect(mariana.weightDelta).toBe(2.5)
    expect(mariana.bodyFatDelta).toBe(-2.5)
    expect(mariana.squat1RMDelta).toBe(18.8)
    expect(mariana.deadlift1RMDelta).toBe(20)
    expect(mariana.bench1RMDelta).toBe(6)
    expect(mariana.hipsDelta).toBe(3)
    expect(mariana.waistDelta).toBe(-2.5)
    expect(mariana.skinfoldSumDelta).toBe(-5)
    expect(mariana.has1RMData).toBe(true)
  })

  it("compares two assessments and generates an escaped A4 print document", () => {
    const comparisons = comparePersonalAssessments(
      baseAssessments[0],
      baseAssessments[1],
    )
    const squatRow = comparisons.find((r) => r.field === "squat1RM")
    expect(squatRow?.firstValue).toBe(75)
    expect(squatRow?.secondValue).toBe(93.75)
    expect(squatRow?.delta).toBe(18.8)

    const { clientEvolutions } = aggregatePersonalEvolutions([
      {
        ...baseAssessments[0],
        client: { id: "c1", name: 'Mariana <script>alert("xss")</script>' },
      },
      {
        ...baseAssessments[1],
        client: { id: "c1", name: 'Mariana <script>alert("xss")</script>' },
      },
    ])

    const html = buildPersonalEvolutionPrintDocument({
      evolution: clientEvolutions[0],
      professionalName: "Lucas Andrade",
    })
    expect(html).toContain("Relatório de Evolução Física &amp; Força")
    expect(html).not.toContain('<script>alert("xss")</script>')
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;")
  })
})
