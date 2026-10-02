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
import { ClientGoalsController } from './client-goals.controller';
import { ClientGoalsService } from './client-goals.service';

describe('ClientGoalsController validation and identity', () => {
  let app: INestApplication<App>;
  const clientId = '81000000-0000-4000-8000-000000000011';
  const user: AuthUser = { sub: 'professional-a', role: 'NUTRITIONIST' };
  const service = {
    list: jest.fn(),
    findOne: jest.fn(),
    upsert: jest.fn(),
    remove: jest.fn(),
  };
  const dto = {
    category: 'WEIGHT_LOSS',
    status: 'PENDING',
    startDate: '2026-10-01',
    targetDate: '2026-12-01',
    habits: {
      waterTargetMl: 2500,
      sleepTargetHours: 8,
      mealsAdherencePercent: 90,
      dailyStepsTarget: 8000,
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClientGoalsController],
      providers: [{ provide: ClientGoalsService, useValue: service }],
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
  it('passes path Client and authenticated professional independently of the body', async () => {
    await request(app.getHttpServer())
      .put(`/client-goals/${clientId}`)
      .send(dto)
      .expect(200);
    expect(service.upsert).toHaveBeenCalledWith(
      user,
      clientId,
      expect.objectContaining(dto),
    );
  });
  it.each([
    'clientId',
    'professionalId',
    'creatorId',
    'patientId',
    'userId',
    'createdAt',
  ])('rejects internal %s', async (field) => {
    await request(app.getHttpServer())
      .put(`/client-goals/${clientId}`)
      .send({ ...dto, [field]: clientId })
      .expect(400);
    expect(service.upsert).not.toHaveBeenCalled();
  });
  it.each([
    { ...dto, category: 'INVALID' },
    { ...dto, status: 'INVALID' },
    { ...dto, startDate: 'invalid-date' },
    { ...dto, targetWeightKg: -1 },
    { ...dto, targetBodyFatPercent: 101 },
    { ...dto, habits: { ...dto.habits, sleepTargetHours: 25 } },
    { ...dto, habits: { ...dto.habits, dailyStepsTarget: 1.5 } },
    { ...dto, habits: { ...dto.habits, professionalId: clientId } },
    { ...dto, habits: null },
  ])('rejects invalid goal values %#', async (body) => {
    await request(app.getHttpServer())
      .put(`/client-goals/${clientId}`)
      .send(body)
      .expect(400);
    expect(service.upsert).not.toHaveBeenCalled();
  });
  it('denies ADMIN before service execution', async () => {
    user.role = 'ADMIN';
    await request(app.getHttpServer())
      .put(`/client-goals/${clientId}`)
      .send(dto)
      .expect(403);
    expect(service.upsert).not.toHaveBeenCalled();
  });
});
