import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infra/database/prisma.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { UsersService } from './users.service';

describe('User authentication invalidation', () => {
  const tx = { $queryRaw: jest.fn(), user: { update: jest.fn() } };
  const prisma = { $transaction: jest.fn(), user: { update: jest.fn() } };
  const sessions = { revokeAll: jest.fn() };
  let service: UsersService;
  beforeEach(() => {
    jest.clearAllMocks();
    tx.user.update.mockResolvedValue({ id: 'one', authVersion: 4 });
    sessions.revokeAll.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      (run: (client: typeof tx) => Promise<unknown>) => run(tx),
    );
    service = new UsersService(
      prisma as unknown as PrismaService,
      sessions as unknown as AuthSessionService,
    );
  });

  it('changes role, increments authVersion and revokes sessions in the same transaction', async () => {
    await service.changeRole('one', 'PERSONAL');
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'one' },
        data: { role: 'PERSONAL', authVersion: { increment: 1 } },
      }),
    );
    expect(sessions.revokeAll).toHaveBeenCalledWith('one', tx);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.update.mock.invocationCallOrder[0],
    );
  });

  it('hashes new credentials and invalidates existing sessions atomically', async () => {
    await service.resetCredentials('one', 'NewCredential-2026!');
    const [args] = tx.user.update.mock.calls[0] as [
      {
        data: { password: string; authVersion: { increment: number } };
        select: object;
      },
    ];
    expect(args.data.password).not.toBe('NewCredential-2026!');
    expect(
      await bcrypt.compare('NewCredential-2026!', args.data.password),
    ).toBe(true);
    expect(args.data.authVersion).toEqual({ increment: 1 });
    expect(args.select).not.toHaveProperty('password');
    expect(sessions.revokeAll).toHaveBeenCalledWith('one', tx);
  });

  it('propagates invalidation failure rather than committing only the credential change', async () => {
    sessions.revokeAll.mockRejectedValue(new Error('database unavailable'));
    await expect(service.changeRole('one', 'PHYSIO')).rejects.toThrow(
      'database unavailable',
    );
  });

  it('can invalidate all sessions without changing identity fields', async () => {
    await service.invalidateAuthentication('one');
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { authVersion: { increment: 1 } } }),
    );
    expect(sessions.revokeAll).toHaveBeenCalledWith('one', tx);
  });

  it('keeps ordinary profile edits independent of authentication invalidation', async () => {
    await service.update('one', { name: 'New name' }, false);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(sessions.revokeAll).not.toHaveBeenCalled();
  });
});
