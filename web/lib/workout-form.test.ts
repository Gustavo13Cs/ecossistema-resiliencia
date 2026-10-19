import { describe, expect, it } from "vitest"
import type { WorkoutPrescription } from "@/types/workout"
import {
  buildWorkoutInput,
  copyWorkoutToForm,
  createEmptyWorkoutForm,
  createWorkoutExercise,
  createWorkoutSplit,
  duplicateExercise,
  duplicateSplit,
  isWorkoutFormDirty,
  moveItem,
  summarizeAdvancedExercise,
  validateWorkoutForm,
} from "./workout-form"

const samplePrescription: WorkoutPrescription = {
  id: "workout-active",
  clientId: "client-1",
  title: "Força Base",
  goal: "Hipertrofia e controle motor",
  durationWeeks: 8,
  notes: "Aquecer 10 minutos antes.",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-10T12:00:00.000Z",
  isActive: true,
  isTemplate: false,
  splits: [
    {
      id: "split-db-1",
      name: "Treino A",
      focus: "Inferiores",
      position: 0,
      exercises: [
        {
          id: "ex-db-1",
          name: "Agachamento Livre",
          sets: "4",
          reps: "6-8",
          rest: "120s",
          notes: "Cadência controlada",
          position: 0,
          muscleGroup: "QUADRICEPS",
          load: "80 kg",
          effortType: "RIR",
          effortTarget: "2",
          tempo: "3-1-1-0",
          method: "REST_PAUSE",
        },
      ],
    },
    {
      id: "split-db-2",
      name: "Treino B",
      focus: null,
      position: 1,
      exercises: [
        {
          id: "ex-db-2",
          name: "Supino Reto",
          sets: "3",
          reps: "8-10",
          rest: null,
          notes: null,
          position: 0,
          method: "STANDARD",
        },
      ],
    },
  ],
}

describe("workout-form helpers", () => {
  it("changing_sets_keeps_reference and save_sends_reference_not_snapshot", () => {
    const exercise = { ...createWorkoutExercise(), name: "Supino", sets: "4", reps: "8", libraryReference: { source: "CATALOG" as const, exerciseId: "cat-1", demonstrationRevision: "r1" }, demonstrationSnapshot: { revision: "r1", instruction: "test" } }
    const form = createEmptyWorkoutForm()
    form.splits[0].exercises = [{ ...exercise, sets: "5" }]
    const sent = buildWorkoutInput(form, "client-1").splits[0].exercises[0]
    expect(sent.libraryReference).toEqual(exercise.libraryReference)
    expect(sent).not.toHaveProperty("demonstrationSnapshot")
  })

  it("copies authorized prescription presentation without sending it on direct create", () => {
    const prescription = structuredClone(samplePrescription)
    prescription.splits[0].exercises[0].libraryReference = { source: "CATALOG", exerciseId: "cat-chest-01", demonstrationRevision: "r1" }
    prescription.splits[0].exercises[0].demonstrationSnapshot = { revision: "r1", instruction: "Treino", assets: [] }
    const form = copyWorkoutToForm(prescription)
    expect(form.splits[0].exercises[0].demonstrationSnapshot).toEqual(prescription.splits[0].exercises[0].demonstrationSnapshot)
    const payload = buildWorkoutInput(form, "client-1").splits[0].exercises[0]
    expect(payload.libraryReference).toEqual(prescription.splits[0].exercises[0].libraryReference)
    expect(payload).not.toHaveProperty("demonstrationSnapshot")
  })

  it("duplicate_and_reorder_preserve_snapshot", () => {
    const exercise = { ...createWorkoutExercise(), libraryReference: { source: "CATALOG" as const, exerciseId: "cat-1", demonstrationRevision: null }, demonstrationSnapshot: null }
    const duplicate = duplicateExercise(exercise)
    expect(moveItem([exercise, duplicate], 0, 1).map(item => item.libraryReference)).toEqual([exercise.libraryReference, exercise.libraryReference])
    expect(duplicate.demonstrationSnapshot).toBeNull()
  })
  it("starts with only the structural Treino A split and no sample exercises", () => {
    const form = createEmptyWorkoutForm()
    expect(form.title).toBe("")
    expect(form.goal).toBe("")
    expect(form.durationWeeks).toBe("")
    expect(form.notes).toBe("")
    expect(form.splits).toHaveLength(1)
    expect(form.splits[0].name).toBe("Treino A")
    expect(form.splits[0].focus).toBe("")
    expect(form.splits[0].exercises).toEqual([])
    expect(isWorkoutFormDirty(form)).toBe(false)
  })

  it("copies an existing prescription into editable form state with local ids and advanced fields", () => {
    const form = copyWorkoutToForm(samplePrescription)
    expect(form.title).toBe("Força Base")
    expect(form.goal).toBe("Hipertrofia e controle motor")
    expect(form.durationWeeks).toBe("8")
    expect(form.notes).toBe("Aquecer 10 minutos antes.")
    expect(form.splits).toHaveLength(2)
    expect(form.splits[0].id).not.toBe("split-db-1")
    expect(form.splits[0].exercises[0].id).not.toBe("ex-db-1")
    expect(form.splits[0].exercises[0]).toMatchObject({
      name: "Agachamento Livre",
      sets: "4",
      reps: "6-8",
      rest: "120s",
      notes: "Cadência controlada",
      muscleGroup: "QUADRICEPS",
      load: "80 kg",
      effortType: "RIR",
      effortTarget: "2",
      tempo: "3-1-1-0",
      method: "REST_PAUSE",
    })
    expect(form.splits[1].focus).toBe("")
    expect(form.splits[1].exercises[0].rest).toBe("")
    expect(isWorkoutFormDirty(form)).toBe(true)
  })

  it("moves items up and down immutably within bounds", () => {
    const original = ["A", "B", "C"]
    expect(moveItem(original, 1, -1)).toEqual(["B", "A", "C"])
    expect(moveItem(original, 1, 1)).toEqual(["A", "C", "B"])
    expect(moveItem(original, 0, -1)).toEqual(["A", "B", "C"])
    expect(moveItem(original, 2, 1)).toEqual(["A", "B", "C"])
    expect(original).toEqual(["A", "B", "C"])
  })

  it("duplicates exercises and splits with distinct local ids and copy suffix", () => {
    const ex = createWorkoutExercise()
    ex.name = "Supino Reto"
    ex.load = "70 kg"
    const duplicatedEx = duplicateExercise(ex)
    expect(duplicatedEx.id).not.toBe(ex.id)
    expect(duplicatedEx.name).toBe("Supino Reto")
    expect(duplicatedEx.load).toBe("70 kg")

    const split = createWorkoutSplit(0)
    split.name = "Treino A"
    split.exercises = [ex]
    const duplicatedSp = duplicateSplit(split)
    expect(duplicatedSp.id).not.toBe(split.id)
    expect(duplicatedSp.name).toBe("Treino A (cópia)")
    expect(duplicatedSp.exercises).toHaveLength(1)
    expect(duplicatedSp.exercises[0].id).not.toBe(ex.id)
  })

  it("summarizes advanced exercise fields as readable chips", () => {
    const ex = createWorkoutExercise()
    expect(summarizeAdvancedExercise(ex)).toEqual([])

    ex.muscleGroup = "QUADRICEPS"
    ex.method = "REST_PAUSE"
    ex.effortType = "RIR"
    ex.effortTarget = "2"
    ex.tempo = "3-0-1-0"
    ex.notes = "Descida lenta"

    expect(summarizeAdvancedExercise(ex)).toEqual([
      "Quadríceps",
      "Rest-pause",
      "RIR 2",
      "Cadência 3-0-1-0",
      "Observações",
    ])
  })

  it("rejects blank or whitespace-only required strings and empty splits", () => {
    const empty = createEmptyWorkoutForm()
    const initialErrors = validateWorkoutForm(empty)
    expect(initialErrors.title).toBeTruthy()
    expect(initialErrors[`splits.${empty.splits[0].id}.exercises`]).toBeTruthy()

    const whitespaceForm = {
      ...empty,
      title: "   ",
      splits: [
        {
          id: "s1",
          name: "   ",
          focus: "",
          exercises: [{ id: "e1", name: "  ", sets: " ", reps: "\t", rest: "", notes: "", muscleGroup: "" as const, load: "", effortType: "" as const, effortTarget: "", tempo: "", method: "STANDARD" as const, libraryReference: null, demonstrationSnapshot: null }],
        },
      ],
    }
    const errors = validateWorkoutForm(whitespaceForm)
    expect(errors.title).toBeTruthy()
    expect(errors["splits.s1.name"]).toBeTruthy()
    expect(errors["exercises.e1.name"]).toBeTruthy()
    expect(errors["exercises.e1.sets"]).toBeTruthy()
    expect(errors["exercises.e1.reps"]).toBeTruthy()
  })

  it("validates advanced exercise fields: tempo regex and effortType/effortTarget pairing", () => {
    const form = copyWorkoutToForm(samplePrescription)
    const ex = form.splits[0].exercises[0]

    ex.tempo = "invalido"
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.tempo`]).toContain("Cadência deve seguir")

    ex.tempo = "3-0-1-0"
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.tempo`]).toBeUndefined()

    ex.tempo = "4-1-X-0"
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.tempo`]).toBeUndefined()

    ex.effortType = "RIR"
    ex.effortTarget = ""
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.effortTarget`]).toBeTruthy()

    ex.effortType = ""
    ex.effortTarget = "2"
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.effortType`]).toBeTruthy()

    ex.effortType = "RIR"
    ex.effortTarget = "2"
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.effortTarget`]).toBeUndefined()
    expect(validateWorkoutForm(form)[`exercises.${ex.id}.effortType`]).toBeUndefined()
  })

  it.each(["0", "-4", "105", "4.5", "4,5", "abc", "Infinity"])(
    "rejects invalid durationWeeks (%s)",
    durationWeeks => {
      const form = copyWorkoutToForm(samplePrescription)
      form.durationWeeks = durationWeeks
      expect(validateWorkoutForm(form).durationWeeks).toBeTruthy()
    },
  )

  it.each(["", "   ", "1", "12", "104"])("accepts blank or valid integer durationWeeks (%s)", durationWeeks => {
    const form = copyWorkoutToForm(samplePrescription)
    form.durationWeeks = durationWeeks
    expect(validateWorkoutForm(form)).toEqual({})
  })

  it("builds a clean CreateWorkoutInput omitting local ids and blank optional fields while preserving advanced parameters", () => {
    const form = copyWorkoutToForm(samplePrescription)
    form.goal = "   "
    form.durationWeeks = ""
    form.notes = " "
    form.splits[0].focus = "  "
    form.splits[0].exercises[0].rest = ""
    form.splits[0].exercises[0].notes = "   "

    const payload = buildWorkoutInput(form, "client-1")
    expect(payload).toEqual({
      clientId: "client-1",
      title: "Força Base",
      splits: [
        {
          name: "Treino A",
          exercises: [
            {
              name: "Agachamento Livre",
              sets: "4",
              reps: "6-8",
              muscleGroup: "QUADRICEPS",
              load: "80 kg",
              effortType: "RIR",
              effortTarget: "2",
              tempo: "3-1-1-0",
              method: "REST_PAUSE",
            },
          ],
        },
        {
          name: "Treino B",
          exercises: [
            {
              name: "Supino Reto",
              sets: "3",
              reps: "8-10",
            },
          ],
        },
      ],
    })
    expect(JSON.stringify(payload)).not.toContain("split-")
    expect(JSON.stringify(payload)).not.toContain("exercise-")
  })
})
