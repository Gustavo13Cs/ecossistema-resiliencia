import { ForbiddenException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_AUTH_MUTATIONS = new Set(['/auth/login', '/auth/register']);
const REFRESH_AUTH_MUTATIONS = new Set(['/auth/refresh', '/auth/logout']);
const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateCsrfToken() {
  return randomBytes(32).toString('base64url');
}

export function isValidCsrfToken(token: unknown): token is string {
  return typeof token === 'string' && CSRF_TOKEN_PATTERN.test(token);
}

export function assertCsrfPair(cookieToken: unknown, headerToken: unknown) {
  if (!isValidCsrfToken(cookieToken) || !isValidCsrfToken(headerToken)) {
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

    const path = request.path.replace(/\/+$/, '') || '/';
    if (PUBLIC_AUTH_MUTATIONS.has(path)) {
      if (!origin || !allowedOrigins.includes(origin))
        throw new ForbiddenException('Origem obrigatória.');
      return next();
    }
    const cookies = request.cookies as Record<string, unknown> | undefined;
    if (
      !REFRESH_AUTH_MUTATIONS.has(path) &&
      !cookies?.access_token &&
      !cookies?.refresh_token
    )
      return next();

    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origem obrigatória.');
    }

    assertCsrfPair(cookies?.csrf_token, request.header('x-csrf-token'));
    return next();
  };
}
