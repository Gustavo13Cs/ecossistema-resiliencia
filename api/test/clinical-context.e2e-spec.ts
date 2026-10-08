import {
  Controller,
  Get,
  Post,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClinicalResponse } from '../src/common/decorators/clinical-response.decorator';
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

@Controller('fixture-response')
class ClassifiedResponseController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('foreign')
  @ClinicalResponse({ shape: 'resource' })
  response() {
    return { clientId: 'foreign-client', notes: 'Synthetic withheld data' };
  }
  @Post('invalid')
  @ClinicalResponse({ shape: 'resource' })
  async invalid() {
    await this.prisma.client.create({
      data: {
        professionalId: this.prisma.principal.sub,
        name: 'Synthetic rollback',
      },
    });
    return { clientId: 'foreign-client', notes: 'Synthetic withheld data' };
  }
}

@Controller('unclassified')
class UnclassifiedController {
  @Get() response() {
    return {};
  }
}

describe('Clinical context through authenticated HTTP and real tenant role', () => {
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
        id: 'context-human',
        name: 'Synthetic',
        email: 'context@synthetic.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.client.createMany({
      data: [
        {
          id: 'context-client-a',
          name: 'Synthetic A',
          professionalId: 'context-human',
        },
        {
          id: 'context-client-b',
          name: 'Synthetic B',
          professionalId: 'context-human',
        },
      ],
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ClassifiedResponseController],
    })
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
      where: { id: 'context-human' },
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
  it('serves owned Clients without any dependency on read-history persistence', async () => {
    const table = (
      await db.pool.query<{ name: string | null }>(
        "SELECT to_regclass('public.client_read_audit_events')::text AS name",
      )
    ).rows[0].name;
    if (table)
      await db.pool.query(`
      CREATE FUNCTION reject_fixture_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$;
      CREATE TRIGGER reject_fixture_audit BEFORE INSERT ON client_read_audit_events FOR EACH ROW EXECUTE FUNCTION reject_fixture_audit();
    `);
    try {
      const response = await request(app.getHttpServer())
        .post('/clients')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Synthetic independent Client' })
        .expect(201);
      expect(response.body as unknown).toMatchObject({
        professionalId: 'context-human',
      });
      expect(
        await db.prisma.client.count({
          where: { name: 'Synthetic independent Client' },
        }),
      ).toBe(1);
      await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
    } finally {
      if (table)
        await db.pool.query(
          'DROP TRIGGER reject_fixture_audit ON client_read_audit_events; DROP FUNCTION reject_fixture_audit()',
        );
    }
  });
  it('no longer exposes the removed history endpoint', async () => {
    await request(app.getHttpServer())
      .get('/read-audit')
      .set('Authorization', 'Bearer ' + token)
      .expect(404);
  });
  it('withholds unauthorized response content and rolls back its mutation', async () => {
    const read = await request(app.getHttpServer())
      .get('/fixture-response/foreign')
      .set('Authorization', 'Bearer ' + token)
      .expect(500);
    const write = await request(app.getHttpServer())
      .post('/fixture-response/invalid')
      .set('Authorization', 'Bearer ' + token)
      .expect(500);
    expect(JSON.stringify([read.body, write.body])).not.toContain(
      'Synthetic withheld data',
    );
    expect(
      await db.prisma.client.count({ where: { name: 'Synthetic rollback' } }),
    ).toBe(0);
  });
  it('keeps nested helpers and concurrent principals on the same isolated transaction', async () => {
    const principal = {
      sub: 'context-human',
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
        id: 'context-other',
        name: 'Other synthetic',
        email: 'other@synthetic.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.food.create({
      data: {
        id: 'context-shared-food',
        name: 'Shared synthetic',
        kcal: 100,
        protein: 10,
        carbs: 10,
        fat: 1,
      },
    });
    await db.prisma.recipe.create({
      data: {
        id: 'context-other-recipe',
        professionalId: 'context-other',
        versions: {
          create: {
            id: 'context-other-version',
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
                foodId: 'context-shared-food',
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
        { sub: 'context-human', role: 'NUTRITIONIST', sessionId: 'fixture' },
        'catalog-check',
        () =>
          app.get(FoodsService).update('context-shared-food', { kcal: 999 }),
      ),
    ).rejects.toThrow('já está em uso');
    await request(app.getHttpServer())
      .put('/foods/context-shared-food')
      .set('Authorization', 'Bearer ' + token)
      .send({ kcal: 999 })
      .expect(409);
    expect(
      (
        await db.prisma.food.findUniqueOrThrow({
          where: { id: 'context-shared-food' },
        })
      ).kcal,
    ).toBe(100);
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
        professionalId: 'context-human',
        patientId: 'http-legacy-patient',
      },
    });
    await db.prisma.client.create({
      data: {
        id: clientId,
        name: 'Synthetic migrated Client',
        professionalId: 'context-human',
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
      creatorId: 'context-human',
    });
  });
  it('invalidates credentials through the restricted authentication connection', async () => {
    const users = app.get(UsersService);
    await users.invalidateAuthentication('context-human');
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
