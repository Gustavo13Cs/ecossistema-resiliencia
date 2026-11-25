import { expect } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JobsPrismaService as PrismaService } from '../../infra/database/database-clients';
import { ALERT_SNAPSHOT_LOCK, AlertsCronService } from './alerts.cron.service';

type Tracking = {
  professionalId: string | null;
  clientId: string | null;
  completedAt: Date;
};
type LatestTracking = Omit<Tracking, 'completedAt'> & {
  _max: { completedAt: Date | null };
};

describe('Atomic alert calculation', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  function setup(clients = [{ id: 'client', professionalId: 'professional' }]) {
    const tx = {
      $executeRaw: jest
        .fn<Promise<number>, [TemplateStringsArray, ...unknown[]]>()
        .mockResolvedValue(1),
      client: {
        findMany: jest
          .fn<Promise<typeof clients>, [Prisma.ClientFindManyArgs]>()
          .mockResolvedValue(clients),
      },
      dailyTracking: {
        findFirst: jest.fn<Promise<null>, [unknown]>().mockResolvedValue(null),
        findMany: jest
          .fn<Promise<Tracking[]>, [Prisma.DailyTrackingFindManyArgs]>()
          .mockResolvedValue([]),
        groupBy: jest
          .fn<Promise<LatestTracking[]>, [unknown]>()
          .mockResolvedValue([]),
      },
      patientAlert: {
        deleteMany: jest
          .fn<Promise<{ count: number }>, [Prisma.PatientAlertDeleteManyArgs]>()
          .mockResolvedValue({ count: 0 }),
        createMany: jest
          .fn<
            Promise<{ count: number }>,
            [{ data: Prisma.PatientAlertCreateManyInput[] }]
          >()
          .mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn<
        unknown,
        [
          (transaction: typeof tx) => unknown,
          { maxWait: number; timeout: number },
        ]
      >((callback) => callback(tx)),
    };
    return {
      tx,
      prisma,
      service: new AlertsCronService(prisma as unknown as PrismaService),
    };
  }
  it('keeps the prior snapshot when required reads fail', async () => {
    const { tx, service } = setup();
    tx.client.findMany.mockRejectedValue(
      new Error('fixture calculation failure'),
    );
    await expect(service.generateDailyAlerts()).rejects.toThrow();
    expect(tx.patientAlert.deleteMany).not.toHaveBeenCalled();
  });
  it.each([
    [500, 1],
    [501, 2],
  ])('reads %i Clients in %i bounded batches', async (count, batches) => {
    const clients = Array.from({ length: count }, (_, index) => ({
      id: `client-${index}`,
      professionalId: `professional-${index % 2}`,
    }));
    const { tx, service } = setup(clients);

    await expect(service.generateDailyAlerts()).resolves.toEqual({
      generated: count,
      skipped: false,
    });

    expect(tx.dailyTracking.findMany).toHaveBeenCalledTimes(batches);
    expect(tx.dailyTracking.groupBy).toHaveBeenCalledTimes(batches);
    expect(tx.dailyTracking.findFirst).not.toHaveBeenCalled();
    for (let batch = 0; batch < batches; batch++) {
      const pairs = clients
        .slice(batch * 500, (batch + 1) * 500)
        .map((client) => ({
          clientId: client.id,
          professionalId: client.professionalId,
        }));
      const scope = expect.objectContaining({ OR: pairs });
      expect(tx.dailyTracking.findMany).toHaveBeenNthCalledWith(
        batch + 1,
        expect.objectContaining({ where: scope }),
      );
      expect(tx.dailyTracking.groupBy).toHaveBeenNthCalledWith(
        batch + 1,
        expect.objectContaining({ where: scope }),
      );
    }
    expect(tx.patientAlert.createMany.mock.calls[0][0].data).toHaveLength(
      count,
    );
  });
  it('keeps the prior snapshot when the latest tracking batch fails', async () => {
    const { tx, service } = setup();
    tx.dailyTracking.groupBy.mockRejectedValue(
      new Error('fixture read failure'),
    );

    await expect(service.generateDailyAlerts()).rejects.toThrow(
      'Alert snapshot generation failed',
    );

    expect(tx.patientAlert.deleteMany).not.toHaveBeenCalled();
    expect(tx.patientAlert.createMany).not.toHaveBeenCalled();
  });
  it('finishes every batch read before replacing the snapshot', async () => {
    const { tx, service } = setup(
      Array.from({ length: 501 }, (_, index) => ({
        id: `client-${index}`,
        professionalId: 'professional',
      })),
    );
    tx.dailyTracking.findMany
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('fixture second batch failure'));

    await expect(service.generateDailyAlerts(now)).rejects.toThrow(
      'Alert snapshot generation failed',
    );

    expect(tx.patientAlert.deleteMany).not.toHaveBeenCalled();
    expect(tx.patientAlert.createMany).not.toHaveBeenCalled();
  });
  it.each([
    { latest: null, types: ['INACTIVE_5_DAYS'] },
    { latest: '2026-10-01T12:00:00.000Z', types: [] },
    { latest: '2026-09-26T12:00:00.000Z', types: [] },
    {
      latest: '2026-09-26T11:59:59.999Z',
      types: ['INACTIVE_5_DAYS'],
    },
    {
      latest: '2026-09-10T12:00:00.000Z',
      types: ['INACTIVE_5_DAYS'],
    },
    {
      latest: '2026-09-10T11:59:59.999Z',
      types: ['INACTIVE_5_DAYS', 'PLATEAU_3_WEEKS'],
    },
  ])(
    'preserves the activity boundaries for latest=$latest',
    async ({ latest, types }) => {
      const { tx, service } = setup();
      if (latest)
        tx.dailyTracking.groupBy.mockResolvedValue([
          {
            clientId: 'client',
            professionalId: 'professional',
            _max: { completedAt: new Date(latest) },
          },
        ]);

      await expect(service.generateDailyAlerts(now)).resolves.toEqual({
        generated: types.length,
        skipped: false,
      });

      const alerts = tx.patientAlert.createMany.mock.calls[0]?.[0].data ?? [];
      expect(alerts.map((alert) => alert.type)).toEqual(types);
      expect(alerts.every((alert) => alert.createdAt === now)).toBe(true);
    },
  );
  it.each([2, 3])(
    'counts %i overloaded UTC days within the batch',
    async (days) => {
      const { tx, service } = setup();
      tx.dailyTracking.groupBy.mockResolvedValue([
        {
          clientId: 'client',
          professionalId: 'professional',
          _max: { completedAt: now },
        },
      ]);
      const completedAt = [
        '2026-09-17T12:00:00.000Z',
        '2026-09-17T13:00:00.000Z',
        '2026-09-20T00:00:00.000Z',
        '2026-09-19T21:05:00.000-03:00',
        '2026-09-30T23:00:00.000Z',
        '2026-09-30T23:59:59.999Z',
      ].slice(0, days * 2);
      tx.dailyTracking.findMany.mockResolvedValue(
        completedAt.map((date) => ({
          clientId: 'client',
          professionalId: 'professional',
          completedAt: new Date(date),
        })),
      );

      await service.generateDailyAlerts(now);

      const alerts = tx.patientAlert.createMany.mock.calls[0]?.[0].data ?? [];
      expect(alerts.map((alert) => alert.type)).toEqual(
        days === 3 ? ['OVERTRAINING_RISK'] : [],
      );
      if (days === 3)
        expect(alerts[0]).toMatchObject({
          severity: 'HIGH',
          message:
            'Múltiplos treinos no mesmo dia detectados em 3 dias nas últimas 2 semanas. Risco de overtraining.',
        });
    },
  );
  it('does not mix another author or legacy subject into the Client metrics', async () => {
    const { tx, service } = setup();
    tx.dailyTracking.groupBy.mockResolvedValue([
      {
        clientId: 'client',
        professionalId: 'other-professional',
        _max: { completedAt: now },
      },
      {
        clientId: null,
        professionalId: 'professional',
        _max: { completedAt: now },
      },
    ]);
    tx.dailyTracking.findMany.mockResolvedValue(
      ['2026-09-28', '2026-09-29', '2026-09-30'].flatMap((date) =>
        [0, 1].map(() => ({
          clientId: 'client',
          professionalId: 'other-professional',
          completedAt: new Date(`${date}T12:00:00.000Z`),
        })),
      ),
    );

    await service.generateDailyAlerts(now);

    expect(tx.patientAlert.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({
        clientId: 'client',
        professionalId: 'professional',
        type: 'INACTIVE_5_DAYS',
      }),
    ]);
  });
  it('clears the Client snapshot without tracking reads when no Client is eligible', async () => {
    const { tx, service } = setup([]);

    await expect(service.generateDailyAlerts(now)).resolves.toEqual({
      generated: 0,
      skipped: false,
    });

    expect(tx.dailyTracking.groupBy).not.toHaveBeenCalled();
    expect(tx.dailyTracking.findMany).not.toHaveBeenCalled();
    expect(tx.patientAlert.deleteMany).toHaveBeenCalledWith({
      where: { clientId: { not: null } },
    });
    expect(tx.patientAlert.createMany).not.toHaveBeenCalled();
  });
  it('reads only workouts up to now and keeps the transaction advisory lock', async () => {
    const { tx, prisma, service } = setup();

    await service.generateDailyAlerts(now);

    expect(tx.client.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', professional: { role: 'PERSONAL' } },
      select: { id: true, professionalId: true },
    });
    expect(tx.dailyTracking.groupBy).toHaveBeenCalledWith({
      by: ['professionalId', 'clientId'],
      where: {
        OR: [{ professionalId: 'professional', clientId: 'client' }],
        type: 'WORKOUT',
        completedAt: { lte: now },
      },
      _max: { completedAt: true },
    });
    expect(tx.dailyTracking.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ professionalId: 'professional', clientId: 'client' }],
        type: 'WORKOUT',
        completedAt: { gte: new Date('2026-09-17T12:00:00.000Z'), lte: now },
      },
      select: { professionalId: true, clientId: true, completedAt: true },
    });
    expect(tx.$executeRaw).toHaveBeenCalledWith(
      expect.any(Array),
      ALERT_SNAPSHOT_LOCK,
    );
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.client.findMany.mock.invocationCallOrder[0],
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 30_000,
      timeout: 60_000,
    });
  });
  it('uses Client and author predicates and writes no legacy patient identity', async () => {
    const { tx, service } = setup();
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    await expect(service.generateDailyAlerts()).resolves.toEqual({
      generated: 1,
      skipped: false,
    });
    expect(tx.dailyTracking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ professionalId: 'professional', clientId: 'client' }],
          type: 'WORKOUT',
        }),
      }),
    );
    expect(tx.patientAlert.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          clientId: 'client',
          professionalId: 'professional',
          patientId: null,
        }),
      ],
    });
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({ generated: 1, skipped: false });
  });
});
