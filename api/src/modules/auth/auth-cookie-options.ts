import { CookieOptions } from 'express';

const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type AuthCookieEnvironment = {
  AUTH_COOKIE_DOMAIN?: string;
  AUTH_COOKIE_SAME_SITE?: string;
  AUTH_COOKIE_SECURE?: string;
};

export type AuthCookiePolicy = {
  set: CookieOptions;
  clear: CookieOptions;
};

function readSecureCookieSetting(value = 'false') {
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new Error('AUTH_COOKIE_SECURE deve ser true ou false.');
}

function readSameSiteSetting(value = 'lax') {
  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value;
  }

  throw new Error('AUTH_COOKIE_SAME_SITE deve ser lax, strict ou none.');
}

export function createAuthCookiePolicy(
  environment: AuthCookieEnvironment = process.env,
): AuthCookiePolicy {
  const secure = readSecureCookieSetting(environment.AUTH_COOKIE_SECURE);
  const sameSite = readSameSiteSetting(environment.AUTH_COOKIE_SAME_SITE);

  if (sameSite === 'none' && !secure) {
    throw new Error(
      'AUTH_COOKIE_SAME_SITE=none exige AUTH_COOKIE_SECURE=true.',
    );
  }

  const domain = environment.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  const boundaryOptions: CookieOptions = {
    httpOnly: true,
    path: '/',
    ...(domain ? { domain } : {}),
    sameSite,
    secure,
  };

  return {
    set: {
      ...boundaryOptions,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    },
    clear: boundaryOptions,
  };
}

export const AUTH_COOKIE_POLICY = createAuthCookiePolicy();
