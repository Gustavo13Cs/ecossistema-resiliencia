import { spawnSync } from 'node:child_process';
import { Pool } from 'pg';
import { resolve } from 'node:path';
import { assertIsolationDatabase } from './fixtures/client-isolation';
import { runtimeUrls } from './fixtures/runtime-roles';
async function run() {
  assertIsolationDatabase();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const roles = await runtimeUrls(pool);
    const result = spawnSync(
      process.execPath,
      [
        resolve('node_modules/jest/bin/jest.js'),
        '--config',
        './test/jest-e2e.json',
        '--runInBand',
        ...process.argv.slice(2),
      ],
      {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          JWT_SECRET: 'synthetic-local-test-secret-at-least-32-characters',
        },
      },
    );
    roles.restore();
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    await pool.end();
  }
}
void run().catch(() => {
  console.error('Local tenant verification failed');
  process.exitCode = 1;
});
