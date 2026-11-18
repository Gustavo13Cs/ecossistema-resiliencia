import { ExerciseEquipment, TrainingEnvironment } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const TRAINING_EXPERIENCE_LEVELS = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
] as const;

export type TrainingExperienceLevel =
  (typeof TRAINING_EXPERIENCE_LEVELS)[number];

export class ParqAnswersDto {
  @IsBoolean()
  heartCondition!: boolean;

  @IsBoolean()
  chestPainActivity!: boolean;

  @IsBoolean()
  chestPainRest!: boolean;

  @IsBoolean()
  dizzinessOrSyncope!: boolean;

  @IsBoolean()
  boneOrJointProblem!: boolean;

  @IsBoolean()
  bloodPressureMedication!: boolean;

  @IsBoolean()
  otherReason!: boolean;
}

export class CreateTrainingAnamnesisDto {
  @IsUUID()
  clientId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ParqAnswersDto)
  parqAnswers!: ParqAnswersDto;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(3000)
  medicalClearanceNotes?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(4000)
  musculoskeletalHistory?: string | null;

  @ValidateIf(
    (_o, value: unknown) =>
      value !== undefined && value !== null && value !== '',
  )
  @IsIn(TRAINING_EXPERIENCE_LEVELS)
  trainingExperience?: TrainingExperienceLevel | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(15)
  @Max(240)
  maxSessionMinutes?: number | null;

  @IsEnum(TrainingEnvironment)
  environment!: TrainingEnvironment;

  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(ExerciseEquipment, { each: true })
  availableEquipment!: ExerciseEquipment[];

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}
