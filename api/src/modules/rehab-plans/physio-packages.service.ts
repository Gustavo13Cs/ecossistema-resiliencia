import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, PhysioPackageStatus, Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreatePhysioPackageDto,
  UpdatePhysioPackageDto,
} from './dto/physio-package.dto';

export const PHYSIO_PACKAGE_SELECT = {
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
} satisfies Prisma.PhysioSessionPackageSelect;

export type PhysioPackageRow = Prisma.PhysioSessionPackageGetPayload<{
  select: typeof PHYSIO_PACKAGE_SELECT;
}>;

export interface PhysioSessionPackageSummary extends PhysioPackageRow {
  completedSessions: number;
  remainingSessions: number;
  progressLabel: string;
  noShowCount: number;
  cancelledCount: number;
  evolutionsSinceAssessment: number;
  reassessmentDue: boolean;
  nearingEnd: boolean;
}

export function buildPhysioPackageSummaries(input: {
  packages: readonly PhysioPackageRow[];
  evolutions: readonly {
    id: string;
    sessionDate: Date;
    packageId: string | null;
  }[];
  appointments: readonly {
    startsAt: Date;
    status: AppointmentStatus;
  }[];
  latestAssessmentDate: Date | null;
}): PhysioSessionPackageSummary[] {
  const latestActiveId =
    input.packages.find((pkg) => pkg.status === 'ACTIVE')?.id ?? null;

  return input.packages.map((pkg) => {
    const inPeriod = (date: Date) =>
      date >= pkg.startedAt && (pkg.expiresAt == null || date <= pkg.expiresAt);

    const countedEvolutions = input.evolutions.filter((evo) => {
      if (evo.packageId === pkg.id) return true;
      return (
        pkg.id === latestActiveId &&
        evo.packageId === null &&
        inPeriod(evo.sessionDate)
      );
    });

    const completedSessions = countedEvolutions.length;
    const remainingSessions = Math.max(
      0,
      pkg.totalSessions - completedSessions,
    );
    const displayCurrent = Math.min(completedSessions, pkg.totalSessions);
    const progressLabel = `Sessão ${displayCurrent} de ${pkg.totalSessions}`;

    let noShowCount = 0;
    let cancelledCount = 0;
    for (const appt of input.appointments) {
      if (!inPeriod(appt.startsAt)) continue;
      if (appt.status === 'NO_SHOW') noShowCount += 1;
      if (appt.status === 'CANCELLED') cancelledCount += 1;
    }

    const evolutionsSinceAssessment = countedEvolutions.filter((evo) =>
      input.latestAssessmentDate
        ? evo.sessionDate > input.latestAssessmentDate
        : true,
    ).length;

    const reassessmentDue =
      pkg.status === 'ACTIVE' &&
      pkg.reassessEverySessions != null &&
      evolutionsSinceAssessment >= pkg.reassessEverySessions;

    const nearingEnd = pkg.status === 'ACTIVE' && remainingSessions <= 2;

    return {
      ...pkg,
      completedSessions,
      remainingSessions,
      progressLabel,
      noShowCount,
      cancelledCount,
      evolutionsSinceAssessment,
      reassessmentDue,
      nearingEnd,
    };
  });
}

@Injectable()
export class PhysioPackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async listByClient(
    user: AuthUser,
    clientId: string,
  ): Promise<PhysioSessionPackageSummary[]> {
    this.assertPhysiotherapist(user);
    const client = await this.clientAccess.getOwnedClient(user, clientId);
    const [packages, evolutions, appointments, latestAssessment] =
      await Promise.all([
        this.prisma.physioSessionPackage.findMany({
          where: { clientId: client.id, professionalId: user.sub },
          select: PHYSIO_PACKAGE_SELECT,
          orderBy: [
            { status: 'asc' },
            { startedAt: 'desc' },
            { createdAt: 'desc' },
          ],
          take: 50,
        }),
        this.prisma.physioSessionEvolution.findMany({
          where: { clientId: client.id, professionalId: user.sub },
          select: { id: true, sessionDate: true, packageId: true },
          take: 500,
        }),
        this.prisma.appointment.findMany({
          where: {
            clientId: client.id,
            professionalId: user.sub,
            status: { in: ['NO_SHOW', 'CANCELLED'] },
          },
          select: { startsAt: true, status: true },
          take: 500,
        }),
        this.prisma.physioAssessment.findFirst({
          where: { clientId: client.id, creatorId: user.sub },
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          select: { date: true },
        }),
      ]);

    return buildPhysioPackageSummaries({
      packages,
      evolutions,
      appointments,
      latestAssessmentDate: latestAssessment?.date ?? null,
    });
  }

  async create(
    user: AuthUser,
    dto: CreatePhysioPackageDto,
  ): Promise<PhysioSessionPackageSummary> {
    this.assertPhysiotherapist(user);
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Informe o título do pacote de sessões.');
    }
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt < startedAt) {
      throw new BadRequestException(
        'A data de validade deve ser igual ou posterior à data de início.',
      );
    }

    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    const created = await this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);
      if (dto.closePreviousActive !== false) {
        await tx.physioSessionPackage.updateMany({
          where: {
            clientId: client.id,
            professionalId: user.sub,
            status: PhysioPackageStatus.ACTIVE,
          },
          data: { status: PhysioPackageStatus.COMPLETED },
        });
      }
      return tx.physioSessionPackage.create({
        data: {
          clientId: client.id,
          professionalId: user.sub,
          title,
          totalSessions: dto.totalSessions,
          reassessEverySessions: dto.reassessEverySessions ?? null,
          startedAt,
          expiresAt,
          status: PhysioPackageStatus.ACTIVE,
          notes: this.normalizeOptionalText(dto.notes),
        },
        select: PHYSIO_PACKAGE_SELECT,
      });
    });

    const all = await this.listByClient(user, client.id);
    return (
      all.find((pkg) => pkg.id === created.id) ??
      buildPhysioPackageSummaries({
        packages: [created],
        evolutions: [],
        appointments: [],
        latestAssessmentDate: null,
      })[0]
    );
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdatePhysioPackageDto,
  ): Promise<PhysioSessionPackageSummary> {
    this.assertPhysiotherapist(user);
    const existing = await this.prisma.physioSessionPackage.findFirst({
      where: { id, professionalId: user.sub },
      select: PHYSIO_PACKAGE_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Pacote de sessões não encontrado');
    }
    await this.clientAccess.getOwnedClient(user, existing.clientId);

    const nextExpiresAt =
      dto.expiresAt !== undefined
        ? dto.expiresAt
          ? new Date(dto.expiresAt)
          : null
        : existing.expiresAt;

    if (nextExpiresAt && nextExpiresAt < existing.startedAt) {
      throw new BadRequestException(
        'A data de validade deve ser igual ou posterior à data de início.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId, user.sub);
      return tx.physioSessionPackage.update({
        where: {
          id: existing.id,
          clientId: existing.clientId,
          professionalId: user.sub,
        },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.totalSessions !== undefined && {
            totalSessions: dto.totalSessions,
          }),
          ...(dto.reassessEverySessions !== undefined && {
            reassessEverySessions: dto.reassessEverySessions,
          }),
          ...(dto.expiresAt !== undefined && { expiresAt: nextExpiresAt }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.notes !== undefined && {
            notes: this.normalizeOptionalText(dto.notes),
          }),
        },
        select: PHYSIO_PACKAGE_SELECT,
      });
    });

    const all = await this.listByClient(user, existing.clientId);
    return (
      all.find((pkg) => pkg.id === updated.id) ??
      buildPhysioPackageSummaries({
        packages: [updated],
        evolutions: [],
        appointments: [],
        latestAssessmentDate: null,
      })[0]
    );
  }

  async remove(user: AuthUser, id: string) {
    this.assertPhysiotherapist(user);
    const existing = await this.prisma.physioSessionPackage.findFirst({
      where: { id, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Pacote de sessões não encontrado');
    }
    await this.clientAccess.getOwnedClient(user, existing.clientId);

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId, user.sub);
      return tx.physioSessionPackage.delete({
        where: {
          id: existing.id,
          clientId: existing.clientId,
          professionalId: user.sub,
        },
        select: { id: true, clientId: true },
      });
    });
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
