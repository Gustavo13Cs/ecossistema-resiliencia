import { describe, expect, it } from "vitest"
import type { WorkoutPrescription } from "@/types/workout"
import {
  buildWorkoutInput,
  copyWorkoutToForm,
  createEmptyWorkoutForm,
  isWorkoutFormDirty,
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
      exercises: [
        {
          id: "ex-db-1",
          name: "Agachamento Livre",
          sets: "4",
          reps: "6-8",
          rest: "120s",
          notes: "Cadência controlada",
        },
      ],
    },
    {
      id: "split-db-2",
      name: "Treino B",
      focus: null,
      exercises: [
        {
          id: "ex-db-2",
          name: "Supino Reto",
          sets: "3",
          reps: "8-10",
          rest: null,
          notes: null,
        },
      ],
    },
  ],
}

describe("workout-form helpers", () => {
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

  it("copies an existing prescription into editable form state with local ids", () => {
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
    })
    expect(form.splits[1].focus).toBe("")
    expect(form.splits[1].exercises[0].rest).toBe("")
    expect(isWorkoutFormDirty(form)).toBe(true)
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
          exercises: [{ id: "e1", name: "  ", sets: " ", reps: "\t", rest: "", notes: "" }],
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

  it("builds a clean CreateWorkoutInput omitting local ids and blank optional fields", () => {
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
