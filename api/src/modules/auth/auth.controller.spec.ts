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

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(body)
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    },
  );

  it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'])(
    'accepts %s professional registration',
    async (role) => {
      authService.register.mockResolvedValue({ id: 'pro-1', role });

      await request(app.getHttpServer())
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

  it('sets the access token only in an HttpOnly cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pro@example.test', password: '12345678' })
      .expect(200);

    expect(response.headers['set-cookie'][0]).toContain(
      'access_token=signed-token',
    );
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.body).toEqual({ message: 'Login realizado com sucesso' });
    expect(response.body).not.toHaveProperty('access_token');
  });

  it('rejects a cookie-authenticated mutation without a matching CSRF header', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', 'http://localhost:3001')
      .set('Cookie', ['access_token=signed-token', 'csrf_token=known-token'])
      .expect(403);
  });

  it('returns the authenticated user plus a CSRF token without exposing the JWT', () => {
    const controller = new AuthController(
      authService as unknown as AuthService,
    );
    const response = { cookie: jest.fn() } as unknown as Response;
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

    expect(body).toEqual({
      user: expect.objectContaining({
        sub: 'pro-1',
        role: 'NUTRITIONIST',
      }),
      csrfToken: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain('signed-token');
    expect(response.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
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
    const response = { clearCookie: jest.fn() } as unknown as Response;

    controller.logout(response);

    expect(response.clearCookie).toHaveBeenCalledTimes(2);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'access_token',
      AUTH_COOKIE_POLICY.clear,
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      AUTH_COOKIE_POLICY.clear,
    );
  });
});
