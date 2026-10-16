import { Prisma } from '@prisma/client';
import { lockActiveOwnedClient } from './lock-active-owned-client';

describe('lockActiveOwnedClient', () => {
  const tx = {
    $queryRaw: jest.fn<
      Promise<Array<{ id: string }>>,
      [TemplateStringsArray, ...unknown[]]
    >(),
    client: { findFirst: jest.fn() },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ id: 'client-1' }]);
    tx.client.findFirst.mockResolvedValue({ id: 'client-1', status: 'ACTIVE' });
  });
  const lock = () =>
    lockActiveOwnedClient(
      tx as unknown as Prisma.TransactionClient,
      'client-1',
      'professional-1',
    );
  it('rejects ARCHIVED after acquiring the owned row lock', async () => {
    tx.client.findFirst.mockResolvedValue({ status: 'ARCHIVED' });
    await expect(lock()).rejects.toMatchObject({ status: 409 });
  });
  it('does not reveal a foreign or absent Client', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(lock()).rejects.toMatchObject({ status: 404 });
    expect(tx.client.findFirst).not.toHaveBeenCalled();
  });
  it('checks current ownership and status on the same transaction after lock', async () => {
    await expect(lock()).resolves.toBeUndefined();
    expect(tx.client.findFirst).toHaveBeenCalledWith({
      where: { id: 'client-1', professionalId: 'professional-1' },
      select: { status: true },
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.client.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.$queryRaw.mock.calls[0].slice(1)).toEqual([
      'client-1',
      'professional-1',
    ]);
  });
  it('rejects if the locked Client no longer resolves', async () => {
    tx.client.findFirst.mockResolvedValue(null);
    await expect(lock()).rejects.toMatchObject({ status: 404 });
  });
});
