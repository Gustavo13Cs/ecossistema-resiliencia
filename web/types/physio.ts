import type { AppointmentKind, AppointmentModality, AppointmentStatus } from "@/types/appointment"
import type { ClientStatus } from "@/types/client"
import type { RehabPlan } from "@/hooks/features/useFisio"

export type PhysioWorkspaceSection =
  | "COMPLETED_WITHOUT_EVOLUTION"
  | "PAIN_WORSENING"
  | "OVERDUE_REASSESSMENT"
  | "WITHOUT_ACTIVE_PLAN"
  | "RECENT"

export interface PhysioWorkspaceItem {
  clientId: string
  name: string
  goal: string | null
  updatedAt: string
  section: PhysioWorkspaceSection
  appointmentId?: string | null
  appointmentStartsAt?: string | null
  appointmentKind?: AppointmentKind | null
  lastAssessmentDate?: string | null
  previousPain?: number | null
  latestPain?: number | null
}

export interface PhysioWorkspace {
  counts: {
    activePatients: number
    archivedPatients: number
    completedWithoutEvolution: number
    withoutActivePlan: number
    overdueReassessments: number
    painWorsening: number
  }
  items: PhysioWorkspaceItem[]
  evolvedAppointmentIds: string[]
}

export interface PhysioAssessmentRecord {
  id: string
  date: string
  chiefComplaint: string | null
  historyOfIllness: string | null
  painLevel: number | null
  posturalAnalysis: string | null
  palpation: string | null
  jointMobility: string | null
  orthopedicTests: string | null
  treatmentPlan: string | null
  clientId: string
  createdAt: string
  updatedAt: string
}

export interface PhysioEvolutionAppointmentSummary {
  id: string
  startsAt: string
  endsAt: string
  kind: AppointmentKind
  status: AppointmentStatus
  modality: AppointmentModality
}

export interface PhysioEvolutionPlanSummary {
  id: string
  title: string
}

export interface PhysioSessionEvolution {
  id: string
  clientId: string
  appointmentId: string | null
  rehabPlanId: string | null
  sessionDate: string
  painBefore: number | null
  painAfter: number | null
  proceduresApplied: string[]
  patientResponse: string
  nextSteps: string | null
  createdAt: string
  updatedAt: string
  appointment: PhysioEvolutionAppointmentSummary | null
  rehabPlan: PhysioEvolutionPlanSummary | null
}

export interface PhysioPainPoint {
  id: string
  date: string
  source: "ASSESSMENT" | "SESSION"
  painLevel: number | null
  painBefore: number | null
  painAfter: number | null
}

export type PhysioActivePlan = RehabPlan & {
  clientId: string
  createdAt?: string
  updatedAt?: string
}

export interface PhysioClientOverview {
  client: { id: string; status: ClientStatus }
  activePlan: PhysioActivePlan | null
  recentAssessments: PhysioAssessmentRecord[]
  recentEvolutions: PhysioSessionEvolution[]
  unlinkedAppointments: PhysioEvolutionAppointmentSummary[]
  painSeries: PhysioPainPoint[]
}

export interface CreatePhysioSessionEvolutionInput {
  clientId: string
  appointmentId?: string | null
  rehabPlanId?: string | null
  sessionDate?: string | null
  painBefore?: number | null
  painAfter?: number | null
  proceduresApplied?: string[]
  patientResponse: string
  nextSteps?: string | null
}

export interface UpdatePhysioSessionEvolutionInput {
  rehabPlanId?: string | null
  sessionDate?: string | null
  painBefore?: number | null
  painAfter?: number | null
  proceduresApplied?: string[]
  patientResponse?: string
  nextSteps?: string | null
}
