import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';

const activeDietSelect = {
  id: true,
  title: true,
  goal: true,
  targetKcal: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  createdAt: true,
  creator: { select: { name: true, role: true } },
} satisfies Prisma.DietPlanSelect;

const activeWorkoutSelect = {
  id: true,
  title: true,
  goal: true,
  durationWeeks: true,
  createdAt: true,
  creator: { select: { name: true, role: true } },
  splits: {
    select: { id: true, name: true, focus: true },
    take: 5,
  },
} satisfies Prisma.WorkoutSelect;

const activeRehabSelect = {
  id: true,
  title: true,
  goal: true,
  durationWeeks: true,
  createdAt: true,
  creator: { select: { name: true, role: true } },
} satisfies Prisma.RehabPlanSelect;

const assessmentSelect = {
  id: true,
  date: true,
  weight: true,
  bodyFat: true,
  muscleMass: true,
  waist: true,
  abdomen: true,
} satisfies Prisma.PhysicalAssessmentSelect;

const labExamSelect = {
  id: true,
  date: true,
  notes: true,
  markers: {
    select: { id: true, name: true, value: true, unit: true },
    take: 6,
  },
} satisfies Prisma.LabExamSelect;

const alertSelect = {
  id: true,
  type: true,
  severity: true,
  message: true,
  createdAt: true,
} satisfies Prisma.PatientAlertSelect;

const physioAssessmentSelect = {
  id: true,
  date: true,
  painLevel: true,
  chiefComplaint: true,
} satisfies Prisma.PhysioAssessmentSelect;

type OverviewClient = Pick<
  Client,
  | 'id'
  | 'name'
  | 'goal'
  | 'allergies'
  | 'pathologies'
  | 'height'
  | 'initialWeight'
  | 'gender'
  | 'birthDate'
>;
type ActiveDiet = Prisma.DietPlanGetPayload<{
  select: typeof activeDietSelect;
}>;
type ActiveWorkout = Prisma.WorkoutGetPayload<{
  select: typeof activeWorkoutSelect;
}>;
type ActiveRehab = Prisma.RehabPlanGetPayload<{
  select: typeof activeRehabSelect;
}>;
type Assessment = Prisma.PhysicalAssessmentGetPayload<{
  select: typeof assessmentSelect;
}>;
type LabExam = Prisma.LabExamGetPayload<{ select: typeof labExamSelect }>;
type ActiveAlert = Prisma.PatientAlertGetPayload<{
  select: typeof alertSelect;
}>;
type PhysioAssessment = Prisma.PhysioAssessmentGetPayload<{
  select: typeof physioAssessmentSelect;
}>;

type TimelineEvent = {
  label: string;
  date: Date;
  type: string;
  author: string;
};

export type ClientOverview = {
  client: OverviewClient;
  activeDietPlan: ActiveDiet | null;
  activeWorkout: ActiveWorkout | null;
  activeRehabPlan: ActiveRehab | null;
  latestAssessment: Assessment | null;
  previousAssessment: Assessment | null;
  weightDelta: number | null;
  latestLabExam: LabExam | null;
  activeAlerts: ActiveAlert[];
  latestPhysioAssessment: PhysioAssessment | null;
  conflictWarning: {
    message: string;
    physioDate: Date;
    painLevel: number;
  } | null;
  recentTimeline: TimelineEvent[];
};

@Injectable()
export class ClientOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async getOverview(user: AuthUser, clientId: string): Promise<ClientOverview> {
    const ownedClient = await this.clientAccess.getOwnedClient(user, clientId);
    const [
      activeDiet,
      activeWorkout,
      activeRehab,
      assessments,
      latestLabExam,
      activeAlerts,
      latestPhysioAssessment,
    ] = await Promise.all([
      this.prisma.dietPlan.findFirst({
        where: { clientId, creatorId: user.sub, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: activeDietSelect,
      }),
      this.prisma.workout.findFirst({
        where: { clientId, creatorId: user.sub, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: activeWorkoutSelect,
      }),
      this.prisma.rehabPlan.findFirst({
        where: { clientId, creatorId: user.sub, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: activeRehabSelect,
      }),
      this.prisma.physicalAssessment.findMany({
        where: { clientId },
        orderBy: { date: 'desc' },
        take: 2,
        select: assessmentSelect,
      }),
      this.prisma.labExam.findFirst({
        where: { clientId, creatorId: user.sub },
        orderBy: { date: 'desc' },
        select: labExamSelect,
      }),
      this.prisma.patientAlert.findMany({
        where: { clientId, professionalId: user.sub },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: alertSelect,
      }),
      this.prisma.physioAssessment.findFirst({
        where: { clientId, creatorId: user.sub },
        orderBy: { date: 'desc' },
        select: physioAssessmentSelect,
      }),
    ]);

    const client: OverviewClient = {
      id: ownedClient.id,
      name: ownedClient.name,
      goal: ownedClient.goal,
      allergies: ownedClient.allergies,
      pathologies: ownedClient.pathologies,
      height: ownedClient.height,
      initialWeight: ownedClient.initialWeight,
      gender: ownedClient.gender,
      birthDate: ownedClient.birthDate,
    };
    const recentTimeline = this.buildTimeline({
      activeDiet,
      activeWorkout,
      activeRehab,
      latestAssessment: assessments[0] ?? null,
      latestLabExam,
      latestPhysioAssessment,
    });
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const hasHighPain =
      latestPhysioAssessment?.painLevel != null &&
      latestPhysioAssessment.painLevel >= 7;
    const hasRecentAssessmentOrWorkout = Boolean(
      (assessments[0] && new Date(assessments[0].date) >= threeDaysAgo) ||
      (activeWorkout && new Date(activeWorkout.createdAt) >= threeDaysAgo),
    );
    const conflictWarning =
      hasHighPain && hasRecentAssessmentOrWorkout && latestPhysioAssessment
        ? {
            message: `Dor EVA ${latestPhysioAssessment.painLevel}/10 registrada pela Fisio em ${new Date(latestPhysioAssessment.date).toLocaleDateString('pt-BR')} e há atividade física ativa no mesmo período.`,
            physioDate: latestPhysioAssessment.date,
            painLevel: latestPhysioAssessment.painLevel as number,
          }
        : null;
    const latestAssessment = assessments[0] ?? null;
    const previousAssessment = assessments[1] ?? null;
    const weightDelta =
      latestAssessment?.weight != null && previousAssessment?.weight != null
        ? Number(
            (latestAssessment.weight - previousAssessment.weight).toFixed(1),
          )
        : null;

    return {
      client,
      activeDietPlan: activeDiet,
      activeWorkout,
      activeRehabPlan: activeRehab,
      latestAssessment,
      previousAssessment,
      weightDelta,
      latestLabExam,
      activeAlerts,
      latestPhysioAssessment,
      conflictWarning,
      recentTimeline,
    };
  }

  private buildTimeline(input: {
    activeDiet: ActiveDiet | null;
    activeWorkout: ActiveWorkout | null;
    activeRehab: ActiveRehab | null;
    latestAssessment: Assessment | null;
    latestLabExam: LabExam | null;
    latestPhysioAssessment: PhysioAssessment | null;
  }): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    if (input.activeDiet) {
      events.push({
        label: `Plano alimentar: "${input.activeDiet.title}"`,
        date: input.activeDiet.createdAt,
        type: 'DIET',
        author: input.activeDiet.creator?.name || 'Nutricionista',
      });
    }
    if (input.activeWorkout) {
      events.push({
        label: `Treino prescrito: "${input.activeWorkout.title}"`,
        date: input.activeWorkout.createdAt,
        type: 'WORKOUT',
        author: input.activeWorkout.creator?.name || 'Personal Trainer',
      });
    }
    if (input.activeRehab) {
      events.push({
        label: `Plano de reabilitação: "${input.activeRehab.title}"`,
        date: input.activeRehab.createdAt,
        type: 'REHAB',
        author: input.activeRehab.creator?.name || 'Fisioterapeuta',
      });
    }
    if (input.latestAssessment) {
      events.push({
        label: `Avaliação física: ${input.latestAssessment.weight != null ? `${input.latestAssessment.weight}kg` : 'registrada'}`,
        date: input.latestAssessment.date,
        type: 'ASSESSMENT',
        author: 'Profissional',
      });
    }
    if (input.latestLabExam) {
      events.push({
        label: 'Exames laboratoriais registrados',
        date: input.latestLabExam.date,
        type: 'LAB',
        author: 'Nutricionista',
      });
    }
    if (input.latestPhysioAssessment) {
      events.push({
        label: `Avaliação fisioterapêutica${input.latestPhysioAssessment.painLevel != null ? ` — Dor EVA ${input.latestPhysioAssessment.painLevel}/10` : ''}`,
        date: input.latestPhysioAssessment.date,
        type: 'PHYSIO',
        author: 'Fisioterapeuta',
      });
    }

    return events
      .sort((left, right) => right.date.getTime() - left.date.getTime())
      .slice(0, 8);
  }
}
