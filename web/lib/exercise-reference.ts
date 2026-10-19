import type { WorkoutForm, WorkoutFormExercise } from "./workout-form"
import type { LibraryReference, DemonstrationPresentation } from "@/types/exercise-demonstration"

export function sameLibraryReference(a: LibraryReference | null | undefined, b: LibraryReference | null | undefined): boolean {
  return Boolean(a && b && a.source === b.source && a.exerciseId === b.exerciseId && a.demonstrationRevision === b.demonstrationRevision)
}

function normalizedName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase()
}

export function renameWorkoutExercise(exercise: WorkoutFormExercise, name: string): WorkoutFormExercise {
  if (!exercise.libraryReference || normalizedName(exercise.name) === normalizedName(name)) return { ...exercise, name }
  return { ...exercise, name, libraryReference: null, demonstrationSnapshot: null }
}

type SavedExercise = { name?: string; libraryReference?: LibraryReference | null; demonstrationSnapshot?: DemonstrationPresentation | null }

export function adoptSavedDemonstrations(current: readonly WorkoutFormExercise[], submitted: readonly WorkoutFormExercise[], saved: readonly SavedExercise[]): WorkoutFormExercise[] {
  return current.map(exercise => {
    const index = submitted.findIndex(item => item.id === exercise.id)
    const sent = submitted[index]
    const response = saved[index]
    if (!sent || !response || !sameLibraryReference(exercise.libraryReference, sent.libraryReference) || !sameLibraryReference(sent.libraryReference, response.libraryReference)) return exercise
    if (!Object.prototype.hasOwnProperty.call(response, "demonstrationSnapshot")) return exercise
    return { ...exercise, demonstrationSnapshot: response.demonstrationSnapshot ?? null }
  })
}

export function adoptSavedFormDemonstrations(
  current: WorkoutForm,
  submitted: WorkoutForm,
  saved: { splits: readonly { exercises: readonly SavedExercise[] }[] },
): WorkoutForm {
  return {
    ...current,
    splits: current.splits.map(split => {
      const index = submitted.splits.findIndex(item => item.id === split.id)
      const sent = submitted.splits[index]
      const response = saved.splits[index]
      if (!sent || !response) return split
      return { ...split, exercises: adoptSavedDemonstrations(split.exercises, sent.exercises, response.exercises) }
    }),
  }
}
