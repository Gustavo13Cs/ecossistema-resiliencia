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
const PROFESSIONAL_A = '20000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '20000000-0000-4000-8000-000000000002';
const FIXTURE_USER_IDS = [PROFESSIONAL_A, PROFESSIONAL_B];

type TestRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: Role };
};

type ClientResponse = {
  id: string;
  professionalId: string;
  name: string;
  email: string | null;
  status: string;
};

const toClientResponse = (value: unknown): ClientResponse => {
  if (!value || typeof value !== 'object') {
    throw new Error('Resposta de cliente inválida.');
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.professionalId !== 'string' ||
    typeof record.name !== 'string' ||
    (record.email !== null && typeof record.email !== 'string') ||
    typeof record.status !== 'string'
  ) {
    throw new Error('Resposta de cliente incompleta.');
  }

  return {
    id: record.id,
    professionalId: record.professionalId,
    name: record.name,
    email: record.email,
    status: record.status,
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

describe('Clients tenant isolation and lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let prismaServices: PrismaService[] = [];
  let databaseReadyForCleanup = false;

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
    await prisma.clientAuditEvent.deleteMany({
      where: { professionalId: { in: FIXTURE_USER_IDS } },
    });
    await prisma.client.deleteMany({
      where: { professionalId: { in: FIXTURE_USER_IDS } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: FIXTURE_USER_IDS } },
    });
  };

  const expectNoFixtures = async () => {
    assertSafeTestDatabase();
    await expect(
      prisma.clientAuditEvent.count({
        where: { professionalId: { in: FIXTURE_USER_IDS } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.client.count({
        where: { professionalId: { in: FIXTURE_USER_IDS } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.user.count({ where: { id: { in: FIXTURE_USER_IDS } } }),
    ).resolves.toBe(0);
  };

  beforeAll(async () => {
    assertSafeTestDatabase();
    process.env.JWT_SECRET = 'clients-e2e-only-secret';

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
          name: 'Nutricionista E2E',
          email: 'clients-professional-a@e2e.test',
          password: 'not-used-e2e',
          role: 'NUTRITIONIST',
        },
        {
          id: PROFESSIONAL_B,
          name: 'Personal E2E',
          email: 'clients-professional-b@e2e.test',
          password: 'not-used-e2e',
          role: 'PERSONAL',
        },
      ],
    });
  });

  afterAll(async () => {
    try {
      if (prisma && databaseReadyForCleanup) {
        await deleteFixtures();
        await expectNoFixtures();
      }
    } finally {
      if (app) {
        await app.close();
      }
      await Promise.allSettled(
        prismaServices.map((prismaService) => prismaService.$disconnect()),
      );
    }
  });

  it('keeps clients private and archives without deleting history', async () => {
    const created = await request(app.getHttpServer())
      .post('/clients')
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ name: 'Cliente A', email: 'shared@example.test' })
      .expect(201);
    const createdBody = toClientResponse(created.body);

    expect(createdBody).toMatchObject({
      professionalId: PROFESSIONAL_A,
      name: 'Cliente A',
      email: 'shared@example.test',
      status: 'ACTIVE',
    });

    const otherCreated = await request(app.getHttpServer())
      .post('/clients')
      .set(asUser(PROFESSIONAL_B, 'PERSONAL'))
      .send({ name: 'Cliente B', email: 'shared@example.test' })
      .expect(201);
    const otherCreatedBody = toClientResponse(otherCreated.body);

    expect(otherCreatedBody).toMatchObject({
      professionalId: PROFESSIONAL_B,
      name: 'Cliente B',
      email: 'shared@example.test',
      status: 'ACTIVE',
    });

    await request(app.getHttpServer())
      .get(`/clients/${createdBody.id}`)
      .set(asUser(PROFESSIONAL_B, 'PERSONAL'))
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/clients/${createdBody.id}`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ professionalId: PROFESSIONAL_B })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/clients/${createdBody.id}/status`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ status: 'ARCHIVED' })
      .expect(200)
      .expect((response) =>
        expect(toClientResponse(response.body).status).toBe('ARCHIVED'),
      );

    expect(
      await prisma.clientAuditEvent.count({
        where: { clientId: createdBody.id, action: 'ARCHIVED' },
      }),
    ).toBe(1);

    await request(app.getHttpServer())
      .get('/clients')
      .query({ status: 'ACTIVE' })
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));

    await request(app.getHttpServer())
      .get('/clients')
      .query({ status: 'ARCHIVED' })
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          expect.objectContaining({
            id: createdBody.id,
            status: 'ARCHIVED',
          }),
        ]),
      );

    await request(app.getHttpServer())
      .patch(`/clients/${createdBody.id}`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ name: 'Cliente A Atualizado' })
      .expect(200)
      .expect((response) =>
        expect(toClientResponse(response.body).name).toBe(
          'Cliente A Atualizado',
        ),
      );

    await request(app.getHttpServer())
      .patch(`/clients/${createdBody.id}/status`)
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .send({ status: 'ACTIVE' })
      .expect(200)
      .expect((response) =>
        expect(toClientResponse(response.body).status).toBe('ACTIVE'),
      );

    await request(app.getHttpServer())
      .get('/clients')
      .query({ status: 'ACTIVE' })
      .set(asUser(PROFESSIONAL_A, 'NUTRITIONIST'))
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual([
          expect.objectContaining({
            id: createdBody.id,
            name: 'Cliente A Atualizado',
            status: 'ACTIVE',
          }),
        ]),
      );

    const auditEvents = await prisma.clientAuditEvent.findMany({
      where: { clientId: createdBody.id },
      select: { professionalId: true, action: true },
    });

    expect(auditEvents).toHaveLength(4);
    expect(auditEvents).toEqual(
      expect.arrayContaining([
        { professionalId: PROFESSIONAL_A, action: 'CREATED' },
        { professionalId: PROFESSIONAL_A, action: 'ARCHIVED' },
        { professionalId: PROFESSIONAL_A, action: 'UPDATED' },
        { professionalId: PROFESSIONAL_A, action: 'RESTORED' },
      ]),
    );
  });
});
