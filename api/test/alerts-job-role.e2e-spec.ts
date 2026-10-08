import { JobsPrismaService } from '../src/infra/database/database-clients';
import { AlertsCronService } from '../src/modules/alerts/alerts.cron.service';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Dedicated alerts job role', () => {
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
  it('generates alerts only for authorized personal Clients', async () => {
    const cron = new AlertsCronService(jobs);
    await cron.generateDailyAlerts();
    expect(
      await db.prisma.patientAlert.findMany({
        select: { clientId: true, professionalId: true, type: true },
      }),
    ).toEqual([
      {
        clientId: 'job-client',
        professionalId: 'personal-job',
        type: 'INACTIVE_5_DAYS',
      },
    ]);
    expect(await jobs.client.findMany({ select: { id: true } })).toEqual([
      { id: 'job-client' },
    ]);
    await expect(jobs.anamnesis.findMany()).rejects.toThrow();
  });
});
