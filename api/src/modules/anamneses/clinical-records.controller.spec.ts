import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { AnamnesesController } from './anamneses.controller';
import { AnamnesesService } from './anamneses.service';
import { ConsultationNotesController } from '../consultation-notes/consultation-notes.controller';
import { ConsultationNotesService } from '../consultation-notes/consultation-notes.service';

describe('Client clinical record routes', () => {
  const user: AuthUser = { sub: 'professional-1', role: 'NUTRITIONIST' };
  const clientId = 'a0000000-0000-4000-8000-000000000001';
  const anamneses = {
    create: jest.fn(),
    findByClient: jest.fn(),
    findByPatient: jest.fn(),
  };
  const notes = {
    ...anamneses,
    create: jest.fn(),
    findByClient: jest.fn(),
    findByPatient: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const contracts = [
    {
      route: '/anamneses',
      legacy: 'user',
      body: { clientId, bristolScale: 4, waterIntake: 2.5 },
      service: anamneses,
    },
    {
      route: '/consultation-notes',
      legacy: 'patient',
      body: { clientId, content: 'Nota clínica' },
      service: notes,
    },
  ];
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AnamnesesController, ConsultationNotesController],
      providers: [
        RolesGuard,
        { provide: AnamnesesService, useValue: anamneses },
        { provide: ConsultationNotesService, useValue: notes },
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
    'creates and lists owned Client records at $route',
    async ({ route, body, service }) => {
      await request(app.getHttpServer()).post(route).send(body).expect(201);
      expect(service.create).toHaveBeenCalledWith(user, body);
      await request(app.getHttpServer())
        .get(`${route}/client/${clientId}`)
        .expect(200);
      expect(service.findByClient).toHaveBeenCalledWith(user, clientId);
    },
  );
  it.each(contracts)(
    'rejects internal IDs and malformed Client identity at $route',
    async ({ route, body, service }) => {
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
      expect(service.create).not.toHaveBeenCalled();
    },
  );
  it.each(contracts)(
    'removes legacy identity routes at $route',
    async ({ route, legacy, service }) => {
      await request(app.getHttpServer())
        .get(`${route}/${legacy}/${clientId}`)
        .expect(404);
      expect(service.findByPatient).not.toHaveBeenCalled();
    },
  );
  it.each([
    { bristolScale: 0 },
    { bristolScale: 8 },
    { bristolScale: 1.5 },
    { waterIntake: -1 },
    { waterIntake: 21 },
    { clinicalHistory: 'x'.repeat(10001) },
  ])('bounds anamnesis fields', async (invalid) => {
    await request(app.getHttpServer())
      .post('/anamneses')
      .send({ clientId, ...invalid })
      .expect(400);
    expect(anamneses.create).not.toHaveBeenCalled();
  });
  it('bounds note content for create and update and keeps identity immutable', async () => {
    for (const content of ['', 'x'.repeat(20001)]) {
      await request(app.getHttpServer())
        .post('/consultation-notes')
        .send({ clientId, content })
        .expect(400);
      await request(app.getHttpServer())
        .patch('/consultation-notes/note-1')
        .send({ content })
        .expect(400);
    }
    for (const field of [
      'clientId',
      'patientId',
      'userId',
      'creatorId',
      'professionalId',
    ]) {
      await request(app.getHttpServer())
        .patch('/consultation-notes/note-1')
        .send({ [field]: clientId })
        .expect(400);
    }
    expect(notes.update).not.toHaveBeenCalled();
    expect(notes.create).not.toHaveBeenCalled();
  });
  it('passes the complete authenticated professional to update and delete', async () => {
    await request(app.getHttpServer())
      .patch('/consultation-notes/note-1')
      .send({ content: 'Atualizada' })
      .expect(200);
    expect(notes.update).toHaveBeenCalledWith(user, 'note-1', {
      content: 'Atualizada',
    });
    await request(app.getHttpServer())
      .delete('/consultation-notes/note-1')
      .expect(200);
    expect(notes.remove).toHaveBeenCalledWith(user, 'note-1');
  });
});
