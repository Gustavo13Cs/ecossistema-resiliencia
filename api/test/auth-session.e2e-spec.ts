import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { createCsrfProtection } from '../src/common/security/csrf-protection';
import { AccessTokenPayload } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { UsersService } from '../src/modules/users/users.service';
import { assertIsolationDatabase } from './fixtures/client-isolation';

const ORIGIN = 'http://localhost:3001';
const PASSWORD = 'Session-E2E-2026!';
type SessionCookies = {
  access: string;
  refresh: string;
  csrf: string;
  cookies: string[];
};

function sessionCookies(response: request.Response): SessionCookies {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const value = (name: string) =>
    decodeURIComponent(
      cookies
        .find((cookie) => cookie.startsWith(`${name}=`))!
        .split(';')[0]
        .slice(name.length + 1),
    );
  return {
    access: value('access_token'),
    refresh: value('refresh_token'),
    csrf: value('csrf_token'),
    cookies: cookies.map((cookie) => cookie.split(';')[0]),
  };
}

describe('Revocable session lifecycle (real PostgreSQL HTTP)', () => {
  jest.setTimeout(60_000);
  const userId = randomUUID();
  const email = `session-${userId}@auth.test`;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  let users: UsersService;
  let passwordHash: string;
  let session: SessionCookies;

  beforeAll(async () => {
    assertIsolationDatabase();
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    // JWT, cookies, CSRF e banco são reais. Somente o contador de requisições
    // fica isolado; o contrato de throttling é verificado na suíte de guard global.
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
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);
    users = module.get(UsersService);
    app = module.createNestApplication();
    app.use(cookieParser());
    app.use(createCsrfProtection([ORIGIN]));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(async () => {
    assertIsolationDatabase();
    await prisma.user.upsert({
      where: { id: userId },
      update: { role: 'NUTRITIONIST', password: passwordHash, authVersion: 0 },
      create: {
        id: userId,
        name: 'Session fixture',
        email,
        password: passwordHash,
        role: 'NUTRITIONIST',
      },
    });
    await prisma.authSession.deleteMany({ where: { userId } });
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(200);
    expect(result.body).toEqual({ message: 'Login realizado com sucesso' });
    session = sessionCookies(result);
  });

  afterAll(async () => {
    try {
      if (prisma)
        await prisma.user.deleteMany({ where: { id: userId, email } });
    } finally {
      await app?.close();
    }
  });

  const refresh = (cookies: SessionCookies) =>
    request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Origin', ORIGIN)
      .set('Cookie', cookies.cookies)
      .set('X-CSRF-Token', cookies.csrf);
  const me = (access: string) =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${access}`);

  it('issues minimal 15-minute JWT claims, HttpOnly cookies and only a refresh hash in SQL', async () => {
    const payload = jwt.verify<
      AccessTokenPayload & { iat: number; exp: number }
    >(session.access);
    expect(payload.exp - payload.iat).toBe(900);
    expect(payload).toMatchObject({ sub: userId, authVersion: 0 });
    expect(payload).not.toHaveProperty('role');
    const stored = await prisma.authSession.findUniqueOrThrow({
      where: { id: payload.jti },
    });
    expect(stored.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(session.refresh);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(200);
    const cookies = login.headers['set-cookie'] as unknown as string[];
    expect(cookies).toHaveLength(3);
    expect(
      cookies.every(
        (cookie) =>
          cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax'),
      ),
    ).toBe(true);
    expect(
      cookies.find((cookie) => cookie.startsWith('refresh_token=')),
    ).toContain('Path=/api/auth');
    expect(
      cookies.find((cookie) => cookie.startsWith('access_token=')),
    ).toContain('Max-Age=900');
    await me(session.access).expect(200).expect('Cache-Control', 'no-store');
  });

  it('recovers expired access, rotates the hash and preserves the fixed refresh expiry', async () => {
    const payload = jwt.verify<AccessTokenPayload>(session.access);
    const expiry = (
      await prisma.authSession.findUniqueOrThrow({ where: { id: payload.jti } })
    ).expiresAt;
    const expired = await jwt.signAsync(
      { sub: userId, jti: payload.jti, authVersion: 0 },
      { expiresIn: -1 },
    );
    await me(expired).expect(401);
    const next = sessionCookies(
      await refresh({
        ...session,
        cookies: session.cookies.map((cookie) =>
          cookie.startsWith('access_token=')
            ? `access_token=${expired}`
            : cookie,
        ),
      }).expect(200),
    );
    expect(next.refresh).not.toBe(session.refresh);
    await me(next.access).expect(200);
    const stored = await prisma.authSession.findUniqueOrThrow({
      where: { id: payload.jti },
    });
    expect(stored.expiresAt).toEqual(expiry);
    expect(stored.lastUsedAt).toBeInstanceOf(Date);
  });

  it('commits replay revocation and denies both previously issued access and new refresh', async () => {
    const rotated = sessionCookies(await refresh(session).expect(200));
    const denied = await refresh(session).expect(401);
    expect(denied.headers['set-cookie']).toHaveLength(3);
    await me(session.access).expect(401);
    await me(rotated.access).expect(401);
    await refresh(rotated).expect(401);
    const payload = jwt.decode<AccessTokenPayload>(session.access);
    expect(
      (
        await prisma.authSession.findUniqueOrThrow({
          where: { id: payload.jti },
        })
      ).revokedAt,
    ).toBeInstanceOf(Date);
  });

  it('serializes simultaneous refresh attempts in PostgreSQL: at most one success, replay revokes the family', async () => {
    const results = await Promise.all([refresh(session), refresh(session)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
    const successful = sessionCookies(
      results.find((result) => result.status === 200)!,
    );
    await me(successful.access).expect(401);
    await refresh(successful).expect(401);
  });

  it('revokes on logout even when the access JWT has expired', async () => {
    const payload = jwt.decode<AccessTokenPayload>(session.access);
    const expired = await jwt.signAsync(
      { sub: userId, jti: payload.jti, authVersion: 0 },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', ORIGIN)
      .set('Cookie', [
        `access_token=${expired}`,
        `refresh_token=${session.refresh}`,
        `csrf_token=${session.csrf}`,
      ])
      .set('X-CSRF-Token', session.csrf)
      .expect(200);
    await me(session.access).expect(401);
    await refresh(session).expect(401);
  });

  it('revokes rather than leaving a rotated session alive when logout carries the preceding token', async () => {
    const rotated = sessionCookies(await refresh(session).expect(200));
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', ORIGIN)
      .set('Cookie', session.cookies)
      .set('X-CSRF-Token', session.csrf)
      .expect(401);
    await me(rotated.access).expect(401);
    await refresh(rotated).expect(401);
  });

  it('rejects missing/hostile Origin or missing/wrong CSRF before touching session state', async () => {
    for (const path of ['/auth/refresh', '/auth/logout']) {
      await request(app.getHttpServer())
        .post(path)
        .set('Cookie', session.cookies)
        .set('X-CSRF-Token', session.csrf)
        .expect(403);
      await request(app.getHttpServer())
        .post(path)
        .set('Origin', 'https://hostile.test')
        .set('Cookie', session.cookies)
        .set('X-CSRF-Token', session.csrf)
        .expect(403);
      await request(app.getHttpServer())
        .post(path)
        .set('Origin', ORIGIN)
        .set('Cookie', session.cookies)
        .expect(403);
      await request(app.getHttpServer())
        .post(path)
        .set('Origin', ORIGIN)
        .set('Cookie', session.cookies)
        .set('X-CSRF-Token', 'b'.repeat(43))
        .expect(403);
    }
    await me(session.access).expect(200);
    await refresh(session).expect(200);
  });

  it('loads current role/name from SQL and rejects unsupported legacy claims or mismatched subject/version', async () => {
    const payload = jwt.decode<AccessTokenPayload>(session.access);
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'PERSONAL', name: 'Current identity' },
    });
    const result = await me(session.access).expect(200);
    expect(
      (result.body as { user: { role: string; name: string } }).user,
    ).toMatchObject({ role: 'PERSONAL', name: 'Current identity' });
    for (const claims of [
      { sub: userId, role: 'ADMIN' },
      { ...payload, sub: 'different-user' },
      { ...payload, authVersion: 10 },
    ]) {
      // Pick only our claims: decode also includes iat/exp.
      const token = await jwt.signAsync({
        sub: claims.sub,
        ...('jti' in claims
          ? { jti: claims.jti, authVersion: claims.authVersion }
          : { role: 'ADMIN' }),
      });
      await me(token).expect(401);
    }
  });

  it('invalidates all sessions atomically after a role or credential change', async () => {
    await users.changeRole(userId, 'PHYSIO');
    await me(session.access).expect(401);
    await refresh(session).expect(401);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.authVersion).toBe(1);
    const relogin = sessionCookies(
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Origin', ORIGIN)
        .send({ email, password: PASSWORD })
        .expect(200),
    );
    await users.resetCredentials(userId, 'Replacement-E2E-2026!');
    await me(relogin.access).expect(401);
    await refresh(relogin).expect(401);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
        .authVersion,
    ).toBe(2);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: PASSWORD })
      .expect(401);
  });

  it('denies an expired refresh session even while its access JWT is cryptographically valid', async () => {
    const payload = jwt.decode<AccessTokenPayload>(session.access);
    await prisma.authSession.update({
      where: { id: payload.jti },
      data: { expiresAt: new Date(0) },
    });
    await me(session.access).expect(401);
    await refresh(session).expect(401);
  });

  it('denies access and refresh after deleting the user and cascades their session hashes', async () => {
    await prisma.user.delete({ where: { id: userId } });
    expect(await prisma.authSession.count({ where: { userId } })).toBe(0);
    await me(session.access).expect(401);
    await refresh(session).expect(401);
  });
});
