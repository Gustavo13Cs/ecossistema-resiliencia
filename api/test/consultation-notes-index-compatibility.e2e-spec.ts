import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, PoolClient } from 'pg';

const migrations = resolve(__dirname, '../prisma/migrations');
const originalName = '20260929120000_add_client_owned_clinical_resources';
const indexName = 'consultation_notes_patientId_createdAt_idx';
const legacyName = `${indexName}_legacy`;
const originalSql = readFileSync(
  resolve(migrations, originalName, 'migration.sql'),
  'utf8',
);
const createIndex = originalSql.match(
  /CREATE INDEX "consultation_notes_patientId_createdAt_idx"[\s\S]*?;/,
)![0];

function compatibilitySql(name: string) {
  const path = resolve(migrations, name, 'migration.sql');
  return readFileSync(path, 'utf8');
}

describe('Consultation notes legacy index compatibility (PostgreSQL)', () => {
  let pool: Pool;
  let connection: PoolClient;

  beforeAll(() => {
    // Fixtures exist only in this connection's temporary schema and are rolled back.
    pool = new Pool({
      connectionString:
        'postgresql://postgres:postgres@localhost:5434/postgres',
      connectionTimeoutMillis: 3000,
    });
  });
  beforeEach(async () => {
    connection = await pool.connect();
    await connection.query('BEGIN');
    await connection.query(`
      CREATE TEMP TABLE consultation_notes (
        id text, "patientId" text, "createdAt" timestamp(3), content text
      );
      CREATE TEMP TABLE "_prisma_migrations" (
        migration_name text, checksum text, finished_at timestamptz,
        rolled_back_at timestamptz
      );
    `);
  });
  afterEach(async () => {
    if (connection) {
      await connection.query('ROLLBACK');
      connection.release();
    }
  });
  afterAll(async () => {
    await pool.end();
  });

  async function prepare() {
    await connection.query(
      compatibilitySql(
        '20260929115900_prepare_legacy_consultation_notes_index',
      ),
    );
  }
  async function indexes() {
    return (
      await connection.query<{
        oid: number;
        relname: string;
        definition: string;
      }>(
        `SELECT c.oid::int, c.relname, pg_get_indexdef(c.oid) AS definition
         FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
         WHERE i.indrelid = 'consultation_notes'::regclass ORDER BY c.relname`,
      )
    ).rows;
  }

  it('reproduces the original duplicate-index failure on the legacy schema', async () => {
    await connection.query(createIndex);
    await expect(connection.query(createIndex)).rejects.toMatchObject({
      code: '42P07',
    });
  });

  it('allows the unchanged migration and preserves the original index and rows', async () => {
    await connection.query(createIndex);
    await connection.query(
      `INSERT INTO consultation_notes VALUES ('synthetic-note', 'synthetic-patient', now(), 'synthetic')`,
    );
    const [originalIndex] = await indexes();
    await prepare();
    await connection.query(createIndex);
    const after = await indexes();
    expect(after).toHaveLength(2);
    expect(after).toContainEqual({
      ...originalIndex,
      relname: legacyName,
      definition: originalIndex.definition.replace(indexName, legacyName),
    });
    expect(after).toContainEqual(
      expect.objectContaining({ relname: indexName }),
    );
    expect(
      (await connection.query('SELECT count(*) FROM consultation_notes')).rows,
    ).toEqual([{ count: '1' }]);
  });

  it('keeps a clean installation with a single canonical index', async () => {
    await prepare();
    await connection.query(createIndex);
    expect(await indexes()).toEqual([
      expect.objectContaining({ relname: indexName }),
    ]);
  });

  it('does not change an already-applied migration or its recorded checksum', async () => {
    const checksum = createHash('sha256').update(originalSql).digest('hex');
    await connection.query(createIndex);
    const before = await indexes();
    await connection.query(
      `INSERT INTO "_prisma_migrations" VALUES ($1, $2, now(), NULL)`,
      [originalName, checksum],
    );
    await prepare();
    expect(await indexes()).toEqual(before);
    expect(
      (await connection.query('SELECT checksum FROM "_prisma_migrations"'))
        .rows,
    ).toEqual([{ checksum }]);
    expect(
      createHash('sha256')
        .update(originalSql.replaceAll('\r\n', '\n'))
        .digest('hex'),
    ).toBe('f5ffbd83141d190fb995d8b13e1498002048c14d5f593bc52e64090303357630');
  });

  it.each([
    'CREATE INDEX "consultation_notes_patientId_createdAt_idx" ON consultation_notes ("createdAt", "patientId")',
    'CREATE UNIQUE INDEX "consultation_notes_patientId_createdAt_idx" ON consultation_notes ("patientId", "createdAt")',
    'CREATE INDEX "consultation_notes_patientId_createdAt_idx" ON consultation_notes ("patientId", "createdAt") WHERE "patientId" IS NOT NULL',
    'CREATE INDEX "consultation_notes_patientId_createdAt_idx" ON consultation_notes ("patientId" DESC, "createdAt")',
    'CREATE INDEX "consultation_notes_patientId_createdAt_idx" ON consultation_notes ("patientId", "createdAt") INCLUDE (content)',
  ])(
    'rejects a conflicting definition before changing objects: %s',
    async (sql) => {
      await connection.query(sql);
      await expect(prepare()).rejects.toThrow('incompatible definition');
    },
  );

  it('rejects an occupied legacy name without overwriting it', async () => {
    await connection.query(createIndex);
    await connection.query(
      `CREATE INDEX "${legacyName}" ON consultation_notes (id)`,
    );
    await expect(prepare()).rejects.toThrow(
      'legacy index name is already occupied',
    );
  });
});

describe('Complete Client ownership migration with legacy index (PostgreSQL)', () => {
  it.each([false, true])(
    'replays the complete SQL with a pre-existing index: %s',
    async (legacy) => {
      const pool = new Pool({
        connectionString:
          'postgresql://postgres:postgres@localhost:5434/postgres',
        connectionTimeoutMillis: 3000,
      });
      const connection = await pool.connect();
      const schema = `safemove_pr22_${randomUUID().replaceAll('-', '')}`;
      try {
        await connection.query('BEGIN');
        await connection.query(`CREATE SCHEMA "${schema}"`);
        await connection.query(`SET LOCAL search_path TO "${schema}"`);
        // Structural prerequisites only; omit unrelated Data API/recipe migrations.
        // All objects belong to this fresh schema and the transaction is rolled back.
        for (const name of readdirSync(migrations).sort()) {
          if (name <= '20260914133000_add_professional_appointments') {
            await connection.query(
              readFileSync(resolve(migrations, name, 'migration.sql'), 'utf8'),
            );
          }
        }
        await connection.query(`CREATE TABLE "_prisma_migrations" (
        migration_name text, finished_at timestamptz, rolled_back_at timestamptz
      )`);
        if (legacy) {
          const createNotes = originalSql.match(
            /CREATE TABLE IF NOT EXISTS "consultation_notes"[\s\S]*?;/,
          )![0];
          await connection.query(createNotes);
          await connection.query(createIndex);
        }
        await connection.query(
          compatibilitySql(
            '20260929115900_prepare_legacy_consultation_notes_index',
          ),
        );
        await connection.query(originalSql);
        const indexes = await connection.query<{ relname: string }>(
          `SELECT c.relname FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
         WHERE i.indrelid = 'consultation_notes'::regclass AND c.relname = ANY($1::text[])`,
          [[indexName, legacyName]],
        );
        expect(indexes.rows).toHaveLength(legacy ? 2 : 1);
        expect(indexes.rows).toContainEqual({ relname: indexName });
        const columns = await connection.query<{ attname: string }>(
          `SELECT attname FROM pg_attribute WHERE attrelid = 'consultation_notes'::regclass AND attname = 'clientId'`,
        );
        expect(columns.rows).toEqual([{ attname: 'clientId' }]);
      } finally {
        await connection.query('ROLLBACK');
        connection.release();
        await pool.end();
      }
    },
  );
});
