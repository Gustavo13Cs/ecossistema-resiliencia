import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  extractSafeSqlOperation,
  formatServerTiming,
  generateSpanId,
  generateTraceId,
  parseTraceparent,
  redactLogRecord,
  resolveRouteTemplate,
  safeErrorCode,
} from './log-redaction';

describe('log-redaction & observability helpers', () => {
  describe('parseTraceparent', () => {
    it('accepts a valid W3C traceparent header and extracts traceId/parentSpanId', () => {
      expect(
        parseTraceparent(
          '  00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01  ',
        ),
      ).toEqual({
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        parentSpanId: '00f067aa0ba902b7',
      });
    });

    it('rejects malformed or all-zero traceparent headers', () => {
      expect(parseTraceparent(undefined)).toBeNull();
      expect(parseTraceparent('invalid')).toBeNull();
      expect(
        parseTraceparent(
          '00-00000000000000000000000000000000-00f067aa0ba902b7-01',
        ),
      ).toBeNull();
      expect(
        parseTraceparent(
          '00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01',
        ),
      ).toBeNull();
    });

    it('generates valid hex trace and span identifiers', () => {
      expect(generateTraceId()).toMatch(/^[0-9a-f]{32}$/);
      expect(generateSpanId()).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('resolveRouteTemplate', () => {
    it('uses matched Express route pattern when available', () => {
      expect(
        resolveRouteTemplate({
          method: 'get',
          baseUrl: '/api',
          route: { path: '/clients/:id/overview' },
          originalUrl:
            '/api/clients/123e4567-e89b-12d3-a456-426614174000/overview?foo=bar',
        }),
      ).toBe('GET /api/clients/:id/overview');
    });

    it('normalizes fallback URLs by stripping query strings and collapsing dynamic IDs', () => {
      expect(
        resolveRouteTemplate({
          method: 'PATCH',
          originalUrl:
            '/clients/123e4567-e89b-12d3-a456-426614174000/workouts/42?secret=123',
        }),
      ).toBe('PATCH /clients/:id/workouts/:id');

      expect(
        resolveRouteTemplate({
          method: 'GET',
          url: '/recipes/cm39x12340000abcdef123456',
        }),
      ).toBe('GET /recipes/:id');
    });
  });

  describe('extractSafeSqlOperation', () => {
    it('extracts SQL operation and table without leaking query values', () => {
      expect(
        extractSafeSqlOperation(
          'SELECT "public"."Client"."id" FROM "public"."Client" WHERE "name" = $1',
        ),
      ).toEqual({ operation: 'SELECT', target: 'Client' });

      expect(
        extractSafeSqlOperation(
          '/* comment */ INSERT INTO "public"."LabExam" ("notes") VALUES ($1)',
        ),
      ).toEqual({ operation: 'INSERT', target: 'LabExam' });

      expect(
        extractSafeSqlOperation(
          '-- line comment\nUPDATE "DietPlan" SET "title" = $1 WHERE id = $2',
        ),
      ).toEqual({ operation: 'UPDATE', target: 'DietPlan' });

      expect(
        extractSafeSqlOperation(
          'DELETE FROM "public"."lab_orders" WHERE id = $1',
        ),
      ).toEqual({ operation: 'DELETE', target: 'lab_orders' });
    });

    it('classifies set_config, transaction commands, and malformed SQL safely', () => {
      expect(
        extractSafeSqlOperation(
          "SELECT set_config('safemove.professional_id', $1, true)",
        ),
      ).toEqual({ operation: 'SET_CONFIG', target: 'rls_context' });
      expect(extractSafeSqlOperation('BEGIN')).toEqual({
        operation: 'BEGIN',
        target: 'transaction',
      });
      expect(extractSafeSqlOperation('COMMIT')).toEqual({
        operation: 'COMMIT',
        target: 'transaction',
      });
      expect(extractSafeSqlOperation('ROLLBACK')).toEqual({
        operation: 'ROLLBACK',
        target: 'transaction',
      });
      expect(extractSafeSqlOperation('SELECT 1')).toEqual({
        operation: 'SELECT',
        target: 'unknown',
      });
    });
  });

  describe('safeErrorCode', () => {
    it('maps HttpException, Prisma codes, and generic errors safely', () => {
      expect(safeErrorCode(new NotFoundException('Cliente João'))).toBe(
        'NotFoundException',
      );
      expect(safeErrorCode(new BadRequestException('invalid'))).toBe(
        'BadRequestException',
      );
      expect(safeErrorCode({ code: 'P2034', message: 'secret detail' })).toBe(
        'P2034',
      );
      expect(safeErrorCode({ code: 'ETIMEDOUT' })).toBe('ETIMEDOUT');
      expect(
        safeErrorCode(new Error('postgresql://user:pass@host:5432/db')),
      ).toBe('INTERNAL_ERROR');
    });
  });

  describe('redactLogRecord', () => {
    it('redacts clinical fields, PII, credentials, DSNs, and JWTs recursively', () => {
      const redacted = redactLogRecord({
        event: 'http_request_completed',
        requestId: 'req-1',
        clientName: 'Maria Silva',
        notes: 'Histórico clínico reservado',
        allergies: 'Lactose',
        password: 'plain-password',
        headers: { authorization: 'Bearer abc' },
        nested: {
          email: 'maria@example.com',
          clinicalNotes: 'Privado',
          markers: [{ name: 'Glicemia', value: 120 }],
          rawSql: 'SELECT * FROM clients',
        },
        detail:
          'failed postgresql://safemove:supersecret@db.internal:5432/prod with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
      });

      expect(redacted.event).toBe('http_request_completed');
      expect(redacted.requestId).toBe('req-1');
      expect(redacted.clientName).toBe('[REDACTED]');
      expect(redacted.notes).toBe('[REDACTED]');
      expect(redacted.allergies).toBe('[REDACTED]');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.headers).toBe('[REDACTED]');
      expect(redacted.nested).toEqual({
        email: '[REDACTED]',
        clinicalNotes: '[REDACTED]',
        markers: '[REDACTED]',
        rawSql: '[REDACTED]',
      });
      expect(redacted.detail).toBe(
        'failed [REDACTED_DSN] with [REDACTED_TOKEN]',
      );
    });
  });

  describe('formatServerTiming', () => {
    it('formats W3C Server-Timing header with numeric durations only', () => {
      expect(
        formatServerTiming({
          totalMs: 42.345,
          dbMs: 18.124,
          txAcquireMs: 1.5,
          rlsContextMs: 0.85,
          handlerMs: 36.2,
          validationMs: 2.1,
          txCommitMs: 1.1,
        }),
      ).toBe(
        'total;dur=42.35, db;dur=18.12, tx;dur=1.5, rls;dur=0.85, handler;dur=36.2, validate;dur=2.1, commit;dur=1.1',
      );
    });
  });
});
