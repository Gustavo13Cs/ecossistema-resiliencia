import { DOMAIN_ROLES } from './professional-domain-roles';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { FoodsController } from '../../modules/foods/foods.controller';
import { AssessmentsController } from '../../modules/assessments/assessments.controller';
import { AnamnesesController } from '../../modules/anamneses/anamneses.controller';
import { LabExamsController } from '../../modules/lab-exams/lab-exams.controller';
import { PhysioAssessmentsController } from '../../modules/physio-assessments/physio-assessments.controller';
import { SupplementsController } from '../../modules/supplements/supplements.controller';
import { DietPlansController } from '../../modules/diet-plans/diet-plans.controller';
import { WorkoutsController } from '../../modules/workouts/workouts.controller';
import { RehabPlansController } from '../../modules/rehab-plans/rehab-plans.controller';
import { ConsultationNotesController } from '../../modules/consultation-notes/consultation-notes.controller';
import { MetricsController } from '../../modules/metrics/metrics.controller';

describe('DOMAIN_ROLES', () => {
  it('exposes the exact professional-only role boundary for every clinical domain', () => {
    expect(DOMAIN_ROLES).toEqual({
      nutrition: ['NUTRITIONIST'],
      training: ['PERSONAL'],
      rehabilitation: ['PHYSIO'],
      sharedAssessment: ['NUTRITIONIST', 'PERSONAL', 'PHYSIO'],
    });

    const allRoles = Object.values(DOMAIN_ROLES).flat();
    expect(allRoles).not.toContain('ADMIN');
    expect(allRoles).not.toContain('PATIENT');
  });

  it('cannot be mutated at runtime', () => {
    expect(Object.isFrozen(DOMAIN_ROLES)).toBe(true);
    Object.values(DOMAIN_ROLES).forEach((roles) => {
      expect(Object.isFrozen(roles)).toBe(true);
    });

    expect(() => {
      (DOMAIN_ROLES.nutrition as unknown as string[]).push('ADMIN');
    }).toThrow();
  });

  it.each([
    [FoodsController, ['NUTRITIONIST']],
    [AnamnesesController, ['NUTRITIONIST']],
    [LabExamsController, ['NUTRITIONIST']],
    [SupplementsController, ['NUTRITIONIST']],
    [DietPlansController, ['NUTRITIONIST']],
    [ConsultationNotesController, ['NUTRITIONIST']],
    [WorkoutsController, ['PERSONAL']],
    [RehabPlansController, ['PHYSIO']],
    [PhysioAssessmentsController, ['PHYSIO']],
    [AssessmentsController, ['NUTRITIONIST', 'PERSONAL', 'PHYSIO']],
    [MetricsController, ['NUTRITIONIST', 'PERSONAL', 'PHYSIO']],
  ] as const)(
    '%s applies its exact domain role policy without endpoint overrides',
    (controller, expectedRoles) => {
      expect(Reflect.getMetadata(ROLES_KEY, controller)).toEqual(expectedRoles);

      for (const methodName of Object.getOwnPropertyNames(
        controller.prototype,
      )) {
        if (methodName === 'constructor') continue;
        const handler = (
          controller.prototype as unknown as Record<string, unknown>
        )[methodName];
        if (typeof handler !== 'function') continue;
        expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
      }
    },
  );
});
