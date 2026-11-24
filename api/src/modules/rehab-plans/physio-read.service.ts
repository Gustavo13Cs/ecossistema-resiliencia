import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { PHYSIO_EVOLUTION_SELECT } from './physio-session-evolutions.service';
import {
  PhysioClientOverview,
  PhysioPainPoint,
  PhysioWorkspace,
  PhysioWorkspaceItem,
} from './physio-read.types';

const DAY_MS = 24 * 60 * 60 * 1000;

const activePlanSelect = {
  id: true,
  title: true,
  goal: true,
  durationWeeks: true,
  notes: true,
  clientId: true,
  isActive: true,
  isTemplate: true,
  createdAt: true,
  updatedAt: true,
  sessions: {
    select: {
      id: true,
      name: true,
      focus: true,
      rehabPlanId: true,
      exercises: {
        select: {
          id: true,
          name: true,
          sets: true,
          reps: true,
          notes: true,
          sessionId: true,
        },
      },
    },
  },
} satisfies Prisma.RehabPlanSelect;

const recentAssessmentSelect = {
  id: true,
  date: true,
  chiefComplaint: true,
  historyOfIllness: true,
  painLevel: true,
  posturalAnalysis: true,
  palpation: true,
  jointMobility: true,
  orthopedicTests: true,
  treatmentPlan: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PhysioAssessmentSelect;

@Injectable()
export class PhysioReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async getWorkspace(user: AuthUser): Promise<PhysioWorkspace> {
    this.assertPhysiotherapist(user);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);

    const activeWhere = {
      professionalId: user.sub,
      status: 'ACTIVE',
    } satisfies Prisma.ClientWhereInput;

    const withoutActivePlanWhere = {
      ...activeWhere,
      rehabPlans: { none: { creatorId: user.sub, isActive: true } },
    } satisfies Prisma.ClientWhereInput;

    const completedWithoutEvolutionWhere = {
      professionalId: user.sub,
      status: 'COMPLETED',
      startsAt: { gte: thirtyDaysAgo },
      client: { professionalId: user.sub, status: 'ACTIVE' },
      physioEvolution: { is: null },
    } satisfies Prisma.AppointmentWhereInput;

    const [
      activePatients,
      archivedPatients,
      withoutActivePlanCount,
      withoutActivePlanSample,
      recentPatients,
      completedWithoutEvolutionCount,
      completedWithoutEvolutionSample,
      activeClientSignals,
      recentEvolvedAppointments,
    ] = await Promise.all([
      this.prisma.client.count({ where: activeWhere }),
      this.prisma.client.count({
        where: { professionalId: user.sub, status: 'ARCHIVED' },
      }),
      this.prisma.client.count({ where: withoutActivePlanWhere }),
      this.prisma.client.findMany({
        where: withoutActivePlanWhere,
        select: { id: true, name: true, goal: true, updatedAt: true },
        take: 5,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.client.findMany({
        where: activeWhere,
        select: { id: true, name: true, goal: true, updatedAt: true },
        take: 5,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.appointment.count({
        where: completedWithoutEvolutionWhere,
      }),
      this.prisma.appointment.findMany({
        where: completedWithoutEvolutionWhere,
        select: {
          id: true,
          clientId: true,
          startsAt: true,
          kind: true,
          client: { select: { name: true, goal: true, updatedAt: true } },
        },
        take: 5,
        orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.client.findMany({
        where: activeWhere,
        select: {
          id: true,
          name: true,
          goal: true,
          updatedAt: true,
          physioAssessments: {
            where: { creatorId: user.sub },
            select: { date: true, painLevel: true },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: 20,
          },
          physioSessionEvolutions: {
            where: { professionalId: user.sub },
            select: { sessionDate: true, painBefore: true, painAfter: true },
            orderBy: [
              { sessionDate: 'desc' },
              { createdAt: 'desc' },
              { id: 'desc' },
            ],
            take: 20,
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.physioSessionEvolution.findMany({
        where: {
          professionalId: user.sub,
          appointmentId: { not: null },
          sessionDate: { gte: fourteenDaysAgo },
        },
        select: { appointmentId: true },
        orderBy: [{ sessionDate: 'desc' }],
        take: 200,
      }),
    ]);

    const overdueAll: Array<{ item: PhysioWorkspaceItem; sortTime: number }> =
      [];
    const worseningAll: Array<{ item: PhysioWorkspaceItem; delta: number }> =
      [];

    for (const patient of activeClientSignals) {
      const latestAssessment = patient.physioAssessments[0] ?? null;
      if (!latestAssessment || latestAssessment.date < thirtyDaysAgo) {
        overdueAll.push({
          sortTime: latestAssessment ? latestAssessment.date.getTime() : 0,
          item: {
            clientId: patient.id,
            name: patient.name,
            goal: patient.goal,
            updatedAt: patient.updatedAt,
            section: 'OVERDUE_REASSESSMENT',
            lastAssessmentDate: latestAssessment ? latestAssessment.date : null,
          },
        });
      }

      const readings: Array<{
        timestamp: number;
        pain: number;
        order: number;
      }> = [];
      for (const assessment of patient.physioAssessments) {
        if (assessment.painLevel !== null) {
          readings.push({
            timestamp: assessment.date.getTime(),
            pain: assessment.painLevel,
            order: 0,
          });
        }
      }
      for (const evolution of patient.physioSessionEvolutions) {
        const pain = evolution.painAfter ?? evolution.painBefore;
        if (pain !== null) {
          readings.push({
            timestamp: evolution.sessionDate.getTime(),
            pain,
            order: 1,
          });
        }
      }

      readings.sort((a, b) => b.timestamp - a.timestamp || b.order - a.order);
      if (readings.length >= 2 && readings[0].pain > readings[1].pain) {
        const latestPain = readings[0].pain;
        const previousPain = readings[1].pain;
        worseningAll.push({
          delta: latestPain - previousPain,
          item: {
            clientId: patient.id,
            name: patient.name,
            goal: patient.goal,
            updatedAt: patient.updatedAt,
            section: 'PAIN_WORSENING',
            previousPain,
            latestPain,
          },
        });
      }
    }

    overdueAll.sort(
      (a, b) =>
        a.sortTime - b.sortTime ||
        b.item.updatedAt.getTime() - a.item.updatedAt.getTime() ||
        a.item.clientId.localeCompare(b.item.clientId),
    );

    worseningAll.sort(
      (a, b) =>
        b.delta - a.delta ||
        b.item.updatedAt.getTime() - a.item.updatedAt.getTime() ||
        a.item.clientId.localeCompare(b.item.clientId),
    );

    const overdueSample: PhysioWorkspaceItem[] = overdueAll
      .slice(0, 5)
      .map((entry) => entry.item);

    const worseningSample: PhysioWorkspaceItem[] = worseningAll
      .slice(0, 5)
      .map((entry) => entry.item);

    const items: PhysioWorkspaceItem[] = [
      ...completedWithoutEvolutionSample.map((appt) => ({
        clientId: appt.clientId,
        name: appt.client.name,
        goal: appt.client.goal,
        updatedAt: appt.client.updatedAt,
        section: 'COMPLETED_WITHOUT_EVOLUTION' as const,
        appointmentId: appt.id,
        appointmentStartsAt: appt.startsAt,
        appointmentKind: appt.kind,
      })),
      ...worseningSample,
      ...overdueSample,
      ...withoutActivePlanSample.map((patient) => ({
        clientId: patient.id,
        name: patient.name,
        goal: patient.goal,
        updatedAt: patient.updatedAt,
        section: 'WITHOUT_ACTIVE_PLAN' as const,
      })),
      ...recentPatients.map((patient) => ({
        clientId: patient.id,
        name: patient.name,
        goal: patient.goal,
        updatedAt: patient.updatedAt,
        section: 'RECENT' as const,
      })),
    ];

    const evolvedAppointmentIds = recentEvolvedAppointments
      .map((entry) => entry.appointmentId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    return {
      counts: {
        activePatients,
        archivedPatients,
        completedWithoutEvolution: completedWithoutEvolutionCount,
        withoutActivePlan: withoutActivePlanCount,
        overdueReassessments: overdueAll.length,
        painWorsening: worseningAll.length,
      },
      items,
      evolvedAppointmentIds,
    };
  }

  async getClientOverview(
    user: AuthUser,
    clientId: string,
  ): Promise<PhysioClientOverview> {
    this.assertPhysiotherapist(user);
    const client = await this.clientAccess.getOwnedClient(user, clientId);

    const [
      activePlan,
      recentAssessments,
      recentEvolutions,
      unlinkedAppointments,
      painAssessments,
      painEvolutions,
    ] = await Promise.all([
      this.prisma.rehabPlan.findFirst({
        where: { clientId: client.id, creatorId: user.sub, isActive: true },
        select: activePlanSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.physioAssessment.findMany({
        where: { clientId: client.id, creatorId: user.sub },
        select: recentAssessmentSelect,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 2,
      }),
      this.prisma.physioSessionEvolution.findMany({
        where: { clientId: client.id, professionalId: user.sub },
        select: PHYSIO_EVOLUTION_SELECT,
        orderBy: [
          { sessionDate: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 5,
      }),
      this.prisma.appointment.findMany({
        where: {
          clientId: client.id,
          professionalId: user.sub,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
          physioEvolution: { is: null },
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          kind: true,
          status: true,
          modality: true,
        },
        orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
        take: 10,
      }),
      this.prisma.physioAssessment.findMany({
        where: {
          clientId: client.id,
          creatorId: user.sub,
          painLevel: { not: null },
        },
        select: { id: true, date: true, painLevel: true },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: 30,
      }),
      this.prisma.physioSessionEvolution.findMany({
        where: {
          clientId: client.id,
          professionalId: user.sub,
          OR: [{ painBefore: { not: null } }, { painAfter: { not: null } }],
        },
        select: {
          id: true,
          sessionDate: true,
          painBefore: true,
          painAfter: true,
        },
        orderBy: [
          { sessionDate: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: 30,
      }),
    ]);

    const painSeries: PhysioPainPoint[] = [
      ...painAssessments.map((item) => ({
        id: item.id,
        date: item.date,
        source: 'ASSESSMENT' as const,
        painLevel: item.painLevel,
        painBefore: null,
        painAfter: null,
      })),
      ...painEvolutions.map((item) => ({
        id: item.id,
        date: item.sessionDate,
        source: 'SESSION' as const,
        painLevel: null,
        painBefore: item.painBefore,
        painAfter: item.painAfter,
      })),
    ]
      .sort(
        (a, b) =>
          a.date.getTime() - b.date.getTime() ||
          (a.source === b.source ? 0 : a.source === 'ASSESSMENT' ? -1 : 1),
      )
      .slice(-60);

    return {
      client: { id: client.id, status: client.status },
      activePlan: activePlan ? { ...activePlan, clientId: client.id } : null,
      recentAssessments: recentAssessments.map((item) => ({
        ...item,
        clientId: client.id,
      })),
      recentEvolutions: recentEvolutions.map((item) => ({
        ...item,
        clientId: client.id,
      })),
      unlinkedAppointments,
      painSeries,
    };
  }

  private assertPhysiotherapist(user: AuthUser) {
    if (user.role !== 'PHYSIO') {
      throw new ForbiddenException('Acesso permitido somente a fisioterapeuta');
    }
  }
}
