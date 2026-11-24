import { MuscleGroup } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RehabPlanBodyDto } from './create-rehab-plan.dto';

export class UpdateRehabPlanDto extends RehabPlanBodyDto {}

export class CreateRehabTemplateDto extends RehabPlanBodyDto {}

export class UpdateRehabPhaseDto {
  @IsInt()
  @Min(0)
  @Max(29)
  currentPhaseIndex!: number;
}

export class PhysioExerciseCatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @IsIn(['true', 'false'])
  onlyWithIllustration?: 'true' | 'false';
}
