import { Pool } from 'pg';
import { assertIsolationDatabase } from './client-isolation';

async function cleanup() {
  assertIsolationDatabase();
  if (
    process.env.DATABASE_URL !==
      'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test' ||
    process.env.DIRECT_URL !==
      'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test' ||
    process.env.NODE_ENV !== 'test' ||
    process.env.SAFEMOVE_LICENSED_MEDIA_FIXTURE !== '1'
  )
    throw new Error('Visual cleanup requires the isolated fixture runner');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const connection = await pool.connect();
  const owner = '31000000-0000-4000-8000-000000000002';
  try {
    await connection.query('BEGIN');
    const { rows } = await connection.query<{ id: string }>(
      `SELECT id FROM clients WHERE "professionalId" = $1 AND name LIKE 'Task6 Biblioteca %'`,
      [owner],
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
    await connection.query(
      `DELETE FROM custom_exercises WHERE "professionalId" = $1 AND (name LIKE 'Task6 próprio %' OR name LIKE 'Task6 sem vídeo %')`,
      [owner],
    );
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
  console.error('Task6 synthetic browser fixture cleanup failed');
  process.exitCode = 1;
});
