import type { ClientStatus } from "@/types/client"
import type { TrainingActiveWorkout } from "@/types/training"

export interface WorkoutSummary extends Omit<TrainingActiveWorkout, "durationWeeks"> {
  client: { id: string; name: string; status: ClientStatus }
  isTemplate: boolean
}

export interface WorkoutPrescription extends TrainingActiveWorkout {
  isTemplate: boolean
  notes: string | null
  splits: {
    id: string
    name: string
    focus: string | null
    exercises: { id: string; name: string; sets: string; reps: string; rest: string | null; notes: string | null }[]
  }[]
}

export interface WorkoutDetail extends WorkoutPrescription {
  client: WorkoutSummary["client"]
}

export interface CreateWorkoutInput {
  clientId: string
  title: string
  goal?: string
  durationWeeks?: number
  notes?: string
  splits: {
    name: string
    focus?: string
    exercises: { name: string; sets: string; reps: string; rest?: string; notes?: string }[]
  }[]
}
