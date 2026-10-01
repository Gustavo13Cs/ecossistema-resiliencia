import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule, GLOBAL_JWT_AUTH_GUARD } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import {
  assertIsolationDatabase,
  clearIsolationFixtures,
  isolationFixtures,
  seedIsolationFixtures,
} from './fixtures/client-isolation';

// Apenas a identidade é injetada: controllers, roles, DTOs, ownership e banco são reais.
class FixtureAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user: AuthUser }>();
    req.user = {
      sub: req.headers['x-test-user-id'],
      role: req.headers['x-test-role'] as AuthUser['role'],
    };
    return true;
  }
}

describe('Client-owned clinical resources (PostgreSQL HTTP)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const asUser = (user: AuthUser) => ({
    'x-test-user-id': user.sub,
    'x-test-role': user.role,
  });

  beforeAll(async () => {
    assertIsolationDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useClass(FixtureAuthGuard)
      .overrideProvider(GLOBAL_JWT_AUTH_GUARD)
      .useClass(FixtureAuthGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    prisma = module.get(PrismaService);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    await seedIsolationFixtures(prisma);
  });
  afterAll(async () => {
    try {
      if (prisma) await clearIsolationFixtures(prisma);
    } finally {
      await app?.close();
    }
  });

  it.each(['client-goals', 'lab-exams', 'lab-orders'])(
    '%s disables persistent HTTP caching of clinical responses',
    async (path) => {
      await request(app.getHttpServer())
        .get(`/${path}`)
        .set(asUser(isolationFixtures.nutrition.a))
        .expect(200)
        .expect('Cache-Control', 'no-store');
    },
  );

  it('persists one current goal per Client and isolates read/upsert/delete/list', async () => {
    const { a, b, clientA } = isolationFixtures.nutrition;
    const payload = {
      category: 'WEIGHT_LOSS',
      startDate: '2026-10-01',
      targetDate: '2026-12-01',
      targetWeightKg: 80,
      habits: {
        waterTargetMl: 2500,
        sleepTargetHours: 8,
        mealsAdherencePercent: 90,
        dailyStepsTarget: 8000,
      },
    };
    const created = await request(app.getHttpServer())
      .put(`/client-goals/${clientA}`)
      .set(asUser(a))
      .send(payload)
      .expect(200);
    const row: unknown = created.body;
    expect(row).toMatchObject({
      clientId: clientA,
      professionalId: a.sub,
      habits: payload.habits,
    });
    const id = (row as { id: string }).id;
    const before = await prisma.clientGoal.findUniqueOrThrow({
      where: { clientId: clientA },
    });
    await request(app.getHttpServer())
      .get(`/client-goals/${clientA}`)
      .set(asUser(b))
      .expect(404);
    await request(app.getHttpServer())
      .put(`/client-goals/${clientA}`)
      .set(asUser(b))
      .send({ ...payload, targetWeightKg: 70 })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/client-goals/${clientA}`)
      .set(asUser(b))
      .expect(404);
    const foreign = await request(app.getHttpServer())
      .get('/client-goals')
      .set(asUser(b))
      .expect(200);
    expect(foreign.body).toEqual([]);
    expect(
      await prisma.clientGoal.findUnique({ where: { clientId: clientA } }),
    ).toEqual(before);
    const updated = await request(app.getHttpServer())
      .put(`/client-goals/${clientA}`)
      .set(asUser(a))
      .send({ ...payload, targetWeightKg: 78 })
      .expect(200);
    expect(updated.body).toMatchObject({ id, targetWeightKg: 78 });
    expect(
      await prisma.clientGoal.count({ where: { clientId: clientA } }),
    ).toBe(1);
    await request(app.getHttpServer())
      .delete(`/client-goals/${clientA}`)
      .set(asUser(a))
      .expect(200);
    expect(
      await prisma.clientGoal.findUnique({ where: { clientId: clientA } }),
    ).toBeNull();
  });

  it('persists orders and aggregate exams using live owned Client relations', async () => {
    const { a, b, clientA } = isolationFixtures.nutrition;
    for (const domain of [
      {
        path: 'lab-orders',
        payload: {
          clientId: clientA,
          markers: ['Synthetic marker'],
          title: 'Synthetic panel',
        },
        row: (id: string) => prisma.labOrder.findUnique({ where: { id } }),
      },
      {
        path: 'lab-exams',
        payload: {
          clientId: clientA,
          date: '2026-10-01T12:00:00.000Z',
          markers: [{ name: 'Synthetic marker', value: 90, unit: 'mg/dL' }],
        },
        row: (id: string) => prisma.labExam.findUnique({ where: { id } }),
      },
    ]) {
      const created = await request(app.getHttpServer())
        .post(`/${domain.path}`)
        .set(asUser(a))
        .send(domain.payload)
        .expect(201);
      const body: unknown = created.body;
      expect(body).toMatchObject({
        clientId: clientA,
        client: { id: clientA, name: 'Synthetic Client A' },
        markers: domain.payload.markers,
      });
      const id = (body as { id: string }).id;
      const before = await domain.row(id);
      const own = await request(app.getHttpServer())
        .get(`/${domain.path}`)
        .set(asUser(a))
        .expect(200);
      expect(own.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id })]),
      );
      const other = await request(app.getHttpServer())
        .get(`/${domain.path}`)
        .set(asUser(b))
        .expect(200);
      expect(other.body).toEqual([]);
      await request(app.getHttpServer())
        .delete(`/${domain.path}/${id}`)
        .set(asUser(b))
        .expect(404);
      expect(await domain.row(id)).toEqual(before);
      await request(app.getHttpServer())
        .delete(`/${domain.path}/${id}`)
        .set(asUser(a))
        .expect(200);
      expect(await domain.row(id)).toBeNull();
    }
  });

  const domains = [
    {
      path: 'workouts',
      fixture: isolationFixtures.training,
      payload: {
        title: 'Synthetic workout',
        splits: [
          { name: 'A', exercises: [{ name: 'Squat', sets: '3', reps: '10' }] },
        ],
      },
      active: true,
      row: (id: string) =>
        prisma.workout.findUnique({
          where: { id },
          include: { splits: { include: { exercises: true } } },
        }),
      deletion: true,
      template: true,
    },
    {
      path: 'rehab-plans',
      fixture: isolationFixtures.physio,
      payload: {
        title: 'Synthetic rehab',
        sessions: [{ name: 'A', exercises: [{ name: 'Mobility' }] }],
      },
      active: true,
      row: (id: string) =>
        prisma.rehabPlan.findUnique({
          where: { id },
          include: { sessions: { include: { exercises: true } } },
        }),
      deletion: true,
      template: true,
    },
    {
      path: 'physio-assessments',
      fixture: isolationFixtures.physio,
      payload: { chiefComplaint: 'Synthetic complaint', painLevel: 3 },
      active: false,
      row: (id: string) =>
        prisma.physioAssessment.findUnique({ where: { id } }),
      deletion: true,
      template: false,
    },
    {
      path: 'anamneses',
      fixture: isolationFixtures.nutrition,
      payload: { clinicalHistory: 'Synthetic history' },
      active: false,
      row: (id: string) => prisma.anamnesis.findUnique({ where: { id } }),
      deletion: false,
      template: false,
    },
    {
      path: 'consultation-notes',
      fixture: isolationFixtures.nutrition,
      payload: { content: 'Synthetic note' },
      active: false,
      row: (id: string) =>
        prisma.consultationNote.findUnique({ where: { id } }),
      deletion: true,
      template: false,
    },
    {
      path: 'supplements',
      fixture: isolationFixtures.nutrition,
      payload: {
        title: 'Synthetic prescription',
        items: [{ name: 'Synthetic formula' }],
      },
      active: true,
      row: (id: string) =>
        prisma.supplementPlan.findUnique({
          where: { id },
          include: { items: true },
        }),
      deletion: false,
      template: false,
    },
    {
      path: 'lab-exams',
      fixture: isolationFixtures.nutrition,
      payload: {
        date: '2026-09-30T12:00:00.000Z',
        markers: [{ name: 'Synthetic marker', value: 90, unit: 'mg/dL' }],
      },
      active: false,
      row: (id: string) =>
        prisma.labExam.findUnique({
          where: { id },
          include: { markers: true },
        }),
      deletion: false,
      template: false,
    },
  ];

  it.each(domains)(
    '$path isolates persisted rows and rejects internal identities',
    async (domain) => {
      const { a, b, clientA, clientB } = domain.fixture;
      const payload = { ...domain.payload, clientId: clientA };
      const created = await request(app.getHttpServer())
        .post(`/${domain.path}`)
        .set(asUser(a))
        .send(payload)
        .expect(201);
      const result: unknown = created.body;
      expect(result).toMatchObject({ clientId: clientA, creatorId: a.sub });
      const id = (result as { id: string }).id;
      expect(typeof id).toBe('string');
      const before = await domain.row(id);
      expect(before).toMatchObject({ clientId: clientA, creatorId: a.sub });
      expect(
        before && ('userId' in before ? before.userId : before.patientId),
      ).toBeNull();
      const readPath = `/${domain.path}/client/${clientA}${domain.active ? '/active' : ''}`;
      const read = await request(app.getHttpServer())
        .get(readPath)
        .set(asUser(a))
        .expect(200);
      expect(
        domain.active
          ? read.body
          : (read.body as { id: string }[]).find((row) => row.id === id),
      ).toMatchObject({ id, clientId: clientA });
      await request(app.getHttpServer())
        .get(readPath)
        .set(asUser(b))
        .expect(404);
      await request(app.getHttpServer())
        .post(`/${domain.path}`)
        .set(asUser(b))
        .send(payload)
        .expect(404);
      await request(app.getHttpServer())
        .post(`/${domain.path}`)
        .set(asUser(a))
        .send({ ...payload, clientId: clientB })
        .expect(404);
      if (domain.deletion)
        await request(app.getHttpServer())
          .delete(`/${domain.path}/${id}`)
          .set(asUser(b))
          .expect(404);
      if (domain.template)
        await request(app.getHttpServer())
          .patch(`/${domain.path}/${id}/save-as-template`)
          .set(asUser(b))
          .send({})
          .expect(404);
      if (domain.path === 'consultation-notes')
        await request(app.getHttpServer())
          .patch(`/${domain.path}/${id}`)
          .set(asUser(b))
          .send({ content: 'Unauthorized change' })
          .expect(404);
      const admin: AuthUser = { sub: a.sub, role: 'ADMIN' };
      await request(app.getHttpServer())
        .get(readPath)
        .set(asUser(admin))
        .expect(403);
      await request(app.getHttpServer())
        .post(`/${domain.path}`)
        .set(asUser(admin))
        .send(payload)
        .expect(403);
      for (const field of [
        'userId',
        'patientId',
        'creatorId',
        'professionalId',
      ]) {
        await request(app.getHttpServer())
          .post(`/${domain.path}`)
          .set(asUser(a))
          .send({ ...payload, [field]: b.sub })
          .expect(400);
      }
      expect(await domain.row(id)).toEqual(before);
      const legacy = `/${domain.path}/${domain.path === 'workouts' || domain.path === 'rehab-plans' ? 'user' : 'patient'}/${clientA}${domain.active ? '/active' : ''}`;
      await request(app.getHttpServer()).get(legacy).set(asUser(a)).expect(404);
    },
  );

  it.each(Object.values(isolationFixtures))(
    'scopes Client overview before aggregation for $a.role',
    async ({ a, b, clientA }) => {
      const own = await request(app.getHttpServer())
        .get(`/clients/${clientA}/overview`)
        .set(asUser(a))
        .expect(200);
      expect(own.body).toMatchObject({
        client: { id: clientA, name: 'Synthetic Client A' },
      });
      expect(
        await prisma.client.findUnique({
          where: { id: clientA },
          select: { professionalId: true },
        }),
      ).toEqual({ professionalId: a.sub });
      await request(app.getHttpServer())
        .get(`/clients/${clientA}/overview`)
        .set(asUser(b))
        .expect(404);
      await request(app.getHttpServer())
        .get(`/clients/${clientA}/overview`)
        .set(asUser({ sub: a.sub, role: 'ADMIN' }))
        .expect(403);
    },
  );
});
