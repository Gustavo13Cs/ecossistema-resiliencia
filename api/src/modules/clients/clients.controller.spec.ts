import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  const authenticatedProfessional = {
    sub: 'pro-1',
    role: 'NUTRITIONIST',
  };
  const clientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    setStatus: jest.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: clientsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          context.switchToHttp().getRequest().user = authenticatedProfessional;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
    clientsService.create.mockResolvedValue({ id: 'client-1', name: 'Ana' });
    clientsService.findAll.mockResolvedValue([]);
    clientsService.findOne.mockResolvedValue({ id: 'client-1', name: 'Ana' });
    clientsService.update.mockResolvedValue({ id: 'client-1', name: 'Ana' });
    clientsService.setStatus.mockResolvedValue({
      id: 'client-1',
      name: 'Ana',
      status: 'ARCHIVED',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects professionalId in a create request body', async () => {
    await request(app.getHttpServer())
      .post('/clients')
      .send({ name: 'Ana', professionalId: 'pro-2' })
      .expect(400);

    expect(clientsService.create).not.toHaveBeenCalled();
  });

  it('passes the authenticated professional to create', async () => {
    await request(app.getHttpServer())
      .post('/clients')
      .send({ name: 'Ana' })
      .expect(201);

    expect(clientsService.create).toHaveBeenCalledWith(
      authenticatedProfessional,
      { name: 'Ana' },
    );
  });

  it('uses ACTIVE as the default list status', async () => {
    await request(app.getHttpServer()).get('/clients').expect(200);

    expect(clientsService.findAll).toHaveBeenCalledWith(
      authenticatedProfessional,
      'ACTIVE',
    );
  });

  it('passes a validated list status to the service', async () => {
    await request(app.getHttpServer())
      .get('/clients')
      .query({ status: 'ARCHIVED' })
      .expect(200);

    expect(clientsService.findAll).toHaveBeenCalledWith(
      authenticatedProfessional,
      'ARCHIVED',
    );
  });

  it('rejects an invalid list status before calling the service', async () => {
    await request(app.getHttpServer())
      .get('/clients')
      .query({ status: 'DELETED' })
      .expect(400);

    expect(clientsService.findAll).not.toHaveBeenCalled();
  });

  it('rejects an invalid client status', async () => {
    await request(app.getHttpServer())
      .patch('/clients/client-1/status')
      .send({ status: 'DELETED' })
      .expect(400);

    expect(clientsService.setStatus).not.toHaveBeenCalled();
  });

  it('passes authenticated ownership to findOne', async () => {
    await request(app.getHttpServer()).get('/clients/client-1').expect(200);

    expect(clientsService.findOne).toHaveBeenCalledWith(
      authenticatedProfessional,
      'client-1',
    );
  });

  it('passes authenticated ownership to update', async () => {
    await request(app.getHttpServer())
      .patch('/clients/client-1')
      .send({ name: 'Ana Maria' })
      .expect(200);

    expect(clientsService.update).toHaveBeenCalledWith(
      authenticatedProfessional,
      'client-1',
      { name: 'Ana Maria' },
    );
  });

  it('rejects professionalId in an update request body', async () => {
    await request(app.getHttpServer())
      .patch('/clients/client-1')
      .send({ name: 'Ana Maria', professionalId: 'pro-2' })
      .expect(400);

    expect(clientsService.update).not.toHaveBeenCalled();
  });

  it('passes authenticated ownership and validated status to setStatus', async () => {
    await request(app.getHttpServer())
      .patch('/clients/client-1/status')
      .send({ status: 'ARCHIVED' })
      .expect(200);

    expect(clientsService.setStatus).toHaveBeenCalledWith(
      authenticatedProfessional,
      'client-1',
      'ARCHIVED',
    );
  });

  it('does not expose a DELETE endpoint', async () => {
    await request(app.getHttpServer()).delete('/clients/client-1').expect(404);
  });
});
