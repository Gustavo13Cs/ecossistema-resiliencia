import { expect } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { JobsPrismaService as PrismaService } from '../../infra/database/database-clients';
import { AlertsCronService } from './alerts.cron.service';

describe('Atomic alert calculation', () => {
  afterEach(() => jest.restoreAllMocks());
  function setup() {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      client: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'client', professionalId: 'professional' },
          ]),
      },
      dailyTracking: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      patientAlert: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    return {
      tx,
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
          professionalId: 'professional',
          clientId: 'client',
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
