import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { isolatedPostgres } from './fixtures/isolated-postgres';

describe('Tenant migration with a managed non-superuser owner', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let owner: Pool;
  const role = `safemove_migrator_${randomUUID().replaceAll('-', '')}`;
  const sql = (path: string) =>
    readFileSync(resolve(__dirname, '..', path), 'utf8');
  const migration = () =>
    sql(
      'prisma/migrations/20261006120000_read_audit_tenant_roles/migration.sql',
    );

  beforeAll(async () => {
    db = await isolatedPostgres({ beforeTenant: true });
    await db.pool
      .query(`CREATE ROLE "${role}" LOGIN PASSWORD 'local-synthetic-only'
      NOSUPERUSER NOBYPASSRLS CREATEROLE NOCREATEDB NOREPLICATION`);
    await db.pool.query(`GRANT safemove_catalog_lookup TO "${role}"
      WITH ADMIN TRUE, INHERIT FALSE, SET FALSE`);
    await db.pool.query(`ALTER SCHEMA public OWNER TO "${role}";
      DO $$ DECLARE t record; BEGIN
        FOR t IN SELECT c.relname FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r'
        LOOP EXECUTE format('ALTER TABLE public.%I OWNER TO %I',t.relname,'${role}'); END LOOP;
      END $$`);
    const database = (
      await db.pool.query<{ name: string }>('SELECT current_database() AS name')
    ).rows[0].name;
    await db.pool.query(`GRANT CREATE ON DATABASE "${database}" TO "${role}"`);
    owner = new Pool({
      connectionString: `postgresql://${role}:local-synthetic-only@localhost:${db.port}/${database}`,
      max: 1,
    });
  });

  afterAll(async () => {
    await owner?.end();
    if (db) {
      await db.close();
      const admin = new Pool({
        connectionString: `postgresql://postgres:postgres@localhost:${db.port}/postgres`,
      });
      try {
        await admin.query(`DROP ROLE "${role}"`);
      } finally {
        await admin.end();
      }
    }
  });

  it('recovers the unchanged migration and removes temporary function authority', async () => {
    const flags = (
      await owner.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
        'SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user',
      )
    ).rows[0];
    expect(flags).toEqual({ rolsuper: false, rolbypassrls: false });
    await expect(owner.query(migration())).rejects.toThrow(
      'must be able to SET ROLE',
    );
    await owner.query<Record<string, unknown>>('ROLLBACK');
    expect(
      (
        await owner.query<Record<string, unknown>>(
          "SELECT to_regclass('public.client_read_audit_events') AS events",
        )
      ).rows[0].events,
    ).toBeNull();

    await owner.query<Record<string, unknown>>(
      sql('scripts/tenant-migration-prepare.sql'),
    );
    await owner.query<Record<string, unknown>>(migration());
    await owner.query<Record<string, unknown>>(
      sql('scripts/tenant-migration-cleanup.sql'),
    );

    const state = (
      await owner.query<Record<string, unknown>>(`SELECT
      pg_has_role(current_user,'safemove_catalog_lookup','SET') AS can_set,
      pg_has_role(current_user,'safemove_catalog_lookup','USAGE') AS inherits,
      (SELECT pg_get_userbyid(proowner) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='safemove_private' AND p.proname='food_in_use') AS function_owner,
      has_schema_privilege('safemove_catalog_lookup','safemove_private','CREATE') AS can_create,
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity) AS rls_tables`)
    ).rows[0];
    expect(state).toEqual({
      can_set: false,
      inherits: false,
      function_owner: 'safemove_catalog_lookup',
      can_create: false,
      rls_tables: 42,
    });
    await expect(
      owner.query("SELECT safemove_private.food_in_use('synthetic')"),
    ).rejects.toThrow('permission denied for function food_in_use');
    await expect(
      owner.query(sql('scripts/tenant-migration-prepare.sql')),
    ).rejects.toThrow('Tenant migration is already installed');
  }, 60000);
});
