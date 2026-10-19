import type { ClientStatus } from "./client"
import type { EffortType, MuscleGroup, TrainingMethod, WorkoutDetail } from "./workout"
import type { DemonstrationPresentation, LibraryReference } from "./exercise-demonstration"

export type WorkoutDraftStatus = "OPEN" | "FINALIZED" | "DISCARDED"
export type DraftExerciseV1 = {
  name: string
  sets: string
  reps: string
  rest: string
  notes: string
  muscleGroup: MuscleGroup | null
  load: string
  effortType: EffortType | null
  effortTarget: string
  tempo: string
  method: TrainingMethod | null
}
export type DraftSplitV1 = { name: string; focus: string; exercises: DraftExerciseV1[] }
export type DraftContentV1 = {
  title: string
  goal: string
  durationWeeks: number | null
  notes: string
  splits: DraftSplitV1[]
}
export type DraftExerciseInput = DraftExerciseV1 & { libraryReference?: LibraryReference | null }
export type DraftContentInput = Omit<DraftContentV1, "splits"> & { splits: (Omit<DraftSplitV1, "exercises"> & { exercises: DraftExerciseInput[] })[] }
export type DraftExercisePresentation = DraftExerciseInput & { libraryReference: LibraryReference | null; demonstrationSnapshot: DemonstrationPresentation | null }
export type DraftContentPresentation = Omit<DraftContentV1, "splits"> & { splits: (Omit<DraftSplitV1, "exercises"> & { exercises: DraftExercisePresentation[] })[] }
export type DraftContentReadable = Omit<DraftContentV1, "splits"> & { splits: (Omit<DraftSplitV1, "exercises"> & { exercises: (DraftExerciseV1 & { libraryReference?: LibraryReference | null; demonstrationSnapshot?: DemonstrationPresentation | null })[] })[] }
export type DraftVersionInput = { expectedVersion: number }
export type DraftSaveInput = DraftVersionInput & { content: DraftContentInput }
export type DraftRebaseInput = DraftVersionInput & { expectedActiveWorkoutId: string | null }
export type DraftCreateInput = { content: DraftContentInput; sourceWorkoutId?: never } | { sourceWorkoutId: string; content?: never }
export type WorkoutDraftResource = {
  id: string
  clientId: string
  status: WorkoutDraftStatus
  version: number
  schemaVersion: number
  content: DraftContentReadable | null
  sourceWorkoutId: string | null
  baseActiveWorkoutId: string | null
  finalizedWorkoutId: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
}
export type DraftSummary = Pick<WorkoutDraftResource, "id" | "clientId" | "status" | "version" | "createdAt" | "updatedAt"> & {
  title: string
  client: { id: string; name: string; status: ClientStatus }
}
export type DraftPage = { items: DraftSummary[]; nextCursor: string | null }
export type DraftAck = Pick<WorkoutDraftResource, "id" | "clientId" | "status" | "version">
export type FinalizedDraftResult = DraftAck & { finalizedWorkoutId: string; workout: WorkoutDetail }
