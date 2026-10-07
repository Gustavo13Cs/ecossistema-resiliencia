import { isolationPort } from './fixtures/client-isolation';
import { testAdminPrisma } from './fixtures/test-admin';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../src/common/client-access/client-access.service';
import { AuthUser } from '../src/common/types/auth-user';
import { PrismaService } from '../src/infra/database/prisma.service';
import { RehabPlansService } from '../src/modules/rehab-plans/rehab-plans.service';

describe('Client rehab transactions (PostgreSQL)', () => {
  const database = `postgresql://postgres:postgres@localhost:${isolationPort}/ecossistema_resiliencia_test`;
  const owner: AuthUser = {
    sub: '72000000-0000-4000-8000-000000000001',
    role: 'PHYSIO',
  };
  const other: AuthUser = {
    sub: '72000000-0000-4000-8000-000000000002',
    role: 'PHYSIO',
  };
  const clientId = '72000000-0000-4000-8000-000000000003';
  const otherClientId = '72000000-0000-4000-8000-000000000004';
  const previousId = '72000000-0000-4000-8000-000000000005';
  const otherPlanId = '72000000-0000-4000-8000-000000000006';
  const dto = {
    clientId,
    title: 'Novo treino',
    sessions: [
      {
        name: 'A',
        exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
      },
    ],
  };
  let prisma: PrismaService;
  let service: { create(user: AuthUser, data: typeof dto): Promise<unknown> };

  beforeAll(async () => {
    expect(process.env.DATABASE_URL).toBe(database);
    expect(process.env.DIRECT_URL).toBe(database);
    const module = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useFactory: testAdminPrisma },
        ClientAccessService,
        RehabPlansService,
      ],
    }).compile();
    prisma = module.get(PrismaService);
    service = module.get(RehabPlansService);
    await prisma.$connect();
  });

  const clearFixtures = async () => {
    await prisma.rehabPlan.deleteMany({
      where: { creatorId: { in: [owner.sub, other.sub] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.sub, other.sub] } },
    });
  };

  beforeEach(async () => {
    await clearFixtures();
    await prisma.user.createMany({
      data: [owner, other].map((user) => ({
        id: user.sub,
        name: 'Fixture professional',
        email: `${user.sub}@rehab-test.invalid`,
        password: 'test-only-not-a-login',
        role: user.role,
      })),
    });
    await prisma.client.createMany({
      data: [
        { id: clientId, name: 'Fixture A', professionalId: owner.sub },
        { id: otherClientId, name: 'Fixture B', professionalId: other.sub },
      ],
    });
    await prisma.rehabPlan.createMany({
      data: [
        {
          id: previousId,
          title: 'Anterior A',
          clientId,
          creatorId: owner.sub,
          isActive: true,
        },
        {
          id: otherPlanId,
          title: 'Anterior B',
          clientId: otherClientId,
          creatorId: other.sub,
          isActive: true,
        },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      try {
        await clearFixtures();
      } finally {
        await prisma.$disconnect();
      }
    }
  });

  it('rolls back deactivation when a nested exercise cannot be persisted', async () => {
    const invalid = {
      ...dto,
      sessions: [
        {
          name: 'A',
          exercises: [
            {
              name: undefined as unknown as string,
              sets: '3',
              reps: '10',
            },
          ],
        },
      ],
    };
    await expect(service.create(owner, invalid)).rejects.toThrow();
    expect(
      await prisma.rehabPlan.findUnique({
        where: { id: previousId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    expect(
      await prisma.rehabPlan.findUnique({
        where: { id: otherPlanId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    expect(
      await prisma.rehabPlan.count({ where: { creatorId: owner.sub } }),
    ).toBe(1);
  });

  it('replaces only the owned Client plan and stores the nested exercises', async () => {
    await service.create(owner, dto);
    expect(
      await prisma.rehabPlan.findUnique({
        where: { id: previousId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });
    expect(
      await prisma.rehabPlan.findUnique({
        where: { id: otherPlanId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    const active = await prisma.rehabPlan.findFirstOrThrow({
      where: { clientId, creatorId: owner.sub, isActive: true },
      include: { sessions: { include: { exercises: true } } },
    });
    expect(active.userId).toBeNull();
    expect(active.sessions[0].exercises[0]).toMatchObject({
      name: 'Agachamento',
      sets: '3',
      reps: '10',
    });
  });
});
