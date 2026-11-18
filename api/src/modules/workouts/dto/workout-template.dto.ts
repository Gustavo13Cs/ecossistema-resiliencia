import { TrainingEnvironment } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DraftContentDto } from './workout-draft.dto';

export const TEMPLATE_GOALS = [
  'MUSCLE_GAIN',
  'STRENGTH',
  'WEIGHT_LOSS',
  'CONDITIONING',
] as const;

export const TEMPLATE_LEVELS = [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
] as const;

export const TEMPLATE_STATUSES = ['active', 'archived', 'all'] as const;

export class WorkoutTemplateQueryDto {
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(TEMPLATE_GOALS)
  goal?: (typeof TEMPLATE_GOALS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(TEMPLATE_LEVELS)
  level?: (typeof TEMPLATE_LEVELS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(['all', 'global', 'private'])
  origin?: 'all' | 'global' | 'private';

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(TEMPLATE_STATUSES)
  status?: (typeof TEMPLATE_STATUSES)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsEnum(TrainingEnvironment)
  environment?: TrainingEnvironment;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  q?: string;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class CreateWorkoutTemplateDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsIn(TEMPLATE_GOALS)
  goal!: (typeof TEMPLATE_GOALS)[number];

  @IsIn(TEMPLATE_LEVELS)
  level!: (typeof TEMPLATE_LEVELS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  targetAudience?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsEnum(TrainingEnvironment)
  environment?: TrainingEnvironment | null;
}

export class CreateStandaloneWorkoutTemplateDto extends CreateWorkoutTemplateDto {
  @IsObject()
  @ValidateNested()
  @Type(() => DraftContentDto)
  content!: DraftContentDto;
}

export class UpdateWorkoutTemplateDto {
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(TEMPLATE_GOALS)
  goal?: (typeof TEMPLATE_GOALS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(TEMPLATE_LEVELS)
  level?: (typeof TEMPLATE_LEVELS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  targetAudience?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsEnum(TrainingEnvironment)
  environment?: TrainingEnvironment | null;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => DraftContentDto)
  content?: DraftContentDto;
}

export class DuplicateWorkoutTemplateDto {
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
}

export class ImportWorkoutTemplateDto {
  @IsUUID()
  clientId!: string;
}
