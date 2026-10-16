import { describe, expect, it } from "vitest"
import { buildPersonalAssessmentPayload, validatePersonalAssessment } from "./personal-assessment"

describe("Personal assessment input", () => {
  it("saves_force_without_weight", () => {
    expect(validatePersonalAssessment({ squat1RM: "80" })).toEqual({})
    expect(buildPersonalAssessmentPayload({ squat1RM: "80", weight: "" }, "c1")).toEqual({ clientId: "c1", squat1RM: 80 })
  })
  it("does_not_send_blank_as_zero", () => {
    expect(buildPersonalAssessmentPayload({ weight: " ", bodyFat: "0", notes: " treino " }, "c1")).toEqual({ clientId: "c1", bodyFat: 0, notes: "treino" })
  })
  it("accepts a decimal comma without changing the unit", () => {
    expect(buildPersonalAssessmentPayload({ weight: "70,5", skinfoldTriceps: "10.5" }, "c1")).toEqual({ clientId: "c1", weight: 70.5, skinfoldTriceps: 10.5 })
  })
  it("whitelists numeric input and omits invalid values", () => {
    const values = { squat1RM: "80", muscleMass: "22", vo2Max: "40", userId: "other", weight: "Infinity", waist: "-1" }
    expect(buildPersonalAssessmentPayload(values, "c1")).toEqual({ clientId: "c1", squat1RM: 80 })
  })
  it.each(["", " "])("rejects no measurement even with notes (%j)", weight => {
    expect(validatePersonalAssessment({ weight, notes: "Somente observação" }).measurement).toBeTruthy()
  })
  it.each(["-1", "0", "Infinity", "NaN", "1,2,3"])("rejects invalid positive measurements (%s)", weight => {
    expect(validatePersonalAssessment({ weight }).weight).toBeTruthy()
  })
  it.each(["-1", "100.1", "Infinity"])("rejects invalid body fat (%s)", bodyFat => {
    expect(validatePersonalAssessment({ bodyFat }).bodyFat).toBeTruthy()
  })
  it.each(["0", "100"])("accepts body fat boundary (%s)", bodyFat => {
    expect(validatePersonalAssessment({ bodyFat })).toEqual({})
  })
})
