import { ForbiddenException } from '@nestjs/common';
import { PatientAccessService } from './patient-access.service';

describe('PatientAccessService', () => {
  const prisma = {
    professionalPatientLink: {
      findFirst: jest.fn(),
    },
  };

  let service: PatientAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PatientAccessService(prisma as never);
  });

  it('accepts a clinical professional with an active patient link', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue({ id: 'link-1' });

    await expect(
      service.assertProfessionalLink(
        { sub: 'professional-1', role: 'NUTRITIONIST' },
        'patient-1',
      ),
    ).resolves.toBeUndefined();

    expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: 'professional-1',
        patientId: 'patient-1',
        isActive: true,
      },
    });
  });

  it('rejects an inactive link', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

    await expect(
      service.assertProfessionalLink(
        { sub: 'professional-1', role: 'NUTRITIONIST' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).toHaveBeenCalledWith({
      where: {
        professionalId: 'professional-1',
        patientId: 'patient-1',
        isActive: true,
      },
    });
  });

  it('rejects ADMIN as a clinical professional', async () => {
    await expect(
      service.assertProfessionalLink(
        { sub: 'admin-1', role: 'ADMIN' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
  });

  it('accepts a patient accessing their own data', () => {
    expect(() =>
      service.assertPatientSelf(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
      ),
    ).not.toThrow();
  });

  it('rejects a patient accessing a different patient', () => {
    expect(() =>
      service.assertPatientSelf(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-2',
      ),
    ).toThrow(ForbiddenException);
  });

  it('accepts the authenticated clinical professional as task author', () => {
    expect(() =>
      service.assertTaskAuthor(
        { sub: 'professional-1', role: 'PHYSIO' },
        'professional-1',
      ),
    ).not.toThrow();
  });

  it('rejects a different task author', () => {
    expect(() =>
      service.assertTaskAuthor(
        { sub: 'professional-1', role: 'PERSONAL' },
        'professional-2',
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects ADMIN as a task author', () => {
    expect(() =>
      service.assertTaskAuthor(
        { sub: 'admin-1', role: 'ADMIN' },
        'admin-1',
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows a patient to read their own data', async () => {
    await expect(
      service.assertCanReadPatient(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
      ),
    ).resolves.toBeUndefined();

    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a patient reading another patient', async () => {
    await expect(
      service.assertCanReadPatient(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-2',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
  });

  it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'] as const)(
    'allows a linked %s to read patient data',
    async (role) => {
      prisma.professionalPatientLink.findFirst.mockResolvedValue({
        id: 'link-1',
      });

      await expect(
        service.assertCanReadPatient(
          { sub: 'professional-1', role },
          'patient-1',
        ),
      ).resolves.toBeUndefined();
    },
  );

  it('rejects ADMIN from reading clinical patient data', async () => {
    await expect(
      service.assertCanReadPatient(
        { sub: 'admin-1', role: 'ADMIN' },
        'patient-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
  });
});
