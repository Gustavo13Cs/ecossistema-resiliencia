import { describe, expect, it } from "vitest"
import {
  calculatePersonalFollowUpItem,
  summarizePersonalFollowUpsKpi,
} from "./usePersonalFollowUps"
import type { Client } from "@/types/client"
import type { Periodization } from "@/types/workout-p3"

const mockClient = (id: string, name: string): Client => ({
  id,
  professionalId: "prof-1",
  name,
  email: null,
  phone: null,
  birthDate: null,
  gender: null,
  goal: null,
  height: null,
  initialWeight: null,
  allergies: null,
  pathologies: null,
  typicalSleep: null,
  stressLevel: null,
  foodRelationship: null,
  psychologyHistory: null,
  exerciseType: null,
  exerciseFrequency: null,
  exerciseDuration: null,
  hasPersonal: null,
  workActivityLevel: null,
  professionalNotes: null,
  privacyNotes: null,
  status: "ACTIVE",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
})

const periodization8Weeks = (startsOn: string): Periodization => ({
  version: 1,
  startsOn,
  timeZone: "America/Sao_Paulo",
  phases: [
    {
      name: "Adaptação",
      type: "ADAPTATION",
      startWeek: 1,
      endWeek: 2,
      effortType: "RIR",
      effortTarget: "3",
    },
    {
      name: "Sobrecarga",
      type: "OVERLOAD",
      startWeek: 3,
      endWeek: 7,
      effortType: "RIR",
      effortTarget: "2",
    },
    {
      name: "Deload",
      type: "DELOAD",
      startWeek: 8,
      endWeek: 8,
      effortType: "RIR",
      effortTarget: "4-5",
    },
  ],
  progression: null,
})

describe("usePersonalFollowUps domain logic", () => {
  const nowMs = Date.parse("2026-11-16T15:00:00.000Z")

  it("identifies student without active workout and never assessed", () => {
    const item = calculatePersonalFollowUpItem({
      client: mockClient("c1", "Fernanda Lima"),
      workouts: [],
      openDrafts: [],
      assessments: [],
      appointments: [],
      nowMs,
    })

    expect(item.workoutCycleStatus).toBe("NO_ACTIVE_WORKOUT")
    expect(item.assessmentStatus).toBe("NEVER_ASSESSED")
    expect(item.urgencyScore).toBeGreaterThanOrEqual(140)
  })

  it("identifies student in DELOAD_WEEK and links open draft", () => {
    const item = calculatePersonalFollowUpItem({
      client: mockClient("c2", "Thiago Nascimento"),
      workouts: [
        {
          id: "w1",
          clientId: "c2",
          title: "Força Corrida 21km",
          durationWeeks: 8,
          isActive: true,
          createdAt: "2026-09-25T10:00:00.000Z",
          periodization: periodization8Weeks("2026-09-25"),
        },
      ],
      openDrafts: [
        {
          id: "d1",
          clientId: "c2",
          status: "OPEN",
          version: 1,
          title: "Pós-Meia Maratona",
          createdAt: "2026-11-15T10:00:00.000Z",
          updatedAt: "2026-11-15T10:00:00.000Z",
          client: { id: "c2", name: "Thiago Nascimento", status: "ACTIVE" },
        },
      ],
      assessments: [
        {
          id: "a1",
          clientId: "c2",
          date: "2026-09-20T10:00:00.000Z",
          weight: 70,
          client: { id: "c2", name: "Thiago Nascimento" },
        },
      ],
      appointments: [],
      nowMs,
    })

    expect(item.workoutCycleStatus).toBe("DELOAD_WEEK")
    expect(item.currentWeek).toBe(8)
    expect(item.currentPhaseType).toBe("DELOAD")
    expect(item.openDraft?.id).toBe("d1")
    expect(item.assessmentStatus).toBe("ASSESSMENT_OVERDUE")

    const kpi = summarizePersonalFollowUpsKpi([item])
    expect(kpi.deloadOrEndingSoonCount).toBe(1)
    expect(kpi.assessmentPendingCount).toBe(1)
  })
})
