import { ForbiddenException } from '@nestjs/common';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { ConsentsService } from './consents.service';

describe('ConsentsService', () => {
  const prisma = {
    professionalPatientLink: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    patientConsent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  let service: ConsentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    const patientAccess = new PatientAccessService(prisma as never);
    service = new ConsentsService(prisma as never, patientAccess);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('grants consent for an actively linked professional', async () => {
    const now = new Date('2026-08-13T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    prisma.professionalPatientLink.findFirst.mockResolvedValue({ id: 'link-1' });
    prisma.patientConsent.upsert.mockResolvedValue({ id: 'consent-1', granted: true });

    await expect(
      service.setMine(
        { sub: 'patient-1', role: 'PATIENT' },
        'professional-1',
        'HEALTH_CHECK_IN',
        { granted: true },
      ),
    ).resolves.toEqual({ id: 'consent-1', granted: true });

    expect(prisma.patientConsent.upsert).toHaveBeenCalledWith({
      where: {
        patientId_professionalId_dataCategory: {
          patientId: 'patient-1',
          professionalId: 'professional-1',
          dataCategory: 'HEALTH_CHECK_IN',
        },
      },
      create: {
        patientId: 'patient-1',
        professionalId: 'professional-1',
        dataCategory: 'HEALTH_CHECK_IN',
        granted: true,
        grantedAt: now,
        revokedAt: null,
      },
      update: {
        granted: true,
        grantedAt: now,
        revokedAt: null,
      },
    });
  });

  it('revokes consent with a consistent timestamp', async () => {
    const now = new Date('2026-08-13T13:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    prisma.professionalPatientLink.findFirst.mockResolvedValue({ id: 'link-1' });
    prisma.patientConsent.upsert.mockResolvedValue({ id: 'consent-1', granted: false });

    await service.setMine(
      { sub: 'patient-1', role: 'PATIENT' },
      'professional-1',
      'HEALTH_CHECK_IN',
      { granted: false },
    );

    expect(prisma.patientConsent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          granted: false,
          grantedAt: null,
          revokedAt: now,
        }),
        update: {
          granted: false,
          grantedAt: null,
          revokedAt: now,
        },
      }),
    );
  });

  it('rejects consent changes for an inactive link', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

    await expect(
      service.setMine(
        { sub: 'patient-1', role: 'PATIENT' },
        'professional-1',
        'HEALTH_CHECK_IN',
        { granted: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        professionalId: 'professional-1',
        isActive: true,
        professional: {
          role: { in: ['NUTRITIONIST', 'PERSONAL', 'PHYSIO'] },
        },
      },
    });
    expect(prisma.patientConsent.upsert).not.toHaveBeenCalled();
  });

  it('rejects consent changes from anyone other than the patient', async () => {
    await expect(
      service.setMine(
        { sub: 'professional-1', role: 'NUTRITIONIST' },
        'professional-2',
        'HEALTH_CHECK_IN',
        { granted: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
    expect(prisma.patientConsent.upsert).not.toHaveBeenCalled();
  });

  it('denies health check-in access without consent', async () => {
    prisma.patientConsent.findUnique.mockResolvedValue(null);

    await expect(
      service.assertGranted('patient-1', 'professional-1', 'HEALTH_CHECK_IN'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies access when consent exists but is revoked', async () => {
    prisma.patientConsent.findUnique.mockResolvedValue({ granted: false });

    await expect(
      service.assertGranted('patient-1', 'professional-1', 'HEALTH_CHECK_IN'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts access when consent is granted', async () => {
    prisma.patientConsent.findUnique.mockResolvedValue({ granted: true });

    await expect(
      service.assertGranted('patient-1', 'professional-1', 'HEALTH_CHECK_IN'),
    ).resolves.toBeUndefined();
  });

  it('lists every consent category for every active professional', async () => {
    const updatedAt = new Date('2026-08-13T14:00:00.000Z');
    prisma.professionalPatientLink.findMany.mockResolvedValue([
      {
        professionalId: 'professional-1',
        professional: {
          id: 'professional-1',
          name: 'Dra. Ana',
          role: 'NUTRITIONIST',
        },
      },
    ]);
    prisma.patientConsent.findMany.mockResolvedValue([
      {
        professionalId: 'professional-1',
        dataCategory: 'NUTRITION',
        granted: true,
        updatedAt,
      },
    ]);

    const result = await service.listMine({ sub: 'patient-1', role: 'PATIENT' });

    expect(result).toHaveLength(5);
    expect(result).toContainEqual({
      professional: {
        id: 'professional-1',
        name: 'Dra. Ana',
        role: 'NUTRITIONIST',
      },
      category: 'NUTRITION',
      granted: true,
      updatedAt,
    });
    expect(result).toContainEqual({
      professional: {
        id: 'professional-1',
        name: 'Dra. Ana',
        role: 'NUTRITIONIST',
      },
      category: 'HEALTH_CHECK_IN',
      granted: false,
      updatedAt: null,
    });
  });
});
