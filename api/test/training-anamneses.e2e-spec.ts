import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma.service';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import {
  clearIsolationFixtures,
  isolationDatabase,
  isolationFixtures,
  seedIsolationFixtures,
} from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';

const actor = isolationFixtures.training.a;
const other = isolationFixtures.training.b;
const clientA = isolationFixtures.training.clientA;
const clientB = isolationFixtures.training.clientB;

const cleanParq = {
  heartCondition: false,
  chestPainActivity: false,
  chestPainRest: false,
  dizzinessOrSyncope: false,
  boneOrJointProblem: false,
  bloodPressureMedication: false,
  otherReason: false,
};

describe('Training anamneses HTTP and real LOGIN RLS', () => {
  let app: INestApplication<App>;
  let admin: PrismaService;
  let pool: Pool;
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const auth = (key = 'a') => `Bearer ${tokens[key]}`;

  beforeAll(async () => {
    admin = testAdminPrisma();
    pool = new Pool({ connectionString: isolationDatabase });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
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

  beforeEach(async () => {
    await seedIsolationFixtures(admin);
    for (const [key, user] of Object.entries({
      a: actor,
      b: other,
      nutrition: isolationFixtures.nutrition.a,
      physio: isolationFixtures.physio.a,
    })) {
      tokens[key] = (
        await app
          .get(AuthSessionService)
          .create(
            await admin.user.findUniqueOrThrow({ where: { id: user.sub } }),
          )
      ).access_token;
    }
  });

  afterAll(async () => {
    await app?.close();
    if (admin) {
      await clearIsolationFixtures(admin);
      await admin.$disconnect();
    }
    await pool?.end();
  });

  it('persists PAR-Q+ screening, environment and equipment for owned Client and isolates across accounts/roles', async () => {
    const created = await http()
      .post('/workouts/anamneses')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        parqAnswers: { ...cleanParq, chestPainActivity: true },
        medicalClearanceNotes: 'Atestado cardiológico apresentado em consulta',
        musculoskeletalHistory: 'Tendinopatia supraespinhal direita compensada',
        trainingExperience: 'INTERMEDIATE',
        daysPerWeek: 4,
        maxSessionMinutes: 55,
        environment: 'CONDO_GYM',
        availableEquipment: ['DUMBBELL', 'CABLE', 'BODYWEIGHT'],
        notes: 'Evitar desenvolvimento atrás da nuca',
      })
      .expect(201)
      .expect('Cache-Control', 'no-store');

    expect(created.body).toMatchObject({
      clientId: clientA,
      hasPositiveParq: true,
      environment: 'CONDO_GYM',
      availableEquipment: ['DUMBBELL', 'CABLE', 'BODYWEIGHT'],
    });
    expect(created.body).not.toHaveProperty('professionalId');

    const listed = await http()
      .get(`/workouts/anamneses/client/${clientA}`)
      .set('Authorization', auth('a'))
      .expect(200);
    expect(listed.body).toHaveLength(1);

    // Foreign Personal cannot read or create on clientA
    await http()
      .get(`/workouts/anamneses/client/${clientA}`)
      .set('Authorization', auth('b'))
      .expect(404);
    await http()
      .post('/workouts/anamneses')
      .set('Authorization', auth('b'))
      .send({
        clientId: clientA,
        parqAnswers: cleanParq,
        environment: 'HOME',
        availableEquipment: ['BODYWEIGHT'],
      })
      .expect(404);

    // Other professions receive 403
    for (const role of ['nutrition', 'physio']) {
      await http()
        .get(`/workouts/anamneses/client/${clientA}`)
        .set('Authorization', auth(role))
        .expect(403);
    }

    // Archived client allows reading history, blocks creating new record
    await admin.client.update({
      where: { id: clientA },
      data: { status: 'ARCHIVED' },
    });
    await http()
      .get(`/workouts/anamneses/client/${clientA}`)
      .set('Authorization', auth('a'))
      .expect(200);
    await http()
      .post('/workouts/anamneses')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        parqAnswers: cleanParq,
        environment: 'HOME',
        availableEquipment: ['BODYWEIGHT'],
      })
      .expect(409);

    // Real LOGIN RLS check
    const service = app.get(PrismaService);
    await expect(
      service.runAsProfessional(
        { ...other, sessionId: 'synthetic-anamnesis-rls' },
        'anamnesis-rls',
        () =>
          service.trainingAnamnesis.findMany({ where: { clientId: clientA } }),
      ),
    ).resolves.toEqual([]);

    await expect(
      service.runAsProfessional(
        { ...actor, sessionId: 'synthetic-anamnesis-rls' },
        'anamnesis-rls',
        () =>
          service.trainingAnamnesis.create({
            data: {
              clientId: clientB,
              professionalId: actor.sub,
              parqAnswers: cleanParq,
              hasPositiveParq: false,
              environment: 'HOME',
              availableEquipment: [],
            },
          }),
      ),
    ).rejects.toThrow();
  });
});
