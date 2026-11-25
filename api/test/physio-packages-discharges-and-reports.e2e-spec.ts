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

type PackageResponse = {
  id: string;
  clientId: string;
  title: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  progressLabel: string;
  noShowCount: number;
  reassessmentDue: boolean;
  nearingEnd: boolean;
};

type DischargeResponse = {
  id: string;
  clientId: string;
  reason: string;
  sessionsCompleted: number;
  initialPainLevel: number | null;
  finalPainLevel: number | null;
  comparisonSnapshot: {
    painDelta: number | null;
    romComparisons: Array<{ gainDeg: number | null }>;
    scaleComparisons: Array<{ delta: number | null }>;
  };
};

describe('Physio packages, discharges and management reports HTTP and RLS (PostgreSQL)', () => {
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
    for (const [key, user] of Object.entries({ a: actor, b: other })) {
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

  it('tracks package counter, no-shows, reassessment flag, workspace queue, discharge comparison, reports and RLS', async () => {
    const startedAt = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const pkgRes = await http()
      .post('/rehab-plans/packages')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        title: 'Pacote Joelho LCA 4x',
        totalSessions: 4,
        reassessEverySessions: 2,
        startedAt,
      })
      .expect(201);
    const pkg = pkgRes.body as PackageResponse;
    expect(pkg.progressLabel).toBe('Sessão 0 de 4');

    // Registra 2 evoluções após pacote (auto-vinculadas ao pacote ativo)
    for (const [painBefore, painAfter] of [
      [7, 5],
      [5, 2],
    ]) {
      await http()
        .post('/rehab-plans/evolutions')
        .set('Authorization', auth('a'))
        .send({
          clientId: clientA,
          painBefore,
          painAfter,
          proceduresApplied: ['Cinesioterapia'],
          patientResponse: 'Boa evolução na sessão.',
        })
        .expect(201);
    }

    // Registra 1 falta na agenda dentro da janela do pacote
    await admin.appointment.create({
      data: {
        clientId: clientA,
        professionalId: actor.sub,
        kind: 'SESSION',
        status: 'NO_SHOW',
        modality: 'IN_PERSON',
        startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600_000),
        timeZone: 'America/Sao_Paulo',
      },
    });

    const listPkgRes = await http()
      .get(`/rehab-plans/packages/client/${clientA}`)
      .set('Authorization', auth('a'))
      .expect(200);
    const listedPkg = (listPkgRes.body as PackageResponse[])[0];
    expect(listedPkg).toMatchObject({
      completedSessions: 2,
      remainingSessions: 2,
      progressLabel: 'Sessão 2 de 4',
      noShowCount: 1,
      reassessmentDue: true,
      nearingEnd: true,
    });

    // Verifica seção Pacotes perto do fim no workspace
    const workspaceRes = await http()
      .get('/rehab-plans/workspace')
      .set('Authorization', auth('a'))
      .expect(200);
    const workspace = workspaceRes.body as {
      counts: { expiringPackages: number };
      items: Array<{ section: string; clientId: string }>;
    };
    expect(workspace.counts.expiringPackages).toBe(1);
    expect(
      workspace.items.some(
        (i) => i.section === 'EXPIRING_PACKAGE' && i.clientId === clientA,
      ),
    ).toBe(true);

    // Avaliações inicial/final + escala funcional para comparativo de alta
    await http()
      .post('/physio-assessments')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        chiefComplaint: 'Dor LCA inicial',
        painLevel: 8,
        goniometry: [
          { joint: 'Joelho', movement: 'Flexão', side: 'RIGHT', activeDeg: 90 },
        ],
      })
      .expect(201);
    await http()
      .post('/physio-assessments')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        chiefComplaint: 'Reavaliação final',
        painLevel: 1,
        goniometry: [
          {
            joint: 'Joelho',
            movement: 'Flexão',
            side: 'RIGHT',
            activeDeg: 132,
          },
        ],
      })
      .expect(201);

    const dischargeRes = await http()
      .post('/rehab-plans/discharges')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        reason: 'GOALS_MET',
        clinicalSummary: 'Paciente apto ao retorno esportivo gradual.',
        recommendations: 'Manter fortalecimento excêntrico 2x/semana.',
      })
      .expect(201);
    const discharge = dischargeRes.body as DischargeResponse;
    expect(discharge.sessionsCompleted).toBe(2);
    expect(discharge.initialPainLevel).toBe(8);
    expect(discharge.finalPainLevel).toBe(1);
    expect(discharge.comparisonSnapshot.painDelta).toBe(7);
    expect(discharge.comparisonSnapshot.romComparisons[0].gainDeg).toBe(42);

    // Relatórios gerenciais
    const reportRes = await http()
      .get('/rehab-plans/discharges/reports?period=30_DAYS')
      .set('Authorization', auth('a'))
      .expect(200);
    const report = reportRes.body as {
      counts: {
        noShowCount: number;
        dischargesCount: number;
        avgSessionsToDischarge: number;
        avgPainReduction: number;
      };
      items: Array<{ clientId: string }>;
    };
    expect(report.counts.noShowCount).toBe(1);
    expect(report.counts.dischargesCount).toBe(1);
    expect(report.counts.avgSessionsToDischarge).toBe(2);
    expect(report.counts.avgPainReduction).toBe(7);
    expect(report.items.some((i) => i.clientId === clientA)).toBe(true);

    // Isolamento tenant B (não enxerga nada do cliente A)
    await http()
      .get(`/rehab-plans/packages/client/${clientA}`)
      .set('Authorization', auth('b'))
      .expect(404);
    await http()
      .get(`/rehab-plans/discharges/client/${clientA}`)
      .set('Authorization', auth('b'))
      .expect(404);
    const reportB = await http()
      .get('/rehab-plans/discharges/reports?period=30_DAYS')
      .set('Authorization', auth('b'))
      .expect(200);
    expect(
      (reportB.body as { counts: { dischargesCount: number } }).counts
        .dischargesCount,
    ).toBe(0);

    // Paciente arquivado bloqueia criação de novo pacote e alta
    await admin.client.update({
      where: { id: clientA },
      data: { status: 'ARCHIVED' },
    });
    await http()
      .post('/rehab-plans/packages')
      .set('Authorization', auth('a'))
      .send({ clientId: clientA, title: 'Novo pacote', totalSessions: 5 })
      .expect(409);
    await http()
      .post('/rehab-plans/discharges')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        reason: 'GOALS_MET',
        clinicalSummary: 'Bloqueado',
      })
      .expect(409);
  });
});
