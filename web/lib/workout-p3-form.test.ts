import { describe, expect, it } from "vitest"
import { buildWorkoutInput, copyWorkoutToForm, createEmptyWorkoutForm, createWorkoutExercise, duplicateExercise, duplicateSplit, isWorkoutFormDirty, suggestedSecondaryMuscles, validateWorkoutForm } from "./workout-form"
import { fromDraftContent, toDraftContent, validateDraftForm } from "./workout-draft-form"
import type { Periodization } from "@/types/workout-p3"
const periodization: Periodization = { version: 1, startsOn: "2026-10-26", timeZone: "America/Sao_Paulo", phases: [{ name: "Base", type: "ADAPTATION", startWeek: 1, endWeek: 4, effortType: "RIR", effortTarget: "2" }], progression: null }
function configuredForm() {
  const form = createEmptyWorkoutForm()
  form.title = "Força"
  form.durationWeeks = "4"
  form.periodization = structuredClone(periodization)
  form.splits[0].weeklyFrequency = 3
  form.splits[0].exercises = [{ ...createWorkoutExercise(), name: "Supino", sets: "3 + drop", reps: "8–10", muscleGroup: "CHEST", secondaryMuscles: [{ muscleGroup: "TRICEPS", weight: 0.5 }] }]
  return form
}
describe("P3 form metadata", () => {
  it("permite data pendente no rascunho e exige para finalizar", () => {
    const form = configuredForm()
    form.durationWeeks = "4"
    form.periodization!.startsOn = ""
    expect(validateWorkoutForm(form).periodization).toBeTruthy()
    expect(validateDraftForm(form).periodization).toBeUndefined()
  })
  it("new splits default to one while legacy frequency remains unknown", () => {
    expect(createEmptyWorkoutForm().splits[0].weeklyFrequency).toBe(1)
    const legacy = fromDraftContent({ title: "Antigo", goal: "", durationWeeks: null, notes: "", splits: [{ name: "A", focus: "", exercises: [] }] })
    expect(legacy.splits[0].weeklyFrequency).toBeNull()
    expect(legacy.periodization).toBeNull()
  })
  it("marks clearing the default frequency as an unsaved change", () => {
    const form = createEmptyWorkoutForm()
    expect(isWorkoutFormDirty(form)).toBe(false)
    form.splits[0].weeklyFrequency = null
    expect(isWorkoutFormDirty(form)).toBe(true)
  })
  it("roundtrips independent metadata and free text through drafts and direct inputs", () => {
    const content = toDraftContent(configuredForm())
    const restored = fromDraftContent(content)
    expect(content.periodization).toEqual(periodization)
    expect(restored.splits[0].weeklyFrequency).toBe(3)
    expect(restored.splits[0].exercises[0].secondaryMuscles).toEqual([{ muscleGroup: "TRICEPS", weight: 0.5 }])
    expect(toDraftContent(restored)).toEqual(content)
    const input = buildWorkoutInput(restored, "c1")
    expect(input.periodization).toEqual(periodization)
    expect(input.splits[0]).toMatchObject({ weeklyFrequency: 3, exercises: [{ sets: "3 + drop", reps: "8–10", secondaryMuscles: [{ muscleGroup: "TRICEPS", weight: 0.5 }] }] })
    restored.splits[0].exercises[0].secondaryMuscles![0].weight = 1
    expect(content.splits[0].exercises[0].secondaryMuscles![0].weight).toBe(0.5)
    restored.periodization!.phases[0].name = "Alterado"
    expect(content.periodization!.phases[0].name).toBe("Base")
  })
  it("duplicates and copies independent secondary lists", () => {
    const form = configuredForm()
    const exercise = form.splits[0].exercises[0]
    const duplicate = duplicateExercise(exercise)
    duplicate.secondaryMuscles![0].weight = 1
    expect(exercise.secondaryMuscles![0].weight).toBe(0.5)
    const split = duplicateSplit(form.splits[0])
    expect(split.weeklyFrequency).toBe(3)
    split.exercises[0].secondaryMuscles!.push({ muscleGroup: "SHOULDERS", weight: 0.5 })
    expect(exercise.secondaryMuscles).toHaveLength(1)
    const copy = copyWorkoutToForm({ id: "w1", clientId: "c1", title: "Ficha", goal: null, durationWeeks: 4, notes: null, createdAt: "", updatedAt: "", isActive: true, isTemplate: false, periodization, splits: [{ id: "s1", name: "A", focus: null, weeklyFrequency: 2, exercises: [{ ...exercise, muscleGroup: "CHEST", method: "STANDARD", effortType: null, notes: null, rest: null }] }] })
    expect(copy.periodization).toEqual(periodization)
    expect(copy.splits[0].weeklyFrequency).toBe(2)
    copy.splits[0].exercises[0].secondaryMuscles![0].weight = 0
    expect(exercise.secondaryMuscles![0].weight).toBe(0.5)
  })
  it("validates frequency, duplicates, primary muscle and weights without coercing text", () => {
    const form = configuredForm()
    expect(validateWorkoutForm(form)).toEqual({})
    form.splits[0].weeklyFrequency = 1.5
    form.splits[0].exercises[0].secondaryMuscles = [{ muscleGroup: "CHEST", weight: 0.5 }, { muscleGroup: "TRICEPS", weight: 0.25 }, { muscleGroup: "TRICEPS", weight: 1 }]
    expect(validateWorkoutForm(form)).toHaveProperty(`splits.${form.splits[0].id}.weeklyFrequency`)
    expect(validateWorkoutForm(form)).toHaveProperty(`exercises.${form.splits[0].exercises[0].id}.secondaryMuscles`)
  })
  it("suggests only by explicit catalog IDs and returns independent lists", () => {
    const reference = { source: "CATALOG" as const, exerciseId: "cat-chest-01", demonstrationRevision: null }
    expect(suggestedSecondaryMuscles(reference)).toEqual([{ muscleGroup: "TRICEPS", weight: 0.5 }, { muscleGroup: "SHOULDERS", weight: 0.5 }])
    expect(suggestedSecondaryMuscles({ ...reference, exerciseId: "cat-chest-08" })).toBeNull()
    expect(suggestedSecondaryMuscles({ ...reference, source: "CUSTOM" })).toBeNull()
    expect(suggestedSecondaryMuscles({ ...reference, exerciseId: "cat-back-06" })).toContainEqual({ muscleGroup: "BICEPS", weight: 0.5 })
    expect(suggestedSecondaryMuscles({ ...reference, exerciseId: "cat-quads-01" })).toContainEqual({ muscleGroup: "GLUTES", weight: 0.5 })
    suggestedSecondaryMuscles(reference)![0].weight = 1
    expect(suggestedSecondaryMuscles(reference)![0].weight).toBe(0.5)
  })
})
