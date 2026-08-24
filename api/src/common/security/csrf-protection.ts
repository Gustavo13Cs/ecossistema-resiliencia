import { ForbiddenException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const PUBLIC_AUTH_MUTATIONS = new Set(['/auth/login', '/auth/register']);

export function generateCsrfToken() {
  return randomBytes(32).toString('base64url');
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
    if (!request.cookies?.access_token) return next();

    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origem obrigatória.');
    }

    assertCsrfPair(request.cookies.csrf_token, request.header('x-csrf-token'));
    return next();
  };
}
