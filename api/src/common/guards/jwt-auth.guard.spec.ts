import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);
  const context = new ExecutionContextHost(
    [],
    class Controller {},
    function handler() {},
  );
  afterEach(() => jest.restoreAllMocks());

  it('delegates default routes to Passport authentication', async () => {
    const passport = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (context: ExecutionContext) => Promise<boolean>;
    };
    const activate = jest
      .spyOn(passport, 'canActivate')
      .mockResolvedValue(false);
    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(activate).toHaveBeenCalledWith(context);
  });

  it('bypasses only Passport when explicitly public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(context)).toBe(true);
  });
});
