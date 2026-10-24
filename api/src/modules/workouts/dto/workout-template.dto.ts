import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
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
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
  @IsIn(TEMPLATE_GOALS)
  goal!: (typeof TEMPLATE_GOALS)[number];
  @IsIn(TEMPLATE_LEVELS)
  level!: (typeof TEMPLATE_LEVELS)[number];
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(500)
  targetAudience?: string;
}
export class ImportWorkoutTemplateDto {
  @IsUUID()
  clientId!: string;
}
