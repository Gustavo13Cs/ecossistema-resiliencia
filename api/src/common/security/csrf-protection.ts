import { ForbiddenException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_AUTH_MUTATIONS = new Set(['/auth/login', '/auth/register']);
const TRUSTED_SESSION_TEARDOWNS = new Set(['/auth/logout']);
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateCsrfToken() {
  return randomBytes(32).toString('base64url');
}

export function isValidCsrfToken(token: unknown): token is string {
  return typeof token === 'string' && CSRF_TOKEN_PATTERN.test(token);
}

export function assertCsrfPair(cookieToken: unknown, headerToken: unknown) {
  if (
    typeof cookieToken !== 'string' ||
    typeof headerToken !== 'string' ||
    cookieToken.length === 0 ||
    headerToken.length === 0
  ) {
    throw new ForbiddenException('Token CSRF inválido.');
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    throw new ForbiddenException('Token CSRF inválido.');
  }
}

export function createCsrfProtection(
  allowedOrigins: readonly string[],
): RequestHandler {
  return (request, _response, next) => {
    if (SAFE_METHODS.has(request.method)) return next();

    const origin = request.header('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origem não autorizada.');
    }

    if (PUBLIC_AUTH_MUTATIONS.has(request.path) && origin) return next();
    if (
      TRUSTED_SESSION_TEARDOWNS.has(request.path) &&
      origin &&
      allowedOrigins.includes(origin)
    ) {
      return next();
    }
    const cookies = request.cookies as Record<string, unknown> | undefined;
    if (!cookies?.access_token) return next();

    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origem obrigatória.');
    }

    assertCsrfPair(cookies.csrf_token, request.header('x-csrf-token'));
    return next();
  };
}
