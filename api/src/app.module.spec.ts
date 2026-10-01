import { APP_GUARD } from '@nestjs/core';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule, GLOBAL_JWT_AUTH_GUARD } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from './common/decorators/public.decorator';
import { AppController } from '../app.controller';
import { AuthController } from './modules/auth/auth.controller';

describe('Application authentication defaults', () => {
  it('registers JWT and throttling as independent global guards', () => {
    const providers: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    );
    expect(providers).toContainEqual({
      provide: APP_GUARD,
      useExisting: GLOBAL_JWT_AUTH_GUARD,
    });
    expect(providers).toContainEqual({ provide: GLOBAL_JWT_AUTH_GUARD, useClass: JwtAuthGuard });
    expect(providers).toContainEqual({
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    });
  });

  it('marks exactly the deliberate health/auth handlers public', () => {
    const handlers = [AppController, AuthController].flatMap((controller) =>
      Object.getOwnPropertyNames(controller.prototype)
        .filter(
          (name) =>
            name !== 'constructor' &&
            Reflect.getMetadata('path', controller.prototype[name]) !==
              undefined,
        )
        .map((name) => ({
          name,
          public:
            Reflect.getMetadata(IS_PUBLIC_KEY, controller.prototype[name]) ===
            true,
        })),
    );
    expect(
      handlers
        .filter((handler) => handler.public)
        .map((handler) => handler.name)
        .sort(),
    ).toEqual([
      'csrf',
      'getHello',
      'getPing',
      'login',
      'logout',
      'refresh',
      'register',
    ]);
    expect(handlers.find((handler) => handler.name === 'me')?.public).toBe(
      false,
    );
  });
});
