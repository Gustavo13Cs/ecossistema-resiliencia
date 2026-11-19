import { PAGINATION_EXPOSED_HEADERS } from '../src/common/pagination/pagination';
import { spawn } from 'node:child_process';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { labExamSummaryQuery } from '../src/modules/lab-exams/lab-exam-summary';
import type { AuthUser } from '../src/common/types/auth-user';
import { AppModule, GLOBAL_JWT_AUTH_GUARD } from '../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PrismaService } from '../src/infra/database/prisma.service';
import { assertIsolationDatabase } from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';

const professional = '79000000-0000-4000-8000-000000000001';
const otherProfessional = '79000000-0000-4000-8000-000000000002';
const id = (kind: number, value: number) =>
  `7900000${kind}-0000-4000-8000-${String(value).padStart(12, '0')}`;
const date = new Date('2026-01-01T12:00:00Z');
const principal = {
  sub: professional,
  role: 'NUTRITIONIST' as const,
  sessionId: 'synthetic-pagination-session',
};

// Autenticação sintética somente neste fixture; contexto clínico, roles e RLS são reais.
class SyntheticGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthUser;
    }>();
    if (!req.headers['x-test-user-id'] || !req.headers['x-test-role'])
      throw new UnauthorizedException();
    req.user = {
      ...principal,
      sub: req.headers['x-test-user-id'],
      role: req.headers['x-test-role'] as Role,
    };
    return true;
  }
}
function records(body: unknown): Record<string, unknown>[] {
  const items = Array.isArray(body)
    ? body
    : body && typeof body === 'object'
      ? (body as Record<string, unknown>).items
      : null;
  if (!Array.isArray(items)) throw new Error('Resposta de listagem inválida');
  return items as Record<string, unknown>[];
}
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

describe('Bounded clinical lists (PostgreSQL/RLS)', () => {
  let app: INestApplication<App>;
  let admin: PrismaService;
  let clinical: PrismaService;
  let services: PrismaService[];
  const headers = (sub = professional, role: Role = 'NUTRITIONIST') => ({
    'x-test-user-id': sub,
    'x-test-role': role,
  });
  async function clear() {
    const where = { in: [professional, otherProfessional] };
    await admin.labOrder.deleteMany({ where: { professionalId: where } });
    await admin.labExam.deleteMany({ where: { creatorId: where } });
    await admin.clientAuditEvent.deleteMany({
      where: { professionalId: where },
    });
    await admin.client.deleteMany({ where: { professionalId: where } });
    await admin.user.deleteMany({ where: { id: where } });
  }
  beforeAll(async () => {
    assertIsolationDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useClass(SyntheticGuard)
      .overrideProvider(GLOBAL_JWT_AUTH_GUARD)
      .useClass(SyntheticGuard)
      .compile();
    app = module.createNestApplication();
    app.enableCors({
      origin: 'http://127.0.0.1:3106',
      credentials: true,
      exposedHeaders: PAGINATION_EXPOSED_HEADERS,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    services = app.get(PrismaService, { each: true });
    clinical = app.get(PrismaService);
    admin = testAdminPrisma();
    await clear();
    await admin.user.createMany({
      data: [professional, otherProfessional].map((sub, i) => ({
        id: sub,
        name: 'Profissional sintético',
        email: `pagination-${i}@example.test`,
        password: 'not-a-login',
        role: 'NUTRITIONIST',
      })),
    });
    await admin.client.createMany({
      data: Array.from({ length: 600 }, (_, i) => ({
        id: id(1, i + 1),
        professionalId: professional,
        name:
          i === 596
            ? 'ÁLVARO'
            : i === 597
              ? 'Cliente100%literal'
              : i >= 598
                ? 'ZIgual'
                : `Cliente${String(i + 1).padStart(4, '0')}`,
        status: 'ACTIVE',
        createdAt: date,
        privacyNotes: 'Registro sintético. '.repeat(40),
      })),
    });
    await admin.client.create({
      data: {
        id: id(1, 9001),
        professionalId: otherProfessional,
        name: 'FOREIGN CLIENT',
      },
    });
    await admin.labExam.createMany({
      data: Array.from({ length: 600 }, (_, i) => ({
        id: id(2, i + 1),
        creatorId: professional,
        clientId: id(1, (i % 50) + 1),
        date: new Date(Date.UTC(2026, 0, (i % 30) + 1, 12)),
        notes:
          i === 0
            ? 'Observação única % clínica'
            : 'Registro sintético de exame. '.repeat(20),
      })),
    });
    await admin.labMarker.createMany({
      data: Array.from({ length: 600 }, (_, i) => [
        {
          examId: id(2, i + 1),
          name: 'Glicemia de Jejum',
          value: [80, 95, 115][i % 3],
          unit: 'mg/dL',
        },
        {
          examId: id(2, i + 1),
          name: i === 0 ? 'Marcador próprio' : 'Vitamina B12',
          value: 500,
          unit: 'pg/mL',
        },
      ]).flat(),
    });
    await admin.labOrder.createMany({
      data: Array.from({ length: 60 }, (_, i) => ({
        id: id(3, i + 1),
        professionalId: professional,
        clientId: id(1, 1),
        issuedAt: date,
        markers: ['Glicemia de Jejum'],
      })),
    });
    await admin.labExam.create({
      data: {
        id: id(2, 9001),
        creatorId: otherProfessional,
        clientId: id(1, 9001),
        date,
        markers: {
          create: [{ name: 'FOREIGN MARKER', value: 500, unit: 'x' }],
        },
      },
    });
  }, 60000);
  afterAll(async () => {
    if (admin) {
      await clear();
      await admin.$disconnect();
    }
    if (app) {
      await app.close();
      for (const service of services) await service.$disconnect();
    }
  });

  it('measures payloads and SELECT plans with the same 600-record fixture', async () => {
    const metrics: Record<string, unknown> = {};
    for (const path of ['/clients', '/lab-exams', '/lab-orders']) {
      const times: number[] = [];
      let rows = 0,
        bytes = 0;
      for (let i = 0; i < 7; i++) {
        const start = performance.now();
        const response = await request(app.getHttpServer())
          .get(path)
          .set(headers())
          .expect(200);
        const elapsed = performance.now() - start;
        if (i >= 2) times.push(elapsed);
        rows = records(response.body as unknown).length;
        bytes = Buffer.byteLength(response.text, 'utf8');
      }
      metrics[path] = {
        rows,
        bodyBytes: bytes,
        medianMs: median(times),
        samplesMs: times,
      };
    }
    const phase = process.env.PERF05_PHASE ?? 'after';
    const plans = await clinical.runAsProfessional(
      principal,
      'pagination-plan',
      async () => ({
        ...(phase === 'after'
          ? {
              summary: await clinical.$queryRaw(
                Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${labExamSummaryQuery(professional)}`,
              ),
            }
          : {}),
        clients: await clinical.$queryRaw(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM clients WHERE "professionalId"=${professional} AND status='ACTIVE' ORDER BY name ASC,"createdAt" DESC,id ASC ${phase === 'before' ? Prisma.empty : Prisma.sql`LIMIT 25`}`,
        ),
        exams: await clinical.$queryRaw(
          Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT e.* FROM lab_exams e JOIN clients c ON c.id=e."clientId" WHERE e."creatorId"=${professional} AND c."professionalId"=${professional} ORDER BY e.date DESC,e.id DESC ${phase === 'before' ? Prisma.empty : Prisma.sql`LIMIT 25`}`,
        ),
      }),
    );
    if (process.env.PERF05_EVIDENCE_DIR) {
      const dir = resolve(process.env.PERF05_EVIDENCE_DIR);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, `${phase}-api.json`),
        JSON.stringify(
          {
            fixture: {
              clients: 600,
              exams: 600,
              markers: 1200,
              orders: 60,
              foreignRecordsExcluded: true,
            },
            scope:
              'Local HTTP with synthetic authentication and restricted RLS roles; body bytes are decoded JSON',
            metrics,
            plans,
          },
          null,
          2,
        ) + '\n',
      );
    }
    expect(
      records(
        (
          await request(app.getHttpServer())
            .get('/clients')
            .set(headers())
            .expect(200)
        ).body as unknown,
      ).every((row) => row.professionalId === professional),
    ).toBe(true);
  });
  it('bounds default lists and keeps total metadata', async () => {
    const clients = await request(app.getHttpServer())
      .get('/clients')
      .set(headers())
      .expect(200);
    expect(records(clients.body as unknown)).toHaveLength(25);
    expect(clients.headers['x-pagination-total']).toBe('600');
    const exams = await request(app.getHttpServer())
      .get('/lab-exams')
      .set(headers())
      .expect(200);
    expect(records(exams.body as unknown)).toHaveLength(25);
    expect(exams.body as unknown).toMatchObject({
      pagination: { total: 600, pageSize: 25 },
      summary: {
        totalExams: 600,
        clientsWithExamsCount: 50,
        alteredMarkersCount: 400,
        ordersIssuedCount: 60,
      },
    });
    const orders = await request(app.getHttpServer())
      .get('/lab-orders')
      .set(headers())
      .expect(200);
    expect(records(orders.body as unknown)).toHaveLength(25);
  });
  it('finds clients outside page one, handles literal wildcards and stable ties', async () => {
    const search = await request(app.getHttpServer())
      .get('/clients')
      .query({ q: '100%', page: 1, pageSize: 25 })
      .set(headers())
      .expect(200);
    expect(records(search.body as unknown).map((row) => row.id)).toEqual([
      id(1, 598),
    ]);
    for (const [page, expected] of [
      [1, id(1, 599)],
      [2, id(1, 600)],
    ] as const) {
      const result = await request(app.getHttpServer())
        .get('/clients')
        .query({ q: 'ZIgual', page, pageSize: 1 })
        .set(headers())
        .expect(200);
      expect(records(result.body as unknown).map((row) => row.id)).toEqual([
        expected,
      ]);
    }
    const accent = await request(app.getHttpServer())
      .get('/clients')
      .query({ q: 'álvaro' })
      .set(headers())
      .expect(200);
    expect(records(accent.body as unknown).map((row) => row.id)).toEqual([
      id(1, 597),
    ]);
  });
  it('filters all exams while summary stays global and foreign metadata remains hidden', async () => {
    const result = await request(app.getHttpServer())
      .get('/lab-exams')
      .query({ status: 'ALERT', pageSize: 10 })
      .set(headers())
      .expect(200);
    expect(records(result.body as unknown)).toHaveLength(10);
    expect(result.body as unknown).toMatchObject({
      pagination: { total: 200 },
      summary: { totalExams: 600, alteredMarkersCount: 400 },
    });
    const body = result.body as { markerNames: string[] };
    expect(body.markerNames).toContain('Marcador próprio');
    expect(body.markerNames).not.toContain('FOREIGN MARKER');
    await request(app.getHttpServer())
      .get('/lab-exams')
      .query({ clientId: id(1, 9001) })
      .set(headers())
      .expect(404);
  });
  it('paginates full-history and longitudinal point endpoints with ownership', async () => {
    const history = await request(app.getHttpServer())
      .get(`/lab-exams/client/${id(1, 1)}`)
      .query({ pageSize: 5 })
      .set(headers())
      .expect(200);
    expect(records(history.body as unknown)).toHaveLength(5);
    expect(history.headers['x-pagination-total']).toBe('12');
    const points = await request(app.getHttpServer())
      .get('/lab-exams/longitudinal')
      .query({ markerName: 'Glicemia de Jejum', pageSize: 5 })
      .set(headers())
      .expect(200);
    expect(records(points.body as unknown)).toHaveLength(5);
    expect(points.headers['x-pagination-total']).toBe('600');
    await request(app.getHttpServer())
      .get('/lab-exams/longitudinal')
      .query({ markerName: 'Glicemia de Jejum', clientId: id(1, 9001) })
      .set(headers())
      .expect(404);
  });
  it('exposes bounded-list metadata for the permitted browser origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/clients')
      .set(headers())
      .set('Origin', 'http://127.0.0.1:3106')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://127.0.0.1:3106',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(
      String(response.headers['access-control-expose-headers']).split(','),
    ).toEqual(PAGINATION_EXPOSED_HEADERS);
    expect(response.headers['x-pagination-total']).toBe('600');
  });
  it('rejects invalid bounds, anonymous access and forbidden roles', async () => {
    for (const pageSize of [0, -1, 101, 1.5, 'bad'])
      await request(app.getHttpServer())
        .get('/clients')
        .query({ pageSize })
        .set(headers())
        .expect(400);
    await request(app.getHttpServer()).get('/clients').expect(401);
    await request(app.getHttpServer())
      .get('/lab-exams')
      .set(headers(professional, 'ADMIN'))
      .expect(403);
    const other = await request(app.getHttpServer())
      .get('/clients')
      .set(headers(otherProfessional))
      .expect(200);
    expect(records(other.body as unknown).map((row) => row.id)).toEqual([
      id(1, 9001),
    ]);
  });
  it('preserves boundary statuses and independent marker filters', async () => {
    const clientId = id(1, 8000);
    await admin.client.create({
      data: {
        id: clientId,
        professionalId: professional,
        name: 'Fronteiras clínicas',
      },
    });
    try {
      for (const value of [69, 70, 75, 88, 99, 100]) {
        await admin.labExam.create({
          data: {
            creatorId: professional,
            clientId,
            date,
            markers: {
              create: [
                { name: 'Glicemia de Jejum', value, unit: 'mg/dL' },
                { name: 'Vitamina B12', value: 500, unit: 'pg/mL' },
                { name: 'Nome próprio', value: -1, unit: 'x' },
              ],
            },
          },
        });
      }
      for (const [status, total] of [
        ['ALERT', 2],
        ['BORDERLINE', 2],
        ['OPTIMAL', 6],
      ] as const) {
        const response = await request(app.getHttpServer())
          .get('/lab-exams')
          .query({ clientId, status, category: 'VITAMINS_MINERALS' })
          .set(headers())
          .expect(200);
        expect(
          (response.body as { pagination: { total: number } }).pagination.total,
        ).toBe(total);
      }
      const unknownCategory = await request(app.getHttpServer())
        .get('/lab-exams')
        .query({ clientId, category: 'OUTROS' })
        .set(headers())
        .expect(200);
      expect(records(unknownCategory.body as unknown)).toHaveLength(0);
      const literal = await request(app.getHttpServer())
        .get('/lab-exams')
        .query({ q: '%' })
        .set(headers())
        .expect(200);
      expect(
        (literal.body as { pagination: { total: number } }).pagination.total,
      ).toBe(1);
    } finally {
      await admin.labExam.deleteMany({ where: { clientId } });
      await admin.client.delete({ where: { id: clientId } });
    }
  });
  it('matches longitudinal names literally without wildcard expansion or trimming', async () => {
    const clientId = id(1, 8100);
    const names = ['X_1', 'XA1', 'X%1', 'XZZ1', 'X\\1', ' X1 ', 'X1'];
    await admin.client.create({
      data: {
        id: clientId,
        professionalId: professional,
        name: 'Nomes literais',
      },
    });
    try {
      for (const [index, name] of names.entries())
        await admin.labExam.create({
          data: {
            creatorId: professional,
            clientId,
            date,
            markers: {
              create: [{ name, value: index, unit: 'unit-' + index }],
            },
          },
        });
      for (const [index, name] of names.entries()) {
        const response = await request(app.getHttpServer())
          .get('/lab-exams/longitudinal')
          .query({ clientId, markerName: name.toLowerCase() })
          .set(headers())
          .expect(200);
        expect(records(response.body as unknown)).toEqual([
          expect.objectContaining({
            name,
            value: index,
            unit: 'unit-' + index,
          }),
        ]);
      }
    } finally {
      await admin.labExam.deleteMany({ where: { clientId } });
      await admin.client.delete({ where: { id: clientId } });
    }
  });
  it('traverses 1105 clients and exams without duplicates, missing rows or over-limit responses', async () => {
    const extra = Array.from({ length: 505 }, (_, index) => index + 10000);
    await admin.client.createMany({
      data: extra.map((index) => ({
        id: id(1, index),
        professionalId: professional,
        name: 'Mesmo nome',
        createdAt: date,
      })),
    });
    await admin.labExam.createMany({
      data: extra.map((index) => ({
        id: id(2, index),
        creatorId: professional,
        clientId: id(1, 1),
        date,
      })),
    });
    try {
      const volumes: Record<string, unknown> = {};
      for (const path of ['/clients', '/lab-exams']) {
        const times: number[] = [];
        const seen = new Set<string>();
        for (let page = 1; page <= 12; page++) {
          const started = performance.now();
          const response = await request(app.getHttpServer())
            .get(path)
            .query({ page, pageSize: 100 })
            .set(headers())
            .expect(200);
          times.push(performance.now() - started);
          const rows = records(response.body as unknown);
          expect(rows.length).toBeLessThanOrEqual(100);
          for (const row of rows) {
            expect(seen.has(String(row.id))).toBe(false);
            seen.add(String(row.id));
          }
        }
        expect(seen.size).toBe(1105);
        volumes[path] = {
          pages: 12,
          pageSize: 100,
          uniqueRows: seen.size,
          samplesMs: times,
          lastPageMs: times[times.length - 1],
        };
      }
      const deepPlans = await clinical.runAsProfessional(
        principal,
        'pagination-deep',
        async () => ({
          clients: await clinical.$queryRaw(
            Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM clients WHERE "professionalId"=${professional} AND status='ACTIVE' ORDER BY name ASC,"createdAt" DESC,id ASC LIMIT 100 OFFSET 1100`,
          ),
          exams: await clinical.$queryRaw(
            Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${labExamSummaryQuery(professional, { page: 12, pageSize: 100 })}`,
          ),
        }),
      );
      if (process.env.PERF05_EVIDENCE_DIR)
        writeFileSync(
          resolve(process.env.PERF05_EVIDENCE_DIR, 'high-volume-api.json'),
          JSON.stringify(
            { fixture: { clients: 1105, exams: 1105 }, volumes, deepPlans },
            null,
            2,
          ) + '\n',
        );
    } finally {
      await admin.labExam.deleteMany({
        where: { id: { in: extra.map((index) => id(2, index)) } },
      });
      await admin.client.deleteMany({
        where: { id: { in: extra.map((index) => id(1, index)) } },
      });
    }
  }, 30000);
  (process.env.PERF05_UI_ORIGIN ? it : it.skip)(
    'validates browser pagination against the local restricted API',
    async () => {
      const origin = process.env.PERF05_UI_ORIGIN!;
      if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
        throw new Error('Apenas navegador local');
      await app.listen(3000, '127.0.0.1');
      await new Promise<void>((resolveRun, reject) => {
        const child = spawn(
          'python3',
          [
            resolve(
              '../docs/runbooks/evidence/performance-05/verify-pagination.py',
            ),
            '--origin',
            origin,
            '--output',
            resolve(
              '../docs/runbooks/evidence/performance-05/browser-after.json',
            ),
          ],
          { stdio: 'inherit' },
        );
        child.once('error', reject);
        child.once('exit', (code) =>
          code === 0 ? resolveRun() : reject(new Error(`Browser exit ${code}`)),
        );
      });
    },
    120000,
  );
});
