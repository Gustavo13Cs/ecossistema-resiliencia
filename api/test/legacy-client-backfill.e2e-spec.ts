import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const SAFE_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test';
const PROFESSIONAL_A = '25000000-0000-4000-8000-000000000001';
const PROFESSIONAL_B = '25000000-0000-4000-8000-000000000002';
const LEGACY_PATIENT = '25000000-0000-4000-8000-000000000003';
const LINK_A = '35000000-0000-4000-8000-000000000001';
const LINK_B = '35000000-0000-4000-8000-000000000002';
const USER_IDS = [PROFESSIONAL_A, PROFESSIONAL_B, LEGACY_PATIENT];
const LINK_IDS = [LINK_A, LINK_B];
const MIGRATION_PATH = resolve(
  __dirname,
  '../prisma/migrations/20260908194000_backfill_legacy_clients/migration.sql',
);

describe('Legacy professional-client backfill (e2e)', () => {
  let pool: Pool;
  let prisma: PrismaClient;

  const assertSafeTestDatabase = () => {
    expect(process.env.DATABASE_URL).toBe(SAFE_TEST_DATABASE_URL);
    expect(process.env.DIRECT_URL).toBe(SAFE_TEST_DATABASE_URL);
  };

  const deleteFixtures = async () => {
    assertSafeTestDatabase();
    await prisma.clientAuditEvent.deleteMany({
      where: { id: { in: LINK_IDS } },
    });
    await prisma.client.deleteMany({ where: { id: { in: LINK_IDS } } });
    await prisma.professionalPatientLink.deleteMany({
      where: { id: { in: LINK_IDS } },
    });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  };

  const seedLegacyRelationship = async () => {
    await prisma.user.createMany({
      data: [
        {
          id: PROFESSIONAL_A,
          name: 'Nutricionista Backfill E2E',
          email: 'backfill-professional-a@e2e.test',
          password: 'not-used-e2e',
          role: 'NUTRITIONIST',
        },
        {
          id: PROFESSIONAL_B,
          name: 'Personal Backfill E2E',
          email: 'backfill-professional-b@e2e.test',
          password: 'not-used-e2e',
          role: 'PERSONAL',
        },
        {
          id: LEGACY_PATIENT,
          name: 'Paciente legado E2E',
          email: 'backfill-patient@e2e.test',
          password: 'not-used-e2e',
          role: 'PATIENT',
          phone: '11999999999',
          goal: 'Objetivo legado',
          allergies: 'Alergia legada',
          nutritionistNotes: 'Nota global que não pode vazar',
        },
      ],
    });
    await prisma.professionalPatientLink.createMany({
      data: [
        {
          id: LINK_A,
          professionalId: PROFESSIONAL_A,
          patientId: LEGACY_PATIENT,
          isActive: true,
        },
        {
          id: LINK_B,
          professionalId: PROFESSIONAL_B,
          patientId: LEGACY_PATIENT,
          isActive: true,
        },
      ],
    });
  };

  const runBackfillMigration = async () => {
    const sql = existsSync(MIGRATION_PATH)
      ? readFileSync(MIGRATION_PATH, 'utf8')
      : 'SELECT 1';
    await prisma.$executeRawUnsafe(sql);
  };

  beforeAll(() => {
    assertSafeTestDatabase();
    pool = new Pool({ connectionString: SAFE_TEST_DATABASE_URL });
    const adapter = new PrismaPg(
      pool as unknown as ConstructorParameters<typeof PrismaPg>[0],
      { disposeExternalPool: true },
    );
    prisma = new PrismaClient({ adapter });
  });

  beforeEach(async () => {
    await deleteFixtures();
    await seedLegacyRelationship();
  });

  afterAll(async () => {
    if (prisma) {
      await deleteFixtures();
      await prisma.$disconnect();
    }
  });

  it('creates one isolated Client snapshot per authorized professional relationship', async () => {
    await runBackfillMigration();

    const clients = await prisma.client.findMany({
      where: { id: { in: LINK_IDS } },
      orderBy: { professionalId: 'asc' },
    });

    expect(clients).toHaveLength(2);
    expect(
      clients.map(({ id, professionalId, name, email, goal }) => ({
        id,
        professionalId,
        name,
        email,
        goal,
      })),
    ).toEqual([
      {
        id: LINK_A,
        professionalId: PROFESSIONAL_A,
        name: 'Paciente legado E2E',
        email: 'backfill-patient@e2e.test',
        goal: 'Objetivo legado',
      },
      {
        id: LINK_B,
        professionalId: PROFESSIONAL_B,
        name: 'Paciente legado E2E',
        email: 'backfill-patient@e2e.test',
        goal: 'Objetivo legado',
      },
    ]);
    expect(clients.every(({ professionalNotes }) => professionalNotes === null)).toBe(
      true,
    );
    await expect(
      prisma.clientAuditEvent.count({ where: { id: { in: LINK_IDS } } }),
    ).resolves.toBe(2);
  });

  it('can be run again without duplicating Client or audit records', async () => {
    await runBackfillMigration();
    await runBackfillMigration();

    await expect(
      prisma.client.count({ where: { id: { in: LINK_IDS } } }),
    ).resolves.toBe(2);
    await expect(
      prisma.clientAuditEvent.count({ where: { id: { in: LINK_IDS } } }),
    ).resolves.toBe(2);
  });
});
