import type { ClientStatus } from "@/types/client"

export const queryKeys = {
  users: (sessionUserId: string) => ["users", sessionUserId] as const,
  clients: (sessionUserId: string, status: ClientStatus) =>
    ["clients", sessionUserId, status] as const,
  client: (sessionUserId: string, clientId: string) => ["client", sessionUserId, clientId] as const,
  patient: (sessionUserId: string, patientId: string) => ["patient", sessionUserId, patientId] as const,
  assessments: (sessionUserId: string, patientId: string) => ["assessments", sessionUserId, patientId] as const,
  anamneses: (sessionUserId: string, patientId: string) => ["anamneses", sessionUserId, patientId] as const,
  diet: (sessionUserId: string, patientId: string) => ["diet", sessionUserId, patientId] as const,
  patientOverview: (sessionUserId: string, patientId: string) => ["patient-overview", sessionUserId, patientId] as const,
  professionalAlerts: (sessionUserId: string) => ["professional-alerts", sessionUserId] as const,
  agenda: (sessionUserId: string, patientId: string, from: string, to: string) => ["agenda", sessionUserId, patientId, from, to] as const,
  consultationNotes: (sessionUserId: string, patientId: string) => ["consultation-notes", sessionUserId, patientId] as const,
  dietHistory: (sessionUserId: string, patientId: string) => ["diet-history", sessionUserId, patientId] as const,
  dashboardSummary: (sessionUserId: string) => ["dashboard-summary", sessionUserId] as const,
}
