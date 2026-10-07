import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { assertDatabaseRole } from '../src/infra/database/database-clients';
import { isolatedPostgres } from './fixtures/isolated-postgres';
import { runtimeUrls } from './fixtures/runtime-roles';

describe('Database privilege boundary attestation', () => {
  let db: Awaited<ReturnType<typeof isolatedPostgres>>;
  let urls: Awaited<ReturnType<typeof runtimeUrls>>;
  let clinical: PrismaClient;
  beforeAll(async () => {
    db = await isolatedPostgres();
    urls = await runtimeUrls(db.pool);
    clinical = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: urls.values.CLINICAL_DATABASE_URL,
      }),
    });
  });
  afterAll(async () => {
    await clinical?.$disconnect();
    urls?.restore();
    await db?.close();
  });
  it('rejects a runtime login able to create roles', async () => {
    await db.pool.query('ALTER ROLE safemove_test_clinical CREATEROLE');
    try {
      await expect(
        assertDatabaseRole(clinical, 'safemove_clinical'),
      ).rejects.toThrow('Unsafe database role');
    } finally {
      await db.pool.query('ALTER ROLE safemove_test_clinical NOCREATEROLE');
    }
    await expect(
      assertDatabaseRole(clinical, 'safemove_clinical'),
    ).resolves.toBeUndefined();
  });
  it('rejects mixed auth and clinical memberships', async () => {
    await db.pool.query('GRANT safemove_auth TO safemove_test_clinical');
    try {
      await expect(
        assertDatabaseRole(clinical, 'safemove_clinical'),
      ).rejects.toThrow('Unsafe database role');
    } finally {
      await db.pool.query('REVOKE safemove_auth FROM safemove_test_clinical');
    }
  });

  it('rejects an owner login that disguises its effective role with SET ROLE', async () => {
    await db.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE safemove_clinical`;
      await expect(
        assertDatabaseRole(tx as unknown as PrismaClient, 'safemove_clinical'),
      ).rejects.toThrow('Unsafe database role');
    });
  });
});
