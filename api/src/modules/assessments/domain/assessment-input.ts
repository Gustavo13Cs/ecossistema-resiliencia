import { BadRequestException } from '@nestjs/common';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';

const measurementFields = [
  'weight',
  'bodyFat',
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
] as const satisfies ReadonlyArray<keyof CreateAssessmentDto>;

export function validateAssessmentMeasurements(dto: CreateAssessmentDto): void {
  let hasMeasurement = false;
  for (const field of measurementFields) {
    const value = dto[field];
    if (value === undefined) continue;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (field === 'bodyFat' ? value < 0 || value > 100 : value <= 0)
    ) {
      throw new BadRequestException('Informe medidas numéricas válidas');
    }
    hasMeasurement = true;
  }
  if (!hasMeasurement) {
    throw new BadRequestException('Informe ao menos uma medida válida');
  }
}
