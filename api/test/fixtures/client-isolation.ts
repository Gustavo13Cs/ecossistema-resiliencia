import { AuthUser } from '../../src/common/types/auth-user';
import { PrismaService } from '../../src/infra/database/prisma.service';

const localPort = Number(process.env.LOCAL_TEST_PG_PORT ?? '5434');
if (![5434, 5435].includes(localPort))
  throw new Error('Synthetic fixture port must be 5434 or 5435');
export const isolationPort = localPort;
export const isolationDatabase =
  'postgresql://postgres:postgres@localhost:' +
  localPort +
  '/ecossistema_resiliencia_test';

const uuid = (suffix: number) =>
  `81000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;

export const isolationFixtures = {
  nutrition: {
    a: { sub: uuid(1), role: 'NUTRITIONIST' },
    b: { sub: uuid(2), role: 'NUTRITIONIST' },
    clientA: uuid(11),
    clientB: uuid(12),
  },
  training: {
    a: { sub: uuid(3), role: 'PERSONAL' },
    b: { sub: uuid(4), role: 'PERSONAL' },
    clientA: uuid(13),
    clientB: uuid(14),
  },
  physio: {
    a: { sub: uuid(5), role: 'PHYSIO' },
    b: { sub: uuid(6), role: 'PHYSIO' },
    clientA: uuid(15),
    clientB: uuid(16),
  },
} satisfies Record<
  string,
  { a: AuthUser; b: AuthUser; clientA: string; clientB: string }
>;

export function assertIsolationDatabase() {
  if (
    process.env.DATABASE_URL !== isolationDatabase ||
    process.env.DIRECT_URL !== isolationDatabase
  ) {
    throw new Error(
      'Clinical isolation fixtures require the explicit local test database',
    );
  }
}

export async function clearIsolationFixtures(prisma: PrismaService) {
  assertIsolationDatabase();
  const professionalIds = Object.values(isolationFixtures).flatMap(
    ({ a, b }) => [a.sub, b.sub],
  );
  const clientIds = Object.values(isolationFixtures).flatMap(
    ({ clientA, clientB }) => [clientA, clientB],
  );
  const where = { creatorId: { in: professionalIds } };
  await prisma.workout.deleteMany({ where });
  await prisma.rehabPlan.deleteMany({ where });
  await prisma.physioAssessment.deleteMany({ where });
  await prisma.anamnesis.deleteMany({ where });
  await prisma.consultationNote.deleteMany({ where });
  await prisma.supplementPlan.deleteMany({ where });
  await prisma.labExam.deleteMany({ where });
  await prisma.clientGoal.deleteMany({
    where: { professionalId: { in: professionalIds } },
  });
  await prisma.labOrder.deleteMany({
    where: { professionalId: { in: professionalIds } },
  });
  await prisma.clientAuditEvent.deleteMany({
    where: { clientId: { in: clientIds } },
  });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  await prisma.user.deleteMany({ where: { id: { in: professionalIds } } });
}

export async function seedIsolationFixtures(prisma: PrismaService) {
  await clearIsolationFixtures(prisma);
  await prisma.user.createMany({
    data: Object.values(isolationFixtures)
      .flatMap(({ a, b }) => [a, b])
      .map((user) => ({
        id: user.sub,
        role: user.role,
        name: 'Synthetic professional',
        email: `${user.sub}@clinical-test.invalid`,
        password: 'test-only-not-a-login',
      })),
  });
  await prisma.client.createMany({
    data: Object.values(isolationFixtures).flatMap(
      ({ a, b, clientA, clientB }) => [
        { id: clientA, professionalId: a.sub, name: 'Synthetic Client A' },
        { id: clientB, professionalId: b.sub, name: 'Synthetic Client B' },
      ],
    ),
  });
}
