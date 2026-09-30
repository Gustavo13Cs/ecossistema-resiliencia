import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController profile boundary', () => {
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    getPatientOverview: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    unlinkPatient: jest.fn(),
  };
  let authenticatedUser: AuthUser = {
    sub: 'professional-1',
    role: 'NUTRITIONIST',
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: AuthUser } };
        }) => {
          context.switchToHttp().getRequest().user = authenticatedUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authenticatedUser = {
      sub: 'professional-1',
      role: 'NUTRITIONIST',
    };
    usersService.findByEmail.mockResolvedValue({ id: 'patient-1' });
    usersService.create.mockResolvedValue({ id: 'patient-1' });
    usersService.findAll.mockResolvedValue([]);
    usersService.getPatientOverview.mockResolvedValue({ patient: null });
    usersService.findOne.mockResolvedValue({ id: 'professional-1' });
    usersService.update.mockResolvedValue({ id: 'professional-1' });
    usersService.unlinkPatient.mockResolvedValue({ isActive: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['NUTRITIONIST', 'ADMIN'] as const)(
    'rejects GET /users/:id for another user even when the requester is %s',
    async (role) => {
      authenticatedUser = { sub: 'requester-1', role };

      await request(app.getHttpServer()).get('/users/another-user').expect(403);

      expect(usersService.findOne).not.toHaveBeenCalled();
    },
  );

  it.each(['PERSONAL', 'ADMIN'] as const)(
    'rejects PATCH /users/:id for another user even when the requester is %s',
    async (role) => {
      authenticatedUser = { sub: 'requester-1', role };

      await request(app.getHttpServer())
        .patch('/users/another-user')
        .send({ name: 'Tentativa indevida' })
        .expect(403);

      expect(usersService.update).not.toHaveBeenCalled();
    },
  );

  it('keeps self-profile reads available', async () => {
    await request(app.getHttpServer()).get('/users/professional-1').expect(200);

    expect(usersService.findOne).toHaveBeenCalledWith('professional-1', true);
  });

  it('removes the legacy patient list route', async () => {
    await request(app.getHttpServer()).get('/users').expect(404);
    expect(usersService.findAll).not.toHaveBeenCalled();
  });

  it('removes the legacy patient creation route', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Paciente legado',
        email: 'legacy@example.com',
        password: 'StrongPassword123!',
      })
      .expect(404);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('removes the legacy clinical overview route', async () => {
    await request(app.getHttpServer())
      .get('/users/patient-1/overview')
      .expect(404);
    expect(usersService.getPatientOverview).not.toHaveBeenCalled();
  });

  it('removes the legacy patient unlink route', async () => {
    await request(app.getHttpServer()).delete('/users/patient-1').expect(404);
    expect(usersService.unlinkPatient).not.toHaveBeenCalled();
  });
});
