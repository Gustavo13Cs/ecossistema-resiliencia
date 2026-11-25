import type { AppointmentKind, AppointmentModality, AppointmentStatus } from "@/types/appointment"
import type { ClientStatus } from "@/types/client"
import type { RehabPlan } from "@/hooks/features/useFisio"

export type PhysioWorkspaceSection =
  | "COMPLETED_WITHOUT_EVOLUTION"
  | "PAIN_WORSENING"
  | "OVERDUE_REASSESSMENT"
  | "EXPIRING_PACKAGE"
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
  packageTitle?: string | null
  completedSessions?: number | null
  totalSessions?: number | null
}

export interface PhysioWorkspace {
  counts: {
    activePatients: number
    archivedPatients: number
    completedWithoutEvolution: number
    withoutActivePlan: number
    overdueReassessments: number
    painWorsening: number
    expiringPackages?: number
  }
  items: PhysioWorkspaceItem[]
  evolvedAppointmentIds: string[]
}

export type BodyPainView = "ANTERIOR" | "POSTERIOR"

export type BodyPainSymptomType =
  | "SHARP"
  | "BURNING"
  | "RADIATING"
  | "ACHING"
  | "STIFFNESS"
  | "TINGLING"

export type AnatomicalSide = "LEFT" | "RIGHT" | "AXIAL"

export type OrthopedicTestSide = "LEFT" | "RIGHT" | "BILATERAL" | "AXIAL"

export type OrthopedicTestResult = "POSITIVE" | "NEGATIVE" | "INCONCLUSIVE"

export interface BodyPainMapEntry {
  region: string
  view: BodyPainView
  intensity: number
  symptomType: BodyPainSymptomType
  notes?: string | null
}

export interface GoniometryEntry {
  joint: string
  movement: string
  side: AnatomicalSide
  activeDeg?: number | null
  passiveDeg?: number | null
  referenceDeg?: number | null
  notes?: string | null
}

export interface MuscleStrengthEntry {
  muscleGroup: string
  side: AnatomicalSide
  grade: number
  painOnResistance?: boolean
  notes?: string | null
}

export interface OrthopedicTestItem {
  region: string
  testName: string
  side: OrthopedicTestSide
  result: OrthopedicTestResult
  notes?: string | null
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
  bodyPainMap: BodyPainMapEntry[] | null
  goniometry: GoniometryEntry[] | null
  muscleStrength: MuscleStrengthEntry[] | null
  orthopedicTestItems: OrthopedicTestItem[] | null
  treatmentPlan: string | null
  clientId: string
  createdAt: string
  updatedAt: string
}

export type PhysioScaleType =
  | "PSFS"
  | "OSWESTRY"
  | "NDI"
  | "LEFS"
  | "SPADI"
  | "TUG"

export type TugAssistiveDevice = "NONE" | "CANE" | "WALKER" | "CRUTCHES"

export interface PhysioFunctionalScaleRecord {
  id: string
  clientId: string
  scaleType: PhysioScaleType
  evaluatedAt: string
  answers: Record<string, unknown>
  rawScore: number
  normalizedScore: number
  scoreUnit: string
  classification: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePhysioFunctionalScaleInput {
  clientId: string
  scaleType: PhysioScaleType
  evaluatedAt?: string | null
  answers: Record<string, unknown>
  notes?: string | null
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
  packageId?: string | null
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

export type PhysioPackageStatus = "ACTIVE" | "COMPLETED" | "CANCELLED"

export interface PhysioSessionPackageRecord {
  id: string
  clientId: string
  title: string
  totalSessions: number
  reassessEverySessions: number | null
  startedAt: string
  expiresAt: string | null
  status: PhysioPackageStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  completedSessions: number
  remainingSessions: number
  progressLabel: string
  noShowCount: number
  cancelledCount: number
  evolutionsSinceAssessment: number
  reassessmentDue: boolean
  nearingEnd: boolean
}

export interface CreatePhysioPackageInput {
  clientId: string
  title: string
  totalSessions: number
  reassessEverySessions?: number | null
  startedAt?: string | null
  expiresAt?: string | null
  notes?: string | null
  closePreviousActive?: boolean
}

export interface UpdatePhysioPackageInput {
  title?: string
  totalSessions?: number
  reassessEverySessions?: number | null
  expiresAt?: string | null
  status?: PhysioPackageStatus
  notes?: string | null
}

export type PhysioDischargeReason =
  | "GOALS_MET"
  | "PARTIAL_IMPROVEMENT"
  | "MEDICAL_REFERRAL"
  | "TREATMENT_ABANDONMENT"
  | "PATIENT_REQUEST"

export interface PhysioDischargeComparison {
  initialPainLevel: number | null
  finalPainLevel: number | null
  painDelta: number | null
  sessionsCompleted: number
  romComparisons: Array<{
    joint: string
    movement: string
    side: string
    initialDeg: number | null
    finalDeg: number | null
    gainDeg: number | null
  }>
  scaleComparisons: Array<{
    scaleType: PhysioScaleType
    scoreUnit: string
    initialScore: number
    finalScore: number | null
    delta: number | null
    initialClassification: string
    finalClassification: string | null
  }>
}

export interface PhysioDischargeRecord {
  id: string
  clientId: string
  rehabPlanId: string | null
  initialAssessmentId: string | null
  finalAssessmentId: string | null
  dischargedAt: string
  reason: PhysioDischargeReason
  sessionsCompleted: number
  initialPainLevel: number | null
  finalPainLevel: number | null
  clinicalSummary: string
  recommendations: string | null
  comparisonSnapshot: PhysioDischargeComparison | null
  createdAt: string
  updatedAt: string
  rehabPlan: PhysioEvolutionPlanSummary | null
}

export interface CreatePhysioDischargeInput {
  clientId: string
  reason: PhysioDischargeReason
  dischargedAt?: string | null
  rehabPlanId?: string | null
  initialAssessmentId?: string | null
  finalAssessmentId?: string | null
  initialPainLevel?: number | null
  finalPainLevel?: number | null
  clinicalSummary: string
  recommendations?: string | null
  deactivateActivePlan?: boolean
}

export type PhysioReportPeriod = "30_DAYS" | "90_DAYS" | "180_DAYS" | "365_DAYS"

export interface PhysioManagementReportItem {
  clientId: string
  name: string
  status: string
  completedSessions: number
  noShowCount: number
  cancelledCount: number
  activePackageTitle: string | null
  packageCompletedSessions: number | null
  packageTotalSessions: number | null
  latestDischargeReason: PhysioDischargeReason | null
  dischargedAt: string | null
}

export interface PhysioManagementReport {
  period: PhysioReportPeriod
  fromDate: string
  toDate: string
  counts: {
    activePatients: number
    archivedPatients: number
    completedSessions: number
    completedAppointments: number
    noShowCount: number
    cancelledCount: number
    attendanceRatePct: number
    noShowRatePct: number
    dischargesCount: number
    avgSessionsToDischarge: number | null
    avgPainReduction: number | null
    activePackagesCount: number
    expiringPackagesCount: number
  }
  dischargesByReason: Record<PhysioDischargeReason, number>
  items: PhysioManagementReportItem[]
}

export type PhysioDocumentType =
  | "ATTENDANCE"
  | "CERTIFICATE"
  | "MEDICAL_REPORT"

export type PhysioActivePlan = RehabPlan & {
  clientId: string
  createdAt?: string
  updatedAt?: string
}

export interface PhysioClientOverview {
  client: { id: string; status: ClientStatus }
  activePlan: PhysioActivePlan | null
  activePackage?: PhysioSessionPackageRecord | null
  latestDischarge?: PhysioDischargeRecord | null
  recentAssessments: PhysioAssessmentRecord[]
  recentEvolutions: PhysioSessionEvolution[]
  recentScales?: PhysioFunctionalScaleRecord[]
  unlinkedAppointments: PhysioEvolutionAppointmentSummary[]
  painSeries: PhysioPainPoint[]
}

export interface CreatePhysioSessionEvolutionInput {
  clientId: string
  appointmentId?: string | null
  rehabPlanId?: string | null
  packageId?: string | null
  sessionDate?: string | null
  painBefore?: number | null
  painAfter?: number | null
  proceduresApplied?: string[]
  patientResponse: string
  nextSteps?: string | null
}

export interface UpdatePhysioSessionEvolutionInput {
  rehabPlanId?: string | null
  packageId?: string | null
  sessionDate?: string | null
  painBefore?: number | null
  painAfter?: number | null
  proceduresApplied?: string[]
  patientResponse?: string
  nextSteps?: string | null
}
