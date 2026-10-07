import { ClinicalResponse } from '../src/common/decorators/clinical-response.decorator';
import { testAdminPrisma } from './fixtures/test-admin';
import { randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Public } from '../src/common/decorators/public.decorator';
import { Roles } from '../src/common/decorators/roles.decorator';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PrismaService } from '../src/infra/database/prisma.service';
import { AuthSessionService } from '../src/modules/auth/auth-session.service';
import { assertIsolationDatabase } from './fixtures/client-isolation';

@Controller('global-auth-fixture')
class UnguardedController {
  @ClinicalResponse({ exception: 'health' })
  @Get()
  unguarded() {
    return { authenticated: true };
  }
  @Public()
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @ClinicalResponse({ exception: 'health' })
  @Get('public')
  publicRoute() {
    return { public: true };
  }
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ClinicalResponse({ exception: 'health' })
  @Get('admin')
  admin() {
    return { admin: true };
  }
}

describe('Global authentication (real PostgreSQL HTTP)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let access: string;
  const userId = randomUUID();
  const otherId = randomUUID();
  const clientId = randomUUID();
  beforeAll(async () => {
    assertIsolationDatabase();
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [UnguardedController],
    }).compile();
    prisma = testAdminPrisma();
    app = module.createNestApplication();
    await app.init();
    for (const id of [userId, otherId]) {
      await prisma.user.create({
        data: {
          id,
          name: 'Global auth fixture',
          email: `${id}@global-auth.test`,
          password: 'unused',
          role: 'NUTRITIONIST',
        },
      });
    }
    await prisma.client.create({
      data: { id: clientId, name: 'Owned fixture', professionalId: otherId },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    access = (await module.get(AuthSessionService).create(user)).access_token;
  });
  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.client.deleteMany({
          where: { id: clientId, professionalId: otherId },
        });
        await prisma.user.deleteMany({
          where: {
            id: { in: [userId, otherId] },
            email: { endsWith: '@global-auth.test' },
          },
        });
      }
    } finally {
      await app?.close();
      await prisma?.$disconnect();
    }
  });
  it('rejects a newly added controller without a local auth guard', async () => {
    await request(app.getHttpServer()).get('/global-auth-fixture').expect(401);
    await request(app.getHttpServer())
      .get('/global-auth-fixture')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
  });
  it('keeps deliberate health routes public and throttles public routes', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/auth/csrf').expect(200);
    await request(app.getHttpServer())
      .get('/global-auth-fixture/public')
      .expect(200);
    await request(app.getHttpServer())
      .get('/global-auth-fixture/public')
      .expect(200);
    await request(app.getHttpServer())
      .get('/global-auth-fixture/public')
      .expect(429);
  });
  it('authenticates before role checks and preserves Client ownership checks', async () => {
    await request(app.getHttpServer())
      .get('/global-auth-fixture/admin')
      .expect(401);
    await request(app.getHttpServer())
      .get('/global-auth-fixture/admin')
      .set('Authorization', `Bearer ${access}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/clients/${clientId}`)
      .set('Authorization', `Bearer ${access}`)
      .expect(404);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
