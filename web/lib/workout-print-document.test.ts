import { describe, expect, it } from "vitest"
import type { WorkoutDetail } from "@/types/workout"
import { suggestPeriodization } from "./workout-periodization"
import {
  buildWorkoutBlockSheetPrintHtml,
  buildWorkoutGymSheetPrintHtml,
} from "./workout-print-document"

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html")

function makeWorkout(overrides: Partial<WorkoutDetail> = {}): WorkoutDetail {
  return {
    id: "w-1",
    clientId: "c-1",
    client: { id: "c-1", name: "Lucas Andrade", status: "ACTIVE" },
    title: "Hipertrofia Upper/Lower",
    goal: "Ganho de massa muscular",
    durationWeeks: 8,
    notes: "Aquecer manguito antes do treino superior.\nHidratar entre as séries.",
    createdAt: "2026-10-20T12:00:00.000Z",
    updatedAt: "2026-10-20T12:00:00.000Z",
    finalizedAt: "2026-10-20T12:00:00.000Z",
    isActive: true,
    isTemplate: false,
    splits: [
      {
        id: "s-2",
        name: "Treino B — Inferiores",
        focus: "Quadríceps e Posteriores",
        position: 1,
        weeklyFrequency: 2,
        exercises: [
          {
            id: "e-2",
            name: "Agachamento Livre",
            sets: "4",
            reps: "6-8",
            rest: "150s",
            load: "90 kg",
            effortType: "RIR",
            effortTarget: "2",
            tempo: "3-1-1-0",
            method: "STANDARD",
            muscleGroup: "QUADRICEPS",
            notes: "Manter tronco firme",
            position: 0,
          },
        ],
      },
      {
        id: "s-1",
        name: "Treino A — Superiores",
        focus: "Peito e Costas",
        position: 0,
        weeklyFrequency: 2,
        exercises: [
          {
            id: "e-1b",
            name: "Remada Curvada",
            sets: "4",
            reps: "8-10",
            rest: "90s",
            load: "60 kg",
            effortType: "RPE",
            effortTarget: "8",
            tempo: "2-0-1-1",
            method: "REST_PAUSE",
            muscleGroup: "BACK",
            notes: "Cotovelos próximos",
            position: 1,
          },
          {
            id: "e-1a",
            name: "Supino Inclinado com Halteres",
            sets: "4",
            reps: "8-10",
            rest: "120s",
            load: "30 kg",
            effortType: "RIR",
            effortTarget: "2",
            tempo: "3-0-1-0",
            method: "STANDARD",
            muscleGroup: "CHEST",
            notes: "Descer controlado\nSem perder escápulas",
            position: 0,
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe("workout typographic A4 print documents", () => {
  it.each([
    "<script>alert(1)</script>",
    '<svg onload="alert(2)">',
    "</style><img src=x onerror=alert(3)>",
    'quotes " & \' plus\nsecond line',
  ])("escapes every field and keeps untrusted text inert in both modes: %s", attack => {
    const periodization = {
      ...suggestPeriodization(4),
      startsOn: "2026-11-02",
    }
    periodization.phases[0] = { ...periodization.phases[0], name: attack }
    const workout = makeWorkout({
      client: { id: "c-1", name: attack, status: "ACTIVE" },
      title: attack,
      goal: attack,
      durationWeeks: 4,
      notes: attack,
      periodization,
      splits: [
        {
          id: "s-attack",
          name: attack,
          focus: attack,
          weeklyFrequency: 2,
          exercises: [
            {
              id: "e-attack",
              name: attack,
              sets: "4",
              reps: "10",
              rest: attack,
              load: attack,
              effortType: "RIR",
              effortTarget: "2",
              tempo: attack,
              notes: attack,
              method: "DROP_SET",
              muscleGroup: "CHEST",
            },
          ],
        },
      ],
    })

    const input = {
      workout,
      professionalName: attack,
      professionalCredential: attack,
      dateLabel: attack,
    }

    for (const html of [
      buildWorkoutGymSheetPrintHtml(input),
      buildWorkoutBlockSheetPrintHtml(input),
    ]) {
      expect(html).not.toContain("<script")
      const doc = parse(html)
      expect(doc.querySelector("script,svg,img,[onload],[onerror]")).toBeNull()
      expect(doc.querySelector(".client-name")?.textContent).toBe(attack)
      expect(doc.querySelector(".professional-line")?.textContent).toContain(attack)
      expect(doc.querySelector("title")?.textContent).toContain(attack)
    }
  })

  it("renders Modo Ficha de Academia in persisted split/exercise order with optional toggles", () => {
    const workout = makeWorkout()
    const html = buildWorkoutGymSheetPrintHtml({
      workout,
      professionalName: "Ana Personal",
      professionalCredential: "CREF 012345-G/SP",
      dateLabel: "06 de novembro de 2026",
    })
    const doc = parse(html)

    expect(doc.querySelector(".brand")?.textContent).toBe("SafeMove · Treinamento")
    expect(doc.querySelector(".professional-line")?.textContent).toBe(
      "Personal: Ana Personal · CREF 012345-G/SP",
    )

    const splitHeadings = Array.from(doc.querySelectorAll(".split-name"), node => node.textContent)
    expect(splitHeadings).toEqual(["Treino A — Superiores", "Treino B — Inferiores"])

    const splitAExercises = Array.from(
      doc.querySelectorAll(".split-block")[0]!.querySelectorAll(".exercise-title"),
      node => node.textContent,
    )
    expect(splitAExercises).toEqual(["Supino Inclinado com Halteres", "Remada Curvada"])
    expect(doc.body.textContent).toContain("30 kg")
    expect(doc.body.textContent).toContain("Rest-pause")
    expect(doc.querySelector(".general-notes p")?.innerHTML).toBe(
      "Aquecer manguito antes do treino superior.<br>Hidratar entre as séries.",
    )

    const cleanHtml = buildWorkoutGymSheetPrintHtml({
      workout,
      professionalName: "Ana Personal",
      dateLabel: "06 de novembro de 2026",
      options: {
        includeLoads: false,
        includeExerciseNotes: false,
        includeGeneralNotes: false,
      },
    })
    const cleanDoc = parse(cleanHtml)
    expect(cleanDoc.body.textContent).not.toContain("30 kg")
    expect(cleanDoc.body.textContent).not.toContain("60 kg")
    expect(cleanDoc.body.textContent).not.toContain("Cotovelos próximos")
    expect(cleanDoc.querySelector(".general-notes")).toBeNull()
  })

  it("projects selected week targets and civil dates in Modo Ficha de Academia when periodization is active", () => {
    const periodization = {
      ...suggestPeriodization(8),
      startsOn: "2026-11-02",
      progression: { intervalWeeks: 2, repsDelta: 1 as const, effortDelta: 0 as const },
    }
    const workout = makeWorkout({ durationWeeks: 8, periodization })

    const deloadHtml = buildWorkoutGymSheetPrintHtml({
      workout,
      dateLabel: "06 de novembro de 2026",
      options: { selectedWeek: 8 },
    })
    const doc = parse(deloadHtml)
    expect(doc.querySelector(".doc-title")?.textContent).toBe("Ficha de Treino · Semana 8")
    expect(doc.body.textContent).toContain("Deload")
    expect(doc.body.textContent).toContain("21/12/2026 a 27/12/2026")
    // 4 sets reduced by ~40% in deload -> round(4 * 0.6) = 2 sets
    expect(doc.body.textContent).toContain("2 × 8-10")
  })

  it("renders Planilha do Bloco chunked up to 6 weeks per page table with projected metas and load slots", () => {
    const periodization = {
      ...suggestPeriodization(8),
      startsOn: "2026-11-02",
      progression: { intervalWeeks: 2, repsDelta: 1 as const, effortDelta: 1 as const },
    }
    const workout = makeWorkout({ durationWeeks: 8, periodization })
    const html = buildWorkoutBlockSheetPrintHtml({
      workout,
      professionalName: "Ana Personal",
      dateLabel: "06 de novembro de 2026",
    })
    const doc = parse(html)

    // 2 splits × 2 week chunks (1..6 and 7..8) = 4 split tables
    const splitNames = Array.from(doc.querySelectorAll(".split-name"), node => node.textContent)
    expect(splitNames).toEqual([
      "Treino A — Superiores · Semanas 1 a 6",
      "Treino A — Superiores · Semanas 7 a 8",
      "Treino B — Inferiores · Semanas 1 a 6",
      "Treino B — Inferiores · Semanas 7 a 8",
    ])
    expect(doc.body.textContent).toContain("02/11/2026–08/11/2026")
    expect(doc.body.textContent).toContain("Deload")
    expect(doc.body.textContent).toContain("Carga: _________")
  })
})
