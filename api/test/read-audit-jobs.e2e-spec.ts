import { JobsPrismaService } from '../src/infra/database/database-clients';
import { AlertsCronService } from '../src/modules/alerts/alerts.cron.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Dedicated alerts job role and SYSTEM audit', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let jobs: JobsPrismaService;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    await db.prisma.user.createMany({
      data: [
        {
          id: 'personal-job',
          name: 'Synthetic',
          email: 'personal@job.invalid',
          password: 'unused',
          role: 'PERSONAL',
        },
        {
          id: 'nutri-job',
          name: 'Synthetic',
          email: 'nutri@job.invalid',
          password: 'unused',
          role: 'NUTRITIONIST',
        },
      ],
    });
    await db.prisma.client.createMany({
      data: [
        { id: 'job-client', professionalId: 'personal-job', name: 'Synthetic' },
        { id: 'job-other', professionalId: 'nutri-job', name: 'Synthetic' },
      ],
    });
    jobs = new JobsPrismaService();
    await jobs.onModuleInit();
  });
  afterAll(async () => {
    await jobs?.$disconnect();
    urls?.restore();
    await db?.close();
  });
  it('records the real owner and allowed task without a fictitious human or session', async () => {
    const cron = new AlertsCronService(jobs);
    await cron.generateDailyAlerts();
    const rows = (await db.pool.query('SELECT * FROM client_read_audit_events'))
      .rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorType: 'SYSTEM',
      tenantProfessionalId: 'personal-job',
      clientId: 'job-client',
      actorProfessionalId: null,
      sessionId: null,
      systemTaskId: 'alerts.daily',
      domain: 'ALERT',
    });
    expect(await jobs.client.findMany({ select: { id: true } })).toEqual([
      { id: 'job-client' },
    ]);
    await expect(jobs.anamnesis.findMany()).rejects.toThrow();
  });
});
