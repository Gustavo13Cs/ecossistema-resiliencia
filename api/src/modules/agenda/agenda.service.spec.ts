import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { AgendaScheduler } from './agenda.scheduler';
import { AgendaService } from './agenda.service';
import { AgendaRangeQueryDto } from './dto/agenda-range-query.dto';
import { CreateAgendaTaskDto } from './dto/create-agenda-task.dto';
import { SkipOccurrenceDto } from './dto/skip-occurrence.dto';
import { UpdateAgendaTaskDto } from './dto/update-agenda-task.dto';

describe('AgendaService', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');
  const task = {
    id: 'task-1',
    patientId: 'patient-1',
    professionalId: 'professional-1',
    title: 'Alongamento',
    category: 'REHABILITATION',
    instructions: null,
    priority: 'NORMAL',
    startsAt: new Date('2026-08-13T13:00:00.000Z'),
    endsAt: null,
    timeZone: 'UTC',
    recurrenceRule: null,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  const prisma = {
    $transaction: jest.fn(),
    professionalPatientLink: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    agendaTask: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    agendaTaskOccurrence: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: AgendaService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    prisma.professionalPatientLink.findFirst.mockResolvedValue({
      id: 'link-1',
    });
    prisma.agendaTaskOccurrence.createMany.mockResolvedValue({ count: 1 });
    prisma.agendaTaskOccurrence.deleteMany.mockResolvedValue({ count: 0 });
    prisma.agendaTaskOccurrence.updateMany.mockResolvedValue({ count: 1 });
    const patientAccess = new PatientAccessService(prisma as never);
    service = new AgendaService(prisma as never, patientAccess);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates the task and its first occurrence in one transaction', async () => {
    prisma.agendaTask.create.mockResolvedValue(task);
    const dto = {
      patientId: 'patient-1',
      title: 'Alongamento',
      category: 'REHABILITATION',
      priority: 'NORMAL',
      startsAt: '2026-08-13T13:00:00.000Z',
      timeZone: 'UTC',
    } as CreateAgendaTaskDto;

    await expect(
      service.createTask({ sub: 'professional-1', role: 'PHYSIO' }, dto),
    ).resolves.toEqual(task);

    expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: 'professional-1',
        patientId: 'patient-1',
        isActive: true,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.agendaTask.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        professionalId: 'professional-1',
        title: 'Alongamento',
        category: 'REHABILITATION',
        instructions: undefined,
        priority: 'NORMAL',
        startsAt: new Date('2026-08-13T13:00:00.000Z'),
        endsAt: null,
        timeZone: 'UTC',
        recurrenceRule: null,
      },
    });
    expect(prisma.agendaTaskOccurrence.createMany).toHaveBeenCalledWith({
      data: [
        {
          taskId: 'task-1',
          patientId: 'patient-1',
          scheduledFor: new Date('2026-08-13T13:00:00.000Z'),
        },
      ],
      skipDuplicates: true,
    });
  });

  it('rejects ADMIN task creation before opening a transaction', async () => {
    await expect(
      service.createTask({ sub: 'admin-1', role: 'ADMIN' }, {
        patientId: 'patient-1',
        title: 'Alongamento',
        category: 'REHABILITATION',
        priority: 'NORMAL',
        startsAt: '2026-08-13T13:00:00.000Z',
        timeZone: 'UTC',
      } as CreateAgendaTaskDto),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.agendaTask.create).not.toHaveBeenCalled();
  });

  it('materializes active tasks idempotently with skipDuplicates', async () => {
    prisma.agendaTask.findMany.mockResolvedValue([
      {
        ...task,
        recurrenceRule: 'FREQ=DAILY',
      },
    ]);
    const windowStart = new Date('2026-08-13T00:00:00.000Z');
    const windowEnd = new Date('2026-08-14T23:59:59.999Z');

    await service.materializeActiveTasks(windowStart, windowEnd);
    await service.materializeActiveTasks(windowStart, windowEnd);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.agendaTask.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: windowEnd },
        OR: [{ endsAt: null }, { endsAt: { gte: windowStart } }],
      },
    });
    expect(prisma.agendaTaskOccurrence.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.agendaTaskOccurrence.createMany).toHaveBeenNthCalledWith(1, {
      data: [
        {
          taskId: 'task-1',
          patientId: 'patient-1',
          scheduledFor: new Date('2026-08-13T13:00:00.000Z'),
        },
        {
          taskId: 'task-1',
          patientId: 'patient-1',
          scheduledFor: new Date('2026-08-14T13:00:00.000Z'),
        },
      ],
      skipDuplicates: true,
    });
  });

  it('edits only an authored task and rematerializes pending future occurrences transactionally', async () => {
    const updatedTask = {
      ...task,
      startsAt: new Date('2026-08-14T15:00:00.000Z'),
    };
    prisma.agendaTask.findUnique.mockResolvedValue(task);
    prisma.agendaTask.update.mockResolvedValue(updatedTask);

    await expect(
      service.updateTask({ sub: 'professional-1', role: 'PHYSIO' }, 'task-1', {
        startsAt: '2026-08-14T15:00:00.000Z',
      }),
    ).resolves.toEqual(updatedTask);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.agendaTaskOccurrence.deleteMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
        scheduledFor: { gte: now },
        status: 'PENDING',
      },
    });
    expect(prisma.agendaTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { startsAt: new Date('2026-08-14T15:00:00.000Z') },
    });
    expect(prisma.agendaTaskOccurrence.createMany).toHaveBeenCalledWith({
      data: [
        {
          taskId: 'task-1',
          patientId: 'patient-1',
          scheduledFor: new Date('2026-08-14T15:00:00.000Z'),
        },
      ],
      skipDuplicates: true,
    });
  });

  it('clears nullable fields and rematerializes a recurring task as a single occurrence', async () => {
    const recurringTask = {
      ...task,
      instructions: 'Repetir diariamente',
      endsAt: new Date('2026-08-20T23:59:00.000Z'),
      recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
    };
    const updatedTask = {
      ...recurringTask,
      instructions: null,
      endsAt: null,
      recurrenceRule: null,
    };
    prisma.agendaTask.findUnique.mockResolvedValue(recurringTask);
    prisma.agendaTask.update.mockResolvedValue(updatedTask);

    await expect(
      service.updateTask(
        { sub: 'professional-1', role: 'PHYSIO' },
        'task-1',
        {
          instructions: null,
          endsAt: null,
          recurrenceRule: null,
        } as unknown as UpdateAgendaTaskDto,
      ),
    ).resolves.toEqual(updatedTask);

    expect(prisma.agendaTaskOccurrence.deleteMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
        scheduledFor: { gte: now },
        status: 'PENDING',
      },
    });
    expect(prisma.agendaTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        instructions: null,
        endsAt: null,
        recurrenceRule: null,
      },
    });
    expect(prisma.agendaTaskOccurrence.createMany).toHaveBeenCalledWith({
      data: [
        {
          taskId: 'task-1',
          patientId: 'patient-1',
          scheduledFor: new Date('2026-08-13T13:00:00.000Z'),
        },
      ],
      skipDuplicates: true,
    });
  });

  it('pauses an authored task and cancels only future pending occurrences', async () => {
    prisma.agendaTask.findUnique.mockResolvedValue(task);
    prisma.agendaTask.update.mockResolvedValue({ ...task, status: 'PAUSED' });

    await service.pauseTask(
      { sub: 'professional-1', role: 'PHYSIO' },
      'task-1',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.agendaTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'PAUSED' },
    });
    expect(prisma.agendaTaskOccurrence.updateMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
        scheduledFor: { gte: now },
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    });
  });

  it('ends an authored paused task without changing executed occurrences', async () => {
    const pausedTask = { ...task, status: 'PAUSED' };
    prisma.agendaTask.findUnique.mockResolvedValue(pausedTask);
    prisma.agendaTask.update.mockResolvedValue({ ...task, status: 'ENDED' });

    await service.endTask({ sub: 'professional-1', role: 'PHYSIO' }, 'task-1');

    expect(prisma.agendaTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'ENDED' },
    });
    expect(prisma.agendaTaskOccurrence.updateMany).toHaveBeenCalledWith({
      where: {
        taskId: 'task-1',
        scheduledFor: { gte: now },
        status: 'PENDING',
      },
      data: { status: 'CANCELLED' },
    });
  });

  it('rejects pausing an ended task as a final state', async () => {
    prisma.agendaTask.findUnique.mockResolvedValue({
      ...task,
      status: 'ENDED',
    });

    await expect(
      service.pauseTask({ sub: 'professional-1', role: 'PHYSIO' }, 'task-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists a UTC range with patient identity, author and exact adherence summary', async () => {
    const from = new Date('2026-08-13T00:00:00.000Z');
    const to = new Date('2026-08-14T00:00:00.000Z');
    const occurrences = [
      {
        id: 'occurrence-1',
        status: 'COMPLETED',
        scheduledFor: new Date('2026-08-13T13:00:00.000Z'),
        task: {
          ...task,
          professional: {
            id: 'professional-1',
            name: 'Dra. Ana',
            role: 'PHYSIO',
          },
        },
      },
      {
        id: 'occurrence-2',
        status: 'SKIPPED',
        scheduledFor: new Date('2026-08-13T18:00:00.000Z'),
        task: {
          ...task,
          professional: {
            id: 'professional-1',
            name: 'Dra. Ana',
            role: 'PHYSIO',
          },
        },
      },
      {
        id: 'occurrence-3',
        status: 'CANCELLED',
        scheduledFor: new Date('2026-08-13T19:00:00.000Z'),
        task: {
          ...task,
          professional: {
            id: 'professional-1',
            name: 'Dra. Ana',
            role: 'PHYSIO',
          },
        },
      },
    ];
    prisma.user.findUnique.mockResolvedValue({
      id: 'patient-1',
      name: 'Paciente Teste',
    });
    prisma.agendaTaskOccurrence.findMany.mockResolvedValue(occurrences);

    await expect(
      service.listPatientRange(
        { sub: 'professional-1', role: 'PHYSIO' },
        'patient-1',
        from,
        to,
      ),
    ).resolves.toEqual({
      patient: { id: 'patient-1', name: 'Paciente Teste' },
      occurrences,
      summary: {
        actionable: 2,
        completed: 1,
        percentage: 50,
      },
    });
    expect(prisma.agendaTaskOccurrence.findMany).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
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
  });

  it('allows a patient to list only their own agenda without a professional link', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'patient-1',
      name: 'Paciente Teste',
    });
    prisma.agendaTaskOccurrence.findMany.mockResolvedValue([]);

    await expect(
      service.listPatientRange(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
        new Date('2026-08-13T00:00:00.000Z'),
        new Date('2026-08-13T23:59:59.999Z'),
      ),
    ).resolves.toEqual({
      patient: { id: 'patient-1', name: 'Paciente Teste' },
      occurrences: [],
      summary: { actionable: 0, completed: 0, percentage: 0 },
    });
    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
  });

  it('rejects inactive professional access to the patient agenda', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

    await expect(
      service.listPatientRange(
        { sub: 'professional-1', role: 'PHYSIO' },
        'patient-1',
        new Date('2026-08-13T00:00:00.000Z'),
        new Date('2026-08-13T23:59:59.999Z'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.agendaTaskOccurrence.findMany).not.toHaveBeenCalled();
  });

  it('rejects UTC ranges greater than 31 days', async () => {
    await expect(
      service.listPatientRange(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-09-01T00:00:00.001Z'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("completes only the patient's actionable occurrence", async () => {
    const completedOccurrence = {
      id: 'occurrence-1',
      patientId: 'patient-1',
      status: 'COMPLETED',
      completedAt: now,
    };
    prisma.agendaTaskOccurrence.updateMany.mockResolvedValue({ count: 1 });
    prisma.agendaTaskOccurrence.findUnique.mockResolvedValue(
      completedOccurrence,
    );

    await expect(
      service.completeOccurrence(
        { sub: 'patient-1', role: 'PATIENT' },
        'occurrence-1',
        'Executado sem dor',
      ),
    ).resolves.toEqual(completedOccurrence);

    expect(prisma.agendaTaskOccurrence.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'occurrence-1',
        patientId: 'patient-1',
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        patientNote: 'Executado sem dor',
      },
    });
  });

  it('skips only an owned actionable occurrence with the required reason', async () => {
    const skippedOccurrence = {
      id: 'occurrence-1',
      patientId: 'patient-1',
      status: 'SKIPPED',
      skipReason: 'Dor acima do habitual',
    };
    prisma.agendaTaskOccurrence.findUnique.mockResolvedValue(skippedOccurrence);

    await expect(
      service.skipOccurrence(
        { sub: 'patient-1', role: 'PATIENT' },
        'occurrence-1',
        'Dor acima do habitual',
      ),
    ).resolves.toEqual(skippedOccurrence);

    expect(prisma.agendaTaskOccurrence.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'occurrence-1',
        patientId: 'patient-1',
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      data: {
        status: 'SKIPPED',
        skipReason: 'Dor acima do habitual',
      },
    });
  });

  it('rejects completion and skip after an occurrence reaches a final state', async () => {
    prisma.agendaTaskOccurrence.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.completeOccurrence(
        { sub: 'patient-1', role: 'PATIENT' },
        'occurrence-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.skipOccurrence(
        { sub: 'patient-1', role: 'PATIENT' },
        'occurrence-1',
        'Impossibilitado',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.agendaTaskOccurrence.findUnique).not.toHaveBeenCalled();
  });
});

describe('Agenda DTO validation', () => {
  it('accepts null only for nullable update fields', async () => {
    const nullable = plainToInstance(UpdateAgendaTaskDto, {
      instructions: null,
      endsAt: null,
      recurrenceRule: null,
    });

    await expect(validate(nullable)).resolves.toHaveLength(0);

    for (const property of [
      'title',
      'category',
      'priority',
      'startsAt',
      'timeZone',
    ] as const) {
      const dto = plainToInstance(UpdateAgendaTaskDto, { [property]: null });

      await expect(validate(dto)).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ property })]),
      );
    }
  });

  it('validates IANA time zones at runtime', async () => {
    const valid = plainToInstance(CreateAgendaTaskDto, {
      patientId: 'efc4a745-d7c7-4a64-a85d-c65f2f158c67',
      title: 'Hidratar',
      category: 'HYDRATION',
      priority: 'NORMAL',
      startsAt: '2026-08-13T12:00:00.000Z',
      timeZone: 'America/Sao_Paulo',
    });
    const invalid = plainToInstance(CreateAgendaTaskDto, {
      ...valid,
      timeZone: 'Invalid/Time_Zone',
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'timeZone' }),
      ]),
    );
  });

  it('rejects malformed, reversed and greater-than-31-day range DTOs', async () => {
    const malformed = plainToInstance(AgendaRangeQueryDto, {
      from: 'not-a-date',
      to: '2026-08-13T00:00:00.000Z',
    });
    const reversed = plainToInstance(AgendaRangeQueryDto, {
      from: '2026-08-14T00:00:00.000Z',
      to: '2026-08-13T00:00:00.000Z',
    });
    const tooLong = plainToInstance(AgendaRangeQueryDto, {
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-09-01T00:00:00.001Z',
    });

    await expect(validate(malformed)).resolves.not.toHaveLength(0);
    await expect(validate(reversed)).resolves.not.toHaveLength(0);
    await expect(validate(tooLong)).resolves.not.toHaveLength(0);
  });

  it.each([
    {
      field: 'from',
      from: '2026-08-13T08:00:00',
      to: '2026-08-13T12:00:00.000Z',
    },
    {
      field: 'to',
      from: '2026-08-13T08:00:00.000Z',
      to: '2026-08-13T12:00:00',
    },
  ])('rejects a range whose $field has no UTC offset', async (range) => {
    const dto = plainToInstance(AgendaRangeQueryDto, range);

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: range.field }),
      ]),
    );
  });

  it('accepts ranges with Z and explicit numeric offsets', async () => {
    const dto = plainToInstance(AgendaRangeQueryDto, {
      from: '2026-08-13T08:00:00-03:00',
      to: '2026-08-13T15:00:00.000Z',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('requires a non-empty skip reason at runtime', async () => {
    const dto = plainToInstance(SkipOccurrenceDto, { reason: '' });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'reason' })]),
    );
  });
});

describe('AgendaScheduler', () => {
  it('materializes the next 30 days before idempotently marking overdue work', async () => {
    const now = new Date('2026-08-13T01:05:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const agendaService = {
      materializeActiveTasks: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const prisma = {
      agendaTaskOccurrence: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const scheduler = new AgendaScheduler(
      agendaService as never,
      prisma as never,
    );

    await scheduler.processDailyAgenda();

    expect(agendaService.materializeActiveTasks).toHaveBeenCalledWith(
      now,
      new Date('2026-09-12T01:05:00.000Z'),
    );
    expect(prisma.agendaTaskOccurrence.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        scheduledFor: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });
    expect(
      agendaService.materializeActiveTasks.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.agendaTaskOccurrence.updateMany.mock.invocationCallOrder[0],
    );
    jest.useRealTimers();
  });
});
