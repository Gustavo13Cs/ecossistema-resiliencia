import {
  AppointmentKind,
  AppointmentModality,
  AppointmentStatus,
  Client,
  PhysioAssessment,
  PhysioDischargeReason,
  PhysioFunctionalScale,
  PhysioSessionEvolution,
  RehabExercise,
  RehabPlan,
  RehabSession,
} from '@prisma/client';
import type { DemonstrationPresentation } from '../workouts/exercise-demonstration.types';
import type { PhysioSessionPackageSummary } from './physio-packages.service';

export type PhysioWorkspaceSection =
  | 'COMPLETED_WITHOUT_EVOLUTION'
  | 'PAIN_WORSENING'
  | 'OVERDUE_REASSESSMENT'
  | 'EXPIRING_PACKAGE'
  | 'WITHOUT_ACTIVE_PLAN'
  | 'RECENT';

export interface PhysioWorkspaceItem {
  clientId: string;
  name: string;
  goal: string | null;
  updatedAt: Date;
  section: PhysioWorkspaceSection;
  appointmentId?: string | null;
  appointmentStartsAt?: Date | null;
  appointmentKind?: AppointmentKind | null;
  lastAssessmentDate?: Date | null;
  previousPain?: number | null;
  latestPain?: number | null;
  packageTitle?: string | null;
  completedSessions?: number | null;
  totalSessions?: number | null;
}

export interface PhysioWorkspace {
  counts: {
    activePatients: number;
    archivedPatients: number;
    completedWithoutEvolution: number;
    withoutActivePlan: number;
    overdueReassessments: number;
    painWorsening: number;
    expiringPackages: number;
  };
  items: PhysioWorkspaceItem[];
  evolvedAppointmentIds: string[];
}

export type PhysioActivePlanExercise = Omit<
  RehabExercise,
  'demonstrationSnapshot'
> & {
  demonstrationSnapshot: DemonstrationPresentation | null;
};

export type PhysioActivePlan = Omit<RehabPlan, 'userId' | 'creatorId'> & {
  clientId: string;
  sessions: (RehabSession & {
    exercises: PhysioActivePlanExercise[];
  })[];
};

export type PhysioRecentAssessment = Omit<
  PhysioAssessment,
  'userId' | 'creatorId'
> & {
  clientId: string;
};

export type PhysioSessionEvolutionSummary = Omit<
  PhysioSessionEvolution,
  'professionalId'
> & {
  appointment: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    kind: AppointmentKind;
    status: AppointmentStatus;
    modality: AppointmentModality;
  } | null;
  rehabPlan: {
    id: string;
    title: string;
  } | null;
};

export interface PhysioUnlinkedAppointment {
  id: string;
  startsAt: Date;
  endsAt: Date;
  kind: AppointmentKind;
  status: AppointmentStatus;
  modality: AppointmentModality;
}

export interface PhysioPainPoint {
  id: string;
  date: Date;
  source: 'ASSESSMENT' | 'SESSION';
  painLevel: number | null;
  painBefore: number | null;
  painAfter: number | null;
}

export type PhysioFunctionalScaleSummary = Omit<
  PhysioFunctionalScale,
  'professionalId'
>;

export interface PhysioDischargeSummary {
  id: string;
  clientId: string;
  rehabPlanId: string | null;
  initialAssessmentId: string | null;
  finalAssessmentId: string | null;
  dischargedAt: Date;
  reason: PhysioDischargeReason;
  sessionsCompleted: number;
  initialPainLevel: number | null;
  finalPainLevel: number | null;
  clinicalSummary: string;
  recommendations: string | null;
  comparisonSnapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
  rehabPlan: { id: string; title: string } | null;
}

export interface PhysioClientOverview {
  client: Pick<Client, 'id' | 'status'>;
  activePlan: PhysioActivePlan | null;
  activePackage: PhysioSessionPackageSummary | null;
  latestDischarge: PhysioDischargeSummary | null;
  recentAssessments: PhysioRecentAssessment[];
  recentEvolutions: PhysioSessionEvolutionSummary[];
  recentScales: PhysioFunctionalScaleSummary[];
  unlinkedAppointments: PhysioUnlinkedAppointment[];
  painSeries: PhysioPainPoint[];
}
