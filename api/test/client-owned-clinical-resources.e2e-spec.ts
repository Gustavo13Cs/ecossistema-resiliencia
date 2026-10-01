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
import { AppModule } from '../src/app.module';
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
