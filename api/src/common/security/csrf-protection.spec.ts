import { ForbiddenException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  assertCsrfPair,
  createCsrfProtection,
  generateCsrfToken,
} from './csrf-protection';

const ALLOWED_ORIGIN = 'http://localhost:3001';

function requestFor({
  method = 'POST',
  path = '/clients',
  origin,
  accessToken,
  cookieToken,
  headerToken,
}: {
  method?: string;
  path?: string;
  origin?: string;
  accessToken?: string;
  cookieToken?: string;
  headerToken?: string;
} = {}) {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (headerToken) headers['x-csrf-token'] = headerToken;

  return {
    method,
    path,
    cookies: {
      ...(accessToken ? { access_token: accessToken } : {}),
      ...(cookieToken ? { csrf_token: cookieToken } : {}),
    },
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

describe('CSRF protection', () => {
  const protection = createCsrfProtection([ALLOWED_ORIGIN]);
  const response = {} as Response;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    next = jest.fn();
  });

  it('generates an unpredictable 32-byte base64url token', () => {
    const tokens = new Set(Array.from({ length: 4 }, generateCsrfToken));

    expect(tokens.size).toBe(4);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('allows cookie authentication with an allowed origin and matching CSRF pair', () => {
    protection(
      requestFor({
        origin: ALLOWED_ORIGIN,
        accessToken: 'signed-token',
        cookieToken: 'known-token',
        headerToken: 'known-token',
      }),
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a hostile origin before considering authentication mode', () => {
    const invoke = () =>
      protection(
        requestFor({ origin: 'https://hostile.example' }),
        response,
        next,
      );

    expect(invoke).toThrow(new ForbiddenException('Origem não autorizada.'));
    expect(next).not.toHaveBeenCalled();
  });

  it('requires an origin for a cookie-authenticated mutation', () => {
    const invoke = () =>
      protection(
        requestFor({
          accessToken: 'signed-token',
          cookieToken: 'known-token',
          headerToken: 'known-token',
        }),
        response,
        next,
      );

    expect(invoke).toThrow(new ForbiddenException('Origem obrigatória.'));
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps Bearer-only API tooling possible without a cookie', () => {
    protection(requestFor(), response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    [undefined, 'known-token'],
    ['known-token', undefined],
    ['short', 'a-different-length'],
  ])(
    'rejects an absent or malformed CSRF pair without leaking comparison errors',
    (cookieToken, headerToken) => {
      const invoke = () => assertCsrfPair(cookieToken, headerToken);

      expect(invoke).toThrow(new ForbiddenException('Token CSRF inválido.'));
      expect(invoke).not.toThrow(RangeError);
    },
  );

  it('protects public login when an Origin header is hostile', () => {
    const invoke = () =>
      protection(
        requestFor({
          path: '/auth/login',
          origin: 'https://hostile.example',
        }),
        response,
        next,
      );

    expect(invoke).toThrow(new ForbiddenException('Origem não autorizada.'));
  });

  it('allows public registration from an allowed browser origin', () => {
    protection(
      requestFor({ path: '/auth/register', origin: ALLOWED_ORIGIN }),
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows a trusted browser origin to clear a stale authenticated session', () => {
    protection(
      requestFor({
        path: '/auth/logout',
        origin: ALLOWED_ORIGIN,
        accessToken: 'signed-token',
        cookieToken: 'stale-token',
        headerToken: 'different-token',
      }),
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
