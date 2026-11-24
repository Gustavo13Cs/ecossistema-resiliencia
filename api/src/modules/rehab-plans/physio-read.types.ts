import {
  AppointmentKind,
  AppointmentModality,
  AppointmentStatus,
  Client,
  PhysioAssessment,
  PhysioFunctionalScale,
  PhysioSessionEvolution,
  RehabExercise,
  RehabPlan,
  RehabSession,
} from '@prisma/client';

export type PhysioWorkspaceSection =
  | 'COMPLETED_WITHOUT_EVOLUTION'
  | 'PAIN_WORSENING'
  | 'OVERDUE_REASSESSMENT'
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
}

export interface PhysioWorkspace {
  counts: {
    activePatients: number;
    archivedPatients: number;
    completedWithoutEvolution: number;
    withoutActivePlan: number;
    overdueReassessments: number;
    painWorsening: number;
  };
  items: PhysioWorkspaceItem[];
  evolvedAppointmentIds: string[];
}

export type PhysioActivePlan = Omit<RehabPlan, 'userId' | 'creatorId'> & {
  clientId: string;
  sessions: (RehabSession & {
    exercises: RehabExercise[];
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

export interface PhysioClientOverview {
  client: Pick<Client, 'id' | 'status'>;
  activePlan: PhysioActivePlan | null;
  recentAssessments: PhysioRecentAssessment[];
  recentEvolutions: PhysioSessionEvolutionSummary[];
  recentScales: PhysioFunctionalScaleSummary[];
  unlinkedAppointments: PhysioUnlinkedAppointment[];
  painSeries: PhysioPainPoint[];
}
