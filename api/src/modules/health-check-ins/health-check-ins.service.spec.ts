import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PatientAccessService } from '../../common/patient-access/patient-access.service';
import { AgendaRangeQueryDto } from '../agenda/dto/agenda-range-query.dto';
import { CreateHealthCheckInDto } from './dto/create-health-check-in.dto';
import { HealthCheckInsService } from './health-check-ins.service';

describe('HealthCheckInsService', () => {
  const checkIn = {
    id: 'check-in-1',
    patientId: 'patient-1',
    recordedAt: new Date('2026-08-13T12:00:00.000Z'),
    waterMl: 500,
    painLevel: null,
    mood: null,
    symptoms: null,
    notes: null,
    createdAt: new Date('2026-08-13T12:00:00.000Z'),
    updatedAt: new Date('2026-08-13T12:00:00.000Z'),
  };
  const prisma = {
    professionalPatientLink: {
      findFirst: jest.fn(),
    },
    healthCheckIn: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const consents = {
    assertGranted: jest.fn(),
  };

  let patientAccess: PatientAccessService;
  let service: HealthCheckInsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.professionalPatientLink.findFirst.mockResolvedValue({
      id: 'link-1',
    });
    prisma.healthCheckIn.create.mockResolvedValue(checkIn);
    prisma.healthCheckIn.findMany.mockResolvedValue([checkIn]);
    consents.assertGranted.mockResolvedValue(undefined);
    patientAccess = new PatientAccessService(prisma as never);
    service = new HealthCheckInsService(
      prisma as never,
      patientAccess,
      consents as never,
    );
  });

  it('rejects an empty check-in', async () => {
    await expect(
      service.create({ sub: 'patient-1', role: 'PATIENT' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.healthCheckIn.create).not.toHaveBeenCalled();
  });

  it('rejects a check-in containing only blank text', async () => {
    await expect(
      service.create(
        { sub: 'patient-1', role: 'PATIENT' },
        { symptoms: '  ', notes: '\n\t' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.healthCheckIn.create).not.toHaveBeenCalled();
  });

  it.each(['waterMl', 'painLevel', 'mood'])(
    'rejects a check-in whose %s is null at runtime',
    async (field) => {
      await expect(
        service.create({ sub: 'patient-1', role: 'PATIENT' }, {
          [field]: null,
          notes: 'Registro válido',
        } as unknown as CreateHealthCheckInDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.healthCheckIn.create).not.toHaveBeenCalled();
    },
  );

  it('creates a partial check-in for the patient identified by the JWT', async () => {
    await expect(
      service.create({ sub: 'patient-1', role: 'PATIENT' }, {
        waterMl: 500,
        patientId: 'patient-2',
      } as CreateHealthCheckInDto),
    ).resolves.toEqual(checkIn);

    expect(prisma.healthCheckIn.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        waterMl: 500,
      },
    });
  });

  it('rejects creation by a professional at service level', async () => {
    await expect(
      service.create({ sub: 'professional-1', role: 'PHYSIO' }, { mood: 4 }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.healthCheckIn.create).not.toHaveBeenCalled();
  });

  it('allows a patient to list only their own check-ins without consent', async () => {
    const range = {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-31T00:00:00.000Z'),
    };

    await expect(
      service.listForPatient(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
        range,
      ),
    ).resolves.toEqual([checkIn]);

    expect(consents.assertGranted).not.toHaveBeenCalled();
    expect(prisma.professionalPatientLink.findFirst).not.toHaveBeenCalled();
    expect(prisma.healthCheckIn.findMany).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        recordedAt: { gte: range.from, lte: range.to },
      },
      orderBy: { recordedAt: 'desc' },
    });
  });

  it('requires health consent for a professional', async () => {
    const range = {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-31T23:59:59.999Z'),
    };
    const linkSpy = jest.spyOn(patientAccess, 'assertProfessionalLink');

    await service.listForPatient(
      { sub: 'professional-1', role: 'PHYSIO' },
      'patient-1',
      range,
    );

    expect(linkSpy).toHaveBeenCalled();
    expect(consents.assertGranted).toHaveBeenCalledWith(
      'patient-1',
      'professional-1',
      'HEALTH_CHECK_IN',
    );
  });

  it('rejects a professional without an active patient link before consent', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);

    await expect(
      service.listForPatient(
        { sub: 'professional-1', role: 'PHYSIO' },
        'patient-1',
        {
          from: new Date('2026-08-01T00:00:00.000Z'),
          to: new Date('2026-08-31T00:00:00.000Z'),
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(consents.assertGranted).not.toHaveBeenCalled();
    expect(prisma.healthCheckIn.findMany).not.toHaveBeenCalled();
  });

  it('does not query check-ins when health consent is denied', async () => {
    consents.assertGranted.mockRejectedValue(new ForbiddenException());

    await expect(
      service.listForPatient(
        { sub: 'professional-1', role: 'PHYSIO' },
        'patient-1',
        {
          from: new Date('2026-08-01T00:00:00.000Z'),
          to: new Date('2026-08-31T00:00:00.000Z'),
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.healthCheckIn.findMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      from: new Date('invalid'),
      to: new Date('2026-08-31T00:00:00.000Z'),
    },
    {
      from: new Date('2026-08-31T00:00:00.000Z'),
      to: new Date('2026-08-01T00:00:00.000Z'),
    },
    {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-09-01T00:00:00.001Z'),
    },
  ])('rejects an invalid service-level range: $from to $to', async (range) => {
    await expect(
      service.listForPatient(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
        range,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.healthCheckIn.findMany).not.toHaveBeenCalled();
  });

  it('converts a non-Date service-level range into a bad request', async () => {
    await expect(
      service.listForPatient(
        { sub: 'patient-1', role: 'PATIENT' },
        'patient-1',
        {
          from: '2026-08-01T00:00:00.000Z',
          to: new Date('2026-08-31T00:00:00.000Z'),
        } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.healthCheckIn.findMany).not.toHaveBeenCalled();
  });
});

describe('Health check-in DTO validation', () => {
  it('accepts all exact numeric boundaries', async () => {
    const minimums = plainToInstance(CreateHealthCheckInDto, {
      waterMl: 0,
      painLevel: 0,
      mood: 1,
    });
    const maximums = plainToInstance(CreateHealthCheckInDto, {
      waterMl: 20000,
      painLevel: 10,
      mood: 5,
    });

    await expect(validate(minimums)).resolves.toHaveLength(0);
    await expect(validate(maximums)).resolves.toHaveLength(0);
  });

  it.each([
    ['waterMl', -1],
    ['waterMl', 20001],
    ['waterMl', 1.5],
    ['painLevel', -1],
    ['painLevel', 11],
    ['painLevel', 1.5],
    ['mood', 0],
    ['mood', 6],
    ['mood', 1.5],
  ])('rejects %s value %s outside its integer limits', async (field, value) => {
    const dto = plainToInstance(CreateHealthCheckInDto, { [field]: value });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: field })]),
    );
  });

  it('enforces text lengths and ISO-8601 recordedAt', async () => {
    const dto = plainToInstance(CreateHealthCheckInDto, {
      symptoms: 's'.repeat(2001),
      notes: 'n'.repeat(4001),
      recordedAt: 'not-a-date',
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'symptoms' }),
        expect.objectContaining({ property: 'notes' }),
        expect.objectContaining({ property: 'recordedAt' }),
      ]),
    );
  });

  it('inherits the Task 6 range contract requiring explicit UTC offsets', async () => {
    const dto = plainToInstance(AgendaRangeQueryDto, {
      from: '2026-08-01T00:00:00',
      to: '2026-08-31T00:00:00',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
