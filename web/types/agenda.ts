export type AgendaTaskCategory =
  | "NUTRITION"
  | "TRAINING"
  | "REHABILITATION"
  | "SUPPLEMENT"
  | "HYDRATION"
  | "CUSTOM"

export type AgendaOccurrenceStatus =
  | "PENDING"
  | "COMPLETED"
  | "SKIPPED"
  | "OVERDUE"
  | "CANCELLED"

export type AgendaTaskPriority = "LOW" | "NORMAL" | "HIGH"

export type AgendaOccurrence = {
  id: string
  scheduledFor: string
  status: AgendaOccurrenceStatus
  completedAt: string | null
  skipReason: string | null
  patientNote: string | null
  task: {
    id: string
    title: string
    category: AgendaTaskCategory
    instructions: string | null
    priority: AgendaTaskPriority
    professional: { id: string; name: string; role: string }
  }
}

export type AgendaDay = {
  patient: { id: string; name: string }
  occurrences: AgendaOccurrence[]
  summary: { actionable: number; completed: number; percentage: number }
}

export type HealthCheckInInput = {
  waterMl?: number
  painLevel?: number
  mood?: number
  symptoms?: string
  notes?: string
  recordedAt?: string
}

export type HealthCheckInConsent = {
  professional: { id: string; name: string; role: string }
  category: "HEALTH_CHECK_IN"
  granted: boolean
  updatedAt: string | null
}
