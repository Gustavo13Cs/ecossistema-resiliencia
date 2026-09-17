export type ManagementPeriod = "30_DAYS" | "90_DAYS" | "180_DAYS" | "365_DAYS" | "ALL"

export type ClientClinicalGoal =
  | "EMAGRECIMENTO"
  | "HIPERTROFIA"
  | "REEDUCACAO"
  | "DOENCAS_CRONICAS"
  | "PERFORMANCE"
  | "OUTROS"

export interface RetentionMetrics {
  retentionRatePercent: number
  churnRatePercent: number
  averageRetentionMonths: number
  showUpRatePercent: number
  noShowRatePercent: number
  clientsAtRiskCount: number
  cohortData: {
    month: string
    activeRate: number
    retainedCount: number
    churnedCount: number
  }[]
}

export interface DietAdherenceMetrics {
  averageAdherencePercent: number
  highAdherenceCount: number // > 80%
  mediumAdherenceCount: number // 50 - 80%
  lowAdherenceCount: number // < 50%
  totalMealCheckIns: number
  mealsAdherenceBreakdown: {
    meal: string
    adherencePercent: number
  }[]
  habitsAdherenceBreakdown: {
    habit: string
    adherencePercent: number
  }[]
  clientsNeedingSupportCount: number
}

export interface AppointmentsVolumeMetrics {
  totalAppointments: number
  initialConsultationsCount: number
  followUpsCount: number
  weeklyAverage: number
  capacityOccupancyPercent: number
  timeSeries: {
    periodLabel: string
    completed: number
    scheduled: number
    canceled: number
  }[]
}

export interface ClientGrowthMetrics {
  totalActiveClients: number
  totalArchivedClients: number
  netNewClients: number
  growthRatePercent: number
  growthHistory: {
    periodLabel: string
    totalClients: number
    newClients: number
  }[]
  goalDistribution: {
    goal: ClientClinicalGoal
    label: string
    count: number
    percent: number
  }[]
}

export type InsightType = "SUCCESS" | "WARNING" | "TIP" | "ALERT"

export interface ManagementInsight {
  id: string
  type: InsightType
  title: string
  description: string
  impact: string
  actionLabel?: string
  actionHref?: string
}

export interface ConsolidatedManagementReport {
  period: ManagementPeriod
  generatedAt: string
  retention: RetentionMetrics
  dietAdherence: DietAdherenceMetrics
  appointments: AppointmentsVolumeMetrics
  growth: ClientGrowthMetrics
  insights: ManagementInsight[]
}
