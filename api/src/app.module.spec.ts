import { APP_GUARD } from '@nestjs/core';
import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
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
    expect(providers).toContainEqual({
      provide: GLOBAL_JWT_AUTH_GUARD,
      useClass: JwtAuthGuard,
    });
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

function runtimeSurface(root: object) {
  const visited = new Set<object>();
  const modules: string[] = [];
  const routes: string[] = [];
  function visit(target: object) {
    if (visited.has(target)) return;
    visited.add(target);
    if (typeof target === 'function') modules.push(target.name);
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      target,
    ) as object[] | undefined;
    for (const controller of controllers ?? []) {
      const path = Reflect.getMetadata(PATH_METADATA, controller) as
        | string
        | string[]
        | undefined;
      if (path) routes.push(...(Array.isArray(path) ? path : [path]));
    }
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, target) as
      | unknown[]
      | undefined;
    for (const imported of imports ?? []) {
      if (typeof imported === 'function') visit(imported);
      else if (
        imported &&
        typeof imported === 'object' &&
        'module' in imported &&
        typeof imported.module === 'function'
      )
        visit(imported.module);
    }
  }
  visit(root);
  return { modules, routes };
}

describe('Professional-only application runtime', () => {
  it('does not mount retired patient modules or their controllers', () => {
    const surface = runtimeSurface(AppModule);
    for (const name of [
      'ConsentsModule',
      'HealthCheckInsModule',
      'MealLogsModule',
      'WorkoutLogsModule',
      'AgendaModule',
      'MetricsModule',
      'PatientAccessModule',
    ]) {
      expect(surface.modules).not.toContain(name);
    }
    for (const route of [
      'consents',
      'health-check-ins',
      'meal-logs',
      'workout-logs',
      'agenda',
      'metrics',
    ]) {
      expect(surface.routes).not.toContain(route);
    }
  });

  it('preserves the Client-based clinical modules and professional appointments', () => {
    const surface = runtimeSurface(AppModule);
    for (const name of [
      'ClientsModule',
      'AppointmentsModule',
      'WorkoutsModule',
      'RehabPlansModule',
      'PhysioAssessmentsModule',
      'AnamnesesModule',
      'ConsultationNotesModule',
      'SupplementsModule',
      'LabExamsModule',
    ]) {
      expect(surface.modules).toContain(name);
    }
    expect(surface.routes).toContain('appointments');
  });
});
