import { BadRequestException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { validateAssessmentMeasurements } from './assessment-input';

const positiveMeasurements = [
  'weight',
  'muscleMass',
  'waist',
  'abdomen',
  'hips',
  'thorax',
  'armLeft',
  'armRight',
  'thighLeft',
  'thighRight',
  'calfLeft',
  'calfRight',
  'skinfoldTriceps',
  'skinfoldSubscapular',
  'skinfoldChest',
  'skinfoldAxillary',
  'skinfoldSuprailiac',
  'skinfoldAbdominal',
  'skinfoldThigh',
  'benchPress1RM',
  'squat1RM',
  'deadlift1RM',
  'vo2Max',
] as const;
const dtoWith = (values: object) =>
  Object.assign(new CreateAssessmentDto(), { clientId: 'client-1', ...values });

describe('validateAssessmentMeasurements', () => {
  it('force_only_assessment_is_valid', () => {
    expect(() =>
      validateAssessmentMeasurements({ clientId: 'client-1', squat1RM: 80 }),
    ).not.toThrow();
  });
  it.each([
    {},
    { clientId: 'client-1' },
    { userId: 'legacy' },
    { notes: 'Nota' },
    { date: '2026-10-14' },
  ])('empty_or_invalid_assessment_is_rejected: %j', (values) => {
    expect(() => validateAssessmentMeasurements(values)).toThrow(
      BadRequestException,
    );
  });
  it.each(positiveMeasurements)(
    'validates positive finite %s in both DTO and service',
    (field) => {
      for (const value of [0, -1, NaN, Infinity, -Infinity, null, '80']) {
        const dto = dtoWith({ squat1RM: 80, [field]: value });
        expect(() => validateAssessmentMeasurements(dto)).toThrow(
          BadRequestException,
        );
        expect(
          validateSync(dto).some((error) => error.property === field),
        ).toBe(true);
      }
      const dto = dtoWith({ [field]: 0.1 });
      expect(() => validateAssessmentMeasurements(dto)).not.toThrow();
      expect(validateSync(dto)).toEqual([]);
    },
  );
  it.each([-1, 100.01, NaN, Infinity, -Infinity, null, '10'])(
    'rejects invalid bodyFat %s',
    (bodyFat) => {
      const dto = dtoWith({ weight: 70, bodyFat });
      expect(() => validateAssessmentMeasurements(dto)).toThrow(
        BadRequestException,
      );
      expect(
        validateSync(dto).some((error) => error.property === 'bodyFat'),
      ).toBe(true);
    },
  );
  it.each([0, 10, 100])(
    'accepts bodyFat %s as the only measurement',
    (bodyFat) => {
      const dto = dtoWith({ bodyFat });
      expect(() => validateAssessmentMeasurements(dto)).not.toThrow();
      expect(validateSync(dto)).toEqual([]);
    },
  );
});
