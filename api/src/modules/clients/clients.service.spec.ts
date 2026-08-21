import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientAccessService } from '../../common/client-access/client-access.service';
import { PrismaService } from '../../infra/database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  const tx = {
    client: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    clientAuditEvent: { create: jest.fn() },
  };
  const prisma = {
    client: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const access = { getOwnedClient: jest.fn() };
  let service: ClientsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
    service = new ClientsService(
      prisma as never,
      access as unknown as ClientAccessService,
    );
  });

  it('derives ownership and writes CREATED audit event', async () => {
    tx.client.create.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });

    await service.create(
      { sub: 'pro-1', role: 'NUTRITIONIST' },
      { name: 'Ana', email: ' ANA@EXAMPLE.COM ' } as CreateClientDto,
    );

    expect(tx.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        professionalId: 'pro-1',
        name: 'Ana',
        email: 'ana@example.com',
      }),
    });
    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'CREATED' },
    });
  });

  it('lists only the authenticated professional active clients', async () => {
    prisma.client.findMany.mockResolvedValue([]);

    await service.findAll({ sub: 'pro-2', role: 'PERSONAL' }, 'ACTIVE');

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { professionalId: 'pro-2', status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
  });

  it('archives an owned client and writes ARCHIVED audit event', async () => {
    access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
    tx.client.update.mockResolvedValue({ id: 'client-1', status: 'ARCHIVED' });

    await service.setStatus(
      { sub: 'pro-1', role: 'PHYSIO' },
      'client-1',
      'ARCHIVED',
    );

    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'ARCHIVED' },
    });
  });

  it('returns 409 for a duplicate email inside the same professional account', async () => {
    tx.client.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate client email', {
        code: 'P2002',
        clientVersion: '7.5.0',
        meta: { target: ['professionalId', 'email'] },
      }),
    );

    await expect(
      service.create(
        { sub: 'pro-1', role: 'NUTRITIONIST' },
        { name: 'Ana', email: 'ana@example.test' } as CreateClientDto,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks ownership before updating a client', async () => {
    const user = { sub: 'pro-1', role: 'NUTRITIONIST' } as const;
    access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
    tx.client.update.mockResolvedValue({ id: 'client-1', name: 'Ana Maria' });

    await service.update(user, 'client-1', { name: 'Ana Maria' } as UpdateClientDto);

    expect(access.getOwnedClient).toHaveBeenCalledWith(user, 'client-1');
    expect(tx.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: expect.objectContaining({ name: 'Ana Maria' }),
    });
    expect(access.getOwnedClient.mock.invocationCallOrder[0]).toBeLessThan(
      tx.client.update.mock.invocationCallOrder[0],
    );
  });

  it('writes UPDATED audit event while preserving omitted fields', async () => {
    access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
    tx.client.update.mockResolvedValue({ id: 'client-1', name: 'Ana' });

    await service.update(
      { sub: 'pro-1', role: 'NUTRITIONIST' },
      'client-1',
      { professionalNotes: null } as UpdateClientDto,
    );

    expect(tx.client.update).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: expect.objectContaining({
        professionalNotes: null,
        name: undefined,
        email: undefined,
      }),
    });
    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'UPDATED' },
    });
  });

  it('restores an owned client and writes RESTORED audit event', async () => {
    access.getOwnedClient.mockResolvedValue({ id: 'client-1', professionalId: 'pro-1' });
    tx.client.update.mockResolvedValue({ id: 'client-1', status: 'ACTIVE' });

    await service.setStatus(
      { sub: 'pro-1', role: 'PHYSIO' },
      'client-1',
      'ACTIVE',
    );

    expect(tx.clientAuditEvent.create).toHaveBeenCalledWith({
      data: { clientId: 'client-1', professionalId: 'pro-1', action: 'RESTORED' },
    });
  });
});
