import { createAuthCookiePolicies } from './auth-cookie-options';

describe('Session cookie boundaries', () => {
  it.each([undefined, 'false'])(
    'refuses production with AUTH_COOKIE_SECURE=%s',
    (value) => {
      expect(() =>
        createAuthCookiePolicies({
          NODE_ENV: 'production',
          AUTH_COOKIE_SECURE: value,
        }),
      ).toThrow('AUTH_COOKIE_SECURE=true');
    },
  );

  it('uses separate lifetimes and matching set/clear paths, flags and domain', () => {
    const policies = createAuthCookiePolicies({
      NODE_ENV: 'production',
      AUTH_COOKIE_SECURE: 'true',
      AUTH_COOKIE_DOMAIN: 'app.example.test',
    });
    expect(policies.access.set.maxAge).toBe(15 * 60 * 1000);
    expect(policies.refresh.set.maxAge).toBe(30 * 86_400_000);
    expect(policies.refresh.set.path).toBe('/api/auth');
    for (const policy of Object.values(policies)) {
      const { maxAge, ...boundary } = policy.set;
      expect(maxAge).toBeGreaterThan(0);
      expect(policy.clear).toEqual(boundary);
      expect(boundary).toMatchObject({
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        domain: 'app.example.test',
      });
    }
  });

  it('supports an explicit absolute refresh route for direct API deployments', () => {
    expect(
      createAuthCookiePolicies({ AUTH_REFRESH_COOKIE_PATH: '/auth' }).refresh
        .set.path,
    ).toBe('/auth');
  });

  it.each([
    'auth',
    '//host/auth',
    '/auth?query=1',
    '/auth#fragment',
    '/auth;bad',
    '/auth\\evil',
  ])('rejects an invalid refresh cookie path %s', (path) => {
    expect(() =>
      createAuthCookiePolicies({ AUTH_REFRESH_COOKIE_PATH: path }),
    ).toThrow('AUTH_REFRESH_COOKIE_PATH');
  });
});
