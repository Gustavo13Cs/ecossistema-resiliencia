import {
  IsInt,
  IsOptional,
  Min,
  Max,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import type { Periodization, SecondaryMuscle } from '../workout-p3.types';
import { VOLUME_MUSCLES } from '../workout-p3.types';
import { validatePeriodization } from '../workout-periodization';

@ValidatorConstraint({ name: 'secondaryMuscles', async: false })
class SecondaryMusclesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (!Array.isArray(value) || value.length > 11) return false;
    const seen = new Set([
      (args.object as { muscleGroup?: string }).muscleGroup,
    ]);
    return value.every((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry))
        return false;
      const item = entry as SecondaryMuscle;
      if (
        Object.keys(item).some(
          (key) => !['muscleGroup', 'weight'].includes(key),
        ) ||
        !VOLUME_MUSCLES.some((group) => group === item.muscleGroup) ||
        ![0, 0.5, 1].includes(item.weight) ||
        seen.has(item.muscleGroup)
      )
        return false;
      seen.add(item.muscleGroup);
      return true;
    });
  }
  defaultMessage() {
    return 'Músculos secundários devem ser únicos, diferentes do principal e ter peso 0, 0.5 ou 1.';
  }
}
@ValidatorConstraint({ name: 'periodization', async: false })
export class PeriodizationConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    return (
      validatePeriodization(
        value,
        (args.object as { durationWeeks?: number }).durationWeeks,
        args.constraints[0] !== false,
      ).length === 0
    );
  }
  defaultMessage() {
    return 'Periodização inválida: verifique duração, data, fuso, fases e progressão.';
  }
}
export class P3ExerciseDto {
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @Validate(SecondaryMusclesConstraint)
  secondaryMuscles?: SecondaryMuscle[] | null;
}
export class P3SplitDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weeklyFrequency?: number | null;
}
export type { Periodization };
