import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientAccessService } from './client-access.service';

describe('ClientAccessService', () => {
  const prisma = { client: { findFirst: jest.fn() } };
  let service: ClientAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientAccessService(prisma as never);
  });

  it('returns a client owned by the authenticated professional', async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: 'client-1',
      professionalId: 'pro-1',
    });

    await expect(
      service.getOwnedClient(
        { sub: 'pro-1', role: 'NUTRITIONIST' },
        'client-1',
      ),
    ).resolves.toMatchObject({ id: 'client-1' });

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', professionalId: 'pro-1' },
    });
  });

  it('returns 404 for another professional client', async () => {
    prisma.client.findFirst.mockResolvedValue(null);

    await expect(
      service.getOwnedClient({ sub: 'pro-2', role: 'PERSONAL' }, 'client-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects non-clinical roles before querying', async () => {
    await expect(
      service.getOwnedClient({ sub: 'admin-1', role: 'ADMIN' }, 'client-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.client.findFirst).not.toHaveBeenCalled();
  });
});
