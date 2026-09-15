import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/infra/database/prisma.service';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';
const PROFESSIONAL_A = '30000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '30000000-0000-4000-8000-000000000002';
const CLIENT_A = '30000000-0000-4000-8000-000000000003';
const CLIENT_B = '30000000-0000-4000-8000-000000000004';
const FIXTURE_USER_IDS = [PROFESSIONAL_A, PROFESSIONAL_B];
const FIXTURE_CLIENT_IDS = [CLIENT_A, CLIENT_B];

type TestRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: Role };
};

type AppointmentResponse = {
  id: string;
  professionalId: string;
  clientId: string;
  status: string;
  cancellationReason: string | null;
  updatedAt: string;
  events: Array<{ type: string }>;
};

const toAppointmentResponse = (value: unknown): AppointmentResponse => {
  if (!value || typeof value !== 'object') {
    throw new Error('Resposta de atendimento inválida.');
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.professionalId !== 'string' ||
    typeof record.clientId !== 'string' ||
    typeof record.status !== 'string' ||
    (record.cancellationReason !== null &&
      typeof record.cancellationReason !== 'string') ||
    typeof record.updatedAt !== 'string' ||
    !Array.isArray(record.events)
  ) {
    throw new Error('Resposta de atendimento incompleta.');
  }

  return {
    id: record.id,
    professionalId: record.professionalId,
    clientId: record.clientId,
    status: record.status,
    cancellationReason: record.cancellationReason,
    updatedAt: record.updatedAt,
    events: record.events.map((event) => {
      if (!event || typeof event !== 'object') {
        throw new Error('Evento de atendimento inválido.');
      }
      const type = (event as Record<string, unknown>).type;
      if (typeof type !== 'string') {
        throw new Error('Tipo de evento de atendimento inválido.');
      }
      return { type };
    }),
  };
};

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TestRequest>();
    request.user = {
      sub: String(request.headers['x-test-user-id']),
      role: String(request.headers['x-test-role']) as Role,
    };
    return true;
  }
}

describe('Professional appointments ownership and lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let prismaServices: PrismaService[] = [];
  let databaseReadyForCleanup = false;
  let jwtSecretWasPresent = false;
  let originalJwtSecret: string | undefined;

  const asUser = (userId: string, role: Role) => ({
    'x-test-user-id': userId,
    'x-test-role': role,
  });

  const assertSafeTestDatabase = () => {
    expect(SAFE_TEST_DATABASE_URL).toMatch(/_test$/);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
  };

  const deleteFixtures = async () => {
    assertSafeTestDatabase();
    await prisma.appointmentEvent.deleteMany({
      where: { professionalId: { in: FIXTURE_USER_IDS } },
    });
    await prisma.appointment.deleteMany({
      where: { professionalId: { in: FIXTURE_USER_IDS } },
    });
    await prisma.clientAuditEvent.deleteMany({
      where: { professionalId: { in: FIXTURE_USER_IDS } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: FIXTURE_CLIENT_IDS } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: FIXTURE_USER_IDS } },
    });
  };

  beforeAll(async () => {
    assertSafeTestDatabase();
    jwtSecretWasPresent = process.env.JWT_SECRET !== undefined;
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'appointments-e2e-only-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prismaServices = app.get(PrismaService, { each: true });
    prisma = prismaServices[0];
  });

  beforeEach(async () => {
    await deleteFixtures();
    databaseReadyForCleanup = true;
    await prisma.user.createMany({
      data: [
        {
          id: PROFESSIONAL_A,
          name: 'Nutricionista Agenda E2E',
          email: 'appointments-professional-a@e2e.test',
          password: 'not-used-e2e',
          role: 'NUTRITIONIST',
        },
        {
          id: PROFESSIONAL_B,
          name: 'Personal Agenda E2E',
          email: 'appointments-professional-b@e2e.test',
          password: 'not-used-e2e',
          role: 'PERSONAL',
        },
      ],
    });
    await prisma.client.createMany({
      data: [
        {
          id: CLIENT_A,
          professionalId: PROFESSIONAL_A,
          name: 'Cliente Agenda A',
          email: 'appointments-client-a@e2e.test',
        },
        {
          id: CLIENT_B,
          professionalId: PROFESSIONAL_B,
          name: 'Cliente Agenda B',
          email: 'appointments-client-b@e2e.test',
        },
      ],
    });
  });

  afterAll(async () => {
    try {
      if (prisma && databaseReadyForCleanup) {
        await deleteFixtures();
      }
    } finally {
      try {
        if (app) {
          await app.close();
        }
      } finally {
        try {
          await Promise.all(
            prismaServices.map((prismaService) => prismaService.$disconnect()),
          );
        } finally {
          if (jwtSecretWasPresent && originalJwtSecret !== undefined) {
            process.env.JWT_SECRET = originalJwtSecret;
          } else {
            delete process.env.JWT_SECRET;
          }
        }
      }
    }
  });

  it('keeps appointments private, conflict-safe and auditable', async () => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    startsAt.setMilliseconds(0);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const rangeFrom = new Date(startsAt.getTime() - 60 * 60 * 1000);
    const rangeTo = new Date(endsAt.getTime() + 60 * 60 * 1000);
    const payload = {
      clientId: CLIENT_A,
      kind: 'FOLLOW_UP',
      modality: 'IN_PERSON',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      timeZone: 'America/Sao_Paulo',
      location: 'Consultório de teste',
      notes: 'Revisar evolução clínica',
    };

    const createdResponse = await request(app.getHttpServer())
      .post('/appointments')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send(payload)
      .expect(201);
    const created = toAppointmentResponse(createdResponse.body);

    expect(created).toMatchObject({
      professionalId: PROFESSIONAL_A,
      clientId: CLIENT_A,
      status: 'SCHEDULED',
      cancellationReason: null,
      events: [{ type: 'CREATED' }],
    });

    await request(app.getHttpServer())
      .post('/appointments')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send(payload)
      .expect(409);

    await request(app.getHttpServer())
      .post('/appointments')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ ...payload, clientId: CLIENT_B })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/appointments/${created.id}`)
      .set(asUser(PROFESSIONAL_B, 'PERSONAL'))
      .expect(404);

    await request(app.getHttpServer())
      .get('/appointments')
      .set(asUser(PROFESSIONAL_B, 'PERSONAL'))
      .query({ from: rangeFrom.toISOString(), to: rangeTo.toISOString() })
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));

    await request(app.getHttpServer())
      .get('/appointments')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .query({ from: rangeFrom.toISOString(), to: rangeTo.toISOString() })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          expect.objectContaining({ id: created.id, status: 'SCHEDULED' }),
        ]),
      );

    const confirmedResponse = await request(app.getHttpServer())
      .post(`/appointments/${created.id}/confirm`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ expectedUpdatedAt: created.updatedAt })
      .expect(201);
    const confirmed = toAppointmentResponse(confirmedResponse.body);

    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.events.map(({ type }) => type)).toEqual([
      'CREATED',
      'CONFIRMED',
    ]);

    await request(app.getHttpServer())
      .patch(`/appointments/${created.id}`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({
        expectedUpdatedAt: created.updatedAt,
        notes: 'Versão antiga não deve sobrescrever',
      })
      .expect(409);

    const cancelledResponse = await request(app.getHttpServer())
      .post(`/appointments/${created.id}/cancel`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({
        expectedUpdatedAt: confirmed.updatedAt,
        reason: 'Cliente solicitou remarcação',
      })
      .expect(201);
    const cancelled = toAppointmentResponse(cancelledResponse.body);

    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'Cliente solicitou remarcação',
    });
    expect(cancelled.events.map(({ type }) => type)).toEqual([
      'CREATED',
      'CONFIRMED',
      'CANCELLED',
    ]);
    await expect(
      prisma.appointmentEvent.count({ where: { appointmentId: created.id } }),
    ).resolves.toBe(3);
  });
});
