export interface WorkoutSummary {
  id: string
  clientId: string
  client: { id: string; name: string }
  title: string
  goal: string | null
  createdAt: string
  isTemplate: boolean
}

export interface WorkoutPrescription extends Omit<WorkoutSummary, "client"> {
  durationWeeks: number | null
  notes: string | null
  splits: {
    id: string
    name: string
    focus: string | null
    exercises: {
      id: string
      name: string
      sets: string
      reps: string
      rest: string | null
      notes: string | null
    }[]
  }[]
}
