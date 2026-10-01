import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';

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
