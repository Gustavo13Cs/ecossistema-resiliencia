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

const actor = isolationFixtures.physio.a;
const other = isolationFixtures.physio.b;
const clientA = isolationFixtures.physio.clientA;

type AssessmentResponse = {
  id: string;
  clientId: string;
  bodyPainMap: Array<{ region: string; intensity: number }>;
  goniometry: Array<{ joint: string; activeDeg: number }>;
  muscleStrength: Array<{ muscleGroup: string; grade: number }>;
  orthopedicTestItems: Array<{ testName: string; result: string }>;
};

type ScaleResponse = {
  id: string;
  clientId: string;
  scaleType: string;
  rawScore: number;
  normalizedScore: number;
  scoreUnit: string;
  classification: string;
};

describe('Physio structured exam and functional scales HTTP and RLS (PostgreSQL)', () => {
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
      personal: isolationFixtures.training.a,
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

  it('persists structured physical exam fields in PhysioAssessment and returns them in overview', async () => {
    const created = await http()
      .post('/physio-assessments')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        chiefComplaint: 'Dor anterior no joelho direito',
        painLevel: 6,
        bodyPainMap: [
          {
            region: 'Joelho direito',
            view: 'ANTERIOR',
            intensity: 6,
            symptomType: 'SHARP',
          },
        ],
        goniometry: [
          {
            joint: 'Joelho',
            movement: 'Flexão',
            side: 'RIGHT',
            activeDeg: 110,
            passiveDeg: 120,
            referenceDeg: 140,
          },
        ],
        muscleStrength: [
          {
            muscleGroup: 'Quadríceps',
            side: 'RIGHT',
            grade: 4,
            painOnResistance: true,
          },
        ],
        orthopedicTestItems: [
          {
            region: 'Joelho',
            testName: 'Lachman',
            side: 'RIGHT',
            result: 'NEGATIVE',
          },
        ],
      })
      .expect(201);

    const body = created.body as AssessmentResponse;
    expect(body.bodyPainMap[0]).toMatchObject({
      region: 'Joelho direito',
      intensity: 6,
    });
    expect(body.goniometry[0]).toMatchObject({
      joint: 'Joelho',
      activeDeg: 110,
    });
    expect(body.muscleStrength[0]).toMatchObject({
      muscleGroup: 'Quadríceps',
      grade: 4,
    });
    expect(body.orthopedicTestItems[0]).toMatchObject({
      testName: 'Lachman',
      result: 'NEGATIVE',
    });

    const overview = await http()
      .get(`/rehab-plans/client/${clientA}/overview`)
      .set('Authorization', auth('a'))
      .expect(200);
    const recentAssessments = (
      overview.body as { recentAssessments: AssessmentResponse[] }
    ).recentAssessments;
    expect(recentAssessments[0].goniometry).toHaveLength(1);
  });

  it('scores, isolates with RLS, filters and deletes functional scales', async () => {
    const oswestry = await http()
      .post('/rehab-plans/scales')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        scaleType: 'OSWESTRY',
        answers: { sections: [2, 2, 1, 2, 1, 2, 1, null, 2, 2] },
        notes: 'Avaliação inicial lombar',
      })
      .expect(201)
      .expect('Cache-Control', 'no-store');

    const oswestryBody = oswestry.body as ScaleResponse;
    expect(oswestryBody).toMatchObject({
      clientId: clientA,
      scaleType: 'OSWESTRY',
      rawScore: 15,
      normalizedScore: 33.3,
      scoreUnit: '%',
      classification: 'Incapacidade moderada',
    });
    expect(oswestryBody).not.toHaveProperty('professionalId');

    await http()
      .post('/rehab-plans/scales')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        scaleType: 'TUG',
        answers: { timeSeconds: 11.2, assistiveDevice: 'NONE' },
      })
      .expect(201);

    const allScales = await http()
      .get(`/rehab-plans/scales/client/${clientA}`)
      .set('Authorization', auth('a'))
      .expect(200);
    expect(allScales.body as ScaleResponse[]).toHaveLength(2);

    const onlyOswestry = await http()
      .get(`/rehab-plans/scales/client/${clientA}?scaleType=OSWESTRY`)
      .set('Authorization', auth('a'))
      .expect(200);
    expect(onlyOswestry.body as ScaleResponse[]).toHaveLength(1);

    // Cross-account and cross-role isolation
    await http()
      .get(`/rehab-plans/scales/client/${clientA}`)
      .set('Authorization', auth('b'))
      .expect(404);
    await http()
      .get(`/rehab-plans/scales/client/${clientA}`)
      .set('Authorization', auth('personal'))
      .expect(403);

    // PostgreSQL RLS under safemove_clinical
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE safemove_clinical');
      await client.query(
        `SELECT set_config('safemove.professional_id', $1, true), set_config('safemove.role', 'PHYSIO', true)`,
        [actor.sub],
      );
      const ownerRows = await client.query(
        'SELECT id FROM physio_functional_scales',
      );
      expect(ownerRows.rows).toHaveLength(2);

      await client.query(
        `SELECT set_config('safemove.professional_id', $1, true), set_config('safemove.role', 'PHYSIO', true)`,
        [other.sub],
      );
      const foreignRows = await client.query(
        'SELECT id FROM physio_functional_scales',
      );
      expect(foreignRows.rows).toHaveLength(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    await http()
      .delete(`/rehab-plans/scales/${oswestryBody.id}`)
      .set('Authorization', auth('a'))
      .expect(200);

    // Archived lock
    await admin.client.update({
      where: { id: clientA },
      data: { status: 'ARCHIVED' },
    });
    await http()
      .post('/rehab-plans/scales')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        scaleType: 'PSFS',
        answers: { activities: [{ description: 'Caminhar', score: 6 }] },
      })
      .expect(409);
  });
});
