import { CookieOptions } from 'express';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type AuthCookieEnvironment = {
  AUTH_COOKIE_DOMAIN?: string;
  AUTH_COOKIE_SAME_SITE?: string;
  AUTH_COOKIE_SECURE?: string;
  AUTH_REFRESH_COOKIE_PATH?: string;
  NODE_ENV?: string;
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
  if (
    environment.NODE_ENV === 'production' &&
    environment.AUTH_COOKIE_SECURE !== 'true'
  ) {
    throw new Error('Produção exige AUTH_COOKIE_SECURE=true.');
  }
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
      maxAge: ACCESS_MAX_AGE_MS,
    },
    clear: boundaryOptions,
  };
}

export function createAuthCookiePolicies(
  environment: AuthCookieEnvironment = process.env,
) {
  const access = createAuthCookiePolicy(environment);
  const path = environment.AUTH_REFRESH_COOKIE_PATH ?? '/api/auth';
  if (!/^\/(?!\/)[A-Za-z0-9/_-]*$/.test(path)) {
    throw new Error(
      'AUTH_REFRESH_COOKIE_PATH deve ser um path absoluto sem query, fragmento ou domínio.',
    );
  }
  const refreshBoundary = { ...access.clear, path };
  return {
    access,
    refresh: {
      set: { ...refreshBoundary, maxAge: REFRESH_MAX_AGE_MS },
      clear: refreshBoundary,
    },
    csrf: {
      set: { ...access.clear, maxAge: REFRESH_MAX_AGE_MS },
      clear: { ...access.clear },
    },
  };
}

export const AUTH_COOKIE_POLICIES = createAuthCookiePolicies();
export const AUTH_COOKIE_POLICY = AUTH_COOKIE_POLICIES.access;
