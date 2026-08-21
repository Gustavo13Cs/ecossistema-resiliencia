import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
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
});
