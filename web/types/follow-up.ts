import type { Appointment } from "@/types/appointment"
import type { Client } from "@/types/client"

export type FollowUpStatus =
  | "UPCOMING_7_DAYS"
  | "UPCOMING_15_DAYS"
  | "UPCOMING_30_DAYS"
  | "OVERDUE"
  | "UNSCHEDULED"
  | "NO_SHOW"
  | "COMPLETED_RECENT"

export type ChurnRiskLevel = "LOW" | "MEDIUM" | "HIGH"

export type RegularityLevel = "EXCELLENT" | "REGULAR" | "IRREGULAR" | "NEW_CLIENT"

export interface ClientFollowUpSummary {
  client: Client
  lastAppointment: Appointment | null
  nextAppointment: Appointment | null
  daysSinceLastAppointment: number | null
  daysUntilNextAppointment: number | null
  status: FollowUpStatus
  churnRisk: ChurnRiskLevel
  regularity: RegularityLevel
  averageIntervalDays: number | null
  completedAppointmentsCount: number
  appointmentsHistory: Appointment[]
}

export interface FollowUpsKpi {
  totalClients: number
  upcoming30Days: number
  upcoming7Days: number
  overdueCount: number
  unscheduledCount: number
  retentionRatePercent: number
  averageCadenceDays: number
}

export interface QuickMessageTemplate {
  id: string
  title: string
  category: "REMINDER" | "OVERDUE" | "CONFIRMATION" | "NO_SHOW"
  template: string
}
