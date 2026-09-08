import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

export const E2E = {
  password: 'SafeMove-E2E-2026!',
  nutritionist: {
    id: '31000000-0000-4000-8000-000000000001',
    email: 'nutri.phase1@e2e.test',
  },
  personal: {
    id: '31000000-0000-4000-8000-000000000002',
    email: 'personal.phase1@e2e.test',
  },
  physio: {
    id: '31000000-0000-4000-8000-000000000003',
    email: 'physio.phase1@e2e.test',
  },
  tenantB: {
    id: '31000000-0000-4000-8000-000000000004',
    email: 'tenant-b.phase1@e2e.test',
  },
  clientA: '41000000-0000-4000-8000-000000000001',
  clientB: '41000000-0000-4000-8000-000000000002',
} as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.endsWith('_test')) {
  throw new Error(
    'seed:phase1-e2e recusado: DATABASE_URL deve terminar em _test.',
  );
}

const pool = new Pool({ connectionString: databaseUrl });
const adapterPool = pool as unknown as ConstructorParameters<
  typeof PrismaPg
>[0];
const adapter = new PrismaPg(adapterPool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

const professionals = [
  {
    ...E2E.nutritionist,
    name: 'Nutricionista Phase 1',
    role: Role.NUTRITIONIST,
  },
  {
    ...E2E.personal,
    name: 'Personal Phase 1',
    role: Role.PERSONAL,
  },
  {
    ...E2E.physio,
    name: 'Fisioterapeuta Phase 1',
    role: Role.PHYSIO,
  },
  {
    ...E2E.tenantB,
    name: 'Profissional Tenant B',
    role: Role.NUTRITIONIST,
  },
] as const;

async function main() {
  const professionalIds = professionals.map(({ id }) => id);
  const password = await bcrypt.hash(E2E.password, 12);

  await prisma.$transaction(async (transaction) => {
    await transaction.clientAuditEvent.deleteMany({
      where: { professionalId: { in: professionalIds } },
    });
    await transaction.client.deleteMany({
      where: { professionalId: { in: professionalIds } },
    });

    for (const professional of professionals) {
      await transaction.user.upsert({
        where: { id: professional.id },
        update: {
          name: professional.name,
          email: professional.email,
          password,
          role: professional.role,
        },
        create: {
          id: professional.id,
          name: professional.name,
          email: professional.email,
          password,
          role: professional.role,
        },
      });
    }

    await transaction.client.createMany({
      data: [
        {
          id: E2E.clientA,
          professionalId: E2E.nutritionist.id,
          name: 'Cliente privado A',
          email: 'cliente-a.phase1@e2e.test',
          goal: 'Acompanhamento nutricional',
        },
        {
          id: E2E.clientB,
          professionalId: E2E.tenantB.id,
          name: 'Cliente privado B',
          email: 'cliente-b.phase1@e2e.test',
          goal: 'Registro isolado de outro profissional',
        },
      ],
    });
  });

  console.log('Seed profissional Phase 1 concluído.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
