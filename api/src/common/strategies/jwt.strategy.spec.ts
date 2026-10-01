import { UnauthorizedException } from '@nestjs/common';
import { AuthSessionService } from '../../modules/auth/auth-session.service';
import { JwtStrategy } from './jwt.strategy';

describe('JWT current-state validation', () => {
  const sessions = { validateAccess: jest.fn() };
  let strategy: JwtStrategy;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-only-jwt-strategy';
    strategy = new JwtStrategy(sessions as unknown as AuthSessionService);
  });

  it('returns current identity rather than trusting role/name from JWT claims', async () => {
    const payload = {
      sub: 'one',
      jti: 'session',
      authVersion: 0,
      role: 'ADMIN',
      name: 'old',
    };
    const current = {
      sub: 'one',
      role: 'PHYSIO',
      name: 'current',
      email: 'current@auth.test',
    };
    sessions.validateAccess.mockResolvedValue(current);
    expect(await strategy.validate(payload)).toEqual(current);
    expect(sessions.validateAccess).toHaveBeenCalledWith(payload);
  });

  it.each([
    'missing jti',
    'revoked',
    'expired',
    'wrong subject',
    'changed authVersion',
    'deleted user',
  ])('propagates 401 for %s', async () => {
    sessions.validateAccess.mockRejectedValue(
      new UnauthorizedException('Sessão inválida'),
    );
    await expect(strategy.validate({ sub: 'one' })).rejects.toMatchObject({
      status: 401,
    });
  });
});
