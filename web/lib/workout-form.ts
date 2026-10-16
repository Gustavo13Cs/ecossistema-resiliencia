import type { CreateWorkoutInput, WorkoutPrescription } from "@/types/workout"

export interface WorkoutFormExercise {
  id: string
  name: string
  sets: string
  reps: string
  rest: string
  notes: string
}

export interface WorkoutFormSplit {
  id: string
  name: string
  focus: string
  exercises: WorkoutFormExercise[]
}

export interface WorkoutForm {
  title: string
  goal: string
  durationWeeks: string
  notes: string
  splits: WorkoutFormSplit[]
}

let nextLocalId = 1

export function createWorkoutExercise(): WorkoutFormExercise {
  return {
    id: `exercise-${nextLocalId++}`,
    name: "",
    sets: "",
    reps: "",
    rest: "",
    notes: "",
  }
}

export function createWorkoutSplit(index = 0): WorkoutFormSplit {
  const letter = String.fromCharCode(65 + (index % 26))
  const suffix = index >= 26 ? ` ${Math.floor(index / 26) + 1}` : ""
  return {
    id: `split-${nextLocalId++}`,
    name: `Treino ${letter}${suffix}`,
    focus: "",
    exercises: [],
  }
}

export function createEmptyWorkoutForm(): WorkoutForm {
  return {
    title: "",
    goal: "",
    durationWeeks: "",
    notes: "",
    splits: [createWorkoutSplit(0)],
  }
}

export function copyWorkoutToForm(workout: WorkoutPrescription): WorkoutForm {
  const splits: WorkoutFormSplit[] =
    workout.splits.length > 0
      ? workout.splits.map(split => ({
          id: `split-${nextLocalId++}`,
          name: split.name,
          focus: split.focus ?? "",
          exercises: split.exercises.map(exercise => ({
            id: `exercise-${nextLocalId++}`,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest: exercise.rest ?? "",
            notes: exercise.notes ?? "",
          })),
        }))
      : [createWorkoutSplit(0)]

  return {
    title: workout.title,
    goal: workout.goal ?? "",
    durationWeeks: workout.durationWeeks != null ? String(workout.durationWeeks) : "",
    notes: workout.notes ?? "",
    splits,
  }
}

function parseDurationWeeks(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^[+-]?\d+$/.test(trimmed)) return NaN
  const value = Number(trimmed)
  return Number.isInteger(value) && value >= 1 && value <= 104 ? value : NaN
}

export function validateWorkoutForm(form: WorkoutForm): Record<string, string> {
  const errors: Record<string, string> = {}
  const title = form.title.trim()
  if (!title) {
    errors.title = "Informe o título da prescrição."
  } else if (title.length > 200) {
    errors.title = "O título deve ter no máximo 200 caracteres."
  }

  if (form.goal.trim().length > 1000) {
    errors.goal = "O objetivo deve ter no máximo 1000 caracteres."
  }

  if (form.durationWeeks.trim()) {
    const duration = parseDurationWeeks(form.durationWeeks)
    if (duration === null || Number.isNaN(duration)) {
      errors.durationWeeks = "Informe uma duração inteira entre 1 e 104 semanas."
    }
  }

  if (form.notes.trim().length > 5000) {
    errors.notes = "As orientações devem ter no máximo 5000 caracteres."
  }

  if (form.splits.length === 0) {
    errors.splits = "Adicione pelo menos uma divisão de treino."
    return errors
  }

  if (form.splits.length > 30) {
    errors.splits = "A prescrição permite no máximo 30 divisões."
  }

  form.splits.forEach(split => {
    const splitName = split.name.trim()
    if (!splitName) {
      errors[`splits.${split.id}.name`] = "Informe o nome da divisão."
    } else if (splitName.length > 200) {
      errors[`splits.${split.id}.name`] = "O nome da divisão deve ter no máximo 200 caracteres."
    }

    if (split.focus.trim().length > 500) {
      errors[`splits.${split.id}.focus`] = "O foco da divisão deve ter no máximo 500 caracteres."
    }

    if (split.exercises.length === 0) {
      errors[`splits.${split.id}.exercises`] = "Adicione pelo menos um exercício nesta divisão."
    } else if (split.exercises.length > 100) {
      errors[`splits.${split.id}.exercises`] = "Cada divisão permite no máximo 100 exercícios."
    }

    split.exercises.forEach(exercise => {
      const exerciseName = exercise.name.trim()
      const sets = exercise.sets.trim()
      const reps = exercise.reps.trim()
      if (!exerciseName) {
        errors[`exercises.${exercise.id}.name`] = "Informe o nome do exercício."
      } else if (exerciseName.length > 200) {
        errors[`exercises.${exercise.id}.name`] = "O nome do exercício deve ter no máximo 200 caracteres."
      }
      if (!sets) {
        errors[`exercises.${exercise.id}.sets`] = "Informe as séries."
      } else if (sets.length > 100) {
        errors[`exercises.${exercise.id}.sets`] = "As séries devem ter no máximo 100 caracteres."
      }
      if (!reps) {
        errors[`exercises.${exercise.id}.reps`] = "Informe as repetições."
      } else if (reps.length > 100) {
        errors[`exercises.${exercise.id}.reps`] = "As repetições devem ter no máximo 100 caracteres."
      }
      if (exercise.rest.trim().length > 100) {
        errors[`exercises.${exercise.id}.rest`] = "O descanso deve ter no máximo 100 caracteres."
      }
      if (exercise.notes.trim().length > 2000) {
        errors[`exercises.${exercise.id}.notes`] = "As observações devem ter no máximo 2000 caracteres."
      }
    })
  })

  return errors
}

export function buildWorkoutInput(form: WorkoutForm, clientId: string): CreateWorkoutInput {
  const payload: CreateWorkoutInput = {
    clientId,
    title: form.title.trim(),
    splits: form.splits.map(split => {
      const focus = split.focus.trim()
      return {
        name: split.name.trim(),
        ...(focus ? { focus } : {}),
        exercises: split.exercises.map(exercise => {
          const rest = exercise.rest.trim()
          const notes = exercise.notes.trim()
          return {
            name: exercise.name.trim(),
            sets: exercise.sets.trim(),
            reps: exercise.reps.trim(),
            ...(rest ? { rest } : {}),
            ...(notes ? { notes } : {}),
          }
        }),
      }
    }),
  }

  const goal = form.goal.trim()
  if (goal) payload.goal = goal

  const durationWeeks = parseDurationWeeks(form.durationWeeks)
  if (durationWeeks !== null && !Number.isNaN(durationWeeks)) {
    payload.durationWeeks = durationWeeks
  }

  const notes = form.notes.trim()
  if (notes) payload.notes = notes

  return payload
}

export function isWorkoutFormDirty(form: WorkoutForm): boolean {
  if (form.title.trim() || form.goal.trim() || form.durationWeeks.trim() || form.notes.trim()) {
    return true
  }
  if (form.splits.length !== 1) {
    return true
  }
  const [firstSplit] = form.splits
  return (
    firstSplit.name.trim() !== "Treino A" ||
    Boolean(firstSplit.focus.trim()) ||
    firstSplit.exercises.length > 0
  )
}
