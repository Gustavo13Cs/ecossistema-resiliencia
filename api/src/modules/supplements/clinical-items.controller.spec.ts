import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { SupplementsController } from './supplements.controller';
import { SupplementsService } from './supplements.service';
import { LabExamsController } from '../lab-exams/lab-exams.controller';
import { LabExamsService } from '../lab-exams/lab-exams.service';

describe('Client supplements and laboratory routes', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'NUTRITIONIST' };
  const clientId = 'a0000000-0000-4000-8000-000000000001';
  const supplements = {
    create: jest.fn(),
    findActive: jest.fn(),
    findActiveByUser: jest.fn(),
  };
  const labs = {
    create: jest.fn(),
    findByClient: jest.fn(),
    findByPatient: jest.fn(),
  };
  const supplement = {
    clientId,
    title: 'Receituário',
    items: [{ name: 'Suplemento', dosage: '1 dose' }],
  };
  const lab = {
    clientId,
    date: '2026-09-30',
    markers: [{ name: 'Glicemia', value: 90, unit: 'mg/dL' }],
  };
  const contracts = [
    {
      route: '/supplements',
      suffix: '/active',
      body: supplement,
      service: supplements,
      reader: supplements.findActive,
    },
    {
      route: '/lab-exams',
      suffix: '',
      body: lab,
      service: labs,
      reader: labs.findByClient,
    },
  ];
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SupplementsController, LabExamsController],
      providers: [
        RolesGuard,
        { provide: SupplementsService, useValue: supplements },
        { provide: LabExamsService, useValue: labs },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user?: AuthUser } };
        }) {
          context.switchToHttp().getRequest().user = user;
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it.each(contracts)(
    'creates and reads by Client at $route',
    async ({ route, suffix, body, service, reader }) => {
      await request(app.getHttpServer()).post(route).send(body).expect(201);
      expect(service.create).toHaveBeenCalledWith(user, body);
      await request(app.getHttpServer())
        .get(`${route}/client/${clientId}${suffix}`)
        .expect(200);
      expect(reader).toHaveBeenCalledWith(user, clientId);
    },
  );
  it.each(contracts)(
    'rejects internal IDs and legacy routes at $route',
    async ({ route, suffix, body, service }) => {
      for (const field of [
        'patientId',
        'userId',
        'creatorId',
        'professionalId',
      ]) {
        await request(app.getHttpServer())
          .post(route)
          .send({ ...body, [field]: clientId })
          .expect(400);
      }
      await request(app.getHttpServer())
        .post(route)
        .send({ ...body, clientId: 'invalid' })
        .expect(400);
      await request(app.getHttpServer())
        .get(`${route}/user/${clientId}${suffix}`)
        .expect(404);
      expect(service.create).not.toHaveBeenCalled();
    },
  );
  it.each([
    { title: '' },
    { title: 'x'.repeat(201) },
    { items: [] },
    { items: Array.from({ length: 101 }, () => ({ name: 'A' })) },
    { items: [{ name: '' }] },
    { items: [{ name: 'A', dosage: 123 }] },
    { items: [{ name: 'A', composition: 'x'.repeat(10001) }] },
    { items: [{ name: 'A', creatorId: 'spoofed' }] },
  ])('rejects malformed or oversized supplement data', async (invalid) => {
    await request(app.getHttpServer())
      .post('/supplements')
      .send({ ...supplement, ...invalid })
      .expect(400);
    expect(supplements.create).not.toHaveBeenCalled();
  });
  it.each([
    { date: 'invalid' },
    { markers: [] },
    { markers: Array.from({ length: 201 }, () => lab.markers[0]) },
    { markers: [{ name: '', value: 1, unit: 'mg' }] },
    { markers: [{ name: 'A', value: '1', unit: 'mg' }] },
    { markers: [{ name: 'A', value: 1e13, unit: 'mg' }] },
    { markers: [{ name: 'A', value: 1, unit: 'x'.repeat(101) }] },
    { markers: [{ ...lab.markers[0], creatorId: 'spoofed' }] },
  ])('rejects malformed or oversized laboratory data', async (invalid) => {
    await request(app.getHttpServer())
      .post('/lab-exams')
      .send({ ...lab, ...invalid })
      .expect(400);
    expect(labs.create).not.toHaveBeenCalled();
  });
});
