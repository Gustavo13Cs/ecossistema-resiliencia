import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { PhysioAssessmentsController } from './physio-assessments.controller';
import { PhysioAssessmentsService } from './physio-assessments.service';

describe('PhysioAssessmentsController Client contract', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'PHYSIO' };
  const clientId = 'a0000000-0000-4000-8000-000000000001';
  const body = { clientId, chiefComplaint: 'Dor no joelho', painLevel: 4 };
  const service = {
    create: jest.fn(),
    findByClient: jest.fn(),
    findByUser: jest.fn(),
    remove: jest.fn(),
  };
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PhysioAssessmentsController],
      providers: [
        RolesGuard,
        { provide: PhysioAssessmentsService, useValue: service },
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
  it('creates with Client and the complete authenticated professional', async () => {
    await request(app.getHttpServer())
      .post('/physio-assessments')
      .send(body)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(user, body);
  });
  it.each(['userId', 'patientId', 'creatorId', 'professionalId'])(
    'rejects internal %s',
    async (field) => {
      await request(app.getHttpServer())
        .post('/physio-assessments')
        .send({ ...body, [field]: clientId })
        .expect(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );
  it.each([
    { clientId: 'invalid' },
    { painLevel: -1 },
    { painLevel: 11 },
    { painLevel: 1.5 },
    { chiefComplaint: 'x'.repeat(5001) },
  ])('rejects invalid clinical fields', async (invalid) => {
    await request(app.getHttpServer())
      .post('/physio-assessments')
      .send({ ...body, ...invalid })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });
  it('uses Client history and authenticated deletion', async () => {
    await request(app.getHttpServer())
      .get(`/physio-assessments/client/${clientId}`)
      .expect(200);
    expect(service.findByClient).toHaveBeenCalledWith(user, clientId);
    await request(app.getHttpServer())
      .delete('/physio-assessments/assessment-1')
      .expect(200);
    expect(service.remove).toHaveBeenCalledWith(user, 'assessment-1');
  });
  it('removes the legacy history route', async () => {
    await request(app.getHttpServer())
      .get(`/physio-assessments/user/${clientId}`)
      .expect(404);
    expect(service.findByUser).not.toHaveBeenCalled();
  });
});
