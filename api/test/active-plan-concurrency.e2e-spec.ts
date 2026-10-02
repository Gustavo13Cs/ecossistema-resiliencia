import { ClientAccessService } from '../src/common/client-access/client-access.service';
import { AuthUser } from '../src/common/types/auth-user';
import { WorkoutsService } from '../src/modules/workouts/workouts.service';
import { RehabPlansService } from '../src/modules/rehab-plans/rehab-plans.service';
import { DietPlansService } from '../src/modules/diet-plans/diet-plans.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';

const diet = {
  title: 'Synthetic diet',
  goal: 'Fixture',
  targetKcal: 2000,
  proteinG: 100,
  fatG: 60,
  carbsG: 250,
  meals: [],
};

describe('Concurrent active plan replacement (isolated PostgreSQL)', () => {
  let database: Awaited<ReturnType<typeof isolatedPostgres>>;
  beforeAll(async () => {
    database = await isolatedPostgres();
  });
  afterAll(async () => {
    await database?.close();
  });

  it.each(['workout', 'rehab', 'diet', 'diet-import'] as const)(
    '%s leaves exactly one active plan after simultaneous prescriptions',
    async (kind) => {
      const prisma = database.prisma;
      const professionalId = `fixture-${kind}`;
      const clientId = `client-${kind}`;
      const user: AuthUser = {
        sub: professionalId,
        role:
          kind === 'workout'
            ? 'PERSONAL'
            : kind === 'rehab'
              ? 'PHYSIO'
              : 'NUTRITIONIST',
      };
      await prisma.user.create({
        data: {
          id: professionalId,
          email: `${kind}@concurrency.test`,
          name: 'Fixture',
          role: user.role,
          password: 'unused',
        },
      });
      await prisma.client.create({
        data: { id: clientId, professionalId, name: 'Synthetic Client' },
      });
      const access = new ClientAccessService(prisma);
      const workouts = new WorkoutsService(prisma, access);
      const rehabilitation = new RehabPlansService(prisma, access);
      const diets = new DietPlansService(prisma);
      const template =
        kind === 'diet-import'
          ? await diets.createTemplate(diet, professionalId)
          : null;
      const create = () => {
        if (kind === 'workout')
          return workouts.create(user, {
            clientId,
            title: 'Synthetic workout',
            splits: [{ name: 'A', exercises: [] }],
          });
        if (kind === 'rehab')
          return rehabilitation.create(user, {
            clientId,
            title: 'Synthetic rehabilitation',
            sessions: [{ name: 'A', exercises: [] }],
          });
        if (template)
          return diets.importTemplateToClient(
            template.id,
            { clientId },
            professionalId,
          );
        return diets.create({ ...diet, clientId }, professionalId);
      };
      const table =
        kind === 'workout'
          ? 'workouts'
          : kind === 'rehab'
            ? 'rehab_plans'
            : 'diet_plans';
      // A barreira de inserção sincroniza as transações; não depende de uma pausa arbitrária.
      const gate = await database.pool.connect();
      let writes: Promise<unknown[]> | undefined;
      try {
        await database.pool
          .query(`CREATE FUNCTION public.fixture_plan_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock_shared(90261002); RETURN NEW; END $$;
        CREATE TRIGGER fixture_plan_barrier BEFORE INSERT ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.fixture_plan_barrier()`);
        await gate.query('BEGIN');
        await gate.query('SELECT pg_advisory_xact_lock(90261002)');
        writes = Promise.all([create(), create()]);
        void writes.catch(() => undefined);
        const deadline = Date.now() + 2000;
        let blocked = 0;
        while (Date.now() < deadline) {
          const result = await database.pool.query<{ count: number }>(
            `SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND wait_event_type='Lock'`,
          );
          blocked = result.rows[0].count;
          if (blocked >= 2) break;
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(2);
        await gate.query('COMMIT');
        await writes;
        const rows = await database.pool.query<{ isActive: boolean }>(
          `SELECT "isActive" FROM public.${table} WHERE "clientId"=$1 AND "creatorId"=$2`,
          [clientId, professionalId],
        );
        expect(rows.rowCount).toBe(2);
        expect(rows.rows.filter((row) => row.isActive)).toHaveLength(1);
      } finally {
        await gate.query('ROLLBACK');
        gate.release();
        await writes?.catch(() => undefined);
        await database.pool.query(
          `DROP TRIGGER IF EXISTS fixture_plan_barrier ON public.${table}; DROP FUNCTION IF EXISTS public.fixture_plan_barrier()`,
        );
      }
    },
  );
});
