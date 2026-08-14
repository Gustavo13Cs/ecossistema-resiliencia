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

export type AgendaTaskStatus = "ACTIVE" | "PAUSED" | "ENDED"

export type AgendaTask = {
  id: string
  patientId?: string
  title: string
  category: AgendaTaskCategory
  instructions: string | null
  priority: AgendaTaskPriority
  startsAt?: string
  endsAt?: string | null
  timeZone?: string
  recurrenceRule?: string | null
  status?: AgendaTaskStatus
  professional: { id: string; name: string; role: string }
}

export type AgendaOccurrence = {
  id: string
  scheduledFor: string
  status: AgendaOccurrenceStatus
  completedAt: string | null
  skipReason: string | null
  patientNote: string | null
  task: AgendaTask
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

export type HealthCheckIn = {
  id: string
  patientId: string
  waterMl: number | null
  painLevel: number | null
  mood: number | null
  symptoms: string | null
  notes: string | null
  recordedAt: string
}
