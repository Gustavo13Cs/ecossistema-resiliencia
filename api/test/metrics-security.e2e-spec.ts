import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PatientAccessService } from '../src/common/patient-access/patient-access.service';
import { JwtStrategy } from '../src/common/strategies/jwt.strategy';
import { PrismaService } from '../src/infra/database/prisma.service';
import { MetricsController } from '../src/modules/metrics/metrics.controller';
import { MetricsService } from '../src/modules/metrics/metrics.service';

const TEST_SECRET = 'metrics-security-test-secret-at-least-32-chars';
const PATIENT_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_PATIENT_ID = '10000000-0000-4000-8000-000000000002';
const PROFESSIONAL_ID = '10000000-0000-4000-8000-000000000003';
const ADMIN_ID = '10000000-0000-4000-8000-000000000004';

describe('Metrics authorization (e2e)', () => {
  const prisma = {
    professionalPatientLink: {
      findFirst: jest.fn(),
    },
    dailyTracking: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let app: INestApplication<App>;
  let jwt: JwtService;
  const originalSecret = process.env.JWT_SECRET;

  const bearer = (sub: string, role: Role) => ({
    Authorization: `Bearer ${jwt.sign({
      sub,
      role,
      email: `${sub}@test.local`,
      name: 'Test User',
    })}`,
  });

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    const moduleFixture = await Test.createTestingModule({
      imports: [PassportModule, JwtModule.register({ secret: TEST_SECRET })],
      controllers: [MetricsController],
      providers: [
        JwtStrategy,
        MetricsService,
        PatientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    jwt = moduleFixture.get(JwtService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.professionalPatientLink.findFirst.mockResolvedValue(null);
    prisma.dailyTracking.findMany.mockResolvedValue([]);
    prisma.dailyTracking.create.mockResolvedValue({ id: 'tracking-1' });
  });

  afterAll(async () => {
    await app.close();
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('returns 401 without a JWT', async () => {
    await request(app.getHttpServer())
      .get(`/metrics/today/${PATIENT_ID}`)
      .expect(401);
  });

  it('returns 401 with an invalid JWT', async () => {
    await request(app.getHttpServer())
      .get(`/metrics/today/${PATIENT_ID}`)
      .set({ Authorization: 'Bearer invalid-token' })
      .expect(401);
  });

  it('rejects patientId in the check-in body', async () => {
    await request(app.getHttpServer())
      .post('/metrics/checkin')
      .set(bearer(PATIENT_ID, 'PATIENT'))
      .send({
        patientId: OTHER_PATIENT_ID,
        type: 'MEAL',
        itemName: 'Almoço',
      })
      .expect(400);

    expect(prisma.dailyTracking.create).not.toHaveBeenCalled();
  });

  it('creates a check-in for the JWT patient', async () => {
    await request(app.getHttpServer())
      .post('/metrics/checkin')
      .set(bearer(PATIENT_ID, 'PATIENT'))
      .send({ type: 'MEAL', itemName: 'Almoço' })
      .expect(201);

    expect(prisma.dailyTracking.create).toHaveBeenCalledWith({
      data: {
        patientId: PATIENT_ID,
        type: 'MEAL',
        itemName: 'Almoço',
      },
    });
  });

  it('allows a patient to read their own metrics', async () => {
    await request(app.getHttpServer())
      .get(`/metrics/today/${PATIENT_ID}`)
      .set(bearer(PATIENT_ID, 'PATIENT'))
      .expect(200);
  });

  it('rejects a patient reading another patient', async () => {
    await request(app.getHttpServer())
      .get(`/metrics/today/${OTHER_PATIENT_ID}`)
      .set(bearer(PATIENT_ID, 'PATIENT'))
      .expect(403);

    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('allows a linked professional to read metrics', async () => {
    prisma.professionalPatientLink.findFirst.mockResolvedValue({
      id: 'link-1',
    });

    await request(app.getHttpServer())
      .get(`/metrics/consistency/${PATIENT_ID}`)
      .set(bearer(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .expect(200);
  });

  it('rejects a professional without an active link', async () => {
    await request(app.getHttpServer())
      .get(`/metrics/today/${PATIENT_ID}`)
      .set(bearer(PROFESSIONAL_ID, 'PHYSIO'))
      .expect(403);

    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });

  it('rejects professional writes and ADMIN reads', async () => {
    await request(app.getHttpServer())
      .post('/metrics/checkin')
      .set(bearer(PROFESSIONAL_ID, 'PERSONAL'))
      .send({ type: 'WORKOUT', itemName: 'Treino A' })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/metrics/today/${PATIENT_ID}`)
      .set(bearer(ADMIN_ID, 'ADMIN'))
      .expect(403);

    expect(prisma.dailyTracking.create).not.toHaveBeenCalled();
    expect(prisma.dailyTracking.findMany).not.toHaveBeenCalled();
  });
});
