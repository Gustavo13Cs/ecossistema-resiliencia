import type { Periodization, SecondaryMuscle, WeeklyVolumeSummary } from "./workout-p3"
import type { ClientStatus } from "@/types/client"
import type { TrainingActiveWorkout } from "@/types/training"
import type { DemonstrationPresentation, LibraryReference } from "./exercise-demonstration"

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "CORE"
  | "QUADRICEPS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "ADDUCTORS"
  | "CALVES"
  | "FULL_BODY"
  | "CARDIO"
  | "MOBILITY"

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Peitoral",
  BACK: "Costas",
  SHOULDERS: "Ombros",
  BICEPS: "Bíceps",
  TRICEPS: "Tríceps",
  FOREARMS: "Antebraço",
  CORE: "Abdômen / Core",
  QUADRICEPS: "Quadríceps",
  HAMSTRINGS: "Posteriores de coxa",
  GLUTES: "Glúteos",
  ADDUCTORS: "Adutores",
  CALVES: "Panturrilhas",
  FULL_BODY: "Corpo inteiro",
  CARDIO: "Cardio",
  MOBILITY: "Mobilidade",
}

export const MUSCLE_GROUP_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => ({
  value: value as MuscleGroup,
  label,
}))

export type EffortType = "RIR" | "RPE"

export const EFFORT_TYPE_LABELS: Record<EffortType, string> = {
  RIR: "RIR (Repetições em reserva)",
  RPE: "RPE (Percepção de esforço)",
}

export type TrainingMethod =
  | "STANDARD"
  | "DROP_SET"
  | "REST_PAUSE"
  | "PYRAMID"
  | "CLUSTER"
  | "ISOMETRIC"

export const TRAINING_METHOD_LABELS: Record<TrainingMethod, string> = {
  STANDARD: "Padrão",
  DROP_SET: "Drop-set",
  REST_PAUSE: "Rest-pause",
  PYRAMID: "Pirâmide",
  CLUSTER: "Cluster set",
  ISOMETRIC: "Isometria",
}

export type ExerciseEquipment =
  | "BARBELL"
  | "DUMBBELL"
  | "MACHINE"
  | "CABLE"
  | "SMITH"
  | "KETTLEBELL"
  | "BAND"
  | "BODYWEIGHT"
  | "OTHER"

export const EXERCISE_EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  BARBELL: "Barra",
  DUMBBELL: "Halteres",
  MACHINE: "Máquina",
  CABLE: "Polia / Cabo",
  SMITH: "Smith",
  KETTLEBELL: "Kettlebell",
  BAND: "Elástico",
  BODYWEIGHT: "Peso do corpo",
  OTHER: "Outro",
}

export interface ExerciseLibraryItem {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: ExerciseEquipment | null
  notes: string | null
  source: "CATALOG" | "CUSTOM"
  hasDemonstration: boolean
  demonstrationTypes: ("IMAGE" | "VIDEO")[]
}

export interface ExerciseLibraryDetail extends ExerciseLibraryItem {
  demonstration: DemonstrationPresentation | null
  mediaVersion: number | null
}

export interface CreateCustomExerciseInput {
  name: string
  muscleGroup: MuscleGroup
  equipment?: ExerciseEquipment
  notes?: string
  videoUrl?: string
}

export interface UpdateExerciseVideoInput { id: string; expectedMediaVersion: number; videoUrl: string | null }

export interface WorkoutSummary extends Omit<TrainingActiveWorkout, "durationWeeks"> {
  finalizedAt?: string | null
  revisionOfId?: string | null
  client: { id: string; name: string; status: ClientStatus }
  isTemplate: boolean
}

export interface WorkoutPrescriptionExercise {
  secondaryMuscles?: SecondaryMuscle[] | null
  id: string
  name: string
  sets: string
  reps: string
  rest: string | null
  notes: string | null
  position?: number
  muscleGroup?: MuscleGroup | null
  load?: string | null
  effortType?: EffortType | null
  effortTarget?: string | null
  tempo?: string | null
  method?: TrainingMethod
  libraryReference?: LibraryReference | null
  demonstrationSnapshot?: DemonstrationPresentation | null
}

export interface WorkoutPrescriptionSplit {
  weeklyFrequency?: number | null
  id: string
  name: string
  focus: string | null
  position?: number
  exercises: WorkoutPrescriptionExercise[]
}

export interface WorkoutPrescription extends TrainingActiveWorkout {
  periodization?: Periodization | null
  weeklyVolumeSnapshot?: WeeklyVolumeSummary | null
  finalizedAt?: string | null
  revisionOfId?: string | null
  isTemplate: boolean
  notes: string | null
  splits: WorkoutPrescriptionSplit[]
}

export interface WorkoutDetail extends WorkoutPrescription {
  weekProjection?: { week: number; planWeek: import("./workout-p3").PlanWeek; phase: import("./workout-p3").PeriodPhase; volume: import("./workout-p3").WeeklyVolumeSummary; exercises: { id: string; sets: string; reps: string; effortType?: EffortType | null; effortTarget?: string | null; warnings: string[] }[] }
  client: WorkoutSummary["client"]
}

export interface CreateWorkoutExerciseInput {
  secondaryMuscles?: SecondaryMuscle[] | null
  name: string
  sets: string
  reps: string
  rest?: string
  notes?: string
  muscleGroup?: MuscleGroup
  load?: string
  effortType?: EffortType
  effortTarget?: string
  tempo?: string
  method?: TrainingMethod
  libraryReference?: LibraryReference | null
}

export interface CreateWorkoutInput {
  periodization?: Periodization | null
  clientId: string
  title: string
  goal?: string
  durationWeeks?: number
  notes?: string
  splits: {
    weeklyFrequency?: number | null
    name: string
    focus?: string
    exercises: CreateWorkoutExerciseInput[]
  }[]
}
