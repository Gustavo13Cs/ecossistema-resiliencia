import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { Client } from 'pg';

export interface ProbeClient {
  connect(): Promise<unknown>;
  query(sql: string): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<unknown>;
}

export function summarize(samples: readonly number[]) {
  if (
    !samples.length ||
    samples.some((value) => !Number.isFinite(value) || value < 0)
  )
    throw new Error('Amostras inválidas.');
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    count: sorted.length,
    minMs: sorted[0],
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    maxMs: sorted[sorted.length - 1],
  };
}

/** Mede somente consultas constantes, em uma conexão com papel restrito. */
export async function measureRegion(
  client: ProbeClient,
  region: string,
  clock: () => number = () => performance.now(),
) {
  const samples: number[] = [];
  const started = clock();
  try {
    await client.connect();
    const connectionMs = clock() - started;
    await client.query('BEGIN READ ONLY');
    const safety = await client.query(`SELECT
      current_setting('transaction_read_only') = 'on' AS read_only,
      NOT rolsuper AND NOT rolbypassrls AS restricted
      FROM pg_roles WHERE rolname = current_user`);
    if (
      safety.rows.length !== 1 ||
      safety.rows[0].read_only !== true ||
      safety.rows[0].restricted !== true
    )
      throw new Error(
        'A sonda exige transação de leitura e papel sem superuser/BYPASSRLS.',
      );
    for (let index = 0; index < 18; index++) {
      const start = clock();
      await client.query('SELECT 1 AS region_probe');
      const duration = clock() - start;
      if (index >= 3) samples.push(duration);
    }
    await client.query('ROLLBACK');
    return {
      kind: 'postgres-region-latency',
      region,
      capturedAt: new Date().toISOString(),
      connectionMs,
      warmups: 3,
      readOnly: true,
      samplesMs: samples,
      ...summarize(samples),
    };
  } finally {
    await client.end();
  }
}

export function safeFailure(error: unknown) {
  // Mensagens e stacks do driver podem conter hosts e credenciais; só o código sai.
  const code =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z0-9_]{1,30}$/.test(error.code)
      ? error.code
      : 'PROBE_FAILED';
  return { kind: 'postgres-region-latency-error', code };
}

export async function main() {
  if (process.env.PROBE_SERVE === 'true') {
    // HTTP só responde saúde; chamadas externas não disparam novas consultas.
    const server = createServer((request, response) => {
      response.writeHead(request.url === '/' ? 200 : 404, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      response.end(JSON.stringify({ service: 'regional-probe' }));
    });
    const port = Number(process.env.PORT ?? '10000');
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error('Porta inválida.');
    server.listen(port, '0.0.0.0');
    process.once('SIGTERM', () => server.close());
  }
  // Após a coleta, remove-se a credencial e a sonda não abre novas conexões.
  if (process.env.PROBE_DISABLED === 'true') {
    console.log(
      'REGION_PROBE ' +
        JSON.stringify({ kind: 'postgres-region-probe-disabled' }),
    );
    return;
  }
  const connectionString = process.env.REGIONAL_DATABASE_URL;
  const region = process.env.PROBE_REGION;
  if (!connectionString || !region || !['oregon', 'virginia'].includes(region))
    throw new Error('Configuração regional incompleta.');
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  console.log(
    'REGION_PROBE ' + JSON.stringify(await measureRegion(client, region)),
  );
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error('REGION_PROBE ' + JSON.stringify(safeFailure(error)));
    if (process.env.PROBE_SERVE !== 'true') process.exitCode = 1;
  });
}
