import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { AuthUser } from '../../common/types/auth-user';
import { PrismaService } from '../../infra/database/prisma.service';
import { LabOrdersService } from './lab-orders.service';

describe('LabOrdersService ownership', () => {
  const user: AuthUser = { sub: 'professional-a', role: 'NUTRITIONIST' };
  const dto = {
    clientId: 'client-a',
    title: 'Synthetic panel',
    markers: ['Synthetic marker'],
    clinicalIndication: 'Synthetic indication',
    preparationInstructions: 'Synthetic instructions',
  };
  const prisma = {
    client: { findFirst: jest.fn() },
    labOrder: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
      deleteMany: jest.fn(),
    },
  };
  let service: {
    list(user: AuthUser): Promise<unknown>;
    create(user: AuthUser, data: typeof dto): Promise<unknown>;
    remove(user: AuthUser, id: string): Promise<unknown>;
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LabOrdersService,
        ClientAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LabOrdersService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue({ id: 'client-a' });
    prisma.labOrder.findMany.mockResolvedValue([]);
    prisma.labOrder.findFirst.mockResolvedValue({ clientId: 'client-a' });
    prisma.labOrder.deleteMany.mockResolvedValue({ count: 1 });
  });
  it('lists orders by professional and owned Client relation', async () => {
    await service.list(user);
    expect(prisma.labOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          professionalId: user.sub,
          client: { professionalId: user.sub },
        },
        include: { client: { select: { id: true, name: true } } },
      }),
    );
  });
  it('creates after Client access, with JWT author and a live Client name relation', async () => {
    await service.create(user, dto);
    const creation: unknown = prisma.labOrder.create.mock.calls[0]?.[0];
    expect(creation).toMatchObject({
      data: { ...dto, professionalId: user.sub },
      include: { client: { select: { id: true, name: true } } },
    });
    expect(prisma.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.labOrder.create.mock.invocationCallOrder[0],
    );
  });
  it('rejects a foreign Client before creating', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.create(user, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.labOrder.create).not.toHaveBeenCalled();
  });
  it('routes deletion using author-scoped metadata, then proves Client ownership', async () => {
    await service.remove(user, 'order-a');
    expect(prisma.labOrder.findFirst).toHaveBeenCalledWith({
      where: { id: 'order-a', professionalId: user.sub },
      select: { clientId: true },
    });
    expect(prisma.labOrder.deleteMany).toHaveBeenCalledWith({
      where: { id: 'order-a', professionalId: user.sub, clientId: 'client-a' },
    });
    expect(prisma.client.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.labOrder.deleteMany.mock.invocationCallOrder[0],
    );
  });
  it('does not reveal or delete another author order', async () => {
    prisma.labOrder.findFirst.mockResolvedValue(null);
    await expect(service.remove(user, 'foreign-order')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
    expect(prisma.labOrder.deleteMany).not.toHaveBeenCalled();
  });
  it('refuses to delete a row whose Client is no longer owned', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.remove(user, 'order-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.labOrder.deleteMany).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'PATIENT', 'PERSONAL', 'PHYSIO'] as const)(
    'denies %s before database access',
    async (role) => {
      const other = { ...user, role };
      await expect(service.list(other)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.create(other, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.remove(other, 'order-a')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.client.findFirst).not.toHaveBeenCalled();
      for (const method of Object.values(prisma.labOrder))
        expect(method).not.toHaveBeenCalled();
    },
  );
});
