import { createWorkoutExercise, createWorkoutSplit, validateWorkoutForm, type WorkoutForm } from "./workout-form"
import type { DraftContentV1 } from "@/types/workout-draft"

export function toDraftContent(form: WorkoutForm): DraftContentV1 {
  return {
    title: form.title.trim(),
    goal: form.goal.trim(),
    durationWeeks: form.durationWeeks.trim() ? Number(form.durationWeeks) : null,
    notes: form.notes.trim(),
    splits: form.splits.map(split => ({
      name: split.name.trim(),
      focus: split.focus.trim(),
      exercises: split.exercises.map(exercise => ({
        name: exercise.name.trim(), sets: exercise.sets.trim(), reps: exercise.reps.trim(),
        rest: exercise.rest.trim(), notes: exercise.notes.trim(), muscleGroup: exercise.muscleGroup || null,
        load: exercise.load.trim(), effortType: exercise.effortType || null,
        effortTarget: exercise.effortTarget.trim(), tempo: exercise.tempo.trim(), method: exercise.method || null,
      })),
    })),
  }
}

export function fromDraftContent(content: DraftContentV1): WorkoutForm {
  return {
    title: content.title, goal: content.goal,
    durationWeeks: content.durationWeeks === null ? "" : String(content.durationWeeks), notes: content.notes,
    splits: content.splits.map((split, index) => ({
      ...createWorkoutSplit(index), name: split.name, focus: split.focus,
      exercises: split.exercises.map(exercise => ({
        ...createWorkoutExercise(), ...exercise,
        muscleGroup: exercise.muscleGroup ?? "", effortType: exercise.effortType ?? "", method: exercise.method ?? "",
      })),
    })),
  }
}

// Reutiliza os limites do formulário completo, permitindo campos clínicos pendentes.
export function validateDraftForm(form: WorkoutForm): Record<string, string> {
  const errors = validateWorkoutForm(form)
  if (!form.title.trim()) delete errors.title
  if (!form.splits.length) delete errors.splits
  form.splits.forEach(split => {
    if (!split.name.trim()) delete errors[`splits.${split.id}.name`]
    if (!split.exercises.length) delete errors[`splits.${split.id}.exercises`]
    split.exercises.forEach(exercise => {
      for (const field of ["name", "sets", "reps"] as const) {
        if (!exercise[field].trim()) delete errors[`exercises.${exercise.id}.${field}`]
      }
      delete errors[`exercises.${exercise.id}.effortType`]
      if (exercise.effortTarget.trim().length <= 20) delete errors[`exercises.${exercise.id}.effortTarget`]
      else errors[`exercises.${exercise.id}.effortTarget`] = "O esforço alvo deve ter no máximo 20 caracteres."
    })
  })
  if (new TextEncoder().encode(JSON.stringify(toDraftContent(form))).byteLength > 65536) {
    errors.content = "O rascunho excede o limite de 64 KiB. Reduza o conteúdo para salvar."
  }
  return errors
}
