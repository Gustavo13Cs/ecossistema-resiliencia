import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentKind,
  AppointmentModality,
  AppointmentStatus,
  ClientStatus,
  Prisma,
} from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import {
  AppointmentsService,
  CreateAppointmentInput,
} from './appointments.service';

describe('AppointmentsService scheduling', () => {
  const now = new Date('2026-09-14T12:00:00.000Z');
  const professional = {
    sub: 'professional-1',
    role: 'NUTRITIONIST',
  } as const;
  const createInput: CreateAppointmentInput = {
    clientId: 'client-1',
    kind: AppointmentKind.FIRST_VISIT,
    modality: AppointmentModality.IN_PERSON,
    startsAt: '2026-09-15T13:00:00.000Z',
    endsAt: '2026-09-15T14:00:00.000Z',
    timeZone: 'America/Sao_Paulo',
    location: 'Consultório 2',
    notes: 'Levar exames recentes',
  };
  const ownedActiveClient = {
    id: 'client-1',
    professionalId: professional.sub,
    name: 'Ana Souza',
    status: ClientStatus.ACTIVE,
  };
  const appointment = {
    id: 'appointment-1',
    professionalId: professional.sub,
    clientId: createInput.clientId,
    kind: createInput.kind,
    status: AppointmentStatus.SCHEDULED,
    modality: createInput.modality,
    startsAt: new Date(createInput.startsAt),
    endsAt: new Date(createInput.endsAt),
    timeZone: createInput.timeZone,
    location: createInput.location,
    meetingUrl: null,
    notes: createInput.notes,
    cancellationReason: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    client: ownedActiveClient,
    events: [],
  };
  const prisma = {
    $transaction: jest.fn(),
    client: { findFirst: jest.fn() },
    appointment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    appointmentEvent: { create: jest.fn() },
  };

  let service: AppointmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    prisma.client.findFirst.mockResolvedValue(ownedActiveClient);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.create.mockResolvedValue(appointment);
    prisma.appointment.findMany.mockResolvedValue([appointment]);
    prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    prisma.appointmentEvent.create.mockResolvedValue({ id: 'event-1' });
    service = new AppointmentsService(
      prisma as never,
      new ClientAccessService(prisma as never),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an appointment for an active client owned by the professional', async () => {
    await expect(service.create(professional, createInput)).resolves.toEqual(
      appointment,
    );

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: createInput.clientId, professionalId: professional.sub },
    });
    expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: professional.sub,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        startsAt: { lt: new Date(createInput.endsAt) },
        endsAt: { gt: new Date(createInput.startsAt) },
      },
      select: { id: true },
    });
    expect(prisma.appointment.create).toHaveBeenCalledWith({
      data: {
        professionalId: professional.sub,
        clientId: createInput.clientId,
        kind: createInput.kind,
        modality: createInput.modality,
        startsAt: new Date(createInput.startsAt),
        endsAt: new Date(createInput.endsAt),
        timeZone: createInput.timeZone,
        location: createInput.location,
        meetingUrl: null,
        notes: createInput.notes,
        events: {
          create: {
            professionalId: professional.sub,
            type: 'CREATED',
            nextStatus: AppointmentStatus.SCHEDULED,
            nextStartsAt: new Date(createInput.startsAt),
            nextEndsAt: new Date(createInput.endsAt),
          },
        },
      },
      include: {
        client: { select: { id: true, name: true, status: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('rejects an archived client before checking the calendar', async () => {
    prisma.client.findFirst.mockResolvedValue({
      ...ownedActiveClient,
      status: ClientStatus.ARCHIVED,
    });

    await expect(
      service.create(professional, createInput),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an overlapping blocking appointment', async () => {
    prisma.appointment.findFirst.mockResolvedValue({ id: 'conflict-1' });

    await expect(
      service.create(professional, createInput),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('allows an adjacent appointment because intervals are half-open', async () => {
    const adjacentInput = {
      ...createInput,
      startsAt: createInput.endsAt,
      endsAt: '2026-09-15T15:00:00.000Z',
    };

    await expect(service.create(professional, adjacentInput)).resolves.toEqual(
      appointment,
    );

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startsAt: { lt: new Date(adjacentInput.endsAt) },
          endsAt: { gt: new Date(adjacentInput.startsAt) },
        }),
      }),
    );
  });

  it('lists only the professional appointments inside the requested range', async () => {
    const query = {
      from: '2026-09-14T00:00:00.000Z',
      to: '2026-09-21T00:00:00.000Z',
      clientId: createInput.clientId,
      status: AppointmentStatus.SCHEDULED,
    };

    await expect(service.list(professional, query)).resolves.toEqual([
      appointment,
    ]);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: {
        professionalId: professional.sub,
        startsAt: { lt: new Date(query.to) },
        endsAt: { gt: new Date(query.from) },
        clientId: query.clientId,
        status: query.status,
      },
      include: {
        client: { select: { id: true, name: true, status: true } },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('rejects ranges longer than 42 days', async () => {
    await expect(
      service.list(professional, {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-10-13T00:00:00.001Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it('returns not found without leaking another professional appointment', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(
        { sub: 'professional-2', role: 'PERSONAL' },
        appointment.id,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
      where: {
        id: appointment.id,
        professionalId: 'professional-2',
      },
      include: {
        client: { select: { id: true, name: true, status: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  });

  it('confirms a scheduled appointment with an optimistic snapshot and audit event', async () => {
    const confirmed = {
      ...appointment,
      status: AppointmentStatus.CONFIRMED,
    };
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointment)
      .mockResolvedValueOnce(confirmed);

    await expect(
      service.confirm(professional, appointment.id, {
        expectedUpdatedAt: appointment.updatedAt.toISOString(),
      }),
    ).resolves.toEqual(confirmed);

    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: {
        id: appointment.id,
        professionalId: professional.sub,
        status: AppointmentStatus.SCHEDULED,
        updatedAt: appointment.updatedAt,
      },
      data: {
        status: AppointmentStatus.CONFIRMED,
        cancellationReason: null,
        cancelledAt: null,
        updatedAt: expect.any(Date),
      },
    });
    expect(prisma.appointmentEvent.create).toHaveBeenCalledWith({
      data: {
        appointmentId: appointment.id,
        professionalId: professional.sub,
        type: 'CONFIRMED',
        previousStatus: AppointmentStatus.SCHEDULED,
        nextStatus: AppointmentStatus.CONFIRMED,
      },
    });
  });

  it.each([
    ['SCHEDULED', 'COMPLETED', 'complete'],
    ['CONFIRMED', 'COMPLETED', 'complete'],
    ['SCHEDULED', 'NO_SHOW', 'markNoShow'],
    ['CONFIRMED', 'CANCELLED', 'cancel'],
  ] as const)(
    '%s can transition to %s through %s',
    async (from, to, method) => {
      const startedAppointment = {
        ...appointment,
        status: from,
        startsAt: new Date('2026-09-14T11:00:00.000Z'),
        updatedAt: now,
      };
      prisma.appointment.findFirst
        .mockResolvedValueOnce(startedAppointment)
        .mockResolvedValueOnce({ ...startedAppointment, status: to });
      const action = { expectedUpdatedAt: now.toISOString() };

      const result =
        method === 'complete'
          ? service.complete(professional, appointment.id, action)
          : method === 'markNoShow'
            ? service.markNoShow(professional, appointment.id, action)
            : service.cancel(professional, appointment.id, {
                ...action,
                reason: 'Cliente solicitou reagendamento',
              });

      await expect(result).resolves.toMatchObject({ status: to });
    },
  );

  it.each(['complete', 'markNoShow'] as const)(
    'rejects %s before the appointment starts',
    async (method) => {
      prisma.appointment.findFirst.mockResolvedValue(appointment);
      const action = { expectedUpdatedAt: now.toISOString() };

      await expect(
        method === 'complete'
          ? service.complete(professional, appointment.id, action)
          : service.markNoShow(professional, appointment.id, action),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
    },
  );

  it('rejects transitions after an appointment reaches a final state', async () => {
    prisma.appointment.findFirst.mockResolvedValue({
      ...appointment,
      status: AppointmentStatus.COMPLETED,
    });

    await expect(
      service.confirm(professional, appointment.id, {
        expectedUpdatedAt: now.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it('requires a meaningful reason to cancel', async () => {
    prisma.appointment.findFirst.mockResolvedValue(appointment);

    await expect(
      service.cancel(professional, appointment.id, {
        expectedUpdatedAt: now.toISOString(),
        reason: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it('returns a conflict when the optimistic snapshot is stale', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointment)
      .mockResolvedValueOnce({
        ...appointment,
        updatedAt: new Date('2026-09-14T12:01:00.000Z'),
      });
    prisma.appointment.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.confirm(professional, appointment.id, {
        expectedUpdatedAt: now.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.appointmentEvent.create).not.toHaveBeenCalled();
  });

  it('reschedules a confirmed appointment back to scheduled and records both intervals', async () => {
    const confirmed = {
      ...appointment,
      status: AppointmentStatus.CONFIRMED,
    };
    const rescheduled = {
      ...confirmed,
      status: AppointmentStatus.SCHEDULED,
      startsAt: new Date('2026-09-16T15:00:00.000Z'),
      endsAt: new Date('2026-09-16T16:00:00.000Z'),
    };
    prisma.appointment.findFirst
      .mockResolvedValueOnce(confirmed)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(rescheduled);

    await expect(
      service.update(professional, appointment.id, {
        expectedUpdatedAt: now.toISOString(),
        startsAt: rescheduled.startsAt.toISOString(),
        endsAt: rescheduled.endsAt.toISOString(),
      }),
    ).resolves.toEqual(rescheduled);

    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: {
        id: appointment.id,
        professionalId: professional.sub,
        status: AppointmentStatus.CONFIRMED,
        updatedAt: now,
      },
      data: expect.objectContaining({
        startsAt: rescheduled.startsAt,
        endsAt: rescheduled.endsAt,
        status: AppointmentStatus.SCHEDULED,
        updatedAt: expect.any(Date),
      }),
    });
    expect(prisma.appointmentEvent.create).toHaveBeenCalledWith({
      data: {
        appointmentId: appointment.id,
        professionalId: professional.sub,
        type: 'RESCHEDULED',
        previousStatus: AppointmentStatus.CONFIRMED,
        nextStatus: AppointmentStatus.SCHEDULED,
        previousStartsAt: appointment.startsAt,
        previousEndsAt: appointment.endsAt,
        nextStartsAt: rescheduled.startsAt,
        nextEndsAt: rescheduled.endsAt,
      },
    });
  });
});
