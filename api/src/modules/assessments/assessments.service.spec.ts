import {
  ForbiddenException,
  NotFoundException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { AssessmentsController } from './assessments.controller';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AssessmentsService } from './assessments.service';

const PROFESSIONAL_ID = 'professional-1';
const CLIENT_ID = 'client-1';

type ProfessionalCreate = (
  dto: CreateAssessmentDto,
  professionalId: string,
) => Promise<unknown>;

type ProfessionalRemove = (
  assessmentId: string,
  professionalId: string,
) => Promise<unknown>;

describe('AssessmentsService professional Client ownership', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    client: { findFirst: jest.fn() },
    professionalPatientLink: { findUnique: jest.fn() },
    physicalAssessment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: AssessmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([{ id: CLIENT_ID }]);
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    prisma.client.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      status: 'ACTIVE',
    });
    prisma.physicalAssessment.create.mockResolvedValue({
      id: 'assessment-1',
      clientId: CLIENT_ID,
    });
    service = new AssessmentsService(prisma as unknown as PrismaService);
  });

  it('creates an assessment only after resolving an owned Client', async () => {
    const create = service.create.bind(
      service,
    ) as unknown as ProfessionalCreate;

    await create(
      { clientId: CLIENT_ID, weight: 72.4 } as unknown as CreateAssessmentDto,
      PROFESSIONAL_ID,
    );

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, professionalId: PROFESSIONAL_ID },
      select: { id: true },
    });
    expect(prisma.physicalAssessment.create).toHaveBeenCalledWith({
      data: {
        clientId: CLIENT_ID,
        userId: null,
        weight: 72.4,
      },
    });
  });

  it('rejects a Client owned by another professional before writing', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    const create = service.create.bind(
      service,
    ) as unknown as ProfessionalCreate;

    await expect(
      create(
        { clientId: CLIENT_ID, weight: 72.4 } as unknown as CreateAssessmentDto,
        PROFESSIONAL_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
  });

  it('archived_client_cannot_receive_assessment', async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      status: 'ARCHIVED',
    });
    await expect(
      service.create({ clientId: CLIENT_ID, squat1RM: 80 }, PROFESSIONAL_ID),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
  });

  it('force_only_assessment_is_valid', async () => {
    await service.create(
      { clientId: CLIENT_ID, squat1RM: 80 },
      PROFESSIONAL_ID,
    );
    expect(prisma.physicalAssessment.create).toHaveBeenCalledWith({
      data: { clientId: CLIENT_ID, userId: null, squat1RM: 80 },
    });
  });

  it.each([
    {},
    { notes: 'Nota' },
    { weight: 0 },
    { squat1RM: -1 },
    { bodyFat: 101 },
    { weight: NaN },
    { waist: Infinity },
  ])('empty_or_invalid_assessment_is_rejected: %j', async (values) => {
    await expect(
      service.create({ clientId: CLIENT_ID, ...values }, PROFESSIONAL_ID),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
  });

  it('uses the transaction connection for resolution, lock and write', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: CLIENT_ID }]),
      client: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: CLIENT_ID, status: 'ACTIVE' }),
      },
      physicalAssessment: {
        create: jest.fn().mockResolvedValue({ id: 'tx-assessment' }),
      },
    };
    prisma.$transaction.mockImplementationOnce(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    );
    await expect(
      service.create({ clientId: CLIENT_ID, squat1RM: 80 }, PROFESSIONAL_ID),
    ).resolves.toEqual({ id: 'tx-assessment' });
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
    expect(tx.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRaw.mock.invocationCallOrder[0],
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.client.findFirst.mock.invocationCallOrder[1],
    );
    expect(tx.client.findFirst.mock.invocationCallOrder[1]).toBeLessThan(
      tx.physicalAssessment.create.mock.invocationCallOrder[0],
    );
  });

  it('preserves authorized legacy resolution and normalized data', async () => {
    prisma.professionalPatientLink.findUnique.mockResolvedValue({
      id: CLIENT_ID,
      isActive: true,
    });
    await service.create(
      { userId: 'legacy-user', weight: 70, date: '2026-10-14', notes: 'Nota' },
      PROFESSIONAL_ID,
    );
    expect(prisma.professionalPatientLink.findUnique).toHaveBeenCalledWith({
      where: {
        professionalId_patientId: {
          professionalId: PROFESSIONAL_ID,
          patientId: 'legacy-user',
        },
      },
      select: { id: true, isActive: true },
    });
    expect(prisma.physicalAssessment.create).toHaveBeenCalledWith({
      data: {
        clientId: CLIENT_ID,
        userId: null,
        weight: 70,
        date: new Date('2026-10-14'),
        notes: 'Nota',
      },
    });
  });

  it.each([null, { id: CLIENT_ID, isActive: false }])(
    'denies an absent or inactive legacy link before lock/write: %j',
    async (link) => {
      prisma.professionalPatientLink.findUnique.mockResolvedValue(link);
      await expect(
        service.create({ userId: 'legacy-user', weight: 70 }, PROFESSIONAL_ID),
      ).rejects.toMatchObject({ status: 404 });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
    },
  );

  it('denies legacy resolution when its Client belongs to another professional', async () => {
    prisma.professionalPatientLink.findUnique.mockResolvedValue({
      id: CLIENT_ID,
      isActive: true,
    });
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ userId: 'legacy-user', weight: 70 }, PROFESSIONAL_ID),
    ).rejects.toMatchObject({ status: 404 });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
  });

  it('blocks an archived Client resolved through an authorized legacy link', async () => {
    prisma.professionalPatientLink.findUnique.mockResolvedValue({
      id: CLIENT_ID,
      isActive: true,
    });
    prisma.client.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      status: 'ARCHIVED',
    });
    await expect(
      service.create({ userId: 'legacy-user', weight: 70 }, PROFESSIONAL_ID),
    ).rejects.toMatchObject({ status: 409 });
    expect(prisma.physicalAssessment.create).not.toHaveBeenCalled();
  });

  it('allows history reads after archival', async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      status: 'ARCHIVED',
    });
    prisma.physicalAssessment.findMany.mockResolvedValue([
      { id: 'historical-assessment' },
    ]);
    await expect(
      service.findByClient(CLIENT_ID, PROFESSIONAL_ID),
    ).resolves.toEqual([{ id: 'historical-assessment' }]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('lists only assessments from Clients owned by the current professional', async () => {
    prisma.physicalAssessment.findMany.mockResolvedValue([]);

    await service.findAll(PROFESSIONAL_ID);

    expect(prisma.physicalAssessment.findMany).toHaveBeenCalledWith({
      where: { client: { professionalId: PROFESSIONAL_ID } },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  });

  it('does not delete an assessment owned by another professional', async () => {
    prisma.physicalAssessment.findFirst.mockResolvedValue(null);
    const remove = service.remove.bind(
      service,
    ) as unknown as ProfessionalRemove;

    await expect(
      remove('assessment-1', PROFESSIONAL_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.physicalAssessment.delete).not.toHaveBeenCalled();
  });
});

describe('shared assessment creation through the authorized role boundary', () => {
  const user: AuthUser = { sub: PROFESSIONAL_ID, role: 'PERSONAL' };
  const tx = {
    $queryRaw: jest.fn(),
    client: { findFirst: jest.fn() },
    professionalPatientLink: { findUnique: jest.fn() },
    physicalAssessment: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (connection: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AssessmentsController],
      providers: [
        AssessmentsService,
        RolesGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user?: AuthUser } };
        }) {
          context.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    user.role = 'PERSONAL';
    tx.$queryRaw.mockResolvedValue([{ id: CLIENT_ID }]);
    tx.client.findFirst.mockResolvedValue({ id: CLIENT_ID, status: 'ACTIVE' });
    tx.professionalPatientLink.findUnique.mockResolvedValue({
      id: CLIENT_ID,
      isActive: true,
    });
    tx.physicalAssessment.create.mockResolvedValue({
      id: 'assessment-1',
      clientId: CLIENT_ID,
    });
  });
  it.each(['PERSONAL', 'NUTRITIONIST', 'PHYSIO'] as const)(
    'preserves valid Client and legacy writes for %s',
    async (role) => {
      user.role = role;
      await request(app.getHttpServer())
        .post('/assessments')
        .send({ clientId: CLIENT_ID, squat1RM: 80 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/assessments')
        .send({ userId: 'legacy-user', muscleMass: 40, vo2Max: 30 })
        .expect(201);
      expect(tx.physicalAssessment.create).toHaveBeenCalledTimes(2);
      expect(tx.client.findFirst).toHaveBeenCalledWith({
        where: { id: CLIENT_ID, professionalId: PROFESSIONAL_ID },
        select: { status: true },
      });
    },
  );
  it.each(['PERSONAL', 'NUTRITIONIST', 'PHYSIO'] as const)(
    'blocks archived Client and legacy writes for %s',
    async (role) => {
      user.role = role;
      tx.client.findFirst.mockResolvedValue({
        id: CLIENT_ID,
        status: 'ARCHIVED',
      });
      await request(app.getHttpServer())
        .post('/assessments')
        .send({ clientId: CLIENT_ID, squat1RM: 80 })
        .expect(409);
      await request(app.getHttpServer())
        .post('/assessments')
        .send({ userId: 'legacy-user', weight: 70 })
        .expect(409);
      expect(tx.physicalAssessment.create).not.toHaveBeenCalled();
    },
  );
  it.each(['ADMIN', 'PATIENT'] as const)(
    'continues denying %s before resource access',
    async (role) => {
      user.role = role;
      await request(app.getHttpServer())
        .post('/assessments')
        .send({ clientId: CLIENT_ID, squat1RM: 80 })
        .expect(403);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    { notes: 'Nota' },
    { weight: 0 },
    { waist: -1 },
    { bodyFat: 101 },
    { squat1RM: null },
  ])('rejects invalid HTTP input without writing: %j', async (values) => {
    await request(app.getHttpServer())
      .post('/assessments')
      .send({ clientId: CLIENT_ID, ...values })
      .expect(400);
    expect(tx.physicalAssessment.create).not.toHaveBeenCalled();
  });
});
