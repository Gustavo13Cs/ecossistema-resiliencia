import { describe, expect, it } from "vitest"
import { createEmptyWorkoutForm, createWorkoutExercise } from "./workout-form"
import { fromDraftContent, toDraftContent, validateDraftForm } from "./workout-draft-form"

describe("workout draft form", () => {
  it("save_sends_reference_not_snapshot and preserves historical null snapshots on load", () => {
    const form = createEmptyWorkoutForm()
    form.splits[0].exercises = [{ ...createWorkoutExercise(), name: "Supino", libraryReference: { source: "CUSTOM", exerciseId: "custom-1", demonstrationRevision: null }, demonstrationSnapshot: null }]
    const sent = toDraftContent(form)
    expect(sent.splits[0].exercises[0].libraryReference).toEqual(form.splits[0].exercises[0].libraryReference)
    expect(sent.splits[0].exercises[0]).not.toHaveProperty("demonstrationSnapshot")
    const loaded = fromDraftContent({ ...sent, splits: [{ ...sent.splits[0], exercises: [{ ...sent.splits[0].exercises[0], demonstrationSnapshot: null }] }] })
    expect(loaded.splits[0].exercises[0].libraryReference?.demonstrationRevision).toBeNull()
    expect(loaded.splits[0].exercises[0].demonstrationSnapshot).toBeNull()
  })
  it("roundtrips_empty_and_advanced_fields", () => {
    const empty = { title: "", goal: "", durationWeeks: null, notes: "", splits: [] }
    expect(toDraftContent(fromDraftContent(empty))).toEqual(empty)
    const form = createEmptyWorkoutForm()
    form.title = "Força"
    form.durationWeeks = "8"
    form.splits[0].exercises = [{ ...createWorkoutExercise(), name: "Supino", sets: "", reps: "8", muscleGroup: "CHEST", load: "20 kg", effortType: "RIR", effortTarget: "2", tempo: "3-0-1-0", method: "DROP_SET", notes: "Pausa" }]
    const content = toDraftContent(form)
    expect(content).toEqual({ title: "Força", goal: "", durationWeeks: 8, notes: "", splits: [{ name: "Treino A", focus: "", weeklyFrequency: 1, exercises: [{ name: "Supino", sets: "", reps: "8", rest: "", notes: "Pausa", muscleGroup: "CHEST", load: "20 kg", effortType: "RIR", effortTarget: "2", tempo: "3-0-1-0", method: "DROP_SET" }] }] })
    expect(toDraftContent(fromDraftContent(content))).toEqual(content)
    expect(content.splits[0]).not.toHaveProperty("id")
    expect(content.splits[0].exercises[0]).not.toHaveProperty("id")
    expect(fromDraftContent(content).splits[0].id).not.toBe(fromDraftContent(content).splits[0].id)
  })
  it("preserves_null_and_explicit_standard_method", () => {
    const content = toDraftContent(createEmptyWorkoutForm())
    content.splits[0].exercises = [{ name: "", sets: "", reps: "", rest: "", notes: "", muscleGroup: null, load: "", effortType: null, effortTarget: "2", tempo: "", method: null }]
    expect(toDraftContent(fromDraftContent(content))).toEqual(content)
    content.splits[0].exercises[0].method = "STANDARD"
    expect(toDraftContent(fromDraftContent(content))).toEqual(content)
  })
  it("draft_save_accepts_incomplete_form", () => {
    const form = createEmptyWorkoutForm()
    form.splits[0].name = ""
    form.splits[0].exercises = [{ ...createWorkoutExercise(), effortTarget: "2" }]
    expect(validateDraftForm(form)).toEqual({})
    form.splits = []
    expect(validateDraftForm(form)).toEqual({})
  })
  it("rejects_invalid_duration_limits_tempo_and_utf8_size", () => {
    const form = createEmptyWorkoutForm()
    form.durationWeeks = "abc"
    expect(validateDraftForm(form)).toHaveProperty("durationWeeks")
    form.durationWeeks = "105"
    expect(validateDraftForm(form)).toHaveProperty("durationWeeks")
    form.durationWeeks = ""
    form.splits[0].exercises = [{ ...createWorkoutExercise(), tempo: "fast", name: "x".repeat(201) }]
    const errors = validateDraftForm(form)
    expect(errors).toHaveProperty(`exercises.${form.splits[0].exercises[0].id}.tempo`)
    expect(errors).toHaveProperty(`exercises.${form.splits[0].exercises[0].id}.name`)
    form.splits[0].exercises = Array.from({ length: 40 }, () => ({ ...createWorkoutExercise(), notes: "á".repeat(1000) }))
    expect(JSON.stringify(toDraftContent(form)).length).toBeLessThan(65536)
    expect(validateDraftForm(form).content).toMatch(/64 KiB/)
  })
})
