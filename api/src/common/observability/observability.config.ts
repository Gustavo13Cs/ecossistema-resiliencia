export type ObservabilityLogMode = 'all' | 'slow' | 'none';

export interface ObservabilityConfig {
  slowRequestMs: number;
  slowQueryMs: number;
  logRequests: ObservabilityLogMode;
  serverTimingEnabled: boolean;
  summaryIntervalMs: number;
}

function parseBoundInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw || !/^[0-9]+$/.test(raw)) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

function parseLogMode(
  raw: string | undefined,
  nodeEnv: string | undefined,
): ObservabilityLogMode {
  if (raw === 'all' || raw === 'slow' || raw === 'none') {
    return raw;
  }
  return nodeEnv === 'test' ? 'none' : 'all';
}

export function readObservabilityConfig(
  env: NodeJS.ProcessEnv = process.env,
): ObservabilityConfig {
  const summaryIntervalMs = parseBoundInt(
    env.OBSERVABILITY_SUMMARY_INTERVAL_MS,
    0,
    10_000,
    3_600_000,
  );
  return {
    slowRequestMs: parseBoundInt(
      env.OBSERVABILITY_SLOW_REQUEST_MS,
      300,
      1,
      60_000,
    ),
    slowQueryMs: parseBoundInt(env.OBSERVABILITY_SLOW_QUERY_MS, 100, 1, 60_000),
    logRequests: parseLogMode(env.OBSERVABILITY_LOG_REQUESTS, env.NODE_ENV),
    serverTimingEnabled: env.OBSERVABILITY_SERVER_TIMING !== 'false',
    summaryIntervalMs,
  };
}

export function roundMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

export function elapsedMs(
  startedAtNs: bigint,
  endedAtNs: bigint = process.hrtime.bigint(),
): number {
  if (endedAtNs <= startedAtNs) return 0;
  return roundMs(Number(endedAtNs - startedAtNs) / 1_000_000);
}
