import { randomBytes } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { roundMs } from './observability.config';

export type SqlOperation =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'SET_CONFIG'
  | 'BEGIN'
  | 'COMMIT'
  | 'ROLLBACK'
  | 'SAVEPOINT'
  | 'OTHER';

const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const UUID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT_PATTERN = /^\d+$/;
const CUID_SEGMENT_PATTERN = /^[a-z][a-z0-9]{20,}$/i;
const LONG_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,}$/;
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
const SAFE_ERROR_CODE_PATTERN = /^[A-Za-z0-9_]{1,64}$/;
const PRISMA_ERROR_CODE_PATTERN = /^P\d{4}$/;
const UPPER_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;

const DSN_PATTERN = /postgres(?:ql)?:\/\/[^\s'"]+/gi;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

const SAFE_TELEMETRY_KEYS = new Set([
  'dbQueryCount',
  'slowQueryCount',
  'avgDbQueries',
  'slowestTarget',
  'target',
]);

const FORBIDDEN_KEY_SUBSTRINGS = [
  'password',
  'secret',
  'authorization',
  'cookie',
  'email',
  'phone',
  'birthdate',
  'clientname',
  'patientname',
  'notes',
  'allergies',
  'pathologies',
  'diagnosis',
  'anamnesis',
  'chiefcomplaint',
  'clinicalindication',
  'preparationinstructions',
  'medication',
  'markers',
  'meals',
  'exercises',
  'payload',
  'connectionstring',
  'databaseurl',
] as const;

const FORBIDDEN_KEY_TOKENS = new Set([
  'token',
  'cpf',
  'rg',
  'body',
  'query',
  'params',
  'args',
  'sql',
  'dsn',
  'headers',
]);

const EXACT_FORBIDDEN_KEYS = new Set([
  'name',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'cookies',
  'email',
  'phone',
  'cpf',
  'rg',
  'birthdate',
  'clientname',
  'patientname',
  'notes',
  'allergies',
  'pathologies',
  'diagnosis',
  'anamnesis',
  'medication',
  'markers',
  'meals',
  'exercises',
  'payload',
  'body',
  'query',
  'params',
  'args',
  'sql',
  'dsn',
  'connectionstring',
  'databaseurl',
  'headers',
]);

function splitKeyTokens(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isForbiddenLogKey(key: string): boolean {
  if (SAFE_TELEMETRY_KEYS.has(key)) return false;
  const normalized = key.toLowerCase();
  if (EXACT_FORBIDDEN_KEYS.has(normalized)) return true;
  if (
    FORBIDDEN_KEY_SUBSTRINGS.some((fragment) => normalized.includes(fragment))
  ) {
    return true;
  }
  return splitKeyTokens(key).some((token) => FORBIDDEN_KEY_TOKENS.has(token));
}

export function parseTraceparent(
  header: unknown,
): { traceId: string; parentSpanId: string } | null {
  if (typeof header !== 'string') return null;
  const trimmed = header.trim().toLowerCase();
  const match = TRACEPARENT_PATTERN.exec(trimmed);
  if (!match) return null;
  const [, traceId, parentSpanId] = match;
  if (/^0+$/.test(traceId) || /^0+$/.test(parentSpanId)) return null;
  return { traceId, parentSpanId };
}

export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

function isDynamicIdSegment(segment: string): boolean {
  if (!segment) return false;
  if (UUID_SEGMENT_PATTERN.test(segment)) return true;
  if (NUMERIC_SEGMENT_PATTERN.test(segment)) return true;
  if (CUID_SEGMENT_PATTERN.test(segment)) return true;
  return LONG_TOKEN_PATTERN.test(segment) && /\d/.test(segment);
}

function normalizePath(path: string): string {
  const collapsed = path.replace(/\/+/g, '/');
  if (!collapsed || collapsed === '/') return '/';
  const withLeading = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  return withLeading.length > 1 && withLeading.endsWith('/')
    ? withLeading.slice(0, -1)
    : withLeading;
}

export function resolveRouteTemplate(request: {
  method?: string;
  baseUrl?: string;
  route?: { path?: unknown };
  originalUrl?: string;
  url?: string;
}): string {
  const method =
    typeof request.method === 'string' && request.method.trim()
      ? request.method.trim().toUpperCase()
      : 'UNKNOWN';

  if (typeof request.route?.path === 'string') {
    const joined = `${request.baseUrl ?? ''}${request.route.path}`;
    return `${method} ${normalizePath(joined)}`;
  }

  const rawUrl = request.originalUrl ?? request.url ?? '/';
  const pathname = rawUrl.split(/[?#]/)[0] || '/';
  const segments = pathname
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => (isDynamicIdSegment(segment) ? ':id' : segment));

  return `${method} ${segments.length ? `/${segments.join('/')}` : '/'}`;
}

function stripLeadingSqlComments(sql: string): string {
  let remaining = sql.trimStart();
  while (remaining.length > 0) {
    if (remaining.startsWith('--')) {
      const newlineIndex = remaining.indexOf('\n');
      remaining =
        newlineIndex === -1
          ? ''
          : remaining.slice(newlineIndex + 1).trimStart();
      continue;
    }
    if (remaining.startsWith('/*')) {
      const endIndex = remaining.indexOf('*/');
      remaining =
        endIndex === -1 ? '' : remaining.slice(endIndex + 2).trimStart();
      continue;
    }
    break;
  }
  return remaining;
}

function normalizeTableToken(rawToken: string | undefined): string {
  if (!rawToken) return 'unknown';
  const unquotedParts = rawToken
    .split('.')
    .map((part) => part.replace(/^"+|"+$/g, '').trim())
    .filter(Boolean);
  const candidate = unquotedParts.at(-1);
  if (!candidate || !SAFE_IDENTIFIER_PATTERN.test(candidate)) {
    return 'unknown';
  }
  return candidate;
}

export function extractSafeSqlOperation(sql: string): {
  operation: SqlOperation;
  target: string;
} {
  if (typeof sql !== 'string' || !sql.trim()) {
    return { operation: 'OTHER', target: 'unknown' };
  }
  const clean = stripLeadingSqlComments(sql);
  if (!clean) {
    return { operation: 'OTHER', target: 'unknown' };
  }

  if (/^SELECT\s+set_config\s*\(/i.test(clean)) {
    return { operation: 'SET_CONFIG', target: 'rls_context' };
  }

  const keywordMatch =
    /^(SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/i.exec(
      clean,
    );
  const operation = (
    keywordMatch ? keywordMatch[1].toUpperCase() : 'OTHER'
  ) as SqlOperation;

  if (
    operation === 'BEGIN' ||
    operation === 'COMMIT' ||
    operation === 'ROLLBACK' ||
    operation === 'SAVEPOINT'
  ) {
    return { operation, target: 'transaction' };
  }

  if (operation === 'INSERT') {
    const intoMatch =
      /\bINTO\s+((?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?[a-zA-Z_][a-zA-Z0-9_]*"?)/i.exec(
        clean,
      );
    return { operation, target: normalizeTableToken(intoMatch?.[1]) };
  }

  if (operation === 'UPDATE') {
    const updateMatch =
      /^UPDATE\s+(?:ONLY\s+)?((?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?[a-zA-Z_][a-zA-Z0-9_]*"?)/i.exec(
        clean,
      );
    return { operation, target: normalizeTableToken(updateMatch?.[1]) };
  }

  if (operation === 'SELECT' || operation === 'DELETE') {
    const fromMatch =
      /\bFROM\s+(?:ONLY\s+)?((?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?[a-zA-Z_][a-zA-Z0-9_]*"?)/i.exec(
        clean,
      );
    return { operation, target: normalizeTableToken(fromMatch?.[1]) };
  }

  return { operation, target: 'unknown' };
}

export function safeErrorCode(error: unknown): string {
  if (error instanceof HttpException) {
    const name = error.constructor?.name ?? 'HttpException';
    return SAFE_ERROR_CODE_PATTERN.test(name) ? name : 'HttpException';
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const rawCode = (error as { code?: unknown }).code;
    if (
      typeof rawCode === 'string' &&
      (PRISMA_ERROR_CODE_PATTERN.test(rawCode) ||
        UPPER_CODE_PATTERN.test(rawCode))
    ) {
      return rawCode;
    }
  }
  return 'INTERNAL_ERROR';
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value
      .replace(DSN_PATTERN, '[REDACTED_DSN]')
      .replace(JWT_PATTERN, '[REDACTED_TOKEN]');
  }
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenLogKey(key)) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redactValue(entry, seen);
    }
  }
  return output;
}

export function redactLogRecord<T extends Record<string, unknown>>(
  record: T,
): Record<string, unknown> {
  return redactValue(record, new WeakSet<object>()) as Record<string, unknown>;
}

export function formatServerTiming(stages: {
  totalMs: number;
  dbMs: number;
  txAcquireMs?: number;
  rlsContextMs?: number;
  handlerMs?: number;
  validationMs?: number;
  txCommitMs?: number;
}): string {
  const parts: string[] = [
    `total;dur=${roundMs(stages.totalMs)}`,
    `db;dur=${roundMs(stages.dbMs)}`,
  ];
  if (stages.txAcquireMs !== undefined) {
    parts.push(`tx;dur=${roundMs(stages.txAcquireMs)}`);
  }
  if (stages.rlsContextMs !== undefined) {
    parts.push(`rls;dur=${roundMs(stages.rlsContextMs)}`);
  }
  if (stages.handlerMs !== undefined) {
    parts.push(`handler;dur=${roundMs(stages.handlerMs)}`);
  }
  if (stages.validationMs !== undefined) {
    parts.push(`validate;dur=${roundMs(stages.validationMs)}`);
  }
  if (stages.txCommitMs !== undefined) {
    parts.push(`commit;dur=${roundMs(stages.txCommitMs)}`);
  }
  return parts.join(', ');
}
