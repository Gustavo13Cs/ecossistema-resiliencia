import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/database/prisma.service';
import {
  AuthPrismaService,
  JobsPrismaService,
} from '../src/infra/database/database-clients';
import { UsersService } from '../src/modules/users/users.service';
import { FoodsService } from '../src/modules/foods/foods.service';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

@Controller('unclassified')
class UnclassifiedController {
  @Get() response() {
    return {};
  }
}

describe('Read auditing through authenticated HTTP and real tenant role', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let app: INestApplication<App>;
  let token: string;
  let clinical: PrismaService;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    await db.prisma.user.create({
      data: {
        id: 'audit-human',
        name: 'Synthetic',
        email: 'audit@synthetic.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.client.createMany({
      data: [
        {
          id: 'audit-client-a',
          name: 'Synthetic A',
          professionalId: 'audit-human',
        },
        {
          id: 'audit-client-b',
          name: 'Synthetic B',
          professionalId: 'audit-human',
        },
      ],
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: () =>
          Promise.resolve({
            totalHits: 1,
            timeToExpire: 60,
            isBlocked: false,
            timeToBlockExpire: 0,
          }),
      })
      .compile();
    clinical = module.get(PrismaService);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    const user = await db.prisma.user.findUniqueOrThrow({
      where: { id: 'audit-human' },
    });
    token = (await module.get(AuthSessionService).create(user)).access_token;
  });
  afterAll(async () => {
    await app?.close();
    if (app)
      await Promise.all([
        app.get(PrismaService).$disconnect(),
        app.get(AuthPrismaService).$disconnect(),
        app.get(JobsPrismaService).$disconnect(),
      ]);
    urls?.restore();
    await db?.close();
  });
  it('records every returned Client once with the validated session and no content', async () => {
    const response = await request(app.getHttpServer())
      .get('/clients')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    expect(response.body).toHaveLength(2);
    const rows = (
      await db.pool.query<Record<string, unknown>>(
        'SELECT * FROM client_read_audit_events ORDER BY "clientId"',
      )
    ).rows;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.clientId)).toEqual([
      'audit-client-a',
      'audit-client-b',
    ]);
    expect(rows[0]).toMatchObject({
      actorType: 'PROFESSIONAL',
      tenantProfessionalId: 'audit-human',
      actorProfessionalId: 'audit-human',
      action: 'LIST',
      domain: 'CLIENT',
    });
    expect(rows[0].sessionId).toBeTruthy();
    expect(rows[0]).not.toHaveProperty('name');
    expect(
      (
        await db.pool.query<Record<string, unknown>>(
          'SELECT count(*)::int AS count FROM audit_delivery_states',
        )
      ).rows[0].count,
    ).toBe(2);
  });
  it('blocks clinical content and rolls back a mutation when audit persistence fails', async () => {
    await db.pool
      .query(`CREATE FUNCTION reject_fixture_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$;
   CREATE TRIGGER reject_fixture_audit BEFORE INSERT ON client_read_audit_events FOR EACH ROW EXECUTE FUNCTION reject_fixture_audit();`);
    try {
      const response = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Must roll back' })
        .expect(500);
      expect(JSON.stringify(response.body)).not.toContain('Must roll back');
      expect(
        await db.prisma.client.count({ where: { name: 'Must roll back' } }),
      ).toBe(0);
    } finally {
      await db.pool.query<Record<string, unknown>>(
        'DROP TRIGGER reject_fixture_audit ON client_read_audit_events; DROP FUNCTION reject_fixture_audit()',
      );
    }
  });
  it('keeps nested helpers and concurrent principals on the same isolated transaction', async () => {
    const principal = {
      sub: 'audit-human',
      role: 'NUTRITIONIST' as const,
      sessionId: 'synthetic-validated-session',
    };
    const first = await clinical.runAsProfessional(
      principal,
      'context-test',
      async () => {
        const outer = await clinical.$queryRaw<
          Array<{ tx: string }>
        >`SELECT txid_current()::text AS tx`;
        const inner = await clinical.$transaction(
          (tx) =>
            tx.$queryRaw<
              Array<{ tx: string }>
            >`SELECT txid_current()::text AS tx`,
        );
        expect(inner).toEqual(outer);
        return outer[0].tx;
      },
    );
    const second = await clinical.runAsProfessional(
      { ...principal, sub: 'no-owner' },
      'context-test-b',
      async () => {
        expect(await clinical.client.findMany()).toEqual([]);
        return (
          await clinical.$queryRaw<
            Array<{ tx: string }>
          >`SELECT txid_current()::text AS tx`
        )[0].tx;
      },
    );
    expect(second).not.toBe(first);
    expect(() => clinical.client).toThrow('Clinical database context required');
  });
  it('keeps shared manual Food immutable when only another tenant references it', async () => {
    await db.prisma.user.create({
      data: {
        id: 'audit-other',
        name: 'Other synthetic',
        email: 'other@synthetic.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.food.create({
      data: {
        id: 'audit-shared-food',
        name: 'Shared synthetic',
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 1,
      },
    });
    await db.prisma.recipe.create({
      data: {
        id: 'audit-other-recipe',
        professionalId: 'audit-other',
        versions: {
          create: {
            id: 'audit-other-version',
            version: 1,
            name: 'Other synthetic recipe',
            category: 'OTHER',
            servings: 1,
            kcal: 100,
            protein: 10,
            carbs: 10,
            fat: 1,
            fiber: 0,
            sodium: 0,
            calcium: 0,
            iron: 0,
            ingredients: {
              create: {
                foodId: 'audit-shared-food',
                quantity: 100,
                measure: 'g',
              },
            },
          },
        },
      },
    });
    await expect(
      clinical.runAsProfessional(
        { sub: 'audit-human', role: 'NUTRITIONIST', sessionId: 'fixture' },
        'catalog-check',
        () => app.get(FoodsService).update('audit-shared-food', { kcal: 999 }),
      ),
    ).rejects.toThrow('já está em uso');
    await request(app.getHttpServer())
      .put('/foods/audit-shared-food')
      .set('Authorization', 'Bearer ' + token)
      .send({ kcal: 999 })
      .expect(409);
    expect(
      (
        await db.prisma.food.findUniqueOrThrow({
          where: { id: 'audit-shared-food' },
        })
      ).kcal,
    ).toBe(100);
  });
  it('paginates only the authenticated trail and audits the page without recursion', async () => {
    const page = await request(app.getHttpServer())
      .get('/read-audit?limit=1')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    const pageBody = page.body as {
      items: Array<{ id: string; tenantProfessionalId: string }>;
      nextCursor: string;
    };
    expect(pageBody.items).toHaveLength(1);
    expect(pageBody.nextCursor).toBeTruthy();
    expect(pageBody.items[0].tenantProfessionalId).toBe('audit-human');
    const next = await request(app.getHttpServer())
      .get('/read-audit')
      .query({ limit: 1, cursor: pageBody.nextCursor })
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    const nextBody = next.body as { items: Array<{ id: string }> };
    expect(nextBody.items).toHaveLength(1);
    expect(nextBody.items[0].id).not.toBe(pageBody.items[0].id);
    expect(
      await db.prisma.clientReadAuditEvent.count({
        where: { domain: 'AUDIT', tenantProfessionalId: 'audit-human' },
      }),
    ).toBe(2);
    await request(app.getHttpServer())
      .get('/read-audit?limit=101')
      .set('Authorization', 'Bearer ' + token)
      .expect(400);
    await request(app.getHttpServer())
      .get('/read-audit?cursor=00000000-0000-4000-8000-000000000099')
      .set('Authorization', 'Bearer ' + token)
      .expect(404);
  });

  it('records a complete overview under its own audit domain', async () => {
    const result = await request(app.getHttpServer())
      .get('/clients/audit-client-a/overview')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    expect(
      await db.prisma.clientReadAuditEvent.count({
        where: {
          requestId: result.headers['x-request-id'],
          clientId: 'audit-client-a',
          domain: 'OVERVIEW',
        },
      }),
    ).toBe(1);
  });
  it('creates a Client-first diet for an owned Client already linked to a legacy patient', async () => {
    const clientId = '82000000-0000-4000-8000-000000000001';
    await db.prisma.user.create({
      data: {
        id: 'http-legacy-patient',
        name: 'Synthetic',
        email: 'http-legacy@fixture.invalid',
        password: 'unused',
        role: 'PATIENT',
      },
    });
    await db.prisma.professionalPatientLink.create({
      data: {
        id: clientId,
        professionalId: 'audit-human',
        patientId: 'http-legacy-patient',
      },
    });
    await db.prisma.client.create({
      data: {
        id: clientId,
        name: 'Synthetic migrated Client',
        professionalId: 'audit-human',
      },
    });
    const response = await request(app.getHttpServer())
      .post('/diet-plans')
      .set('Authorization', 'Bearer ' + token)
      .send({
        clientId,
        title: 'Synthetic diet',
        goal: 'test',
        targetKcal: 2000,
        proteinG: 100,
        fatG: 60,
        carbsG: 250,
        meals: [],
      })
      .expect(201);
    expect(response.body as unknown).toMatchObject({
      clientId,
      userId: null,
      creatorId: 'audit-human',
    });
  });
  it('invalidates credentials through the restricted authentication connection', async () => {
    const users = app.get(UsersService);
    await users.invalidateAuthentication('audit-human');
    await request(app.getHttpServer())
      .get('/clients')
      .set('Authorization', 'Bearer ' + token)
      .expect(401);
  });
  it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'] as const)(
    'registers and authenticates a new %s through the restricted auth role',
    async (role) => {
      const email = role.toLowerCase() + '@registration.synthetic.invalid';
      const registration = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Origin', 'http://localhost:3001')
        .send({
          name: 'Synthetic registration',
          email,
          password: 'Synthetic-register-2026!',
          role,
        })
        .expect(201);
      expect(registration.body as unknown).toMatchObject({ role, email });
      expect(registration.body as unknown).not.toHaveProperty('password');
      expect(registration.body as unknown).not.toHaveProperty('authVersion');
      const persisted = await db.prisma.user.findUniqueOrThrow({
        where: { email },
        select: { authVersion: true },
      });
      expect(persisted.authVersion).toBe(0);
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Origin', 'http://localhost:3001')
        .send({ email, password: 'Synthetic-register-2026!' })
        .expect(200);
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('Origin', 'http://localhost:3001')
        .send({
          name: 'Synthetic duplicate',
          email,
          password: 'Synthetic-register-2026!',
          role,
        })
        .expect(409);
    },
  );
  it('rejects an unclassified mounted handler regardless of HTTP method', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [UnclassifiedController],
    }).compile();

    const unknown = module.createNestApplication();
    try {
      await expect(unknown.init()).rejects.toThrow('Unclassified HTTP handler');
    } finally {
      await unknown.close();
      await Promise.all([
        module.get(PrismaService).$disconnect(),
        module.get(AuthPrismaService).$disconnect(),
        module.get(JobsPrismaService).$disconnect(),
      ]);
    }
  });
});
