import { randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import {
  createRefreshToken,
  parseRefreshToken,
  matchesRefreshToken,
} from './refresh-token';

describe('Opaque refresh tokens', () => {
  it('uses an independent 32-byte random secret and stores only its hash', () => {
    const sessionId = randomUUID();
    const first = createRefreshToken(sessionId);
    const second = createRefreshToken(sessionId);
    const parsed = parseRefreshToken(first.rawToken);
    expect(parsed.sessionId).toBe(sessionId);
    expect(Buffer.from(parsed.secret, 'base64url')).toHaveLength(32);
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.hash).not.toContain(parsed.secret);
    expect(matchesRefreshToken(first.hash, first.rawToken)).toBe(true);
    expect(matchesRefreshToken(first.hash, second.rawToken)).toBe(false);
    expect(matchesRefreshToken('corrupt-hash', first.rawToken)).toBe(false);
  });

  it.each([
    '',
    'one',
    'one.two.three',
    `${randomUUID()}.short`,
    `${randomUUID()}.${'!'.repeat(43)}`,
    `${randomUUID()}.${'A'.repeat(42)}B`,
    `${randomUUID()}.${'a'.repeat(2000)}`,
  ])('rejects malformed tokens uniformly: %s', (raw) => {
    expect(() => parseRefreshToken(raw)).toThrow(UnauthorizedException);
    expect(() => parseRefreshToken(raw)).toThrow('Sessão inválida');
  });
});
