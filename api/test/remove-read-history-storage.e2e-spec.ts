import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { PrismaService } from '../src/infra/database/prisma.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Remove read-history storage through a managed migration owner', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let owner: Pool;
  const role = 'safemove_remove_' + randomUUID().replaceAll('-', '');
  const migration = () =>
    readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations/20261008120000_remove_read_access_history/migration.sql',
      ),
      'utf8',
    );

  beforeAll(async () => {
    db = await isolatedPostgres({ beforeHistoryRemoval: true });
    await db.pool
      .query(`CREATE ROLE "${role}" LOGIN PASSWORD 'local-synthetic-only'
      NOSUPERUSER NOBYPASSRLS CREATEROLE NOCREATEDB NOREPLICATION;
      ALTER SCHEMA public OWNER TO "${role}";
      ALTER SCHEMA safemove_private OWNER TO "${role}";
      GRANT safemove_audit_delivery TO "${role}" WITH ADMIN TRUE, INHERIT FALSE, SET FALSE;
      DO $$ DECLARE t record; BEGIN
        FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind='r'
        LOOP EXECUTE format('ALTER TABLE public.%I OWNER TO %I',t.relname,'${role}'); END LOOP;
      END $$;
      ALTER FUNCTION safemove_private.immutable_audit() OWNER TO "${role}";
      ALTER TYPE public."ReadAuditDomain" OWNER TO "${role}";
      ALTER TYPE public."ReadAuditAction" OWNER TO "${role}";
      ALTER TYPE public."ReadAuditActor" OWNER TO "${role}";`);
    const database = (
      await db.pool.query<{ name: string }>('SELECT current_database() AS name')
    ).rows[0].name;
    owner = new Pool({
      connectionString: `postgresql://${role}:local-synthetic-only@localhost:${db.port}/${database}`,
      max: 1,
    });
    await db.prisma.user.createMany({
      data: ['a', 'b'].map((id) => ({
        id: 'storage-owner-' + id,
        name: 'Synthetic',
        email: id + '@storage.fixture.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      })),
    });
    await db.prisma.client.createMany({
      data: ['a', 'b'].map((id) => ({
        id: 'storage-client-' + id,
        name: 'Synthetic',
        professionalId: 'storage-owner-' + id,
      })),
    });
    await db.prisma.clientAuditEvent.create({
      data: {
        id: 'storage-change',
        clientId: 'storage-client-a',
        professionalId: 'storage-owner-a',
        action: 'CREATED',
      },
    });
    await db.pool.query(`INSERT INTO client_read_audit_events
      (id,"tenantProfessionalId","clientId","actorType","actorProfessionalId","sessionId","requestId",action,domain)
      VALUES('storage-read','storage-owner-a','storage-client-a','PROFESSIONAL','storage-owner-a',
      'synthetic-session','synthetic-request','READ','CLIENT');
      INSERT INTO audit_delivery_states("eventId") VALUES('storage-read');`);
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

  it('rolls back all storage deletions when the delivery role has an unexpected dependency', async () => {
    await owner.query(
      'GRANT SELECT ON public.clients TO safemove_audit_delivery',
    );
    try {
      await expect(owner.query(migration())).rejects.toMatchObject({
        code: '2BP01',
      });
      await owner.query('ROLLBACK');
      expect(
        (await db.pool.query('SELECT id FROM client_read_audit_events')).rows,
      ).toEqual([{ id: 'storage-read' }]);
      expect(
        (await db.pool.query('SELECT "eventId" FROM audit_delivery_states'))
          .rows,
      ).toEqual([{ eventId: 'storage-read' }]);
      expect(
        (
          await db.pool.query<{ exists: boolean }>(
            "SELECT to_regprocedure('safemove_private.immutable_audit()') IS NOT NULL AS exists",
          )
        ).rows[0].exists,
      ).toBe(true);
      expect(await db.prisma.client.count()).toBe(2);
      expect(await db.prisma.clientAuditEvent.count()).toBe(1);
    } finally {
      await owner.query('ROLLBACK');
      await owner.query(
        'REVOKE SELECT ON public.clients FROM safemove_audit_delivery',
      );
    }
  });

  it('removes only read-history objects and preserves records and tenant isolation', async () => {
    const flags = (
      await owner.query(
        'SELECT rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname=current_user',
      )
    ).rows[0] as Record<string, boolean>;
    expect(flags).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: true,
    });
    await owner.query(migration());
    expect(
      (
        await db.pool.query(`SELECT
      to_regclass('public.client_read_audit_events') AS events,
      to_regclass('public.audit_delivery_states') AS delivery,
      to_regprocedure('safemove_private.immutable_audit()') AS immutable,
      to_regtype('public."ReadAuditDomain"') AS domain,
      to_regtype('public."ReadAuditAction"') AS action,
      to_regtype('public."ReadAuditActor"') AS actor`)
      ).rows[0],
    ).toEqual({
      events: null,
      delivery: null,
      immutable: null,
      domain: null,
      action: null,
      actor: null,
    });
    expect(
      (
        await db.pool.query(
          "SELECT rolname FROM pg_roles WHERE rolname='safemove_audit_delivery'",
        )
      ).rows,
    ).toEqual([]);
    const tables = (
      await db.pool.query<{ name: string; rls: boolean }>(`SELECT
      c.relname AS name,c.relrowsecurity AS rls FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'`)
    ).rows;
    expect(tables).toHaveLength(40);
    expect(tables.every((table) => table.rls)).toBe(true);
    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'clients',
        'client_audit_events',
        'appointments',
        'appointment_events',
      ]),
    );
    expect(await db.prisma.user.count()).toBe(2);
    expect(await db.prisma.client.count()).toBe(2);
    expect(
      await db.prisma.clientAuditEvent.findUniqueOrThrow({
        where: { id: 'storage-change' },
      }),
    ).toMatchObject({
      clientId: 'storage-client-a',
      professionalId: 'storage-owner-a',
      action: 'CREATED',
    });
    const urls = await runtimeUrls(db.pool);
    const clinical = new PrismaService();
    try {
      await clinical.onModuleInit();
      for (const id of ['a', 'b']) {
        const visible = await clinical.runAsProfessional(
          {
            sub: 'storage-owner-' + id,
            role: 'NUTRITIONIST',
            sessionId: 'synthetic',
          },
          'after-storage-removal-' + id,
          () => clinical.client.findMany({ select: { id: true } }),
        );
        expect(visible).toEqual([{ id: 'storage-client-' + id }]);
      }
      await expect(
        clinical.runAsProfessional(
          {
            sub: 'storage-owner-a',
            role: 'NUTRITIONIST',
            sessionId: 'synthetic',
          },
          'foreign-write-after-removal',
          () =>
            clinical.client.create({
              data: {
                name: 'Forbidden synthetic',
                professionalId: 'storage-owner-b',
              },
            }),
        ),
      ).rejects.toThrow();
    } finally {
      await clinical.$disconnect();
      urls.restore();
    }
  });
});
