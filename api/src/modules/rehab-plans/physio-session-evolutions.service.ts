import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { lockActiveOwnedClient } from '../../common/client-access/lock-active-owned-client';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import {
  CreatePhysioSessionEvolutionDto,
  UpdatePhysioSessionEvolutionDto,
} from './dto/physio-session-evolution.dto';

export const PHYSIO_EVOLUTION_SELECT = {
  id: true,
  clientId: true,
  appointmentId: true,
  rehabPlanId: true,
  sessionDate: true,
  painBefore: true,
  painAfter: true,
  proceduresApplied: true,
  patientResponse: true,
  nextSteps: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      kind: true,
      status: true,
      modality: true,
    },
  },
  rehabPlan: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.PhysioSessionEvolutionSelect;

@Injectable()
export class PhysioSessionEvolutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async listByClient(user: AuthUser, clientId: string) {
    this.assertPhysiotherapist(user);
    const client = await this.clientAccess.getOwnedClient(user, clientId);
    return this.prisma.physioSessionEvolution.findMany({
      where: {
        clientId: client.id,
        professionalId: user.sub,
      },
      select: PHYSIO_EVOLUTION_SELECT,
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  async findByAppointment(user: AuthUser, appointmentId: string) {
    this.assertPhysiotherapist(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado');
    }
    await this.clientAccess.getOwnedClient(user, appointment.clientId);
    return this.prisma.physioSessionEvolution.findFirst({
      where: {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        professionalId: user.sub,
      },
      select: PHYSIO_EVOLUTION_SELECT,
    });
  }

  async create(user: AuthUser, dto: CreatePhysioSessionEvolutionDto) {
    this.assertPhysiotherapist(user);
    const patientResponse = dto.patientResponse.trim();
    if (!patientResponse) {
      throw new BadRequestException('Descreva a evolução clínica do paciente.');
    }

    const client = await this.clientAccess.getOwnedClient(user, dto.clientId);
    const proceduresApplied = this.normalizeProcedures(dto.proceduresApplied);
    const nextSteps = this.normalizeOptionalText(dto.nextSteps);

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, client.id, user.sub);

      let appointmentStartsAt: Date | null = null;
      if (dto.appointmentId) {
        const appointment = await tx.appointment.findFirst({
          where: {
            id: dto.appointmentId,
            professionalId: user.sub,
            clientId: client.id,
          },
          select: { id: true, startsAt: true, status: true },
        });
        if (!appointment) {
          throw new NotFoundException(
            'Atendimento não encontrado para este paciente',
          );
        }
        if (
          appointment.status === 'CANCELLED' ||
          appointment.status === 'NO_SHOW'
        ) {
          throw new BadRequestException(
            'Atendimentos cancelados ou com falta não podem receber evolução de sessão',
          );
        }
        const existingForAppointment =
          await tx.physioSessionEvolution.findFirst({
            where: { appointmentId: appointment.id },
            select: { id: true },
          });
        if (existingForAppointment) {
          throw new ConflictException(
            'Este atendimento já possui evolução registrada',
          );
        }
        appointmentStartsAt = appointment.startsAt;
      }

      if (dto.rehabPlanId) {
        const plan = await tx.rehabPlan.findFirst({
          where: {
            id: dto.rehabPlanId,
            creatorId: user.sub,
            clientId: client.id,
          },
          select: { id: true },
        });
        if (!plan) {
          throw new NotFoundException(
            'Protocolo de reabilitação não encontrado para este paciente',
          );
        }
      }

      const sessionDate = dto.sessionDate
        ? new Date(dto.sessionDate)
        : (appointmentStartsAt ?? new Date());

      return tx.physioSessionEvolution.create({
        data: {
          clientId: client.id,
          professionalId: user.sub,
          appointmentId: dto.appointmentId ?? null,
          rehabPlanId: dto.rehabPlanId ?? null,
          sessionDate,
          painBefore: dto.painBefore ?? null,
          painAfter: dto.painAfter ?? null,
          proceduresApplied,
          patientResponse,
          nextSteps,
        },
        select: PHYSIO_EVOLUTION_SELECT,
      });
    });
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdatePhysioSessionEvolutionDto,
  ) {
    this.assertPhysiotherapist(user);
    const existing = await this.prisma.physioSessionEvolution.findFirst({
      where: { id, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Evolução de sessão não encontrada');
    }
    await this.clientAccess.getOwnedClient(user, existing.clientId);

    let trimmedResponse: string | undefined;
    if (dto.patientResponse !== undefined) {
      trimmedResponse = dto.patientResponse.trim();
      if (!trimmedResponse) {
        throw new BadRequestException(
          'Descreva a evolução clínica do paciente.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId, user.sub);

      if (dto.rehabPlanId !== undefined && dto.rehabPlanId !== null) {
        const plan = await tx.rehabPlan.findFirst({
          where: {
            id: dto.rehabPlanId,
            creatorId: user.sub,
            clientId: existing.clientId,
          },
          select: { id: true },
        });
        if (!plan) {
          throw new NotFoundException(
            'Protocolo de reabilitação não encontrado para este paciente',
          );
        }
      }

      return tx.physioSessionEvolution.update({
        where: {
          id: existing.id,
          clientId: existing.clientId,
          professionalId: user.sub,
        },
        data: {
          ...(dto.rehabPlanId !== undefined && {
            rehabPlanId: dto.rehabPlanId,
          }),
          ...(dto.sessionDate !== undefined &&
            dto.sessionDate !== null && {
              sessionDate: new Date(dto.sessionDate),
            }),
          ...(dto.painBefore !== undefined && { painBefore: dto.painBefore }),
          ...(dto.painAfter !== undefined && { painAfter: dto.painAfter }),
          ...(dto.proceduresApplied !== undefined && {
            proceduresApplied: this.normalizeProcedures(dto.proceduresApplied),
          }),
          ...(trimmedResponse !== undefined && {
            patientResponse: trimmedResponse,
          }),
          ...(dto.nextSteps !== undefined && {
            nextSteps: this.normalizeOptionalText(dto.nextSteps),
          }),
        },
        select: PHYSIO_EVOLUTION_SELECT,
      });
    });
  }

  async remove(user: AuthUser, id: string) {
    this.assertPhysiotherapist(user);
    const existing = await this.prisma.physioSessionEvolution.findFirst({
      where: { id, professionalId: user.sub },
      select: { id: true, clientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Evolução de sessão não encontrada');
    }
    await this.clientAccess.getOwnedClient(user, existing.clientId);

    return this.prisma.$transaction(async (tx) => {
      await lockActiveOwnedClient(tx, existing.clientId, user.sub);
      return tx.physioSessionEvolution.delete({
        where: {
          id: existing.id,
          clientId: existing.clientId,
          professionalId: user.sub,
        },
        select: {
          id: true,
          clientId: true,
        },
      });
    });
  }

  private normalizeProcedures(procedures?: string[] | null): string[] {
    if (!procedures) return [];
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const item of procedures) {
      const cleaned = item.trim();
      if (!cleaned || seen.has(cleaned)) continue;
      seen.add(cleaned);
      normalized.push(cleaned);
    }
    return normalized;
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
