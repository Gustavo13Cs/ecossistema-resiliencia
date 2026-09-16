export type GoalCategory =
  | "WEIGHT_LOSS"
  | "HYPERTROPHY"
  | "RECOMPOSITION"
  | "HEALTH_MAINTENANCE"
  | "PERFORMANCE"

export type GoalStatus =
  | "ON_TRACK"
  | "AT_RISK"
  | "ACHIEVED"
  | "STAGNANT"
  | "PENDING"

export type RateFeasibility =
  | "HEALTHY"
  | "AGGRESSIVE"
  | "UNREALISTIC"
  | "MAINTAIN"

export interface HabitTargets {
  waterTargetMl: number
  sleepTargetHours: number
  mealsAdherencePercent: number
  dailyStepsTarget: number
  habitsNotes?: string
}

export interface ClientGoalCommitment {
  id: string
  clientId: string
  category: GoalCategory
  targetWeightKg: number | null
  targetBodyFatPercent: number | null
  targetMuscleMassKg: number | null
  startWeightKg: number | null
  startBodyFatPercent: number | null
  startDate: string
  targetDate: string
  habits: HabitTargets
  clinicalNotes?: string
  status: GoalStatus
  createdAt: string
  updatedAt: string
}

export interface HabitsAdherenceBreakdown {
  water: number // 0 - 100%
  sleep: number // 0 - 100%
  meals: number // 0 - 100%
  steps: number // 0 - 100%
  overall: number // 0 - 100%
}

export interface GoalProgress {
  currentWeightKg: number | null
  currentBodyFatPercent: number | null
  currentMuscleMassKg: number | null
  weightDeltaKg: number | null
  weightRemainingKg: number | null
  percentAchieved: number
  daysTotal: number
  daysPassed: number
  daysRemaining: number
  requiredWeeklyRateKg: number
  actualWeeklyRateKg: number | null
  rateFeasibility: RateFeasibility
  habitsAdherence: HabitsAdherenceBreakdown
}

export interface GoalAlert {
  id: string
  clientId: string
  clientName: string
  clientPhone?: string | null
  type: "PLATEAU" | "REGRESSION" | "HABIT_DEFICIT" | "DEADLINE_CRITICAL"
  severity: "HIGH" | "MEDIUM" | "LOW"
  title: string
  description: string
  recommendedAction: string
  suggestedWhatsAppMessage: string
}

export interface GoalsKpiSummary {
  totalClients: number
  activeGoalsCount: number
  onTrackCount: number
  onTrackPercent: number
  atRiskCount: number
  atRiskPercent: number
  achievedCount: number
  averageHabitsAdherence: number
}

export interface ClientWithGoalSummary {
  client: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    initialWeight?: number | null
    height?: number | null
    goal?: string | null
  }
  goal: ClientGoalCommitment | null
  progress: GoalProgress | null
  alerts: GoalAlert[]
}
