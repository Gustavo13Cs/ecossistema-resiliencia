import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types/auth-user';
import request from 'supertest';
import { createCsrfProtection } from '../../common/security/csrf-protection';
import {
  AUTH_COOKIE_POLICIES,
  createAuthCookiePolicy,
} from './auth-cookie-options';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController registration contract', () => {
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  let app: INestApplication;
  let httpServer: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.use(createCsrfProtection(['http://localhost:3001']));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService.register.mockResolvedValue({ id: 'pro-1' });
    const session = {
      access_token: 'signed-token',
      refresh_token: 'opaque-refresh',
      refresh_expires_at: new Date(Date.now() + 30 * 86_400_000),
      user: { sub: 'pro-1', role: 'NUTRITIONIST' },
    };
    authService.login.mockResolvedValue(session);
    authService.refresh.mockResolvedValue(session);
    authService.logout.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['PATIENT', 'ADMIN', 'ARBITRARY', undefined])(
    'rejects non-professional role %s',
    async (role) => {
      const body = {
        name: 'Profissional',
        email: 'pro@example.test',
        password: '12345678',
        ...(role ? { role } : {}),
      };

      await request(httpServer)
        .post('/auth/register')
        .set('Origin', 'http://localhost:3001')
        .send(body)
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    },
  );

  it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'])(
    'accepts %s professional registration',
    async (role) => {
      authService.register.mockResolvedValue({ id: 'pro-1', role });

      await request(httpServer)
        .post('/auth/register')
        .set('Origin', 'http://localhost:3001')
        .send({
          name: 'Profissional',
          email: `${role.toLowerCase()}@example.test`,
          password: '12345678',
          role,
        })
        .expect(201);

      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
      );
    },
  );

  it('sets three HttpOnly cookies without exposing access or refresh credentials', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .set('Origin', 'http://localhost:3001')
      .send({ email: 'pro@example.test', password: '12345678' })
      .expect(200);

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=signed-token'),
        expect.stringContaining('refresh_token=opaque-refresh'),
        expect.stringMatching(/^csrf_token=[A-Za-z0-9_-]{43};/),
      ]),
    );
    expect(response.headers['set-cookie']).toHaveLength(3);
    for (const cookie of response.headers['set-cookie']) {
      expect(cookie).toContain('HttpOnly');
    }
    expect(response.body).toEqual({ message: 'Login realizado com sucesso' });
    expect(response.body).not.toHaveProperty('access_token');
  });

  it('rejects logout with stale CSRF even from an allowed Origin', async () => {
    await request(httpServer)
      .post('/auth/logout')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', ['access_token=signed-token', 'csrf_token=known-token'])
      .expect(403);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('bootstraps a valid CSRF cookie/header pair without a live access token', async () => {
    const result = await request(httpServer).get('/auth/csrf').expect(200);
    const body = result.body as { csrfToken: string };
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.headers['set-cookie']).toEqual([
      expect.stringContaining(`csrf_token=${body.csrfToken};`),
    ]);
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it.each(['/auth/refresh', '/auth/logout'])(
    'requires both allowed Origin and CSRF on %s',
    async (path) => {
      const csrf = 'a'.repeat(43);
      await request(httpServer)
        .post(path)
        .set('Cookie', [`refresh_token=opaque-refresh`, `csrf_token=${csrf}`])
        .set('X-CSRF-Token', csrf)
        .expect(403);
      await request(httpServer)
        .post(path)
        .set('Origin', 'http://localhost:3001')
        .set('Cookie', 'refresh_token=opaque-refresh')
        .expect(403);
      expect(authService.refresh).not.toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
    },
  );

  it('rotates cookies using only the refresh credential when access is expired', async () => {
    const csrf = 'a'.repeat(43);
    const result = await request(httpServer)
      .post('/auth/refresh')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', [
        `refresh_token=opaque-refresh`,
        `csrf_token=${csrf}`,
        'access_token=expired',
      ])
      .set('X-CSRF-Token', csrf)
      .expect(200);
    expect(authService.refresh).toHaveBeenCalledWith('opaque-refresh');
    expect(result.headers['set-cookie']).toHaveLength(3);
    expect(result.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('Path=/api/auth')]),
    );
    expect(result.body).not.toHaveProperty('refresh_token');
    expect(result.body).not.toHaveProperty('access_token');
  });

  it('revokes before clearing all three cookie boundaries', async () => {
    const csrf = 'a'.repeat(43);
    const result = await request(httpServer)
      .post('/auth/logout')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', [`refresh_token=opaque-refresh`, `csrf_token=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect(200);
    expect(authService.logout).toHaveBeenCalledWith('opaque-refresh');
    expect(result.headers['set-cookie']).toHaveLength(3);
    expect(result.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^refresh_token=;.*Path=\/api\/auth/),
      ]),
    );
  });

  it('clears cookies and returns 401 when refresh is replayed or revoked', async () => {
    authService.refresh.mockRejectedValue(
      new UnauthorizedException('Sessão inválida'),
    );
    const csrf = 'a'.repeat(43);
    const result = await request(httpServer)
      .post('/auth/refresh')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', ['refresh_token=replayed', `csrf_token=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .expect(401);
    expect(result.headers['set-cookie']).toHaveLength(3);
    expect(result.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^access_token=;/),
        expect.stringMatching(/^refresh_token=;/),
        expect.stringMatching(/^csrf_token=;/),
      ]),
    );
  });

  it('returns the authenticated user plus a CSRF token without exposing the JWT', () => {
    const controller = new AuthController(
      authService as unknown as AuthService,
    );
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;
    const body = controller.me(
      {
        user: {
          sub: 'pro-1',
          role: 'NUTRITIONIST',
          signedToken: 'signed-token',
        },
      } as unknown as AuthenticatedRequest,
      response,
    );

    expect(body.user).toEqual({
      sub: 'pro-1',
      role: 'NUTRITIONIST',
    });
    expect(typeof body.csrfToken).toBe('string');
    expect(JSON.stringify(body)).not.toContain('signed-token');
    expect(cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('reuses the valid CSRF cookie across subsequent session hydration calls', () => {
    const controller = new AuthController(
      authService as unknown as AuthService,
    );
    const sessionToken = 'a'.repeat(43);
    const requestWithSession = {
      cookies: { csrf_token: sessionToken },
      user: { sub: 'pro-1', role: 'NUTRITIONIST' },
    } as unknown as AuthenticatedRequest;
    const firstCookie = jest.fn();
    const secondCookie = jest.fn();
    const firstResponse = { cookie: firstCookie } as unknown as Response;
    const secondResponse = { cookie: secondCookie } as unknown as Response;

    const firstBody = controller.me(requestWithSession, firstResponse);
    const secondBody = controller.me(requestWithSession, secondResponse);

    expect(firstBody.csrfToken).toBe(sessionToken);
    expect(secondBody.csrfToken).toBe(sessionToken);
    expect(firstCookie).not.toHaveBeenCalled();
    expect(secondCookie).not.toHaveBeenCalled();
  });

  it('replaces a malformed CSRF cookie during session hydration', () => {
    const controller = new AuthController(
      authService as unknown as AuthService,
    );
    const cookie = jest.fn();
    const response = { cookie } as unknown as Response;

    const body = controller.me(
      {
        cookies: { csrf_token: 'attacker-controlled' },
        user: { sub: 'pro-1', role: 'NUTRITIONIST' },
      } as unknown as AuthenticatedRequest,
      response,
    );

    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.csrfToken).not.toBe('attacker-controlled');
    expect(cookie).toHaveBeenCalledWith(
      'csrf_token',
      body.csrfToken,
      AUTH_COOKIE_POLICIES.csrf.set,
    );
  });

  it('uses the same cookie boundary attributes when setting and clearing cookies', () => {
    const policy = createAuthCookiePolicy({
      AUTH_COOKIE_DOMAIN: 'api.example.test',
      AUTH_COOKIE_SAME_SITE: 'strict',
      AUTH_COOKIE_SECURE: 'true',
    });

    expect(policy.set).toEqual(
      expect.objectContaining({
        path: '/',
        domain: 'api.example.test',
        sameSite: 'strict',
        secure: true,
      }),
    );
    expect(policy.clear).toEqual({
      httpOnly: true,
      path: '/',
      domain: 'api.example.test',
      sameSite: 'strict',
      secure: true,
    });
  });

  it('rejects SameSite none when secure cookies are disabled', () => {
    const configure = () =>
      createAuthCookiePolicy({
        AUTH_COOKIE_SAME_SITE: 'none',
        AUTH_COOKIE_SECURE: 'false',
      });

    expect(configure).toThrow(
      'AUTH_COOKIE_SAME_SITE=none exige AUTH_COOKIE_SECURE=true.',
    );
  });

  it('clears cookies only after awaiting server revocation', async () => {
    const controller = new AuthController(
      authService as unknown as AuthService,
    );
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    let finish!: () => void;
    authService.logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const promise = controller.logout(
      { cookies: { refresh_token: 'opaque-refresh' } } as unknown as Request,
      response,
    );
    expect(clearCookie).not.toHaveBeenCalled();
    finish();
    await promise;

    expect(clearCookie).toHaveBeenCalledTimes(3);
    expect(clearCookie).toHaveBeenCalledWith(
      'access_token',
      AUTH_COOKIE_POLICIES.access.clear,
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      AUTH_COOKIE_POLICIES.csrf.clear,
    );
  });
});
