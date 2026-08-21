import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessService', () => {
  const prisma = { client: { findFirst: jest.fn() } };
  let service: ClientAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientAccessService(prisma as never);
  });

  it.each(['NUTRITIONIST', 'PERSONAL', 'PHYSIO'] as const)(
    'returns a client owned by an authenticated %s',
    async (role) => {
      prisma.client.findFirst.mockResolvedValue({
        id: 'client-1',
        professionalId: 'pro-1',
      });

      await expect(
        service.getOwnedClient({ sub: 'pro-1', role }, 'client-1'),
      ).resolves.toMatchObject({ id: 'client-1' });

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-1', professionalId: 'pro-1' },
      });
    },
  );

  it('returns 404 for another professional client', async () => {
    prisma.client.findFirst.mockResolvedValue(null);

    await expect(
      service.getOwnedClient({ sub: 'pro-2', role: 'PERSONAL' }, 'client-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', professionalId: 'pro-2' },
    });
  });

  it.each(['ADMIN', 'PATIENT'] as const)(
    'rejects the non-clinical %s role before querying',
    async (role) => {
      await expect(
        service.getOwnedClient({ sub: 'user-1', role }, 'client-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.client.findFirst).not.toHaveBeenCalled();
    },
  );
});
