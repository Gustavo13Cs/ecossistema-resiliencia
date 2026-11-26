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
const clientB = isolationFixtures.physio.clientB;

type EvolutionBody = {
  id: string;
  clientId: string;
  appointmentId: string | null;
  rehabPlanId: string | null;
  painBefore: number | null;
  painAfter: number | null;
  proceduresApplied: string[];
};

type WorkspaceBody = {
  counts: {
    activePatients: number;
    archivedPatients: number;
    completedWithoutEvolution: number;
    withoutActivePlan: number;
    overdueReassessments: number;
    painWorsening: number;
  };
  items: Array<Record<string, unknown>>;
};

type OverviewBody = {
  client: { id: string; status: string };
  painSeries: Array<Record<string, unknown>>;
  unlinkedAppointments: Array<Record<string, unknown>>;
};

describe('Physio workspace and session evolutions HTTP and RLS (PostgreSQL)', () => {
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

  const clearPhysioExtras = async () => {
    await admin.physioSessionEvolution.deleteMany({
      where: { professionalId: { in: [actor.sub, other.sub] } },
    });
    await admin.appointment.deleteMany({
      where: { professionalId: { in: [actor.sub, other.sub] } },
    });
  };

  beforeEach(async () => {
    await clearPhysioExtras();
    await seedIsolationFixtures(admin);
    for (const [key, user] of Object.entries({
      a: actor,
      b: other,
      personal: isolationFixtures.training.a,
      nutrition: isolationFixtures.nutrition.a,
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
      await clearPhysioExtras();
      await clearIsolationFixtures(admin);
      await admin.$disconnect();
    }
    await pool?.end();
  });

  it('keeps a linked evolution in its original chart when editing the agenda', async () => {
    await admin.client.update({
      where: { id: clientB },
      data: { professionalId: actor.sub },
    });
    const appointment = await admin.appointment.create({
      data: {
        professionalId: actor.sub,
        clientId: clientA,
        kind: 'SESSION',
        modality: 'IN_PERSON',
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 90_000_000),
        timeZone: 'UTC',
      },
    });
    const evolution = await admin.physioSessionEvolution.create({
      data: {
        clientId: clientA,
        professionalId: actor.sub,
        appointmentId: appointment.id,
        sessionDate: appointment.startsAt,
        patientResponse: 'Registro de teste',
      },
    });

    await http()
      .patch('/appointments/' + appointment.id)
      .set('Authorization', auth())
      .send({
        clientId: clientB,
        expectedUpdatedAt: appointment.updatedAt.toISOString(),
      })
      .expect(409);

    await expect(
      admin.appointment.update({
        where: { id: appointment.id },
        data: { clientId: clientB },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await admin.appointment.delete({ where: { id: appointment.id } });
    await expect(
      admin.physioSessionEvolution.findUnique({ where: { id: evolution.id } }),
    ).resolves.toMatchObject({ clientId: clientA, appointmentId: null });
  });

  it('creates, updates, queries and isolates session evolutions with real PostgreSQL RLS', async () => {
    const appointment = await admin.appointment.create({
      data: {
        professionalId: actor.sub,
        clientId: clientA,
        kind: 'SESSION',
        status: 'COMPLETED',
        modality: 'IN_PERSON',
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 60 * 60 * 1000),
        timeZone: 'America/Sao_Paulo',
      },
    });

    const plan = await admin.rehabPlan.create({
      data: {
        clientId: clientA,
        creatorId: actor.sub,
        title: 'Protocolo LCA Fase 1',
        isActive: true,
      },
    });

    const created = await http()
      .post('/rehab-plans/evolutions')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        appointmentId: appointment.id,
        rehabPlanId: plan.id,
        painBefore: 7,
        painAfter: 4,
        proceduresApplied: ['TENS', 'Mobilização patelar'],
        patientResponse: 'Boa tolerância, redução imediata de quadro álgico.',
        nextSteps: 'Iniciar isometria em 60 graus',
      })
      .expect(201)
      .expect('Cache-Control', 'no-store');

    const createdBody = created.body as EvolutionBody;
    expect(createdBody).toMatchObject({
      clientId: clientA,
      appointmentId: appointment.id,
      rehabPlanId: plan.id,
      painBefore: 7,
      painAfter: 4,
      proceduresApplied: ['TENS', 'Mobilização patelar'],
    });
    expect(createdBody).not.toHaveProperty('professionalId');

    // Duplicate appointment evolution is rejected with 409
    await http()
      .post('/rehab-plans/evolutions')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        appointmentId: appointment.id,
        patientResponse: 'Tentativa duplicada',
      })
      .expect(409);

    // Query by appointment & client
    const byAppt = await http()
      .get(`/rehab-plans/evolutions/appointment/${appointment.id}`)
      .set('Authorization', auth('a'))
      .expect(200);
    expect((byAppt.body as EvolutionBody).id).toBe(createdBody.id);

    const list = await http()
      .get(`/rehab-plans/evolutions/client/${clientA}`)
      .set('Authorization', auth('a'))
      .expect(200);
    expect(list.body).toHaveLength(1);

    // Update evolution
    const updated = await http()
      .patch(`/rehab-plans/evolutions/${createdBody.id}`)
      .set('Authorization', auth('a'))
      .send({ painAfter: 3, patientResponse: 'Evolução revisada' })
      .expect(200);
    expect((updated.body as EvolutionBody).painAfter).toBe(3);

    // Cross-account and cross-role isolation
    await http()
      .get(`/rehab-plans/evolutions/client/${clientA}`)
      .set('Authorization', auth('b'))
      .expect(404);
    await http()
      .get(`/rehab-plans/evolutions/client/${clientA}`)
      .set('Authorization', auth('personal'))
      .expect(403);
    await http()
      .get(`/rehab-plans/evolutions/client/${clientA}`)
      .set('Authorization', auth('nutrition'))
      .expect(403);

    // Verify PostgreSQL RLS under safemove_clinical
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE safemove_clinical');
      await client.query(
        `SELECT set_config('safemove.professional_id', $1, true), set_config('safemove.role', 'PHYSIO', true)`,
        [actor.sub],
      );
      const ownerRows = await client.query(
        'SELECT id FROM physio_session_evolutions',
      );
      expect(ownerRows.rows).toHaveLength(1);

      await client.query(
        `SELECT set_config('safemove.professional_id', $1, true), set_config('safemove.role', 'PHYSIO', true)`,
        [other.sub],
      );
      const foreignRows = await client.query(
        'SELECT id FROM physio_session_evolutions',
      );
      expect(foreignRows.rows).toHaveLength(0);

      await client.query(
        `SELECT set_config('safemove.professional_id', $1, true), set_config('safemove.role', 'PERSONAL', true)`,
        [actor.sub],
      );
      const wrongRoleRows = await client.query(
        'SELECT id FROM physio_session_evolutions',
      );
      expect(wrongRoleRows.rows).toHaveLength(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Delete evolution
    await http()
      .delete(`/rehab-plans/evolutions/${createdBody.id}`)
      .set('Authorization', auth('a'))
      .expect(200);
  });

  it('serves workspace alerts, client overview, and enforces ARCHIVED write locks', async () => {
    await admin.physioAssessment.create({
      data: {
        clientId: clientA,
        creatorId: actor.sub,
        chiefComplaint: 'Lombalgia crônica',
        painLevel: 4,
        date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    });
    await admin.physioSessionEvolution.create({
      data: {
        clientId: clientA,
        professionalId: actor.sub,
        sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        painBefore: 5,
        painAfter: 7,
        proceduresApplied: ['Alongamento'],
        patientResponse: 'Dor aumentou após esforço domiciliar',
      },
    });
    const pendingAppt = await admin.appointment.create({
      data: {
        professionalId: actor.sub,
        clientId: clientA,
        kind: 'SESSION',
        status: 'COMPLETED',
        modality: 'IN_PERSON',
        startsAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        timeZone: 'America/Sao_Paulo',
      },
    });

    const workspace = await http()
      .get('/rehab-plans/workspace')
      .set('Authorization', auth('a'))
      .expect(200)
      .expect('Cache-Control', 'no-store');

    const workspaceBody = workspace.body as WorkspaceBody;
    expect(workspaceBody.counts).toMatchObject({
      activePatients: 1,
      archivedPatients: 0,
      completedWithoutEvolution: 1,
      withoutActivePlan: 1,
      overdueReassessments: 1,
      painWorsening: 1,
    });
    expect(workspaceBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientId: clientA,
          section: 'COMPLETED_WITHOUT_EVOLUTION',
          appointmentId: pendingAppt.id,
        }),
        expect.objectContaining({
          clientId: clientA,
          section: 'PAIN_WORSENING',
          previousPain: 4,
          latestPain: 7,
        }),
        expect.objectContaining({
          clientId: clientA,
          section: 'OVERDUE_REASSESSMENT',
        }),
      ]),
    );

    const overview = await http()
      .get(`/rehab-plans/client/${clientA}/overview`)
      .set('Authorization', auth('a'))
      .expect(200)
      .expect('Cache-Control', 'no-store');

    const overviewBody = overview.body as OverviewBody;
    expect(overviewBody.client).toEqual({ id: clientA, status: 'ACTIVE' });
    expect(overviewBody.painSeries).toHaveLength(2);
    expect(overviewBody.unlinkedAppointments).toHaveLength(1);

    // Foreign client B overview returns 404
    await http()
      .get(`/rehab-plans/client/${clientB}/overview`)
      .set('Authorization', auth('a'))
      .expect(404);

    // Archive clientA and confirm writes are rejected with 409
    await admin.client.update({
      where: { id: clientA },
      data: { status: 'ARCHIVED' },
    });

    await http()
      .post('/rehab-plans/evolutions')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        patientResponse: 'Bloqueado após arquivamento',
      })
      .expect(409);

    await http()
      .post('/physio-assessments')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        chiefComplaint: 'Bloqueado após arquivamento',
      })
      .expect(409);
  });
});
