import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PhysioDischargeReason, PhysioScaleType, Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreatePhysioDischargeDto,
  PhysioReportPeriod,
  PhysioReportsQueryDto,
} from './dto/physio-discharge.dto';
import { buildPhysioPackageSummaries } from './physio-packages.service';

export const PHYSIO_DISCHARGE_SELECT = {
  id: true,
  clientId: true,
  rehabPlanId: true,
  initialAssessmentId: true,
  finalAssessmentId: true,
  dischargedAt: true,
  reason: true,
  sessionsCompleted: true,
  initialPainLevel: true,
  finalPainLevel: true,
  clinicalSummary: true,
  recommendations: true,
  comparisonSnapshot: true,
  createdAt: true,
  updatedAt: true,
  rehabPlan: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.PhysioDischargeSelect;

type GoniometryEntryJson = {
  joint?: unknown;
  movement?: unknown;
  side?: unknown;
  activeDeg?: unknown;
  passiveDeg?: unknown;
};

export interface PhysioDischargeRomComparison {
  joint: string;
  movement: string;
  side: string;
  initialDeg: number | null;
  finalDeg: number | null;
  gainDeg: number | null;
}

export interface PhysioDischargeScaleComparison {
  scaleType: PhysioScaleType;
  scoreUnit: string;
  initialScore: number;
  finalScore: number | null;
  delta: number | null;
  initialClassification: string;
  finalClassification: string | null;
}

export interface PhysioDischargeComparisonSnapshot {
  initialPainLevel: number | null;
  finalPainLevel: number | null;
  painDelta: number | null;
  sessionsCompleted: number;
  romComparisons: PhysioDischargeRomComparison[];
  scaleComparisons: PhysioDischargeScaleComparison[];
}

export interface PhysioManagementReportItem {
  clientId: string;
  name: string;
  status: string;
  completedSessions: number;
  noShowCount: number;
  cancelledCount: number;
  activePackageTitle: string | null;
  packageCompletedSessions: number | null;
  packageTotalSessions: number | null;
  latestDischargeReason: PhysioDischargeReason | null;
  dischargedAt: Date | null;
}

export interface PhysioManagementReport {
  period: PhysioReportPeriod;
  fromDate: Date;
  toDate: Date;
  counts: {
    activePatients: number;
    archivedPatients: number;
    completedSessions: number;
    completedAppointments: number;
    noShowCount: number;
    cancelledCount: number;
    attendanceRatePct: number;
    noShowRatePct: number;
    dischargesCount: number;
    avgSessionsToDischarge: number | null;
    avgPainReduction: number | null;
    activePackagesCount: number;
    expiringPackagesCount: number;
  };
  dischargesByReason: Record<PhysioDischargeReason, number>;
  items: PhysioManagementReportItem[];
}

const PERIOD_DAYS: Record<PhysioReportPeriod, number> = {
  '30_DAYS': 30,
  '90_DAYS': 90,
  '180_DAYS': 180,
  '365_DAYS': 365,
};

function parseGoniometryEntries(raw: unknown): Array<{
  joint: string;
  movement: string;
  side: string;
  deg: number | null;
}> {
  if (!Array.isArray(raw)) return [];
  const entries: Array<{
    joint: string;
    movement: string;
    side: string;
    deg: number | null;
  }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as GoniometryEntryJson;
    if (
      typeof candidate.joint !== 'string' ||
      typeof candidate.movement !== 'string' ||
      typeof candidate.side !== 'string'
    ) {
      continue;
    }
    const active =
      typeof candidate.activeDeg === 'number' ? candidate.activeDeg : null;
    const passive =
      typeof candidate.passiveDeg === 'number' ? candidate.passiveDeg : null;
    const deg = active ?? passive;
    if (deg == null) continue;
    entries.push({
      joint: candidate.joint,
      movement: candidate.movement,
      side: candidate.side,
      deg,
    });
  }
  return entries;
}

export function buildDischargeComparison(input: {
  initialPainLevel: number | null;
  finalPainLevel: number | null;
  sessionsCompleted: number;
  initialGoniometry: unknown;
  finalGoniometry: unknown;
  scales: Array<{
    scaleType: PhysioScaleType;
    normalizedScore: number;
    scoreUnit: string;
    classification: string;
  }>;
}): PhysioDischargeComparisonSnapshot {
  const painDelta =
    input.initialPainLevel != null && input.finalPainLevel != null
      ? input.initialPainLevel - input.finalPainLevel
      : null;

  const initialRom = parseGoniometryEntries(input.initialGoniometry);
  const finalRom = parseGoniometryEntries(input.finalGoniometry);
  const romMap = new Map<string, PhysioDischargeRomComparison>();

  for (const entry of initialRom) {
    const key = `${entry.joint}::${entry.movement}::${entry.side}`;
    romMap.set(key, {
      joint: entry.joint,
      movement: entry.movement,
      side: entry.side,
      initialDeg: entry.deg,
      finalDeg: null,
      gainDeg: null,
    });
  }
  for (const entry of finalRom) {
    const key = `${entry.joint}::${entry.movement}::${entry.side}`;
    const current = romMap.get(key);
    if (current) {
      current.finalDeg = entry.deg;
      current.gainDeg =
        current.initialDeg != null && entry.deg != null
          ? entry.deg - current.initialDeg
          : null;
    } else {
      romMap.set(key, {
        joint: entry.joint,
        movement: entry.movement,
        side: entry.side,
        initialDeg: null,
        finalDeg: entry.deg,
        gainDeg: null,
      });
    }
  }

  const byScale = new Map<
    PhysioScaleType,
    Array<{
      normalizedScore: number;
      scoreUnit: string;
      classification: string;
    }>
  >();
  for (const scale of input.scales) {
    const list = byScale.get(scale.scaleType) ?? [];
    list.push(scale);
    byScale.set(scale.scaleType, list);
  }

  const scaleComparisons: PhysioDischargeScaleComparison[] = [];
  for (const [scaleType, list] of byScale.entries()) {
    const initial = list[0];
    const final = list.length >= 2 ? list[list.length - 1] : null;
    scaleComparisons.push({
      scaleType,
      scoreUnit: initial.scoreUnit,
      initialScore: initial.normalizedScore,
      finalScore: final ? final.normalizedScore : null,
      delta: final
        ? Number((final.normalizedScore - initial.normalizedScore).toFixed(1))
        : null,
      initialClassification: initial.classification,
      finalClassification: final ? final.classification : null,
    });
  }

  return {
    initialPainLevel: input.initialPainLevel,
    finalPainLevel: input.finalPainLevel,
    painDelta,
    sessionsCompleted: input.sessionsCompleted,
    romComparisons: Array.from(romMap.values()),
    scaleComparisons,
  };
}

@Injectable()
export class PhysioDischargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async listByClient(user: AuthUser, clientId: string) {
    this.assertPhysiotherapist(user);
    const client = await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.physioDischarge.findMany({
      where: { clientId: client.id, professionalId: user.sub },
      select: PHYSIO_DISCHARGE_SELECT,
      orderBy: [
        { dischargedAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: 25,
    });
  }

  async create(user: AuthUser, dto: CreatePhysioDischargeDto) {
    this.assertPhysiotherapist(user);
    const clinicalSummary = dto.clinicalSummary.trim();
    if (!clinicalSummary) {
      throw new BadRequestException(
        'Informe o resumo clínico da alta fisioterapêutica.',
      );
    }

    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    const recommendations = this.normalizeOptionalText(dto.recommendations);
    const dischargedAt = dto.dischargedAt
      ? new Date(dto.dischargedAt)
      : new Date();

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);

      if (dto.rehabPlanId) {
        const plan = await tx.rehabPlan.findFirst({
          where: {
            id: dto.rehabPlanId,
            clientId: client.id,
            creatorId: user.sub,
          },
          select: { id: true },
        });
        if (!plan) {
          throw new NotFoundException(
            'Protocolo de reabilitação não encontrado para este paciente',
          );
        }
      }

      const [assessments, scales, sessionsCompleted] = await Promise.all([
        tx.physioAssessment.findMany({
          where: { clientId: client.id, creatorId: user.sub },
          select: {
            id: true,
            date: true,
            painLevel: true,
            goniometry: true,
          },
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
        }),
        tx.physioFunctionalScale.findMany({
          where: { clientId: client.id, professionalId: user.sub },
          select: {
            scaleType: true,
            normalizedScore: true,
            scoreUnit: true,
            classification: true,
          },
          orderBy: [
            { evaluatedAt: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' },
          ],
        }),
        tx.physioSessionEvolution.count({
          where: { clientId: client.id, professionalId: user.sub },
        }),
      ]);

      const initialAssessment = dto.initialAssessmentId
        ? assessments.find((a) => a.id === dto.initialAssessmentId)
        : (assessments[0] ?? null);
      if (dto.initialAssessmentId && !initialAssessment) {
        throw new NotFoundException(
          'Avaliação inicial não encontrada para este paciente',
        );
      }

      const finalAssessment = dto.finalAssessmentId
        ? assessments.find((a) => a.id === dto.finalAssessmentId)
        : assessments.length >= 2
          ? assessments[assessments.length - 1]
          : null;
      if (dto.finalAssessmentId && !finalAssessment) {
        throw new NotFoundException(
          'Avaliação final não encontrada para este paciente',
        );
      }

      const initialPainLevel =
        dto.initialPainLevel ?? initialAssessment?.painLevel ?? null;
      const finalPainLevel =
        dto.finalPainLevel ?? finalAssessment?.painLevel ?? null;

      const comparisonSnapshot = buildDischargeComparison({
        initialPainLevel,
        finalPainLevel,
        sessionsCompleted,
        initialGoniometry: initialAssessment?.goniometry ?? null,
        finalGoniometry: finalAssessment?.goniometry ?? null,
        scales,
      });

      if (dto.deactivateActivePlan !== false) {
        await tx.rehabPlan.updateMany({
          where: { clientId: client.id, creatorId: user.sub, isActive: true },
          data: { isActive: false },
        });
        await tx.physioSessionPackage.updateMany({
          where: {
            clientId: client.id,
            professionalId: user.sub,
            status: 'ACTIVE',
          },
          data: { status: 'COMPLETED' },
        });
      }

      return tx.physioDischarge.create({
        data: {
          clientId: client.id,
          professionalId: user.sub,
          rehabPlanId: dto.rehabPlanId ?? null,
          initialAssessmentId: initialAssessment?.id ?? null,
          finalAssessmentId: finalAssessment?.id ?? null,
          dischargedAt,
          reason: dto.reason,
          sessionsCompleted,
          initialPainLevel,
          finalPainLevel,
          clinicalSummary,
          recommendations,
          comparisonSnapshot:
            comparisonSnapshot as unknown as Prisma.InputJsonValue,
        },
        select: PHYSIO_DISCHARGE_SELECT,
      });
    });
  }

  async remove(user: AuthUser, id: string) {
    this.assertPhysiotherapist(user);
    const existing = await this.prisma.physioDischarge.findFirst({
      where: { id, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Registro de alta não encontrado');
    }
    await this.clientAccess.getOwnedClient(user, existing.clientId);

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId, user.sub);
      return tx.physioDischarge.delete({
        where: {
          id: existing.id,
          clientId: existing.clientId,
          professionalId: user.sub,
        },
        select: { id: true, clientId: true },
      });
    });
  }

  async getManagementReport(
    user: AuthUser,
    query: PhysioReportsQueryDto = {},
  ): Promise<PhysioManagementReport> {
    this.assertPhysiotherapist(user);
    const period: PhysioReportPeriod = query.period ?? '30_DAYS';
    const toDate = new Date();
    const fromDate = new Date(
      toDate.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000,
    );

    const [
      clients,
      appointments,
      evolutions,
      discharges,
      activePackages,
      packageEvolutions,
    ] = await Promise.all([
      this.prisma.client.findMany({
        where: { professionalId: user.sub },
        select: { id: true, name: true, status: true, updatedAt: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.appointment.findMany({
        where: {
          professionalId: user.sub,
          startsAt: { gte: fromDate, lte: toDate },
        },
        select: { clientId: true, status: true, startsAt: true },
      }),
      this.prisma.physioSessionEvolution.findMany({
        where: {
          professionalId: user.sub,
          sessionDate: { gte: fromDate, lte: toDate },
        },
        select: {
          id: true,
          clientId: true,
          sessionDate: true,
          painBefore: true,
          painAfter: true,
        },
      }),
      this.prisma.physioDischarge.findMany({
        where: {
          professionalId: user.sub,
          dischargedAt: { gte: fromDate, lte: toDate },
        },
        select: {
          clientId: true,
          reason: true,
          sessionsCompleted: true,
          initialPainLevel: true,
          finalPainLevel: true,
          dischargedAt: true,
        },
        orderBy: [{ dischargedAt: 'desc' }],
      }),
      this.prisma.physioSessionPackage.findMany({
        where: { professionalId: user.sub, status: 'ACTIVE' },
        select: {
          id: true,
          clientId: true,
          title: true,
          totalSessions: true,
          reassessEverySessions: true,
          startedAt: true,
          expiresAt: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.physioSessionEvolution.findMany({
        where: { professionalId: user.sub },
        select: {
          id: true,
          clientId: true,
          sessionDate: true,
          packageId: true,
        },
        take: 1000,
      }),
    ]);

    const activePatients = clients.filter((c) => c.status === 'ACTIVE').length;
    const archivedPatients = clients.length - activePatients;

    let completedAppointments = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    const apptByClient = new Map<
      string,
      { noShow: number; cancelled: number }
    >();

    for (const appt of appointments) {
      const current = apptByClient.get(appt.clientId) ?? {
        noShow: 0,
        cancelled: 0,
      };
      if (appt.status === 'COMPLETED') completedAppointments += 1;
      else if (appt.status === 'NO_SHOW') {
        noShowCount += 1;
        current.noShow += 1;
      } else if (appt.status === 'CANCELLED') {
        cancelledCount += 1;
        current.cancelled += 1;
      }
      apptByClient.set(appt.clientId, current);
    }

    const attendanceDenominator = completedAppointments + noShowCount;
    const attendanceRatePct =
      attendanceDenominator > 0
        ? Number(
            ((completedAppointments / attendanceDenominator) * 100).toFixed(1),
          )
        : 0;
    const noShowRatePct =
      attendanceDenominator > 0
        ? Number(((noShowCount / attendanceDenominator) * 100).toFixed(1))
        : 0;

    const evolutionsByClient = new Map<string, number>();
    for (const evo of evolutions) {
      evolutionsByClient.set(
        evo.clientId,
        (evolutionsByClient.get(evo.clientId) ?? 0) + 1,
      );
    }

    const dischargesByReason: Record<PhysioDischargeReason, number> = {
      GOALS_MET: 0,
      PARTIAL_IMPROVEMENT: 0,
      MEDICAL_REFERRAL: 0,
      TREATMENT_ABANDONMENT: 0,
      PATIENT_REQUEST: 0,
    };

    let dischargeSessionsSum = 0;
    const painDeltas: number[] = [];
    const latestDischargeByClient = new Map<
      string,
      { reason: PhysioDischargeReason; dischargedAt: Date }
    >();

    for (const discharge of discharges) {
      dischargesByReason[discharge.reason] += 1;
      dischargeSessionsSum += discharge.sessionsCompleted;
      if (
        discharge.initialPainLevel != null &&
        discharge.finalPainLevel != null
      ) {
        painDeltas.push(discharge.initialPainLevel - discharge.finalPainLevel);
      }
      if (!latestDischargeByClient.has(discharge.clientId)) {
        latestDischargeByClient.set(discharge.clientId, {
          reason: discharge.reason,
          dischargedAt: discharge.dischargedAt,
        });
      }
    }

    const avgSessionsToDischarge =
      discharges.length > 0
        ? Number((dischargeSessionsSum / discharges.length).toFixed(1))
        : null;

    if (painDeltas.length === 0) {
      for (const evo of evolutions) {
        if (evo.painBefore != null && evo.painAfter != null) {
          painDeltas.push(evo.painBefore - evo.painAfter);
        }
      }
    }

    const avgPainReduction =
      painDeltas.length > 0
        ? Number(
            (
              painDeltas.reduce((acc, value) => acc + value, 0) /
              painDeltas.length
            ).toFixed(1),
          )
        : null;

    const packageSummariesByClient = new Map<
      string,
      { title: string; completed: number; total: number; nearingEnd: boolean }
    >();
    let expiringPackagesCount = 0;

    const pkgsGrouped = new Map<string, typeof activePackages>();
    for (const pkg of activePackages) {
      const list = pkgsGrouped.get(pkg.clientId) ?? [];
      list.push(pkg);
      pkgsGrouped.set(pkg.clientId, list);
    }

    for (const [clientId, pkgList] of pkgsGrouped.entries()) {
      const evos = packageEvolutions.filter((e) => e.clientId === clientId);
      const summaries = buildPhysioPackageSummaries({
        packages: pkgList,
        evolutions: evos,
        appointments: [],
        latestAssessmentDate: null,
      });
      const primary = summaries[0];
      if (primary) {
        if (primary.nearingEnd) expiringPackagesCount += 1;
        packageSummariesByClient.set(clientId, {
          title: primary.title,
          completed: primary.completedSessions,
          total: primary.totalSessions,
          nearingEnd: primary.nearingEnd,
        });
      }
    }

    const items: PhysioManagementReportItem[] = clients
      .filter(
        (c) =>
          c.status === 'ACTIVE' ||
          evolutionsByClient.has(c.id) ||
          apptByClient.has(c.id) ||
          latestDischargeByClient.has(c.id),
      )
      .slice(0, 100)
      .map((client) => {
        const appt = apptByClient.get(client.id);
        const pkg = packageSummariesByClient.get(client.id);
        const discharge = latestDischargeByClient.get(client.id);
        return {
          clientId: client.id,
          name: client.name,
          status: client.status,
          completedSessions: evolutionsByClient.get(client.id) ?? 0,
          noShowCount: appt?.noShow ?? 0,
          cancelledCount: appt?.cancelled ?? 0,
          activePackageTitle: pkg?.title ?? null,
          packageCompletedSessions: pkg?.completed ?? null,
          packageTotalSessions: pkg?.total ?? null,
          latestDischargeReason: discharge?.reason ?? null,
          dischargedAt: discharge?.dischargedAt ?? null,
        };
      });

    return {
      period,
      fromDate,
      toDate,
      counts: {
        activePatients,
        archivedPatients,
        completedSessions: evolutions.length,
        completedAppointments,
        noShowCount,
        cancelledCount,
        attendanceRatePct,
        noShowRatePct,
        dischargesCount: discharges.length,
        avgSessionsToDischarge,
        avgPainReduction,
        activePackagesCount: activePackages.length,
        expiringPackagesCount,
      },
      dischargesByReason,
      items,
    };
  }

  private normalizeOptionalText(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private assertPhysiotherapist(user: AuthUser) {
    if (user.role !== 'PHYSIO') {
      throw new ForbiddenException('Acesso permitido somente a fisioterapeuta');
    }
  }
}
