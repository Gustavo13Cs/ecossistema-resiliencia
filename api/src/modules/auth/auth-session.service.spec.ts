import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { AuthSession } from '@prisma/client';
import { AuthPrismaService as PrismaService } from '../../infra/database/database-clients';
import { AuthSessionService } from './auth-session.service';
import { createRefreshToken } from './refresh-token';

describe('Revocable sessions', () => {
  const user = {
    id: 'user-one',
    name: 'Professional',
    email: 'one@auth.test',
    role: 'NUTRITIONIST' as const,
    authVersion: 3,
  };
  const sessionId = randomUUID();
  let row: AuthSession & { user: typeof user };
  let token: ReturnType<typeof createRefreshToken>;
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: { findUnique: jest.fn() },
    authSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = { ...tx, $transaction: jest.fn() };
  const jwt = { signAsync: jest.fn() };
  let service: AuthSessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    token = createRefreshToken(sessionId);
    row = {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: token.hash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { ...user },
    };
    tx.user.findUnique.mockResolvedValue({ ...user });
    tx.authSession.findUnique.mockImplementation(() => Promise.resolve(row));
    tx.authSession.update.mockImplementation(
      ({ data }: { data: Partial<AuthSession> }) => {
        row = { ...row, ...data };
        return Promise.resolve(row);
      },
    );
    tx.authSession.create.mockImplementation(
      ({ data }: { data: AuthSession }) => Promise.resolve(data),
    );
    tx.authSession.updateMany.mockResolvedValue({ count: 1 });
    let previous = Promise.resolve();
    prisma.$transaction.mockImplementation(
      (run: (client: typeof tx) => Promise<unknown>) => {
        const current = previous.then(() => run(tx));
        previous = current.then(
          () => undefined,
          () => undefined,
        );
        return current;
      },
    );
    jwt.signAsync.mockResolvedValue('access-token');
    service = new AuthSessionService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  it('creates a fixed 30-day session with no raw token persisted and a minimal JWT', async () => {
    const now = Date.now();
    const result = await service.create(user);
    const [args] = tx.authSession.create.mock.calls[0] as [
      {
        data: AuthSession;
      },
    ];
    expect(args.data.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(args)).not.toContain(result.refresh_token);
    expect(args.data.expiresAt.getTime() - now).toBeGreaterThanOrEqual(
      30 * 86_400_000,
    );
    expect(args.data.expiresAt.getTime() - now).toBeLessThan(
      30 * 86_400_000 + 1000,
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      jti: args.data.id,
      authVersion: 3,
    });
    expect(result.user).toEqual({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });

  it('rejects a login snapshot invalidated during password verification', async () => {
    tx.user.findUnique.mockResolvedValue({ ...user, authVersion: 4 });
    await expect(service.create(user)).rejects.toMatchObject({ status: 401 });
    expect(tx.authSession.create).not.toHaveBeenCalled();
  });

  it('locks before rotation, replaces the hash and records use without extending expiry', async () => {
    const expiresAt = row.expiresAt;
    const result = await service.rotate(token.rawToken);
    expect(result.refresh_token).not.toBe(token.rawToken);
    expect(row.refreshTokenHash).not.toBe(token.hash);
    expect(row.lastUsedAt).toBeInstanceOf(Date);
    expect(row.expiresAt).toEqual(expiresAt);
    expect(result.refresh_expires_at).toEqual(expiresAt);
    expect(
      tx.$queryRaw.mock.calls.some(([strings]) =>
        String(strings).includes('FOR UPDATE'),
      ),
    ).toBe(true);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.authSession.update.mock.invocationCallOrder[0],
    );
  });

  it('commits revocation before rejecting replay of an old token', async () => {
    await service.rotate(token.rawToken);
    await expect(service.rotate(token.rawToken)).rejects.toMatchObject({
      status: 401,
    });
    expect(row.revokedAt).toBeInstanceOf(Date);
    // The callback must resolve after revocation; throwing inside it would roll back SQL.
    expect(
      await (prisma.$transaction.mock.results[1].value as Promise<unknown>),
    ).toBeNull();
  });

  it('allows at most one success when a refresh token is used concurrently', async () => {
    const results = await Promise.allSettled([
      service.rotate(token.rawToken),
      service.rotate(token.rawToken),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(row.revokedAt).toBeInstanceOf(Date);
  });

  it.each(['expired', 'revoked', 'missing'] as const)(
    'denies %s refresh sessions',
    async (state) => {
      if (state === 'expired') row.expiresAt = new Date(0);
      if (state === 'revoked') row.revokedAt = new Date();
      if (state === 'missing')
        tx.authSession.findUnique.mockResolvedValue(null);
      await expect(service.rotate(token.rawToken)).rejects.toMatchObject({
        status: 401,
      });
      expect(jwt.signAsync).not.toHaveBeenCalled();
    },
  );

  it('validates access using the current database identity, ignoring stale role claims', async () => {
    row.user.role = 'PERSONAL' as typeof user.role;
    const result = await service.validateAccess({
      sub: user.id,
      jti: sessionId,
      authVersion: 3,
      role: 'ADMIN',
    });
    expect(result.role).toBe('PERSONAL');
    expect(result.name).toBe(user.name);
    expect(result).toHaveProperty('sessionId', sessionId);
  });

  it.each([
    { sub: user.id },
    { sub: 'other', jti: sessionId, authVersion: 3 },
    { sub: user.id, jti: sessionId, authVersion: 2 },
    { sub: user.id, jti: sessionId, authVersion: -1 },
  ])(
    'denies missing session identity or a mismatched subject/version',
    async (payload) => {
      await expect(service.validateAccess(payload)).rejects.toMatchObject({
        status: 401,
      });
    },
  );

  it.each(['expired', 'revoked', 'missing'] as const)(
    'denies %s access sessions',
    async (state) => {
      if (state === 'expired') row.expiresAt = new Date(0);
      if (state === 'revoked') row.revokedAt = new Date();
      if (state === 'missing')
        tx.authSession.findUnique.mockResolvedValue(null);
      await expect(
        service.validateAccess({
          sub: user.id,
          jti: sessionId,
          authVersion: 3,
        }),
      ).rejects.toMatchObject({ status: 401 });
    },
  );

  it('revokes a matching token and denies it thereafter', async () => {
    await service.revoke(token.rawToken);
    expect(row.revokedAt).toBeInstanceOf(Date);
    await expect(service.rotate(token.rawToken)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('revokes all active sessions belonging to only the given user', async () => {
    await service.revokeAll(user.id);
    expect(tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
  });
});
