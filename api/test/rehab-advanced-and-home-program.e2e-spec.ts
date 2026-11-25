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

type RehabExerciseResponse = {
  id: string;
  name: string;
  category: string;
  modalityParams: { modality: string; frequency?: string } | null;
  isHomeExercise: boolean;
  homeFrequency: string | null;
  patientInstructions: string | null;
  catalogExerciseId: string | null;
  demonstrationSnapshot: {
    revision: string;
    instruction: string;
    assets?: Array<{ url: string; displayAllowed: boolean }>;
  } | null;
};

type RehabPlanResponse = {
  id: string;
  clientId: string | null;
  title: string;
  currentPhaseIndex: number;
  isTemplate: boolean;
  isActive: boolean;
  sessions: Array<{
    id: string;
    name: string;
    focus: string | null;
    position: number;
    progressionCriteria: string | null;
    estimatedWeeks: number | null;
    exercises: RehabExerciseResponse[];
  }>;
};

describe('Rehab advanced plans and visual home program HTTP and RLS (PostgreSQL)', () => {
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

  it('serves curated protocol and visual exercise catalogs only to PHYSIO', async () => {
    const protocolsRes = await http()
      .get('/rehab-plans/protocol-catalog')
      .set('Authorization', auth('a'))
      .expect(200);
    const protocols = protocolsRes.body as Array<{ id: string; title: string }>;
    expect(protocols.length).toBeGreaterThanOrEqual(6);
    expect(protocols.some((p) => p.id === 'proto-lombalgia-mecanica')).toBe(
      true,
    );

    const catalogRes = await http()
      .get('/rehab-plans/exercise-catalog?onlyWithIllustration=true')
      .set('Authorization', auth('a'))
      .expect(200);
    const exercises = catalogRes.body as Array<{
      id: string;
      hasIllustration: boolean;
      demonstration: { assets: Array<{ displayAllowed: boolean }> } | null;
    }>;
    expect(exercises.length).toBe(20);
    expect(
      exercises.every(
        (ex) =>
          ex.hasIllustration &&
          ex.demonstration?.assets.some((a) => a.displayAllowed === true),
      ),
    ).toBe(true);
  });

  it('creates, updates in-place preserving evolution link, advances phase, and enforces RLS', async () => {
    const createdRes = await http()
      .post('/rehab-plans')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        title: 'Lombalgia Mecânica',
        goal: 'Controle motor e redução de dor',
        durationWeeks: 8,
        currentPhaseIndex: 0,
        notes: 'Caminhadas diárias de 15 min',
        sessions: [
          {
            name: 'Fase 1 - Analgesia',
            focus: 'Eletroterapia e orientações',
            estimatedWeeks: 2,
            progressionCriteria: 'EVA <= 3 em repouso',
            exercises: [
              {
                name: 'TENS Lombar',
                category: 'ELECTROTHERAPY',
                sets: '20 min',
                reps: 'Contínuo',
                notes: 'Eletrodos L3-S1',
                modalityParams: {
                  modality: 'TENS',
                  frequency: '80 Hz',
                  pulseWidth: '100 µs',
                  durationMinutes: 20,
                },
              },
            ],
          },
          {
            name: 'Fase 2 - Controle Motor',
            focus: 'Core em baixa carga',
            estimatedWeeks: 6,
            progressionCriteria: 'Sem dor na execução de Dead Bug',
            exercises: [
              {
                name: 'Dead bug',
                category: 'KINESIOTHERAPY',
                sets: '3',
                reps: '10 alternadas',
                catalogExerciseId: 'cat-core-10',
                isHomeExercise: true,
                homeFrequency: '1x ao dia',
                patientInstructions: 'Respire devagar e controle a descida.',
              },
            ],
          },
        ],
      })
      .expect(201);

    const created = createdRes.body as RehabPlanResponse;
    expect(created.currentPhaseIndex).toBe(0);
    expect(
      created.sessions[1].exercises[0].demonstrationSnapshot?.assets?.[0]
        .displayAllowed,
    ).toBe(true);

    const evolutionRes = await http()
      .post('/rehab-plans/evolutions')
      .set('Authorization', auth('a'))
      .send({
        clientId: clientA,
        rehabPlanId: created.id,
        painBefore: 6,
        painAfter: 3,
        proceduresApplied: ['TENS Lombar'],
        patientResponse: 'Boa tolerância na primeira sessão.',
      })
      .expect(201);
    const evolution = evolutionRes.body as { id: string; rehabPlanId: string };
    expect(evolution.rehabPlanId).toBe(created.id);

    const updatedRes = await http()
      .patch(`/rehab-plans/${created.id}`)
      .set('Authorization', auth('a'))
      .send({
        title: 'Lombalgia Mecânica Revisada',
        goal: 'Estabilidade lombo-pélvica',
        durationWeeks: 8,
        currentPhaseIndex: 0,
        notes: 'Caminhadas diárias de 20 min',
        sessions: created.sessions.map((session) => ({
          name: session.name,
          focus: session.focus ?? undefined,
          progressionCriteria: session.progressionCriteria ?? undefined,
          estimatedWeeks: session.estimatedWeeks ?? undefined,
          exercises: session.exercises.map((exercise) => ({
            name: exercise.name,
            category: exercise.category,
            modalityParams: exercise.modalityParams ?? undefined,
            isHomeExercise: exercise.isHomeExercise,
            homeFrequency: exercise.homeFrequency ?? undefined,
            patientInstructions: exercise.patientInstructions ?? undefined,
            catalogExerciseId: exercise.catalogExerciseId ?? undefined,
          })),
        })),
      })
      .expect(200);

    const updated = updatedRes.body as RehabPlanResponse;
    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe('Lombalgia Mecânica Revisada');

    const evolutionAfter = await admin.physioSessionEvolution.findUniqueOrThrow(
      {
        where: { id: evolution.id },
      },
    );
    expect(evolutionAfter.rehabPlanId).toBe(created.id);

    const phaseRes = await http()
      .patch(`/rehab-plans/${created.id}/phase`)
      .set('Authorization', auth('a'))
      .send({ currentPhaseIndex: 1 })
      .expect(200);
    expect((phaseRes.body as RehabPlanResponse).currentPhaseIndex).toBe(1);

    // Foreign professional cannot update or advance phase
    await http()
      .patch(`/rehab-plans/${created.id}`)
      .set('Authorization', auth('b'))
      .send({
        title: 'Tentativa externa',
        sessions: [{ name: 'Fase 1', exercises: [{ name: 'Ponte' }] }],
      })
      .expect(404);

    await http()
      .patch(`/rehab-plans/${created.id}/phase`)
      .set('Authorization', auth('b'))
      .send({ currentPhaseIndex: 0 })
      .expect(404);

    // Custom standalone template owned by A
    const tplRes = await http()
      .post('/rehab-plans/templates')
      .set('Authorization', auth('a'))
      .send({
        title: 'Meu Modelo Lombalgia',
        durationWeeks: 6,
        sessions: [
          {
            name: 'Fase 1',
            progressionCriteria: 'Sem dor aguda',
            exercises: [
              {
                name: 'Bird dog',
                catalogExerciseId: 'cat-core-11',
                isHomeExercise: true,
              },
            ],
          },
        ],
      })
      .expect(201);
    const template = tplRes.body as RehabPlanResponse;
    expect(template.clientId).toBeNull();
    expect(template.isTemplate).toBe(true);
    expect(template.isActive).toBe(false);

    const templatesB = await http()
      .get('/rehab-plans/templates')
      .set('Authorization', auth('b'))
      .expect(200);
    expect((templatesB.body as RehabPlanResponse[]).length).toBe(0);

    // Archived Client blocks updating protocol
    await admin.client.update({
      where: { id: clientA },
      data: { status: 'ARCHIVED' },
    });
    await http()
      .patch(`/rehab-plans/${created.id}`)
      .set('Authorization', auth('a'))
      .send({
        title: 'Tentativa arquivado',
        sessions: [{ name: 'Fase 1', exercises: [{ name: 'Ponte' }] }],
      })
      .expect(409);
  });
});
