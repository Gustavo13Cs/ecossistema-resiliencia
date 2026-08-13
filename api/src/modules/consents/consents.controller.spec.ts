import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';

describe('ConsentsController', () => {
  const consentsService = {
    listMine: jest.fn(),
    setMine: jest.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ConsentsController],
      providers: [{ provide: ConsentsService, useValue: consentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          context.switchToHttp().getRequest().user = {
            sub: 'patient-1',
            role: 'PATIENT',
          };
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
    consentsService.setMine.mockResolvedValue({ id: 'consent-1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an invalid consent category with HTTP 400', async () => {
    await request(app.getHttpServer())
      .put('/consents/professional-1/NOT_A_CATEGORY')
      .send({ granted: true })
      .expect(400);

    expect(consentsService.setMine).not.toHaveBeenCalled();
  });

  it('preserves a valid consent category when calling the service', async () => {
    await request(app.getHttpServer())
      .put('/consents/professional-1/HEALTH_CHECK_IN')
      .send({ granted: true })
      .expect(200);

    expect(consentsService.setMine).toHaveBeenCalledWith(
      { sub: 'patient-1', role: 'PATIENT' },
      'professional-1',
      'HEALTH_CHECK_IN',
      { granted: true },
    );
  });
});
