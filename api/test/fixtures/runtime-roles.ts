import { Pool } from 'pg';

export async function runtimeUrls(
  pool: Pool,
  port = Number(process.env.LOCAL_TEST_PG_PORT ?? '5434'),
) {
  if (![5434, 5435].includes(port))
    throw new Error('Synthetic fixture port must be 5434 or 5435');
  const database = (
    await pool.query<{ name: string }>('SELECT current_database() AS name')
  ).rows[0].name;
  if (
    !/^(safemove_security_[a-f0-9]{32}|ecossistema_resiliencia_test)$/.test(
      database,
    )
  )
    throw new Error('Runtime fixtures require a synthetic local database');
  const groups = {
    clinical: 'safemove_clinical',
    auth: 'safemove_auth',
    jobs: 'safemove_jobs',
  };
  for (const [purpose, group] of Object.entries(groups)) {
    const role = 'safemove_test_' + purpose;
    await pool.query(`DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='${role}') THEN
      CREATE ROLE ${role} LOGIN PASSWORD 'local-synthetic-only' NOSUPERUSER NOBYPASSRLS; END IF; END $$;`);
    await pool.query(`GRANT ${group} TO ${role}`);
  }
  const url = (purpose: string) =>
    `postgresql://safemove_test_${purpose}:local-synthetic-only@localhost:${port}/${database}`;
  const values = {
    CLINICAL_DATABASE_URL: url('clinical'),
    AUTH_DATABASE_URL: url('auth'),
    JOBS_DATABASE_URL: url('jobs'),
  };
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, values);
  return {
    values,
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    },
  };
}
