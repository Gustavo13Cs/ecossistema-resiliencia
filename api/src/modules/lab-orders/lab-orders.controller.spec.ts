import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/types/auth-user';
import { LabExamsController } from '../lab-exams/lab-exams.controller';
import { LabExamsService } from '../lab-exams/lab-exams.service';
import { LabOrdersController } from './lab-orders.controller';
import { LabOrdersService } from './lab-orders.service';

describe('Laboratory aggregate routes and DTOs', () => {
  let app: INestApplication<App>;
  const id = '81000000-0000-4000-8000-000000000011';
  const user: AuthUser = { sub: 'professional-a', role: 'NUTRITIONIST' };
  const orders = { list: jest.fn(), create: jest.fn(), remove: jest.fn() };
  const exams = { findAll: jest.fn(), remove: jest.fn() };
  const dto = {
    clientId: id,
    markers: ['Synthetic marker'],
    clinicalIndication: 'Synthetic indication',
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LabOrdersController, LabExamsController],
      providers: [
        { provide: LabOrdersService, useValue: orders },
        { provide: LabExamsService, useValue: exams },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user: AuthUser }>().user = user;
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
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    user.role = 'NUTRITIONIST';
  });
  it('forwards authenticated identity for order create/list/delete', async () => {
    await request(app.getHttpServer())
      .post('/lab-orders')
      .send(dto)
      .expect(201);
    await request(app.getHttpServer()).get('/lab-orders').expect(200);
    await request(app.getHttpServer()).delete(`/lab-orders/${id}`).expect(200);
    expect(orders.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining(dto),
    );
    expect(orders.list).toHaveBeenCalledWith(user);
    expect(orders.remove).toHaveBeenCalledWith(user, id);
  });
  it('forwards authenticated identity for aggregate exams and deletion', async () => {
    await request(app.getHttpServer()).get('/lab-exams').expect(200);
    await request(app.getHttpServer()).delete(`/lab-exams/${id}`).expect(200);
    expect(exams.findAll).toHaveBeenCalledWith(user);
    expect(exams.remove).toHaveBeenCalledWith(user, id);
  });
  it.each([
    'clientName',
    'professionalId',
    'creatorId',
    'userId',
    'patientId',
    'issuedAt',
  ])('rejects internal %s on orders', async (field) => {
    await request(app.getHttpServer())
      .post('/lab-orders')
      .send({ ...dto, [field]: id })
      .expect(400);
    expect(orders.create).not.toHaveBeenCalled();
  });
  it.each([
    { ...dto, clientId: 'invalid' },
    { ...dto, markers: [] },
    { ...dto, markers: Array.from({ length: 201 }, () => 'marker') },
    { ...dto, markers: ['x'.repeat(201)] },
    { ...dto, markers: [3] },
    { ...dto, markers: [''] },
    { ...dto, title: 'x'.repeat(201) },
    { ...dto, clinicalIndication: 'x'.repeat(10001) },
  ])('rejects invalid or oversized order %#', async (body) => {
    await request(app.getHttpServer())
      .post('/lab-orders')
      .send(body)
      .expect(400);
    expect(orders.create).not.toHaveBeenCalled();
  });
  it('denies ADMIN for laboratory aggregates and mutations', async () => {
    user.role = 'ADMIN';
    await request(app.getHttpServer()).get('/lab-orders').expect(403);
    await request(app.getHttpServer())
      .post('/lab-orders')
      .send(dto)
      .expect(403);
    await request(app.getHttpServer()).delete(`/lab-orders/${id}`).expect(403);
    await request(app.getHttpServer()).get('/lab-exams').expect(403);
    await request(app.getHttpServer()).delete(`/lab-exams/${id}`).expect(403);
    for (const method of [...Object.values(orders), ...Object.values(exams)])
      expect(method).not.toHaveBeenCalled();
  });
});
