import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentEventType,
  AppointmentKind,
  AppointmentModality,
  AppointmentStatus,
  ClientStatus,
  Prisma,
} from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import {
  AuthUser,
  CLINICAL_PROFESSIONAL_ROLES,
} from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';

const MAX_RANGE_MS = 42 * 24 * 60 * 60 * 1_000;
const MIN_DURATION_MS = 15 * 60 * 1_000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1_000;
const BLOCKING_STATUSES = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

const clientSummary = {
  select: { id: true, name: true, status: true },
} satisfies Prisma.ClientDefaultArgs;

const appointmentDetailsInclude = {
  client: clientSummary,
  events: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.AppointmentInclude;

const appointmentListInclude = {
  client: clientSummary,
} satisfies Prisma.AppointmentInclude;

export type AppointmentDetails = Prisma.AppointmentGetPayload<{
  include: typeof appointmentDetailsInclude;
}>;

export type AppointmentListItem = Prisma.AppointmentGetPayload<{
  include: typeof appointmentListInclude;
}>;

export type CreateAppointmentInput = {
  clientId: string;
  kind: AppointmentKind;
  modality: AppointmentModality;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  location?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
};

export type AppointmentRangeQuery = {
  from: string;
  to: string;
  clientId?: string;
  status?: AppointmentStatus;
};

export type UpdateAppointmentInput = Partial<
  Omit<CreateAppointmentInput, 'clientId'>
> & {
  clientId?: string;
  expectedUpdatedAt: string;
};

export type AppointmentActionInput = {
  expectedUpdatedAt: string;
};

export type CancelAppointmentInput = AppointmentActionInput & {
  reason: string;
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAccess: ClientAccessService,
  ) {}

  async create(
    user: AuthUser,
    input: CreateAppointmentInput,
  ): Promise<AppointmentDetails> {
    const client = await this.clientAccess.getOwnedClient(user, input.clientId);
    if (client.status === ClientStatus.ARCHIVED) {
      throw new ConflictException(
        'Não é possível agendar para um prontuário arquivado',
      );
    }

    const { startsAt, endsAt } = this.parseAppointmentInterval(
      input.startsAt,
      input.endsAt,
      true,
    );
    this.assertValidTimeZone(input.timeZone);

    const location =
      input.modality === AppointmentModality.IN_PERSON
        ? this.normalizeOptionalString(input.location)
        : null;
    const meetingUrl =
      input.modality === AppointmentModality.ONLINE
        ? this.normalizeOptionalString(input.meetingUrl)
        : null;

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await this.assertNoOverlap(transaction, user.sub, startsAt, endsAt);

          return transaction.appointment.create({
            data: {
              professionalId: user.sub,
              clientId: input.clientId,
              kind: input.kind,
              modality: input.modality,
              startsAt,
              endsAt,
              timeZone: input.timeZone,
              location,
              meetingUrl,
              notes: this.normalizeOptionalString(input.notes),
              events: {
                create: {
                  professionalId: user.sub,
                  type: AppointmentEventType.CREATED,
                  nextStatus: AppointmentStatus.SCHEDULED,
                  nextStartsAt: startsAt,
                  nextEndsAt: endsAt,
                },
              },
            },
            include: appointmentDetailsInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'O horário foi reservado em outra sessão. Atualize a agenda e escolha outro intervalo.',
        );
      }
      throw error;
    }
  }

  async list(
    user: AuthUser,
    query: AppointmentRangeQuery,
  ): Promise<AppointmentListItem[]> {
    this.assertClinicalProfessional(user);
    const from = this.parseDate(query.from, 'Data inicial inválida');
    const to = this.parseDate(query.to, 'Data final inválida');
    if (to <= from || to.getTime() - from.getTime() > MAX_RANGE_MS) {
      throw new BadRequestException(
        'O intervalo da agenda deve ter no máximo 42 dias',
      );
    }

    if (query.clientId) {
      await this.clientAccess.getOwnedClient(user, query.clientId);
    }

    return this.prisma.appointment.findMany({
      where: {
        professionalId: user.sub,
        startsAt: { lt: to },
        endsAt: { gt: from },
        clientId: query.clientId,
        status: query.status,
      },
      include: appointmentListInclude,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(
    user: AuthUser,
    appointmentId: string,
  ): Promise<AppointmentDetails> {
    this.assertClinicalProfessional(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, professionalId: user.sub },
      include: appointmentDetailsInclude,
    });

    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return appointment;
  }

  async update(
    user: AuthUser,
    appointmentId: string,
    input: UpdateAppointmentInput,
  ): Promise<AppointmentDetails> {
    this.assertClinicalProfessional(user);
    const expectedUpdatedAt = this.parseDate(
      input.expectedUpdatedAt,
      'Versão do atendimento inválida',
    );

    return this.runSerializable(async (transaction) => {
      const current = await this.findOwnedForMutation(
        transaction,
        user.sub,
        appointmentId,
      );
      this.assertMutableStatus(current.status);

      const scheduleChanged =
        Object.prototype.hasOwnProperty.call(input, 'startsAt') ||
        Object.prototype.hasOwnProperty.call(input, 'endsAt');
      const startsAt = scheduleChanged
        ? this.parseAppointmentInterval(
            input.startsAt ?? current.startsAt.toISOString(),
            input.endsAt ?? current.endsAt.toISOString(),
            true,
          ).startsAt
        : current.startsAt;
      const endsAt = scheduleChanged
        ? this.parseAppointmentInterval(
            input.startsAt ?? current.startsAt.toISOString(),
            input.endsAt ?? current.endsAt.toISOString(),
            true,
          ).endsAt
        : current.endsAt;
      const clientId = input.clientId ?? current.clientId;

      if (scheduleChanged || input.clientId) {
        await this.assertActiveOwnedClient(transaction, user.sub, clientId);
      }
      if (scheduleChanged) {
        await this.assertNoOverlap(
          transaction,
          user.sub,
          startsAt,
          endsAt,
          appointmentId,
        );
      }

      const timeZone = input.timeZone ?? current.timeZone;
      this.assertValidTimeZone(timeZone);
      const modality = input.modality ?? current.modality;
      const nextStatus =
        scheduleChanged && current.status === AppointmentStatus.CONFIRMED
          ? AppointmentStatus.SCHEDULED
          : current.status;
      const updatedAt = this.nextUpdatedAt(expectedUpdatedAt);
      const data: Prisma.AppointmentUncheckedUpdateManyInput = {
        clientId: input.clientId,
        kind: input.kind,
        modality: input.modality,
        startsAt: scheduleChanged ? startsAt : undefined,
        endsAt: scheduleChanged ? endsAt : undefined,
        timeZone: input.timeZone,
        notes: Object.prototype.hasOwnProperty.call(input, 'notes')
          ? this.normalizeOptionalString(input.notes)
          : undefined,
        status: nextStatus === current.status ? undefined : nextStatus,
        updatedAt,
      };

      if (
        Object.prototype.hasOwnProperty.call(input, 'modality') ||
        Object.prototype.hasOwnProperty.call(input, 'location') ||
        Object.prototype.hasOwnProperty.call(input, 'meetingUrl')
      ) {
        data.location =
          modality === AppointmentModality.IN_PERSON
            ? this.normalizeOptionalString(
                input.location ?? current.location ?? undefined,
              )
            : null;
        data.meetingUrl =
          modality === AppointmentModality.ONLINE
            ? this.normalizeOptionalString(
                input.meetingUrl ?? current.meetingUrl ?? undefined,
              )
            : null;
      }

      const result = await transaction.appointment.updateMany({
        where: {
          id: appointmentId,
          professionalId: user.sub,
          status: current.status,
          updatedAt: expectedUpdatedAt,
        },
        data,
      });
      if (result.count === 0) {
        await this.throwMutationConflict(transaction, user.sub, appointmentId);
      }

      await transaction.appointmentEvent.create({
        data: scheduleChanged
          ? {
              appointmentId,
              professionalId: user.sub,
              type: AppointmentEventType.RESCHEDULED,
              previousStatus: current.status,
              nextStatus,
              previousStartsAt: current.startsAt,
              previousEndsAt: current.endsAt,
              nextStartsAt: startsAt,
              nextEndsAt: endsAt,
            }
          : {
              appointmentId,
              professionalId: user.sub,
              type: AppointmentEventType.UPDATED,
              previousStatus: current.status,
              nextStatus,
            },
      });

      return this.findOwnedDetails(transaction, user.sub, appointmentId);
    });
  }

  confirm(
    user: AuthUser,
    appointmentId: string,
    input: AppointmentActionInput,
  ): Promise<AppointmentDetails> {
    return this.transition(
      user,
      appointmentId,
      AppointmentStatus.CONFIRMED,
      input,
    );
  }

  complete(
    user: AuthUser,
    appointmentId: string,
    input: AppointmentActionInput,
  ): Promise<AppointmentDetails> {
    return this.transition(
      user,
      appointmentId,
      AppointmentStatus.COMPLETED,
      input,
    );
  }

  markNoShow(
    user: AuthUser,
    appointmentId: string,
    input: AppointmentActionInput,
  ): Promise<AppointmentDetails> {
    return this.transition(
      user,
      appointmentId,
      AppointmentStatus.NO_SHOW,
      input,
    );
  }

  async cancel(
    user: AuthUser,
    appointmentId: string,
    input: CancelAppointmentInput,
  ): Promise<AppointmentDetails> {
    const reason = input.reason.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new BadRequestException(
        'O motivo do cancelamento deve ter entre 3 e 500 caracteres',
      );
    }
    return this.transition(
      user,
      appointmentId,
      AppointmentStatus.CANCELLED,
      input,
      reason,
    );
  }

  private async transition(
    user: AuthUser,
    appointmentId: string,
    nextStatus: AppointmentStatus,
    input: AppointmentActionInput,
    cancellationReason?: string,
  ): Promise<AppointmentDetails> {
    this.assertClinicalProfessional(user);
    const expectedUpdatedAt = this.parseDate(
      input.expectedUpdatedAt,
      'Versão do atendimento inválida',
    );

    return this.runSerializable(async (transaction) => {
      const current = await this.findOwnedForMutation(
        transaction,
        user.sub,
        appointmentId,
      );
      this.assertTransition(current.status, nextStatus);
      if (
        (
          [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
          ] as AppointmentStatus[]
        ).includes(nextStatus) &&
        current.startsAt > new Date()
      ) {
        throw new ConflictException(
          'Esta ação só pode ser registrada após o início do atendimento',
        );
      }

      const result = await transaction.appointment.updateMany({
        where: {
          id: appointmentId,
          professionalId: user.sub,
          status: current.status,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          status: nextStatus,
          cancellationReason:
            nextStatus === AppointmentStatus.CANCELLED
              ? cancellationReason
              : null,
          cancelledAt:
            nextStatus === AppointmentStatus.CANCELLED ? new Date() : null,
          updatedAt: this.nextUpdatedAt(expectedUpdatedAt),
        },
      });
      if (result.count === 0) {
        await this.throwMutationConflict(transaction, user.sub, appointmentId);
      }

      await transaction.appointmentEvent.create({
        data: {
          appointmentId,
          professionalId: user.sub,
          type: this.eventTypeForStatus(nextStatus),
          previousStatus: current.status,
          nextStatus,
        },
      });

      return this.findOwnedDetails(transaction, user.sub, appointmentId);
    });
  }

  private async assertNoOverlap(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
    excludedAppointmentId?: string,
  ): Promise<void> {
    const overlapping = await transaction.appointment.findFirst({
      where: {
        professionalId,
        id: excludedAppointmentId ? { not: excludedAppointmentId } : undefined,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new ConflictException(
        'Já existe um atendimento nesse intervalo de horário',
      );
    }
  }

  private async assertActiveOwnedClient(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    clientId: string,
  ): Promise<void> {
    const client = await transaction.client.findFirst({
      where: { id: clientId, professionalId },
      select: { id: true, status: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    if (client.status === ClientStatus.ARCHIVED) {
      throw new ConflictException(
        'Não é possível reagendar para um prontuário arquivado',
      );
    }
  }

  private async findOwnedForMutation(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    appointmentId: string,
  ) {
    const appointment = await transaction.appointment.findFirst({
      where: { id: appointmentId, professionalId },
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado');
    }
    return appointment;
  }

  private async findOwnedDetails(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    appointmentId: string,
  ): Promise<AppointmentDetails> {
    const appointment = await transaction.appointment.findFirst({
      where: { id: appointmentId, professionalId },
      include: appointmentDetailsInclude,
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado');
    }
    return appointment;
  }

  private async throwMutationConflict(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    appointmentId: string,
  ): Promise<never> {
    const stillExists = await transaction.appointment.findFirst({
      where: { id: appointmentId, professionalId },
      select: { id: true },
    });
    if (!stillExists) {
      throw new NotFoundException('Atendimento não encontrado');
    }
    throw new ConflictException(
      'O atendimento foi alterado em outra sessão. Recarregue antes de salvar.',
    );
  }

  private assertMutableStatus(status: AppointmentStatus): void {
    if (
      (
        [
          AppointmentStatus.COMPLETED,
          AppointmentStatus.CANCELLED,
          AppointmentStatus.NO_SHOW,
        ] as AppointmentStatus[]
      ).includes(status)
    ) {
      throw new ConflictException('Este atendimento já está encerrado');
    }
  }

  private assertTransition(
    currentStatus: AppointmentStatus,
    nextStatus: AppointmentStatus,
  ): void {
    const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.NO_SHOW]: [],
    };
    if (!allowed[currentStatus].includes(nextStatus)) {
      throw new ConflictException(
        'A mudança de estado não é permitida para este atendimento',
      );
    }
  }

  private eventTypeForStatus(status: AppointmentStatus): AppointmentEventType {
    const eventTypes: Partial<Record<AppointmentStatus, AppointmentEventType>> =
      {
        [AppointmentStatus.CONFIRMED]: AppointmentEventType.CONFIRMED,
        [AppointmentStatus.COMPLETED]: AppointmentEventType.COMPLETED,
        [AppointmentStatus.CANCELLED]: AppointmentEventType.CANCELLED,
        [AppointmentStatus.NO_SHOW]: AppointmentEventType.NO_SHOW,
      };
    const eventType = eventTypes[status];
    if (!eventType) {
      throw new ConflictException('Estado de atendimento inválido');
    }
    return eventType;
  }

  private nextUpdatedAt(expectedUpdatedAt: Date): Date {
    return new Date(Math.max(Date.now(), expectedUpdatedAt.getTime() + 1));
  }

  private async runSerializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Os dados mudaram em outra sessão. Atualize a agenda e tente novamente.',
        );
      }
      throw error;
    }
  }

  private parseAppointmentInterval(
    startsAtValue: string,
    endsAtValue: string,
    requireFuture: boolean,
  ): { startsAt: Date; endsAt: Date } {
    const startsAt = this.parseDate(startsAtValue, 'Horário inicial inválido');
    const endsAt = this.parseDate(endsAtValue, 'Horário final inválido');
    const duration = endsAt.getTime() - startsAt.getTime();

    if (requireFuture && startsAt <= new Date()) {
      throw new BadRequestException(
        'Novos atendimentos devem começar no futuro',
      );
    }
    if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
      throw new BadRequestException(
        'O atendimento deve durar entre 15 minutos e 8 horas',
      );
    }

    return { startsAt, endsAt };
  }

  private parseDate(value: string, message: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(message);
    }
    return date;
  }

  private assertValidTimeZone(timeZone: string): void {
    try {
      new Intl.DateTimeFormat('pt-BR', { timeZone }).format();
    } catch {
      throw new BadRequestException('Fuso horário inválido');
    }
  }

  private assertClinicalProfessional(user: AuthUser): void {
    if (!CLINICAL_PROFESSIONAL_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Acesso permitido somente a profissional clínico',
      );
    }
  }

  private normalizeOptionalString(value?: string | null): string | null {
    return value?.trim() || null;
  }
}
