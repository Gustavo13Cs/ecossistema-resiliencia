import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import {
  assertIsolationDatabase,
  isolationDatabase,
  isolationPort,
} from './fixtures/client-isolation';
import { runtimeUrls } from './fixtures/runtime-roles';

const API_PORT = 3000;
const WEB_PORT = 3001;
const E2E_JWT_SECRET = 'synthetic-local-test-secret-at-least-32-characters';

function assertPortFree(port: number): Promise<void> {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer();
    probe.once('error', () => {
      rejectPort(
        new Error(
          `Port ${port} is already occupied by an external process; refusing to run E2E against unknown server`,
        ),
      );
    });
    probe.once('listening', () => {
      probe.close((closeErr) => {
        if (closeErr) rejectPort(closeErr);
        else resolvePort();
      });
    });
    probe.listen(port, '127.0.0.1');
  });
}

async function waitForHttp(
  url: string,
  expectedStatuses: number[],
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (expectedStatuses.includes(response.status)) {
        return;
      }
    } catch {
      // Server still booting.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function runCommandSync(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): void {
  const isCmd = command.toLowerCase().endsWith('.cmd');
  const result = isCmd
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', command, ...args], {
        cwd,
        env,
        stdio: 'inherit',
        windowsHide: true,
      })
    : spawnSync(command, args, {
        cwd,
        env,
        stdio: 'inherit',
        windowsHide: true,
      });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Command "${command} ${args.join(' ')}" exited with status ${String(result.status)}`,
    );
  }
}

function terminateOwnedChild(child: ChildProcess | null): void {
  if (!child?.pid || child.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child.kill('SIGTERM');
  }
}

function buildChildApiEnv(
  roleValues: Record<
    'CLINICAL_DATABASE_URL' | 'AUTH_DATABASE_URL' | 'JOBS_DATABASE_URL',
    string
  >,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DIRECT_URL;
  return {
    ...env,
    ...roleValues,
    DOTENV_CONFIG_PATH: '__disabled_dotenv__',
    NODE_ENV: 'test',
    PORT: String(API_PORT),
    JWT_SECRET: E2E_JWT_SECRET,
    ALLOWED_ORIGINS: `http://localhost:${WEB_PORT}`,
    AUTH_COOKIE_SECURE: 'false',
    AUTH_COOKIE_SAME_SITE: 'lax',
  };
}

export async function runPersonalP1Real(): Promise<number> {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousDirectUrl = process.env.DIRECT_URL;

  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    process.env.DATABASE_URL = isolationDatabase;
    process.env.DIRECT_URL = isolationDatabase;
  }

  assertIsolationDatabase();
  await assertPortFree(API_PORT);
  await assertPortFree(WEB_PORT);

  const apiDir = resolve(__dirname, '..');
  const webDir = resolve(apiDir, '..', 'web');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let restoreRoles: (() => void) | null = null;
  let apiProcess: ChildProcess | null = null;
  let webProcess: ChildProcess | null = null;

  try {
    const adminEnv: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: isolationDatabase,
      DIRECT_URL: isolationDatabase,
      DOTENV_CONFIG_PATH: '__disabled_dotenv__',
    };

    runCommandSync(
      'npx.cmd',
      ['prisma', 'migrate', 'deploy'],
      apiDir,
      adminEnv,
    );

    const roles = await runtimeUrls(pool, isolationPort);
    restoreRoles = () => roles.restore();

    runCommandSync('npm.cmd', ['run', 'seed:phase1-e2e'], apiDir, adminEnv);
    runCommandSync('npm.cmd', ['run', 'build'], apiDir, adminEnv);

    const webBuildEnv: NodeJS.ProcessEnv = {
      ...process.env,
      INTERNAL_API_URL: `http://localhost:${API_PORT}`,
      NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
    };
    delete webBuildEnv.DATABASE_URL;
    delete webBuildEnv.DIRECT_URL;

    runCommandSync('npm.cmd', ['run', 'build'], webDir, webBuildEnv);

    apiProcess = spawn(
      process.execPath,
      [resolve(apiDir, 'dist/src/main.js')],
      {
        cwd: apiDir,
        env: buildChildApiEnv(roles.values),
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    await waitForHttp(`http://localhost:${API_PORT}/auth/me`, [401]);

    webProcess = spawn(
      process.execPath,
      [
        resolve(webDir, 'node_modules/next/dist/bin/next'),
        'start',
        '-p',
        String(WEB_PORT),
      ],
      {
        cwd: webDir,
        env: {
          ...webBuildEnv,
          NODE_ENV: 'production',
          PORT: String(WEB_PORT),
        },
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    await waitForHttp(`http://localhost:${WEB_PORT}/auth/login`, [200]);

    const specs = [
      'cypress/e2e/personal-workspace-real.cy.ts',
      'cypress/e2e/professional-phase1-real.cy.ts',
      'cypress/e2e/assessments-client-real.cy.ts',
      'cypress/e2e/client-owned-clinical-resources.cy.ts',
    ].join(',');

    const cypressResult = spawnSync(
      'cmd.exe',
      [
        '/d',
        '/s',
        '/c',
        'npx.cmd',
        'cypress',
        'run',
        '--browser',
        'electron',
        '--config',
        'screenshotOnRunFailure=false,video=false',
        '--spec',
        specs,
      ],
      {
        cwd: webDir,
        env: webBuildEnv,
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    if (cypressResult.error) {
      throw cypressResult.error;
    }

    return cypressResult.status ?? 1;
  } finally {
    terminateOwnedChild(webProcess);
    terminateOwnedChild(apiProcess);
    restoreRoles?.();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousDirectUrl === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = previousDirectUrl;
    await pool.end();
  }
}

if (require.main === module) {
  void runPersonalP1Real()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(
        error instanceof Error
          ? error.message
          : 'Personal P1 real verification failed',
      );
      process.exitCode = 1;
    });
}
