import { Pool } from 'pg';
import { assertIsolationDatabase, isolationDatabase } from './client-isolation';

// Fixtures Task7 são deliberadamente limitadas à conta sintética e ao prefixo próprio.
async function cleanup() {
  process.env.DATABASE_URL = isolationDatabase;
  process.env.DIRECT_URL = isolationDatabase;
  assertIsolationDatabase();
  const pool = new Pool({ connectionString: isolationDatabase });
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const { rows } = await connection.query<{ id: string }>(
      `SELECT id FROM clients WHERE "professionalId" = $1 AND name LIKE 'Task7 %'`,
      ['31000000-0000-4000-8000-000000000002'],
    );
    const ids = rows.map(({ id }) => id);
    for (const table of ['workout_drafts', 'workouts', 'client_audit_events']) {
      await connection.query(
        `DELETE FROM ${table} WHERE "clientId" = ANY($1::text[])`,
        [ids],
      );
    }
    await connection.query('DELETE FROM clients WHERE id = ANY($1::text[])', [
      ids,
    ]);
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

void cleanup().catch(() => {
  console.error('Task7 synthetic browser fixture cleanup failed');
  process.exitCode = 1;
});
