import { isolationPort } from './fixtures/client-isolation';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Retired patient runtime (e2e)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    const database = `postgresql://postgres:postgres@localhost:${isolationPort}/ecossistema_resiliencia_test`;
    expect(process.env.DATABASE_URL).toBe(database);
    expect(process.env.DIRECT_URL).toBe(database);
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it.each([
    '/consents',
    '/health-check-ins',
    '/meal-logs',
    '/workout-logs',
    '/agenda/patient/legacy-id',
    '/metrics/today/legacy-id',
  ])('does not expose %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(404);
    await request(app.getHttpServer()).post(path).send({}).expect(404);
  });
  it('preserves authenticated professional appointments', async () => {
    await request(app.getHttpServer()).get('/appointments').expect(401);
  });
});
