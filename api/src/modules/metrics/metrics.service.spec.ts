import { ForbiddenException } from '@nestjs/common';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { MetricsService } from './metrics.service';

describe('MetricsService authorization', () => {
  const prisma = {
    professionalPatientLink: {
      findFirst: jest.fn(),
    },
    dailyTracking: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: MetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.dailyTracking.findMany.mockResolvedValue([]);
    service = new MetricsService(
      prisma as never,
      new PatientAccessService(prisma as never),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a check-in with the authenticated patient id', async () => {
    prisma.dailyTracking.create.mockResolvedValue({ id: 'tracking-1' });

    await service.registerCheckIn(
      { sub: 'patient-1', role: 'PATIENT' },
      { type: 'MEAL', itemName: 'Café da manhã' },
    );

    expect(prisma.dailyTracking.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        type: 'MEAL',
        itemName: 'Café da manhã',
      },
    });
  });

  it('rejects a professional creating a patient check-in', async () => {
    await expect(
      service.registerCheckIn(
        { sub: 'professional-1', role: 'NUTRITIONIST' },
        { type: 'MEAL', itemName: 'Almoço' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.dailyTracking.create).not.toHaveBeenCalled();
  });

  it('rejects another patient before reading consistency', async () => {
    await expect(
      service.getWeeklyConsistency(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-2',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('allows a linked professional to read today logs', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue({
      id: 'link-1',
    });

    await service.getTodayLogs(
      { sub: 'professional-1', role: 'PHYSIO' },
      'patient-1',
    );

    expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: 'professional-1',
        patientId: 'patient-1',
        isActive: true,
      },
    });
    expect(prisma.dailyTracking.findMany).toHaveBeenCalled();
  });

  it('rejects a professional without a link before reading metrics', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

    await expect(
      service.getTodayLogs(
        { sub: 'professional-1', role: 'PERSONAL' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('rejects ADMIN before reading metrics', async () => {
    await expect(
      service.getTodayLogs(
        { sub: 'admin-1', role: 'ADMIN' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('preserves the weekly consistency calculation', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-21T12:00:00.000Z'));
    const history = [
      { completedAt: new Date('2026-08-20T08:00:00.000Z') },
      { completedAt: new Date('2026-08-20T12:00:00.000Z') },
      { completedAt: new Date('2026-08-19T09:00:00.000Z') },
    ];
    prisma.dailyTracking.findMany.mockResolvedValue(history);

    await expect(
      service.getWeeklyConsistency(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
      ),
    ).resolves.toEqual({
      percentage: 29,
      activeDays: 2,
      totalLogs: 3,
      history,
    });

    expect(prisma.dailyTracking.findMany).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        completedAt: { gte: new Date('2026-08-14T12:00:00.000Z') },
      },
      orderBy: { completedAt: 'desc' },
    });
  });
});
