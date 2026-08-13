import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgendaTask, AgendaTaskStatus, Prisma } from '@prisma/client';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { generateOccurrenceDates } from './domain/occurrence-generator';
import { CreateAgendaTaskDto } from './dto/create-agenda-task.dto';
import { UpdateAgendaTaskDto } from './dto/update-agenda-task.dto';

const MATERIALIZATION_DAYS = 30;
const MAX_RANGE_MILLISECONDS = 31 * 24 * 60 * 60 * 1000;

type AgendaTaskSchedule = Pick<
  AgendaTask,
  'id' | 'patientId' | 'startsAt' | 'endsAt' | 'timeZone' | 'recurrenceRule'
>;

@Injectable()
export class AgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
  ) {}

  async createTask(
    user: AuthUser,
    dto: CreateAgendaTaskDto,
  ): Promise<AgendaTask> {
    await this.patientAccess.assertProfessionalLink(user, dto.patientId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    const recurrenceRule = dto.recurrenceRule ?? null;
    const now = new Date();
    const windowEnd = addUtcDays(now, MATERIALIZATION_DAYS);

    this.validateDefinition(
      { startsAt, endsAt, timeZone: dto.timeZone, recurrenceRule },
      now,
      windowEnd,
    );

    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.agendaTask.create({
        data: {
          patientId: dto.patientId,
          professionalId: user.sub,
          title: dto.title,
          category: dto.category,
          instructions: dto.instructions,
          priority: dto.priority,
          startsAt,
          endsAt,
          timeZone: dto.timeZone,
          recurrenceRule,
        },
      });

      await this.createOccurrences(transaction, task, now, windowEnd);
      return task;
    });
  }

  async updateTask(
    user: AuthUser,
    taskId: string,
    dto: UpdateAgendaTaskDto,
  ): Promise<AgendaTask> {
    const existingTask = await this.findMutableTask(user, taskId);

    if (existingTask.status === 'ENDED') {
      throw new ConflictException('Tarefa encerrada não pode ser editada');
    }

    const startsAt = dto.startsAt
      ? new Date(dto.startsAt)
      : existingTask.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existingTask.endsAt;
    const timeZone = dto.timeZone ?? existingTask.timeZone;
    const recurrenceRule = dto.recurrenceRule ?? existingTask.recurrenceRule;
    const now = new Date();
    const windowEnd = addUtcDays(now, MATERIALIZATION_DAYS);
    const scheduleChanged =
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined ||
      dto.timeZone !== undefined ||
      dto.recurrenceRule !== undefined;

    this.validateDefinition(
      { startsAt, endsAt, timeZone, recurrenceRule },
      now,
      windowEnd,
    );

    const data: Prisma.AgendaTaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startsAt !== undefined) data.startsAt = startsAt;
    if (dto.endsAt !== undefined) data.endsAt = endsAt;
    if (dto.timeZone !== undefined) data.timeZone = timeZone;
    if (dto.recurrenceRule !== undefined) {
      data.recurrenceRule = recurrenceRule;
    }

    return this.prisma.$transaction(async (transaction) => {
      if (scheduleChanged) {
        await transaction.agendaTaskOccurrence.deleteMany({
          where: {
            taskId,
            scheduledFor: { gte: now },
            status: 'PENDING',
          },
        });
      }

      const updatedTask = await transaction.agendaTask.update({
        where: { id: taskId },
        data,
      });

      if (scheduleChanged && updatedTask.status === 'ACTIVE') {
        await this.createOccurrences(transaction, updatedTask, now, windowEnd);
      }

      return updatedTask;
    });
  }

  async pauseTask(user: AuthUser, taskId: string): Promise<AgendaTask> {
    const task = await this.findMutableTask(user, taskId);

    if (task.status !== 'ACTIVE') {
      throw new ConflictException('Somente tarefa ativa pode ser pausada');
    }

    return this.changeTaskStatus(taskId, 'PAUSED');
  }

  async endTask(user: AuthUser, taskId: string): Promise<AgendaTask> {
    const task = await this.findMutableTask(user, taskId);

    if (task.status === 'ENDED') {
      throw new ConflictException('Tarefa já encerrada');
    }

    return this.changeTaskStatus(taskId, 'ENDED');
  }

  async listPatientRange(
    user: AuthUser,
    patientId: string,
    from: Date,
    to: Date,
  ) {
    assertUtcRange(from, to);

    if (user.role === 'PATIENT') {
      this.patientAccess.assertPatientSelf(user, patientId);
    } else {
      await this.patientAccess.assertProfessionalLink(user, patientId);
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, name: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const occurrences = await this.prisma.agendaTaskOccurrence.findMany({
      where: {
        patientId,
        scheduledFor: { gte: from, lte: to },
      },
      include: {
        task: {
          include: {
            professional: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });
    const actionable = occurrences.filter(
      (occurrence) => occurrence.status !== 'CANCELLED',
    ).length;
    const completed = occurrences.filter(
      (occurrence) => occurrence.status === 'COMPLETED',
    ).length;

    return {
      patient: { id: patient.id, name: patient.name },
      occurrences,
      summary: {
        actionable,
        completed,
        percentage:
          actionable === 0 ? 0 : Math.round((completed / actionable) * 100),
      },
    };
  }

  async completeOccurrence(
    user: AuthUser,
    occurrenceId: string,
    patientNote?: string,
  ) {
    this.patientAccess.assertPatientSelf(user, user.sub);
    const completedAt = new Date();
    const result = await this.prisma.agendaTaskOccurrence.updateMany({
      where: {
        id: occurrenceId,
        patientId: user.sub,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      data: {
        status: 'COMPLETED',
        completedAt,
        patientNote,
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Ocorrência não está disponível para conclusão',
      );
    }

    return this.findChangedOccurrence(occurrenceId);
  }

  async skipOccurrence(user: AuthUser, occurrenceId: string, reason: string) {
    this.patientAccess.assertPatientSelf(user, user.sub);

    if (reason.trim().length === 0) {
      throw new BadRequestException('Motivo é obrigatório');
    }

    const result = await this.prisma.agendaTaskOccurrence.updateMany({
      where: {
        id: occurrenceId,
        patientId: user.sub,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      data: {
        status: 'SKIPPED',
        skipReason: reason,
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Ocorrência não está disponível para omissão',
      );
    }

    return this.findChangedOccurrence(occurrenceId);
  }

  async materializeActiveTasks(windowStart: Date, windowEnd: Date) {
    assertUtcRange(windowStart, windowEnd);

    return this.prisma.$transaction(async (transaction) => {
      const tasks = await transaction.agendaTask.findMany({
        where: {
          status: 'ACTIVE',
          startsAt: { lte: windowEnd },
          OR: [{ endsAt: null }, { endsAt: { gte: windowStart } }],
        },
      });
      const data = tasks.flatMap((task) =>
        this.buildOccurrences(task, windowStart, windowEnd),
      );

      if (data.length === 0) {
        return { count: 0 };
      }

      return transaction.agendaTaskOccurrence.createMany({
        data,
        skipDuplicates: true,
      });
    });
  }

  private async findMutableTask(
    user: AuthUser,
    taskId: string,
  ): Promise<AgendaTask> {
    const task = await this.prisma.agendaTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    this.patientAccess.assertTaskAuthor(user, task.professionalId);
    await this.patientAccess.assertProfessionalLink(user, task.patientId);
    return task;
  }

  private changeTaskStatus(
    taskId: string,
    status: AgendaTaskStatus,
  ): Promise<AgendaTask> {
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const updatedTask = await transaction.agendaTask.update({
        where: { id: taskId },
        data: { status },
      });
      await transaction.agendaTaskOccurrence.updateMany({
        where: {
          taskId,
          scheduledFor: { gte: now },
          status: 'PENDING',
        },
        data: { status: 'CANCELLED' },
      });

      return updatedTask;
    });
  }

  private async findChangedOccurrence(occurrenceId: string) {
    const occurrence = await this.prisma.agendaTaskOccurrence.findUnique({
      where: { id: occurrenceId },
    });

    if (!occurrence) {
      throw new ConflictException('Ocorrência não pôde ser carregada');
    }

    return occurrence;
  }

  private validateDefinition(
    task: Omit<AgendaTaskSchedule, 'id' | 'patientId'>,
    windowStart: Date,
    windowEnd: Date,
  ): void {
    generateOccurrenceDates({ ...task, windowStart, windowEnd });
  }

  private buildOccurrences(
    task: AgendaTaskSchedule,
    windowStart: Date,
    windowEnd: Date,
  ): Prisma.AgendaTaskOccurrenceCreateManyInput[] {
    return generateOccurrenceDates({
      startsAt: task.startsAt,
      endsAt: task.endsAt,
      timeZone: task.timeZone,
      recurrenceRule: task.recurrenceRule,
      windowStart,
      windowEnd,
    }).map((scheduledFor) => ({
      taskId: task.id,
      patientId: task.patientId,
      scheduledFor,
    }));
  }

  private async createOccurrences(
    transaction: Prisma.TransactionClient,
    task: AgendaTaskSchedule,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<void> {
    const data = this.buildOccurrences(task, windowStart, windowEnd);

    if (data.length > 0) {
      await transaction.agendaTaskOccurrence.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }
}

function assertUtcRange(from: Date, to: Date): void {
  if (
    !(from instanceof Date) ||
    !(to instanceof Date) ||
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    to < from ||
    to.getTime() - from.getTime() > MAX_RANGE_MILLISECONDS
  ) {
    throw new BadRequestException(
      'Intervalo deve ser válido e ter no máximo 31 dias',
    );
  }
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
