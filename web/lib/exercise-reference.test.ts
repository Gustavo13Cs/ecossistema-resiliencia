import { describe, expect, it } from "vitest"
import { createWorkoutExercise } from "./workout-form"
import { adoptSavedDemonstrations, adoptSavedFormDemonstrations, renameWorkoutExercise } from "./exercise-reference"

const reference = { source: "CATALOG" as const, exerciseId: "cat-1", demonstrationRevision: "2026-10-19.1:1" }
const presentation = { revision: "2026-10-19.1:1", instruction: "Controlar o movimento" }

describe("exercise reference", () => {
  it("manual_rename_clears_demonstration_with_notice", () => {
    const exercise = { ...createWorkoutExercise(), name: "Supino Reto", libraryReference: reference, demonstrationSnapshot: presentation }
    expect(renameWorkoutExercise(exercise, " supino   reto ")).toMatchObject({ libraryReference: reference, demonstrationSnapshot: presentation })
    expect(renameWorkoutExercise(exercise, "Agachamento")).toMatchObject({ libraryReference: null, demonstrationSnapshot: null })
  })

  it("saved response adopts only the matching submitted and current reference without changing edited fields", () => {
    const submitted = { ...createWorkoutExercise(), name: "Supino", sets: "3", libraryReference: reference }
    const current = { ...submitted, sets: "5" }
    const saved = { ...submitted, demonstrationSnapshot: presentation }
    expect(adoptSavedDemonstrations([current], [submitted], [saved])[0]).toMatchObject({ sets: "5", demonstrationSnapshot: presentation })
    expect(adoptSavedDemonstrations([{ ...current, libraryReference: null }], [submitted], [saved])[0]).toMatchObject({ libraryReference: null, demonstrationSnapshot: null })
    expect(adoptSavedDemonstrations([current], [submitted], [{ ...saved, libraryReference: null }])[0].demonstrationSnapshot).toBeNull()
  })

  it("response reconciliation follows local ids through reorder and preserves manual detach", () => {
    const first = { ...createWorkoutExercise(), name: "Supino", libraryReference: reference }
    const second = createWorkoutExercise()
    const submitted = { title: "", goal: "", durationWeeks: "", notes: "", splits: [{ id: "s1", name: "A", focus: "", exercises: [first, second] }] }
    const current = { ...submitted, splits: [{ ...submitted.splits[0], exercises: [second, { ...first, libraryReference: null, demonstrationSnapshot: null }] }] }
    const saved = { splits: [{ exercises: [{ libraryReference: reference, demonstrationSnapshot: presentation }, { libraryReference: null, demonstrationSnapshot: null }] }] }
    expect(adoptSavedFormDemonstrations(current, submitted, saved).splits[0].exercises[1].demonstrationSnapshot).toBeNull()
    expect(adoptSavedFormDemonstrations(submitted, submitted, saved).splits[0].exercises[0].demonstrationSnapshot).toEqual(presentation)
  })
})
