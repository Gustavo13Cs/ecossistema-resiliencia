import { Pool, PoolClient } from 'pg';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Tenant SQL matrix through a non-owner login', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let runtime: Pool;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    runtime = new Pool({ connectionString: urls.values.CLINICAL_DATABASE_URL });
    await db.prisma.user.createMany({
      data: ['a', 'b'].map((id) => ({
        id: 'tenant-' + id,
        name: 'Synthetic',
        email: id + '@tenant.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      })),
    });
    await db.prisma.client.createMany({
      data: ['a', 'b'].map((id) => ({
        id: 'client-' + id,
        name: 'Synthetic',
        professionalId: 'tenant-' + id,
      })),
    });
    const diet = (id: string, clientId: string | null, isTemplate = false) => ({
      id,
      clientId,
      isTemplate,
      creatorId: id.endsWith('b') ? 'tenant-b' : 'tenant-a',
      title: 'Synthetic',
      goal: 'test',
      targetKcal: 1,
      proteinG: 1,
      fatG: 1,
      carbsG: 1,
    });
    await db.prisma.dietPlan.createMany({
      data: [
        diet('diet-a', 'client-a'),
        diet('diet-b', 'client-b'),
        diet('template-a', null, true),
        diet('template-b', null, true),
        diet('legacy-a', null),
      ],
    });
    await db.prisma.meal.createMany({
      data: [
        { id: 'meal-a', name: 'Synthetic', dietPlanId: 'diet-a' },
        { id: 'meal-b', name: 'Synthetic', dietPlanId: 'diet-b' },
      ],
    });
    await db.prisma.food.createMany({
      data: ['official', 'shared', 'unused'].map((id) => ({
        id,
        name: 'Synthetic ' + id,
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 1,
        source: id === 'official' ? 'TACO' : 'MANUAL',
      })),
    });
    await db.prisma.mealItem.createMany({
      data: [
        {
          id: 'item-a',
          mealId: 'meal-a',
          foodId: 'official',
          quantity: 1,
          measure: 'g',
        },
        {
          id: 'item-b',
          mealId: 'meal-b',
          foodId: 'shared',
          quantity: 1,
          measure: 'g',
        },
      ],
    });
  });
  afterAll(async () => {
    await runtime?.end();
    urls?.restore();
    await db?.close();
  });
  async function scoped<T>(
    id: string,
    fn: (c: PoolClient) => Promise<T>,
    role = 'NUTRITIONIST',
  ) {
    const c = await runtime.connect();
    try {
      await c.query<Record<string, unknown>>('BEGIN');
      await c.query<Record<string, unknown>>(
        "SELECT set_config('safemove.professional_id',$1,true),set_config('safemove.role',$2,true),set_config('safemove.session_id','valid-session',true),set_config('safemove.request_id','valid-request',true)",
        [id, role],
      );
      const result = await fn(c);
      await c.query<Record<string, unknown>>('COMMIT');
      return result;
    } catch (error) {
      await c.query<Record<string, unknown>>('ROLLBACK');
      throw error;
    } finally {
      c.release();
    }
  }
  it('attests non-owner, no bypass, distinct roles and closed PUBLIC functions', async () => {
    const role = (
      await runtime.query<Record<string, unknown>>(
        'SELECT rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname=current_user',
      )
    ).rows[0] as Record<string, boolean>;
    expect(role).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: false,
    });
    expect(
      (
        await db.pool.query<Record<string, unknown>>(
          "SELECT count(*)::int AS count FROM pg_class WHERE relname='clients' AND pg_has_role('safemove_test_clinical',relowner,'MEMBER')",
        )
      ).rows[0].count,
    ).toBe(0);
    const fn = (
      await db.pool.query<Record<string, unknown>>(
        "SELECT p.prosecdef,r.rolname,p.proconfig FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='safemove_private.food_in_use(text)'::regprocedure",
      )
    ).rows[0];
    expect(fn).toMatchObject({
      prosecdef: true,
      rolname: 'safemove_catalog_lookup',
    });
    expect(fn.proconfig).toContain('search_path=pg_catalog, pg_temp');
    expect(
      (
        await db.pool.query<Record<string, unknown>>(
          "SELECT has_column_privilege('safemove_catalog_lookup','meal_items','notes','SELECT') AS notes,has_table_privilege('safemove_catalog_lookup','clients','SELECT') AS clients",
        )
      ).rows[0],
    ).toEqual({ notes: false, clients: false });
    expect(
      (
        await db.pool.query<Record<string, unknown>>(
          "SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='safemove_private' AND a.grantee=0 AND a.privilege_type='EXECUTE'",
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it('queries roots without a tenant filter; absence, empty context and ADMIN deny', async () => {
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            'SELECT id FROM clients ORDER BY id',
          ),
        )
      ).rows,
    ).toEqual([{ id: 'client-a' }]);
    expect(
      (
        await scoped('tenant-b', (c) =>
          c.query<Record<string, unknown>>(
            'SELECT id FROM clients ORDER BY id',
          ),
        )
      ).rows,
    ).toEqual([{ id: 'client-b' }]);
    expect(
      (await runtime.query<Record<string, unknown>>('SELECT id FROM clients'))
        .rows,
    ).toEqual([]);
    expect(
      (
        await scoped('', (c) =>
          c.query<Record<string, unknown>>('SELECT id FROM clients'),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await scoped(
          'tenant-a',
          (c) => c.query<Record<string, unknown>>('SELECT id FROM clients'),
          'ADMIN',
        )
      ).rows,
    ).toEqual([]);
  });
  it('inherits authorization for children and permits only private clientless templates', async () => {
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            'SELECT id FROM diet_plans ORDER BY id',
          ),
        )
      ).rows,
    ).toEqual([{ id: 'diet-a' }, { id: 'template-a' }]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>('SELECT id FROM meals'),
        )
      ).rows,
    ).toEqual([{ id: 'meal-a' }]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>('SELECT id FROM meal_items'),
        )
      ).rows,
    ).toEqual([{ id: 'item-a' }]);
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "INSERT INTO meals(id,name,\"dietPlanId\") VALUES('foreign-child','Synthetic','diet-b')",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "UPDATE meals SET \"dietPlanId\"='diet-b' WHERE id='meal-a'",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });
  it('enforces UPDATE, DELETE, INSERT WITH CHECK, RETURNING and upsert', async () => {
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "INSERT INTO clients(id,\"professionalId\",name,\"updatedAt\") VALUES('bad','tenant-b','Synthetic',now())",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "UPDATE clients SET \"professionalId\"='tenant-b' WHERE id='client-a'",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            "UPDATE clients SET name='Bad' WHERE id='client-b' RETURNING id",
          ),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            "DELETE FROM clients WHERE id='client-b' RETURNING id",
          ),
        )
      ).rows,
    ).toEqual([]);
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "INSERT INTO clients(id,\"professionalId\",name,\"updatedAt\") VALUES('client-b','tenant-a','Synthetic',now()) ON CONFLICT(id) DO UPDATE SET name=excluded.name RETURNING id",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });
  it('rolls back data and context; concurrently used connections never cross tenants', async () => {
    await expect(
      scoped('tenant-a', async (c) => {
        await c.query<Record<string, unknown>>(
          "UPDATE clients SET name='Rollback' WHERE id='client-a'",
        );
        throw new Error('synthetic');
      }),
    ).rejects.toThrow('synthetic');
    expect(
      (await db.prisma.client.findUniqueOrThrow({ where: { id: 'client-a' } }))
        .name,
    ).toBe('Synthetic');
    const results = await Promise.all(
      ['tenant-a', 'tenant-b'].map((id) =>
        scoped(id, async (c) => {
          await c.query<Record<string, unknown>>('SELECT pg_sleep(0.02)');
          return (
            await c.query<Record<string, unknown>>('SELECT id FROM clients')
          ).rows;
        }),
      ),
    );
    expect(results).toEqual([[{ id: 'client-a' }], [{ id: 'client-b' }]]);
    expect(
      (await runtime.query<Record<string, unknown>>('SELECT id FROM clients'))
        .rows,
    ).toEqual([]);
  });
  it('locks shared official Foods but denies official and globally referenced mutation', async () => {
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            "SELECT id FROM foods WHERE id='official' FOR SHARE",
          ),
        )
      ).rows,
    ).toEqual([{ id: 'official' }]);
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "UPDATE foods SET kcal=999 WHERE id='official'",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "UPDATE foods SET kcal=999 WHERE id='shared'",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            "DELETE FROM foods WHERE id='shared' RETURNING id",
          ),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<Record<string, unknown>>(
            "UPDATE foods SET kcal=101 WHERE id='unused' RETURNING kcal",
          ),
        )
      ).rows,
    ).toEqual([{ kcal: 101 }]);
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "UPDATE foods SET source='TACO' WHERE id='unused'",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });
  const insertAudit =
    "INSERT INTO client_read_audit_events(id,\"tenantProfessionalId\",\"clientId\",\"actorType\",\"actorProfessionalId\",\"sessionId\",\"requestId\",action,domain) VALUES($1,'tenant-a','client-a','PROFESSIONAL','tenant-a',$2,'valid-request','READ','CLIENT')";
  it('binds human trail to validated request/session and leaves initial outbox state', async () => {
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(insertAudit, [
          'forged',
          'wrong-session',
        ]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await scoped('tenant-a', async (c) => {
      await c.query<Record<string, unknown>>(insertAudit, [
        'valid-audit',
        'valid-session',
      ]);
      await c.query<Record<string, unknown>>(
        'INSERT INTO audit_delivery_states("eventId") VALUES(\'valid-audit\')',
      );
    });
    expect(
      (
        await scoped('tenant-b', (c) =>
          c.query<Record<string, unknown>>(
            'SELECT id FROM client_read_audit_events',
          ),
        )
      ).rows,
    ).toEqual([]);
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          'INSERT INTO audit_delivery_states("eventId",attempts,"deliveredAt") VALUES(\'valid-audit\',3,now())',
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });
  it.each([
    "UPDATE client_read_audit_events SET domain='AUDIT'",
    'DELETE FROM client_read_audit_events',
    'TRUNCATE client_read_audit_events',
  ])('denies immutable trail mutation: %s', async (sql) => {
    await expect(
      scoped('tenant-a', (c) => c.query<Record<string, unknown>>(sql)),
    ).rejects.toMatchObject({ code: '42501' });
  });
  it('rejects a SYSTEM actor with no task even when inserted by the fixture owner', async () => {
    await expect(
      db.pool.query<Record<string, unknown>>(
        "INSERT INTO client_read_audit_events(id,\"tenantProfessionalId\",\"clientId\",\"actorType\",\"requestId\",action,domain) VALUES('invalid-system','tenant-a','client-a','SYSTEM','invalid-system','READ','ALERT')",
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('denies clinical credentials and sensitive writes', async () => {
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>('SELECT password FROM "User"'),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>('SELECT * FROM auth_sessions'),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      scoped('tenant-a', (c) =>
        c.query<Record<string, unknown>>(
          "UPDATE \"User\" SET role='ADMIN' WHERE id='tenant-a'",
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('keeps a new foreign reference immutable after waiting for its Food snapshot lock', async () => {
    let unlock!: () => void;
    let entered!: () => void;
    const release = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const reader = scoped('tenant-b', async (c) => {
      await c.query("SELECT id FROM foods WHERE id='unused' FOR SHARE");
      entered();
      await release;
      await c.query(
        "INSERT INTO meal_items(id,\"mealId\",\"foodId\",quantity,measure) VALUES('racing-reference','meal-b','unused',1,'g')",
      );
    });
    await started;
    const updater = scoped('tenant-a', (c) =>
      c.query("UPDATE foods SET kcal=777 WHERE id='unused'"),
    ).then(
      () => null,
      (error) => error as { code: string },
    );
    let blocked = false;
    try {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const row = (
          await db.pool.query<{ blocked: boolean }>(
            "SELECT EXISTS(SELECT FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'UPDATE foods SET kcal=777%') AS blocked",
          )
        ).rows[0];
        if (row.blocked) {
          blocked = true;
          break;
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    } finally {
      unlock();
    }
    await reader;
    expect(blocked).toBe(true);
    expect(await updater).toMatchObject({ code: '42501' });
    expect(
      (await db.prisma.food.findUniqueOrThrow({ where: { id: 'unused' } }))
        .kcal,
    ).toBe(101);
  });

  it('reads migrated resources through their owned Client while keeping clientless legacy hidden', async () => {
    await db.prisma.user.create({
      data: {
        id: 'legacy-patient',
        name: 'Synthetic',
        email: 'legacy@fixture.invalid',
        password: 'unused',
        role: 'PATIENT',
      },
    });
    await db.prisma.dietPlan.update({
      where: { id: 'diet-a' },
      data: { userId: 'legacy-patient' },
    });
    await db.prisma.workout.create({
      data: {
        id: 'migrated-workout',
        creatorId: 'tenant-a',
        clientId: 'client-a',
        userId: 'legacy-patient',
        title: 'Synthetic',
      },
    });
    await db.prisma.rehabPlan.create({
      data: {
        id: 'migrated-rehab',
        creatorId: 'tenant-a',
        clientId: 'client-a',
        userId: 'legacy-patient',
        title: 'Synthetic',
      },
    });
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<{ id: string }>(
            "SELECT id FROM diet_plans WHERE id='diet-a'",
          ),
        )
      ).rows,
    ).toEqual([{ id: 'diet-a' }]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<{ id: string }>('SELECT id FROM workouts'),
        )
      ).rows,
    ).toEqual([{ id: 'migrated-workout' }]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<{ id: string }>('SELECT id FROM rehab_plans'),
        )
      ).rows,
    ).toEqual([{ id: 'migrated-rehab' }]);
    expect(
      (
        await scoped('tenant-b', (c) =>
          c.query<{ id: string }>('SELECT id FROM workouts'),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await scoped('tenant-a', (c) =>
          c.query<{ id: string }>(
            "SELECT id FROM diet_plans WHERE id='legacy-a'",
          ),
        )
      ).rows,
    ).toEqual([]);
  });
  it('waits for a foreign FK reference even when its writer took no explicit Food lock', async () => {
    await db.prisma.food.create({
      data: {
        id: 'fk-race',
        name: 'Synthetic',
        kcal: 100,
        protein: 1,
        carbs: 1,
        fat: 1,
      },
    });
    let unlock!: () => void;
    let entered!: () => void;
    const release = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const writer = scoped('tenant-b', async (c) => {
      await c.query(
        "INSERT INTO meal_items(id,\"mealId\",\"foodId\",quantity,measure) VALUES('fk-only-reference','meal-b','fk-race',1,'g')",
      );
      entered();
      await release;
    });
    await started;
    let completed = false;
    const update = scoped('tenant-a', (c) =>
      c.query("UPDATE foods SET kcal=777 WHERE id='fk-race'"),
    ).then(
      () => {
        completed = true;
        return null;
      },
      (error) => {
        completed = true;
        return error as { code: string };
      },
    );
    let blocked = false;
    try {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && !completed) {
        const row = (
          await db.pool.query<{ blocked: boolean }>(
            "SELECT EXISTS(SELECT FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'UPDATE foods SET kcal=777%') AS blocked",
          )
        ).rows[0];
        if (row.blocked) {
          blocked = true;
          break;
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    } finally {
      unlock();
    }
    await writer;
    const error = await update;
    expect(blocked).toBe(true);
    expect(error).toMatchObject({ code: '42501' });
    expect(
      (await db.prisma.food.findUniqueOrThrow({ where: { id: 'fk-race' } }))
        .kcal,
    ).toBe(100);
  });
});
