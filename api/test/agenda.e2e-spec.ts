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
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/infra/database/prisma.service';
import { AgendaService } from '../src/modules/agenda/agenda.service';
import { AppModule } from '../src/app.module';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';
const PROFESSIONAL_ID = '10000000-0000-4000-8000-000000000001';
const PATIENT_ID = '10000000-0000-4000-8000-000000000002';
const OTHER_PATIENT_ID = '10000000-0000-4000-8000-000000000003';
const FIXTURE_USER_IDS = [PROFESSIONAL_ID, PATIENT_ID, OTHER_PATIENT_ID];

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      sub: String(request.headers['x-test-user-id']),
      role: String(request.headers['x-test-role']) as Role,
    };
    return true;
  }
}

describe('Agenda core journey (e2e)', () => {
  let app: INestApplication<App>;
  let agendaService: AgendaService;
  let prisma: PrismaService;
  let prismaServices: PrismaService[] = [];
  let databaseReadyForCleanup = false;

  const asUser = (userId: string, role: Role) => ({
    'x-test-user-id': userId,
    'x-test-role': role,
  });

  const assertSafeTestDatabase = () => {
    expect(process.env.DIRECT_URL).toBe(
      'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test',
    );
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
  };

  const deleteFixtures = async () => {
    assertSafeTestDatabase();
    await prisma.user.deleteMany({
      where: { id: { in: FIXTURE_USER_IDS } },
    });
  };

  beforeAll(async () => {
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
    agendaService = app.get(AgendaService);
  });

  beforeEach(async () => {
    await deleteFixtures();
    databaseReadyForCleanup = true;
    await prisma.user.createMany({
      data: [
        {
          id: PROFESSIONAL_ID,
          name: 'Profissional E2E',
          email: 'agenda-professional@e2e.test',
          password: 'not-used-e2e',
          role: 'NUTRITIONIST',
        },
        {
          id: PATIENT_ID,
          name: 'Paciente E2E',
          email: 'agenda-patient@e2e.test',
          password: 'not-used-e2e',
          role: 'PATIENT',
        },
        {
          id: OTHER_PATIENT_ID,
          name: 'Outro Paciente E2E',
          email: 'agenda-other-patient@e2e.test',
          password: 'not-used-e2e',
          role: 'PATIENT',
        },
      ],
    });
    await prisma.professionalPatientLink.create({
      data: {
        professionalId: PROFESSIONAL_ID,
        patientId: PATIENT_ID,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (prisma && databaseReadyForCleanup) {
      await deleteFixtures();
    }
    if (app) {
      await app.close();
    }
    await Promise.allSettled(
      prismaServices.map((prismaService) => prismaService.$disconnect()),
    );
  });

  it('enforces the complete agenda and consent journey without changing DailyTracking', async () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    startsAt.setMilliseconds(0);
    const endsAt = new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const rangeFrom = new Date(startsAt.getTime() - 60 * 60 * 1000);
    const rangeTo = new Date(endsAt.getTime() + 60 * 60 * 1000);
    const checkInFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const checkInTo = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dailyTrackingBefore = await prisma.dailyTracking.count({
      where: { patientId: PATIENT_ID },
    });

    const createdTask = await request(app.getHttpServer())
      .post('/agenda/tasks')
      .set(asUser(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .send({
        patientId: PATIENT_ID,
        title: 'Hidratação diária',
        category: 'HYDRATION',
        instructions: 'Beber água ao longo do dia',
        priority: 'HIGH',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timeZone: 'UTC',
        recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
      })
      .expect(201);

    expect(createdTask.body).toMatchObject({
      patientId: PATIENT_ID,
      professionalId: PROFESSIONAL_ID,
      title: 'Hidratação diária',
      status: 'ACTIVE',
    });

    const occurrencesAfterCreate = await prisma.agendaTaskOccurrence.count({
      where: { taskId: createdTask.body.id },
    });
    await agendaService.materializeActiveTasks(rangeFrom, rangeTo);
    const occurrencesAfterFirstMaterialization =
      await prisma.agendaTaskOccurrence.count({
        where: { taskId: createdTask.body.id },
      });
    const secondMaterialization = await agendaService.materializeActiveTasks(
      rangeFrom,
      rangeTo,
    );
    const occurrencesAfterSecondMaterialization =
      await prisma.agendaTaskOccurrence.count({
        where: { taskId: createdTask.body.id },
      });

    expect(occurrencesAfterCreate).toBe(3);
    expect(occurrencesAfterFirstMaterialization).toBe(3);
    expect(secondMaterialization.count).toBe(0);
    expect(occurrencesAfterSecondMaterialization).toBe(3);

    const agendaBeforeCompletion = await request(app.getHttpServer())
      .get(`/agenda/patient/${PATIENT_ID}`)
      .set(asUser(PATIENT_ID, 'PATIENT'))
      .query({ from: rangeFrom.toISOString(), to: rangeTo.toISOString() })
      .expect(200);

    expect(agendaBeforeCompletion.body.summary).toEqual({
      actionable: 3,
      completed: 0,
      percentage: 0,
    });
    expect(
      agendaBeforeCompletion.body.occurrences.map(
        (occurrence: { scheduledFor: string }) => occurrence.scheduledFor,
      ),
    ).toEqual([
      startsAt.toISOString(),
      new Date(startsAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt.toISOString(),
    ]);

    const occurrenceId = agendaBeforeCompletion.body.occurrences[0].id;
    await request(app.getHttpServer())
      .post(`/agenda/occurrences/${occurrenceId}/complete`)
      .set(asUser(OTHER_PATIENT_ID, 'PATIENT'))
      .send({ patientNote: 'Tentativa de outro paciente' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/agenda/occurrences/${occurrenceId}/complete`)
      .set(asUser(PATIENT_ID, 'PATIENT'))
      .send({ patientNote: 'Concluída no horário' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: occurrenceId,
          patientId: PATIENT_ID,
          status: 'COMPLETED',
          patientNote: 'Concluída no horário',
        });
      });

    const occurrenceToSkipId = agendaBeforeCompletion.body.occurrences[1].id;
    await request(app.getHttpServer())
      .post(`/agenda/occurrences/${occurrenceToSkipId}/skip`)
      .set(asUser(OTHER_PATIENT_ID, 'PATIENT'))
      .send({ reason: 'Tentativa de outro paciente' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/agenda/occurrences/${occurrenceToSkipId}/skip`)
      .set(asUser(PATIENT_ID, 'PATIENT'))
      .send({ reason: 'Orientado pelo profissional' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: occurrenceToSkipId,
          patientId: PATIENT_ID,
          status: 'SKIPPED',
          skipReason: 'Orientado pelo profissional',
        });
      });

    const agendaAfterCompletion = await request(app.getHttpServer())
      .get(`/agenda/patient/${PATIENT_ID}`)
      .set(asUser(PATIENT_ID, 'PATIENT'))
      .query({ from: rangeFrom.toISOString(), to: rangeTo.toISOString() })
      .expect(200);

    expect(agendaAfterCompletion.body.summary).toEqual({
      actionable: 3,
      completed: 1,
      percentage: 33,
    });

    const createdCheckIn = await request(app.getHttpServer())
      .post('/health-check-ins')
      .set(asUser(PATIENT_ID, 'PATIENT'))
      .send({ waterMl: 1800, mood: 4, notes: 'Disposição boa' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/health-check-ins/patient/${PATIENT_ID}`)
      .set(asUser(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .query({
        from: checkInFrom.toISOString(),
        to: checkInTo.toISOString(),
      })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/consents/${PROFESSIONAL_ID}/HEALTH_CHECK_IN`)
      .set(asUser(PATIENT_ID, 'PATIENT'))
      .send({ granted: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          patientId: PATIENT_ID,
          professionalId: PROFESSIONAL_ID,
          dataCategory: 'HEALTH_CHECK_IN',
          granted: true,
        });
      });

    await request(app.getHttpServer())
      .get(`/health-check-ins/patient/${PATIENT_ID}`)
      .set(asUser(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .query({
        from: checkInFrom.toISOString(),
        to: checkInTo.toISOString(),
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: createdCheckIn.body.id,
          patientId: PATIENT_ID,
          waterMl: 1800,
          mood: 4,
        });
      });

    await prisma.professionalPatientLink.update({
      where: {
        professionalId_patientId: {
          professionalId: PROFESSIONAL_ID,
          patientId: PATIENT_ID,
        },
      },
      data: { isActive: false },
    });

    await request(app.getHttpServer())
      .get(`/agenda/patient/${PATIENT_ID}`)
      .set(asUser(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .query({ from: rangeFrom.toISOString(), to: rangeTo.toISOString() })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/agenda/tasks/${createdTask.body.id}`)
      .set(asUser(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .send({ title: 'Tarefa sem vínculo' })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/health-check-ins/patient/${PATIENT_ID}`)
      .set(asUser(PROFESSIONAL_ID, 'NUTRITIONIST'))
      .query({
        from: checkInFrom.toISOString(),
        to: checkInTo.toISOString(),
      })
      .expect(403);

    expect(
      await prisma.dailyTracking.count({ where: { patientId: PATIENT_ID } }),
    ).toBe(dailyTrackingBefore);
  });
});
