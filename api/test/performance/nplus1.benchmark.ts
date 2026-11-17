import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Client, Pool } from 'pg';
import { PrismaService } from '../../src/infra/database/prisma.service';
import { JobsPrismaService } from '../../src/infra/database/database-clients';
import { AuthUser } from '../../src/common/types/auth-user';
import { DraftContentInput } from '../../src/modules/workouts/workout-draft.types';
import { CreateDietPlanDto } from '../../src/modules/diet-plans/dto/create-diet-plan.dto';
import { isolatedPostgres } from '../fixtures/isolated-postgres';
import { runtimeUrls } from '../fixtures/runtime-roles';

// Somente bases sintéticas locais são aceitas pelo fixture. Nenhum .env é necessário.
const source = resolve(
  process.env.NPLUS1_SOURCE_ROOT ?? resolve(__dirname, '../..'),
);
const load = createRequire(__filename);
const { DietPlansService } = load(
  resolve(source, 'src/modules/diet-plans/diet-plans.service'),
) as typeof import('../../src/modules/diet-plans/diet-plans.service');
const { ExerciseDemonstrationService } = load(
  resolve(source, 'src/modules/workouts/exercise-demonstration.service'),
) as typeof import('../../src/modules/workouts/exercise-demonstration.service');
const { ExerciseLibraryService } = load(
  resolve(source, 'src/modules/workouts/exercise-library.service'),
) as typeof import('../../src/modules/workouts/exercise-library.service');
const { WorkoutTemplatesService } = load(
  resolve(source, 'src/modules/workouts/workout-templates.service'),
) as typeof import('../../src/modules/workouts/workout-templates.service');
const { WorkoutDraftsService } = load(
  resolve(source, 'src/modules/workouts/workout-drafts.service'),
) as typeof import('../../src/modules/workouts/workout-drafts.service');
const { WorkoutsService } = load(
  resolve(source, 'src/modules/workouts/workouts.service'),
) as typeof import('../../src/modules/workouts/workouts.service');
const { ClientAccessService } = load(
  resolve(source, 'src/common/client-access/client-access.service'),
) as typeof import('../../src/common/client-access/client-access.service');
const { AlertsCronService } = load(
  resolve(source, 'src/modules/alerts/alerts.cron.service'),
) as typeof import('../../src/modules/alerts/alerts.cron.service');

type SqlCall = { text: string; values?: unknown[] };
let capture: SqlCall[] | undefined;
// O método original é sempre invocado via Reflect.apply com o Client correto.
// eslint-disable-next-line @typescript-eslint/unbound-method
const query = Client.prototype.query;
Client.prototype.query = function (this: Client, ...args: unknown[]): unknown {
  const config = args[0];
  if (typeof config === 'string') {
    capture?.push({
      text: config,
      values: Array.isArray(args[1]) ? args[1] : undefined,
    });
  } else if (
    config &&
    typeof config === 'object' &&
    'text' in config &&
    typeof config.text === 'string'
  ) {
    capture?.push({
      text: config.text,
      values:
        'values' in config && Array.isArray(config.values)
          ? config.values
          : undefined,
    });
  }
  return Reflect.apply(query, this, args);
} as typeof query;

const now = new Date('2026-11-17T12:00:00.000Z');
const day = 86_400_000;
const id = (n: number) =>
  `82000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const nutritionist: AuthUser = {
  sub: id(1),
  role: 'NUTRITIONIST',
  sessionId: 'synthetic-nutrition-session',
};
const personal: AuthUser = {
  sub: id(2),
  role: 'PERSONAL',
  sessionId: 'synthetic-personal-session',
};
const foreign: AuthUser = {
  sub: id(3),
  role: 'PERSONAL',
  sessionId: 'synthetic-foreign-session',
};
const nutrientClient = id(10);
const clientIds = Array.from({ length: 100 }, (_, i) => id(100 + i));
const foodIds = Array.from({ length: 30 }, (_, i) => id(1000 + i));
const exerciseIds = Array.from({ length: 30 }, (_, i) => id(2000 + i));
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function measure<T>(
  name: string,
  target: RegExp,
  operation: () => Promise<T>,
  check: (result: T) => void,
  prepare: () => Promise<unknown> = () => Promise.resolve(),
) {
  for (let i = 0; i < 2; i++) {
    await prepare();
    check(await operation());
  }
  const samples: {
    milliseconds: number;
    totalSql: number;
    targetSql: number;
  }[] = [];
  let lastCalls: SqlCall[] = [];
  for (let i = 0; i < 7; i++) {
    await prepare();
    const calls: SqlCall[] = [];
    capture = calls;
    const start = performance.now();
    let result: T;
    try {
      result = await operation();
    } finally {
      capture = undefined;
    }
    const milliseconds = performance.now() - start;
    check(result);
    samples.push({
      milliseconds,
      totalSql: calls.length,
      targetSql: calls.filter((call) => target.test(call.text)).length,
    });
    lastCalls = calls;
  }
  return {
    name,
    samples,
    medianMs: median(samples.map((s) => s.milliseconds)),
    totalSql: samples[0].totalSql,
    targetSql: samples[0].targetSql,
    lastCalls,
  };
}

async function main() {
  Logger.overrideLogger(false);
  const db = await isolatedPostgres();
  const urls = await runtimeUrls(db.pool);
  const clinical = new PrismaService();
  const jobs = new JobsPrismaService();
  try {
    await db.prisma.user.createMany({
      data: [nutritionist, personal, foreign].map((actor) => ({
        id: actor.sub,
        role: actor.role,
        name: 'Synthetic performance professional',
        email: `${actor.sub}@benchmark.invalid`,
        password: 'synthetic-unused',
      })),
    });
    await db.prisma.client.createMany({
      data: [
        {
          id: nutrientClient,
          professionalId: nutritionist.sub,
          name: 'Synthetic nutrition client',
        },
        ...clientIds.map((clientId) => ({
          id: clientId,
          professionalId: personal.sub,
          name: 'Synthetic training client',
        })),
        {
          id: id(999),
          professionalId: foreign.sub,
          name: 'Synthetic foreign client',
          status: 'ARCHIVED',
        },
      ],
    });
    await db.prisma.food.createMany({
      data: foodIds.map((foodId, index) => ({
        id: foodId,
        name: `Synthetic food ${index}`,
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
      })),
    });
    await db.prisma.customExercise.createMany({
      data: exerciseIds.map((exerciseId, index) => ({
        id: exerciseId,
        professionalId: personal.sub,
        name: `Synthetic exercise ${index}`,
        normalizedName: `synthetic exercise ${index}`,
        muscleGroup: 'CHEST',
        videoUrl: `https://vimeo.com/${index + 100}`,
        notes: 'Synthetic instruction',
      })),
    });
    const rows: Prisma.DailyTrackingCreateManyInput[] = [];
    clientIds.forEach((clientId, i) => {
      const base = {
        clientId,
        professionalId: personal.sub,
        type: 'WORKOUT',
        itemName: 'Synthetic workout',
      };
      if (i % 4 !== 0) {
        for (let d = 30; d < 130; d++)
          rows.push({
            ...base,
            completedAt: new Date(now.getTime() - d * day),
          });
      }
      if (i % 4 === 2) {
        for (let d = 1; d <= 3; d++)
          for (let h = 0; h < 2; h++)
            rows.push({
              ...base,
              completedAt: new Date(now.getTime() - d * day + h * 3_600_000),
            });
      }
      if (i % 4 === 3)
        for (let d = 0; d < 21; d++)
          rows.push({
            ...base,
            completedAt: new Date(now.getTime() - d * day),
          });
      // Futuro, outra modalidade e profissional incorreto não participam do resultado.
      rows.push(
        { ...base, completedAt: new Date(now.getTime() + day) },
        { ...base, type: 'MEAL', completedAt: now },
        { ...base, professionalId: foreign.sub, completedAt: now },
      );
    });
    await db.prisma.dailyTracking.createMany({ data: rows });
    await db.pool.query('ANALYZE');
    await clinical.onModuleInit();
    await jobs.onModuleInit();
    const run = <T>(actor: AuthUser, call: () => Promise<T>) =>
      clinical.runAsProfessional(actor, randomUUID(), call);
    const diet = new DietPlansService(clinical);
    const demonstrations = new ExerciseDemonstrationService(clinical);
    const access = new ClientAccessService(clinical);
    const workouts = new WorkoutsService(clinical, access, demonstrations);
    const drafts = new WorkoutDraftsService(
      clinical,
      access,
      workouts,
      demonstrations,
    );
    const templates = new WorkoutTemplatesService(
      clinical,
      access,
      drafts,
      new ExerciseLibraryService(clinical),
    );
    const dto: CreateDietPlanDto = {
      clientId: nutrientClient,
      title: 'Synthetic plan',
      goal: 'Synthetic goal',
      targetKcal: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 70,
      meals: Array.from({ length: 6 }, (_, m) => ({
        name: `Meal ${m}`,
        items: foodIds.slice(m * 5, m * 5 + 5).map((foodId, index) => ({
          foodId,
          quantity: index + 1,
          measure: 'porção',
        })),
      })),
    };
    const content: DraftContentInput = {
      title: 'Synthetic workout',
      goal: 'Hipertrofia',
      durationWeeks: 8,
      notes: '',
      splits: Array.from({ length: 3 }, (_, s) => ({
        name: `Split ${s}`,
        focus: '',
        exercises: exerciseIds
          .slice(s * 10, s * 10 + 10)
          .map((exerciseId, index) => ({
            name: `Exercise ${index}`,
            sets: '3',
            reps: '10',
            rest: '60',
            notes: '',
            muscleGroup: 'CHEST',
            load: '',
            effortType: null,
            effortTarget: '',
            tempo: '',
            method: null,
            libraryReference: {
              source: 'CUSTOM',
              exerciseId,
              demonstrationRevision: '1',
            },
          })),
      })),
    };
    const template = await db.prisma.workoutTemplate.create({
      data: {
        professionalId: personal.sub,
        title: 'Synthetic template',
        goal: 'MUSCLE_GAIN',
        level: 'BEGINNER',
        estimatedWeeks: 8,
        schemaVersion: 3,
        content: content as unknown as Prisma.InputJsonValue,
      },
    });
    const dietResult = await measure(
      'diet-30-foods',
      /food_preferences/,
      () => run(nutritionist, () => diet.create(dto, nutritionist.sub)),
      (result) => {
        assert.equal(result.meals.length, 6);
        assert.equal(
          result.meals.reduce((n, m) => n + m.items.length, 0),
          30,
        );
      },
    );
    const prefs = await db.prisma.foodPreference.findMany({
      orderBy: [{ foodId: 'asc' }, { quantity: 'asc' }],
      select: {
        nutritionistId: true,
        foodId: true,
        quantity: true,
        measure: true,
      },
    });
    assert.equal(prefs.length, 30);
    const exerciseResult = await measure(
      'demonstrations-30-custom',
      /custom_exercises/,
      () =>
        run(personal, () =>
          demonstrations.resolveContent(personal, structuredClone(content)),
        ),
      (result) => {
        assert.equal(result.splits.length, 3);
        assert.equal(
          result.splits[0].exercises[0].demonstrationSnapshot?.personalVideoUrl,
          'https://vimeo.com/100',
        );
      },
    );
    const templateResult = await measure(
      'template-import-30-custom',
      /custom_exercises/,
      () =>
        run(personal, () =>
          templates.createDraft(personal, template.id, {
            clientId: clientIds[0],
          }),
        ),
      (result) => assert.equal(result.status, 'OPEN'),
      () =>
        db.prisma.workoutDraft.deleteMany({
          where: { clientId: clientIds[0] },
        }),
    );
    const cron = new AlertsCronService(jobs);
    const cronResult = await measure(
      'alerts-100-clients',
      /DailyTracking/,
      () => cron.generateDailyAlerts(now),
      (result) => assert.equal(result.generated, 100),
    );
    const alerts = await db.prisma.patientAlert.findMany({
      select: {
        clientId: true,
        professionalId: true,
        type: true,
        severity: true,
        message: true,
        createdAt: true,
      },
      orderBy: [{ clientId: 'asc' }, { type: 'asc' }],
    });
    assert.equal(alerts.length, 100);
    assert.equal(alerts.filter((a) => a.type === 'INACTIVE_5_DAYS').length, 50);
    assert.equal(alerts.filter((a) => a.type === 'PLATEAU_3_WEEKS').length, 25);
    assert.equal(
      alerts.filter((a) => a.type === 'OVERTRAINING_RISK').length,
      25,
    );
    const plans: unknown[] = [];
    const explainPool = new Pool({
      connectionString: urls.values.JOBS_DATABASE_URL,
    });
    try {
      for (const call of cronResult.lastCalls.filter((c) =>
        /SELECT.*DailyTracking/s.test(c.text),
      )) {
        if (plans.length >= 2) break;
        const plan = await explainPool.query(
          'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + call.text,
          call.values,
        );
        plans.push({ sql: call.text, plan: plan.rows as unknown });
      }
    } finally {
      await explainPool.end();
    }
    const results = [
      dietResult,
      exerciseResult,
      templateResult,
      cronResult,
    ].map((result) => ({
      name: result.name,
      samples: result.samples,
      medianMs: result.medianMs,
      totalSql: result.totalSql,
      targetSql: result.targetSql,
    }));
    const report = {
      source,
      postgres: (await db.pool.query<{ version: string }>('SELECT version()'))
        .rows[0].version,
      node: process.version,
      warmups: 2,
      repetitions: 7,
      trackingRows: rows.length,
      rls: 'clinical/jobs NOSUPERUSER NOBYPASSRLS; onModuleInit role checks',
      results,
      equivalence: {
        preferences: digest(prefs),
        demonstrations: digest(
          await run(personal, () =>
            demonstrations.resolveContent(personal, structuredClone(content)),
          ),
        ),
        alerts: digest(alerts),
      },
      plans,
    };
    if (process.env.NPLUS1_REPORT_PATH)
      writeFileSync(
        process.env.NPLUS1_REPORT_PATH,
        JSON.stringify(report, null, 2) + '\n',
      );
    console.log(
      JSON.stringify({ results, equivalence: report.equivalence }, null, 2),
    );
  } finally {
    capture = undefined;
    Client.prototype.query = query;
    await clinical.$disconnect();
    await jobs.$disconnect();
    urls.restore();
    await db.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
