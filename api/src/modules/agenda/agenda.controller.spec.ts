import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

describe('AgendaController range validation', () => {
  const patientId = 'efc4a745-d7c7-4a64-a85d-c65f2f158c67';
  const agendaService = {
    listPatientRange: jest.fn(),
  };

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AgendaController],
      providers: [{ provide: AgendaService, useValue: agendaService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          context.switchToHttp().getRequest().user = {
            sub: patientId,
            role: 'PATIENT',
          };
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
    agendaService.listPatientRange.mockResolvedValue({ occurrences: [] });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    {
      from: '2026-08-13T08:00:00',
      to: '2026-08-13T12:00:00.000Z',
    },
    {
      from: '2026-08-13T08:00:00.000Z',
      to: '2026-08-13T12:00:00',
    },
  ])('rejects an agenda range without an explicit offset', async (query) => {
    await request(app.getHttpServer())
      .get(`/agenda/patient/${patientId}`)
      .query(query)
      .expect(400);

    expect(agendaService.listPatientRange).not.toHaveBeenCalled();
  });

  it('normalizes Z and explicit-offset ranges before calling the service', async () => {
    await request(app.getHttpServer())
      .get(`/agenda/patient/${patientId}`)
      .query({
        from: '2026-08-13T08:00:00-03:00',
        to: '2026-08-13T15:00:00.000Z',
      })
      .expect(200);

    expect(agendaService.listPatientRange).toHaveBeenCalledWith(
      { sub: patientId, role: 'PATIENT' },
      patientId,
      new Date('2026-08-13T11:00:00.000Z'),
      new Date('2026-08-13T15:00:00.000Z'),
    );
  });
});
