import { isolationPort } from './fixtures/client-isolation';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const ADMIN_URL = `postgresql://postgres:postgres@localhost:${isolationPort}/postgres`;
const TARGET = '20260929123000_add_revocable_auth_sessions';
const MIGRATIONS = resolve(__dirname, '../prisma/migrations');
const USER_ID = 'auth-schema-existing-user';

describe('Revocable auth session schema (e2e)', () => {
  jest.setTimeout(60_000);
  const databaseName = `safemove_auth_schema_${randomUUID().replaceAll('-', '')}`;
  let admin: Pool;
  let pool: Pool;

  beforeAll(async () => {
    const url = new URL(ADMIN_URL);
    expect(url.hostname).toBe('localhost');
    expect(url.port).toBe(String(isolationPort));
    expect(url.pathname).toBe('/postgres');
    expect(databaseName).toMatch(/^safemove_auth_schema_[a-f0-9]{32}$/);
    admin = new Pool({ connectionString: ADMIN_URL });
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    pool = new Pool({
      connectionString: `postgresql://postgres:postgres@localhost:${isolationPort}/${databaseName}`,
    });
    for (const name of readdirSync(MIGRATIONS)
      .filter((name) => name < TARGET)
      .sort()) {
      const path = resolve(MIGRATIONS, name, 'migration.sql');
      if (existsSync(path)) await pool.query(readFileSync(path, 'utf8'));
    }
    await pool.query(
      `INSERT INTO "User" (id, name, email, password, "updatedAt")
       VALUES ($1, 'Auth schema fixture', 'schema@auth.test', 'unused', now())`,
      [USER_ID],
    );
    const path = resolve(MIGRATIONS, TARGET, 'migration.sql');
    if (existsSync(path)) await pool.query(readFileSync(path, 'utf8'));
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.end();
    }
  });

  it('backfills an existing user with authVersion zero', async () => {
    const result = await pool.query<{ authVersion: number }>(
      'SELECT "authVersion" FROM "User" WHERE id = $1',
      [USER_ID],
    );
    expect(result.rows).toEqual([{ authVersion: 0 }]);
  });

  it('requires a refresh hash and an existing user', async () => {
    await expect(
      pool.query(
        `INSERT INTO auth_sessions (id, "userId", "expiresAt", "updatedAt")
       VALUES ('missing-hash', $1, now() + interval '30 days', now())`,
        [USER_ID],
      ),
    ).rejects.toMatchObject({ code: '23502' });
    await expect(
      pool.query(
        `INSERT INTO auth_sessions (id, "userId", "refreshTokenHash", "expiresAt", "updatedAt")
       VALUES ('missing-user', 'unknown', 'hash', now() + interval '30 days', now())`,
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('removes sessions when their user is deleted', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO auth_sessions (id, "userId", "refreshTokenHash", "expiresAt", "updatedAt")
         VALUES ('delete-session', $1, 'hash', now() + interval '30 days', now())`,
        [USER_ID],
      );
      await client.query('DELETE FROM "User" WHERE id = $1', [USER_ID]);
      expect((await client.query('SELECT id FROM auth_sessions')).rows).toEqual(
        [],
      );
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('indexes active user session and expiration lookups', async () => {
    const indexes = await pool.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'auth_sessions'`,
    );
    expect(
      indexes.rows.some(({ indexdef }) =>
        indexdef.includes('("userId", "revokedAt", "expiresAt")'),
      ),
    ).toBe(true);
    expect(
      indexes.rows.some(({ indexdef }) => indexdef.includes('("expiresAt")')),
    ).toBe(true);
  });

  it('keeps sessions and new clinical tables private to the application database role', async () => {
    const tables = ['auth_sessions', 'client_goals', 'lab_orders'];
    const rows = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT relname, relrowsecurity FROM pg_class
       WHERE relnamespace = 'public'::regnamespace AND relname = ANY($1::text[])`,
      [tables],
    );
    expect(rows.rows).toHaveLength(3);
    expect(rows.rows.every((row) => row.relrowsecurity)).toBe(true);
    const policies = await pool.query<{
      tablename: string;
      permissive: string;
      qual: string;
      with_check: string;
    }>(
      `SELECT tablename, permissive, qual, with_check FROM pg_policies
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])
         AND policyname = 'deny_data_api_access'`,
      [tables],
    );
    expect(policies.rows).toHaveLength(3);
    expect(
      policies.rows.every(
        (row) =>
          row.permissive === 'RESTRICTIVE' &&
          row.qual === 'false' &&
          row.with_check === 'false',
      ),
    ).toBe(true);
    const grants = await pool.query(
      `SELECT 1 FROM information_schema.table_privileges
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
         AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')`,
      [tables],
    );
    expect(grants.rows).toEqual([]);
  });
});
