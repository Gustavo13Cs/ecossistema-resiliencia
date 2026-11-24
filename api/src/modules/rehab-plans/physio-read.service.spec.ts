import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { PhysioReadService } from './physio-read.service';

describe('PhysioReadService', () => {
  const user: AuthUser = { sub: 'physio-1', role: 'PHYSIO' };

  const prisma = {
    client: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    physioSessionEvolution: {
      findMany: jest.fn(),
    },
    rehabPlan: {
      findFirst: jest.fn(),
    },
    physioAssessment: {
      findMany: jest.fn(),
    },
  };

  let service: PhysioReadService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhysioReadService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PhysioReadService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes workspace counts, overdue reassessments and pain worsening accurately', async () => {
    const now = Date.now();
    const daysAgo = (days: number) =>
      new Date(now - days * 24 * 60 * 60 * 1000);

    prisma.client.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    prisma.client.findMany
      .mockResolvedValueOnce([
        {
          id: 'c-1',
          name: 'Carla',
          goal: 'Lombalgia',
          updatedAt: daysAgo(1),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'c-1',
          name: 'Carla',
          goal: 'Lombalgia',
          updatedAt: daysAgo(1),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'c-1',
          name: 'Carla',
          goal: 'Lombalgia',
          updatedAt: daysAgo(1),
          physioAssessments: [{ date: daysAgo(45), painLevel: 3 }],
          physioSessionEvolutions: [
            { sessionDate: daysAgo(2), painBefore: 5, painAfter: 6 },
            { sessionDate: daysAgo(5), painBefore: 4, painAfter: 4 },
          ],
        },
        {
          id: 'c-2',
          name: 'Bruno',
          goal: 'LCA',
          updatedAt: daysAgo(3),
          physioAssessments: [{ date: daysAgo(5), painLevel: 7 }],
          physioSessionEvolutions: [
            { sessionDate: daysAgo(1), painBefore: 6, painAfter: 3 },
          ],
        },
      ]);

    prisma.appointment.count.mockResolvedValueOnce(1);
    prisma.appointment.findMany.mockResolvedValueOnce([
      {
        id: 'appt-1',
        clientId: 'c-2',
        startsAt: daysAgo(1),
        kind: 'SESSION',
        client: { name: 'Bruno', goal: 'LCA', updatedAt: daysAgo(3) },
      },
    ]);
    prisma.physioSessionEvolution.findMany.mockResolvedValueOnce([
      { appointmentId: 'appt-done' },
      { appointmentId: null },
    ]);

    const result = await service.getWorkspace(user);

    expect(result.counts).toEqual({
      activePatients: 3,
      archivedPatients: 1,
      completedWithoutEvolution: 1,
      withoutActivePlan: 2,
      overdueReassessments: 1,
      painWorsening: 1,
    });
    expect(result.evolvedAppointmentIds).toEqual(['appt-done']);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientId: 'c-2',
          section: 'COMPLETED_WITHOUT_EVOLUTION',
          appointmentId: 'appt-1',
        }),
        expect.objectContaining({
          clientId: 'c-1',
          section: 'PAIN_WORSENING',
          previousPain: 4,
          latestPain: 6,
        }),
        expect.objectContaining({
          clientId: 'c-1',
          section: 'OVERDUE_REASSESSMENT',
        }),
        expect.objectContaining({
          clientId: 'c-1',
          section: 'WITHOUT_ACTIVE_PLAN',
        }),
        expect.objectContaining({
          clientId: 'c-1',
          section: 'RECENT',
        }),
      ]),
    );
  });

  it('returns client overview with chronological painSeries after checking ownership', async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: 'c-1',
      professionalId: user.sub,
      status: 'ACTIVE',
    });
    prisma.rehabPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      title: 'Pós-Op LCA',
      sessions: [],
    });
    prisma.physioAssessment.findMany
      .mockResolvedValueOnce([
        {
          id: 'a-1',
          date: new Date('2026-11-01T10:00:00.000Z'),
          chiefComplaint: 'Dor no joelho',
          painLevel: 8,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'a-1',
          date: new Date('2026-11-01T10:00:00.000Z'),
          painLevel: 8,
        },
      ]);
    prisma.physioSessionEvolution.findMany
      .mockResolvedValueOnce([
        {
          id: 'e-1',
          clientId: 'c-1',
          sessionDate: new Date('2026-11-10T10:00:00.000Z'),
          painBefore: 6,
          painAfter: 4,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'e-1',
          sessionDate: new Date('2026-11-10T10:00:00.000Z'),
          painBefore: 6,
          painAfter: 4,
        },
      ]);
    prisma.appointment.findMany.mockResolvedValue([]);

    const overview = await service.getClientOverview(user, 'c-1');

    expect(overview.client).toEqual({ id: 'c-1', status: 'ACTIVE' });
    expect(overview.activePlan?.id).toBe('plan-1');
    expect(overview.painSeries).toEqual([
      {
        id: 'a-1',
        date: new Date('2026-11-01T10:00:00.000Z'),
        source: 'ASSESSMENT',
        painLevel: 8,
        painBefore: null,
        painAfter: null,
      },
      {
        id: 'e-1',
        date: new Date('2026-11-10T10:00:00.000Z'),
        source: 'SESSION',
        painLevel: null,
        painBefore: 6,
        painAfter: 4,
      },
    ]);
  });

  it('denies foreign clients and non-PHYSIO roles', async () => {
    prisma.client.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getClientOverview(user, 'foreign-client'),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.getWorkspace({ sub: user.sub, role: 'PERSONAL' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
