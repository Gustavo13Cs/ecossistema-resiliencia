import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import request from 'supertest';
import { createCsrfProtection } from '../../common/security/csrf-protection';
import {
  AUTH_COOKIE_POLICY,
  createAuthCookiePolicy,
} from './auth-cookie-options';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController registration contract', () => {
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
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
    authService.login.mockResolvedValue({ access_token: 'signed-token' });
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

      await request(httpServer).post('/auth/register').send(body).expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    },
  );

  it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'])(
    'accepts %s professional registration',
    async (role) => {
      authService.register.mockResolvedValue({ id: 'pro-1', role });

      await request(httpServer)
        .post('/auth/register')
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

  it('sets both session tokens in HttpOnly cookies without exposing the JWT', async () => {
    const response = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'pro@example.test', password: '12345678' })
      .expect(200);

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=signed-token'),
        expect.stringMatching(/^csrf_token=[A-Za-z0-9_-]{43};/),
      ]),
    );
    expect(response.headers['set-cookie']).toHaveLength(2);
    for (const cookie of response.headers['set-cookie']) {
      expect(cookie).toContain('HttpOnly');
    }
    expect(response.body).toEqual({ message: 'Login realizado com sucesso' });
    expect(response.body).not.toHaveProperty('access_token');
  });

  it('allows a trusted browser to clear a cookie-authenticated session with a stale CSRF token', async () => {
    await request(httpServer)
      .post('/auth/logout')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', ['access_token=signed-token', 'csrf_token=known-token'])
      .expect(200);
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
      } as unknown as Request,
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
    } as unknown as Request;
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
      } as unknown as Request,
      response,
    );

    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.csrfToken).not.toBe('attacker-controlled');
    expect(cookie).toHaveBeenCalledWith(
      'csrf_token',
      body.csrfToken,
      AUTH_COOKIE_POLICY.set,
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

  it('clears both authentication cookies with the shared boundary policy', () => {
    const controller = new AuthController(
      authService as unknown as AuthService,
    );
    const clearCookie = jest.fn();
    const response = { clearCookie } as unknown as Response;

    controller.logout(response);

    expect(clearCookie).toHaveBeenCalledTimes(2);
    expect(clearCookie).toHaveBeenCalledWith(
      'access_token',
      AUTH_COOKIE_POLICY.clear,
    );
    expect(clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      AUTH_COOKIE_POLICY.clear,
    );
  });
});
