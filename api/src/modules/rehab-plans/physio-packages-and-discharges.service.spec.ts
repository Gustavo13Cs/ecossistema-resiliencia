import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PhysioDischargeReason, PhysioPackageStatus } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { PhysioDischargesService } from './physio-discharges.service';
import {
  buildPhysioPackageSummaries,
  PhysioPackagesService,
} from './physio-packages.service';

describe('PhysioPackagesService & PhysioDischargesService', () => {
  const user: AuthUser = { sub: 'physio-1', role: 'PHYSIO' };
  const clientId = 'client-1';
  const client = { id: clientId, professionalId: user.sub };

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: clientId }]),
    client: { findFirst: jest.fn() },
    physioSessionPackage: {
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    physioAssessment: { findMany: jest.fn() },
    physioFunctionalScale: { findMany: jest.fn() },
    physioSessionEvolution: { count: jest.fn() },
    rehabPlan: { findFirst: jest.fn(), updateMany: jest.fn() },
    physioDischarge: { create: jest.fn(), delete: jest.fn() },
  };

  const prisma = {
    client: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    physioSessionPackage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    physioSessionEvolution: {
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    physioAssessment: {
      findFirst: jest.fn(),
    },
    physioDischarge: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };

  let packagesService: PhysioPackagesService;
  let dischargesService: PhysioDischargesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhysioPackagesService,
        PhysioDischargesService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    packagesService = module.get(PhysioPackagesService);
    dischargesService = module.get(PhysioDischargesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue(client);
    tx.client.findFirst.mockResolvedValue({ status: 'ACTIVE' });
  });

  it('computes session counter, no-show count, reassessment due and nearing end', () => {
    const startedAt = new Date('2026-11-01T00:00:00Z');
    const summaries = buildPhysioPackageSummaries({
      packages: [
        {
          id: 'pkg-1',
          clientId,
          title: 'Pacote Joelho 10',
          totalSessions: 10,
          reassessEverySessions: 3,
          startedAt,
          expiresAt: null,
          status: PhysioPackageStatus.ACTIVE,
          notes: null,
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      ],
      evolutions: Array.from({ length: 8 }, (_, idx) => ({
        id: `evo-${idx}`,
        sessionDate: new Date(
          `2026-11-${String(idx + 2).padStart(2, '0')}T10:00:00Z`,
        ),
        packageId: idx < 7 ? 'pkg-1' : null,
      })),
      appointments: [
        { startsAt: new Date('2026-11-03T10:00:00Z'), status: 'NO_SHOW' },
        { startsAt: new Date('2026-11-04T10:00:00Z'), status: 'CANCELLED' },
      ],
      latestAssessmentDate: new Date('2026-11-05T10:00:00Z'),
    });

    expect(summaries[0]).toMatchObject({
      completedSessions: 8,
      remainingSessions: 2,
      progressLabel: 'Sessão 8 de 10',
      noShowCount: 1,
      cancelledCount: 1,
      evolutionsSinceAssessment: 4,
      reassessmentDue: true,
      nearingEnd: true,
    });
  });

  it('rejects non-PHYSIO access and archived client mutations', async () => {
    await expect(
      packagesService.listByClient(
        { sub: 'personal-1', role: 'PERSONAL' },
        clientId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      dischargesService.getManagementReport({
        sub: 'nutri-1',
        role: 'NUTRITIONIST',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    tx.client.findFirst.mockResolvedValueOnce({ status: 'ARCHIVED' });
    await expect(
      packagesService.create(user, {
        clientId,
        title: 'Pacote Lombar',
        totalSessions: 10,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds initial vs final comparison snapshot and closes plan/package on discharge', async () => {
    tx.physioAssessment.findMany.mockResolvedValueOnce([
      {
        id: 'assess-init',
        date: new Date('2026-10-01T10:00:00Z'),
        painLevel: 8,
        goniometry: [
          {
            joint: 'Joelho',
            movement: 'Flexão',
            side: 'RIGHT',
            activeDeg: 95,
          },
        ],
      },
      {
        id: 'assess-final',
        date: new Date('2026-11-20T10:00:00Z'),
        painLevel: 1,
        goniometry: [
          {
            joint: 'Joelho',
            movement: 'Flexão',
            side: 'RIGHT',
            activeDeg: 135,
          },
        ],
      },
    ]);
    tx.physioFunctionalScale.findMany.mockResolvedValueOnce([
      {
        scaleType: 'LEFS',
        normalizedScore: 38,
        scoreUnit: 'pontos (0–80)',
        classification: 'Limitação importante',
      },
      {
        scaleType: 'LEFS',
        normalizedScore: 72,
        scoreUnit: 'pontos (0–80)',
        classification: 'Funcionalidade preservada',
      },
    ]);
    tx.physioSessionEvolution.count.mockResolvedValueOnce(12);
    tx.physioDischarge.create.mockImplementation((args: { data: unknown }) =>
      Promise.resolve({ id: 'dis-1', ...(args.data as object) }),
    );

    const created = (await dischargesService.create(user, {
      clientId,
      reason: PhysioDischargeReason.GOALS_MET,
      clinicalSummary: 'Paciente atingiu amplitude completa sem dor.',
      recommendations: 'Manter exercícios preventivos 2x/semana.',
    })) as unknown as {
      sessionsCompleted: number;
      initialPainLevel: number;
      finalPainLevel: number;
      comparisonSnapshot: {
        painDelta: number;
        romComparisons: Array<{ gainDeg: number }>;
        scaleComparisons: Array<{ delta: number }>;
      };
    };

    expect(created.sessionsCompleted).toBe(12);
    expect(created.initialPainLevel).toBe(8);
    expect(created.finalPainLevel).toBe(1);
    expect(created.comparisonSnapshot.painDelta).toBe(7);
    expect(created.comparisonSnapshot.romComparisons[0].gainDeg).toBe(40);
    expect(created.comparisonSnapshot.scaleComparisons[0].delta).toBe(34);
    expect(tx.rehabPlan.updateMany).toHaveBeenCalled();
    expect(tx.physioSessionPackage.updateMany).toHaveBeenCalled();
  });

  it('denies foreign clients on discharge removal', async () => {
    prisma.physioDischarge.findFirst.mockResolvedValueOnce(null);
    await expect(
      dischargesService.remove(user, 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aggregates no-shows, discharge averages and pain delta in management reports', async () => {
    prisma.client.findMany.mockResolvedValueOnce([
      { id: 'c1', name: 'Carlos', status: 'ACTIVE', updatedAt: new Date() },
      { id: 'c2', name: 'Marina', status: 'ACTIVE', updatedAt: new Date() },
    ]);
    prisma.appointment.findMany.mockResolvedValueOnce([
      { clientId: 'c1', status: 'COMPLETED', startsAt: new Date() },
      { clientId: 'c1', status: 'COMPLETED', startsAt: new Date() },
      { clientId: 'c1', status: 'NO_SHOW', startsAt: new Date() },
      { clientId: 'c2', status: 'CANCELLED', startsAt: new Date() },
    ]);
    prisma.physioSessionEvolution.findMany
      .mockResolvedValueOnce([
        {
          id: 'e1',
          clientId: 'c1',
          sessionDate: new Date(),
          painBefore: 6,
          painAfter: 3,
        },
        {
          id: 'e2',
          clientId: 'c2',
          sessionDate: new Date(),
          painBefore: 4,
          painAfter: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'e1',
          clientId: 'c1',
          sessionDate: new Date(),
          packageId: 'pkg-1',
        },
      ]);
    prisma.physioDischarge.findMany.mockResolvedValueOnce([
      {
        clientId: 'c2',
        reason: PhysioDischargeReason.GOALS_MET,
        sessionsCompleted: 10,
        initialPainLevel: 8,
        finalPainLevel: 1,
        dischargedAt: new Date(),
      },
    ]);
    prisma.physioSessionPackage.findMany.mockResolvedValueOnce([
      {
        id: 'pkg-1',
        clientId: 'c1',
        title: 'Pacote Ombro',
        totalSessions: 3,
        reassessEverySessions: null,
        startedAt: new Date('2026-11-01T00:00:00Z'),
        expiresAt: null,
        status: PhysioPackageStatus.ACTIVE,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const report = await dischargesService.getManagementReport(user, {
      period: '30_DAYS',
    });

    expect(report.counts).toMatchObject({
      activePatients: 2,
      completedSessions: 2,
      completedAppointments: 2,
      noShowCount: 1,
      cancelledCount: 1,
      attendanceRatePct: 66.7,
      noShowRatePct: 33.3,
      dischargesCount: 1,
      avgSessionsToDischarge: 10,
      avgPainReduction: 7,
      activePackagesCount: 1,
      expiringPackagesCount: 1,
    });
    expect(report.dischargesByReason.GOALS_MET).toBe(1);
    expect(report.items).toHaveLength(2);
  });
});
