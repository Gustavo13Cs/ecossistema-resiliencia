import { PrismaService } from '../src/infra/database/prisma.service';
import { ClinicalResponseValidator } from '../src/common/clinical-context/clinical-response.validator';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Clinical response limits and bounded transaction proof', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let clinical: PrismaService;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    clinical = new PrismaService();
    await clinical.onModuleInit();
    await db.prisma.user.create({
      data: {
        id: 'batch-owner',
        name: 'Synthetic',
        email: 'batch@fixture.invalid',
        password: 'unused',
        role: 'NUTRITIONIST',
      },
    });
    await db.prisma.client.createMany({
      data: Array.from({ length: 500 }, (_, i) => ({
        id: 'batch-' + i,
        name: 'Synthetic',
        professionalId: 'batch-owner',
      })),
    });
  });
  afterAll(async () => {
    await clinical?.$disconnect();
    urls?.restore();
    await db?.close();
  });
  const principal = {
    sub: 'batch-owner',
    role: 'NUTRITIONIST' as const,
    sessionId: 'validated-fixture',
  };
  it('validates an owned response and rejects a foreign Client', async () => {
    const validator = new ClinicalResponseValidator(clinical);
    await clinical.runAsProfessional(principal, 'owned-response', async () => {
      const result = await clinical.client.findMany({ select: { id: true } });
      await validator.validate({ shape: 'client' }, result);
    });
    await expect(
      clinical.runAsProfessional(principal, 'foreign-response', () =>
        validator.validate(
          { shape: 'resource' },
          { clientId: 'foreign-client' },
        ),
      ),
    ).rejects.toThrow('Unauthorized Client in prepared response');
  });
  it('rejects an over-wide response before releasing clinical data', async () => {
    const validator = new ClinicalResponseValidator(clinical);
    await expect(
      clinical.runAsProfessional(principal, 'too-wide', () =>
        validator.validate(
          { shape: 'client' },
          Array.from({ length: 1001 }, (_, i) => ({ id: 'batch-' + i })),
        ),
      ),
    ).rejects.toThrow('Consulta muito ampla');
  });
  it('rolls back a timed-out transaction and closes the contextual delegates', async () => {
    const before = process.env.CLINICAL_TRANSACTION_TIMEOUT_MS;
    process.env.CLINICAL_TRANSACTION_TIMEOUT_MS = '100';
    const short = new PrismaService();
    if (before === undefined)
      delete process.env.CLINICAL_TRANSACTION_TIMEOUT_MS;
    else process.env.CLINICAL_TRANSACTION_TIMEOUT_MS = before;
    try {
      await expect(
        short.runAsProfessional(principal, 'timeout', async () => {
          await short.client.update({
            where: { id: 'batch-0' },
            data: { name: 'Should roll back' },
          });
          await short.$queryRaw`SELECT pg_sleep(0.3)`;
        }),
      ).rejects.toThrow();
      expect(
        (await db.prisma.client.findUniqueOrThrow({ where: { id: 'batch-0' } }))
          .name,
      ).toBe('Synthetic');
      expect(() => short.client).toThrow('Clinical database context required');
    } finally {
      await short.$disconnect();
    }
  });
});
