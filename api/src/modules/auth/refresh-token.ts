import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

const SESSION_ID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SECRET = /^[A-Za-z0-9_-]{43}$/;
const hashToken = (raw: string) =>
  createHash('sha256').update(raw).digest('hex');

export function createRefreshToken(sessionId: string) {
  const rawToken = `${sessionId}.${randomBytes(32).toString('base64url')}`;
  return { rawToken, hash: hashToken(rawToken) };
}

export function parseRefreshToken(raw: string) {
  const parts = typeof raw === 'string' ? raw.split('.') : [];
  const [sessionId, secret] = parts;
  if (
    parts.length !== 2 ||
    !SESSION_ID.test(sessionId) ||
    !SECRET.test(secret) ||
    Buffer.from(secret, 'base64url').toString('base64url') !== secret
  ) {
    throw new UnauthorizedException('Sessão inválida');
  }
  return { sessionId, secret };
}

export function matchesRefreshToken(expectedHash: string, raw: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  return timingSafeEqual(
    Buffer.from(expectedHash, 'hex'),
    Buffer.from(hashToken(raw), 'hex'),
  );
}
