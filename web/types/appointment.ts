import type { ClientStatus } from "@/types/client"

export type AppointmentKind =
  | "FIRST_VISIT"
  | "FOLLOW_UP"
  | "ASSESSMENT"
  | "SESSION"
  | "OTHER"

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

export type AppointmentModality = "IN_PERSON" | "ONLINE"

export type AppointmentEventType =
  | "CREATED"
  | "UPDATED"
  | "RESCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

export type AppointmentClient = {
  id: string
  name: string
  status: ClientStatus
}

export type AppointmentEvent = {
  id: string
  appointmentId: string
  professionalId: string
  type: AppointmentEventType
  previousStatus: AppointmentStatus | null
  nextStatus: AppointmentStatus | null
  previousStartsAt: string | null
  previousEndsAt: string | null
  nextStartsAt: string | null
  nextEndsAt: string | null
  createdAt: string
}

export type Appointment = {
  id: string
  professionalId: string
  clientId: string
  kind: AppointmentKind
  status: AppointmentStatus
  modality: AppointmentModality
  startsAt: string
  endsAt: string
  timeZone: string
  location: string | null
  meetingUrl: string | null
  notes: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  client: AppointmentClient
  events?: AppointmentEvent[]
}

export type AgendaView = "day" | "week" | "month"

export type AppointmentFilters = {
  clientId?: string
  status?: AppointmentStatus
}

export type AppointmentPeriod = {
  from: string
  to: string
}

export type CreateAppointmentCommand = {
  clientId: string
  kind: AppointmentKind
  modality: AppointmentModality
  startsAt: string
  endsAt: string
  timeZone: string
  location?: string | null
  meetingUrl?: string | null
  notes?: string | null
}

export type UpdateAppointmentCommand = Partial<CreateAppointmentCommand> & {
  expectedUpdatedAt: string
}

export type AppointmentActionCommand = {
  expectedUpdatedAt: string
}

export type CancelAppointmentCommand = AppointmentActionCommand & {
  reason: string
}
