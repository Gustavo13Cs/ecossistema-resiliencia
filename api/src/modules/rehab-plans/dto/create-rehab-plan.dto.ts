import { RehabItemCategory } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RehabModalityParamsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  modality!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  frequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pulseWidth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  intensity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  emissionMode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  applicationSite?: string;
}

export class CreateRehabExerciseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reps?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(RehabItemCategory)
  category?: RehabItemCategory;

  @IsOptional()
  @ValidateNested()
  @Type(() => RehabModalityParamsDto)
  modalityParams?: RehabModalityParamsDto;

  @IsOptional()
  @IsBoolean()
  isHomeExercise?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  homeFrequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  patientInstructions?: string;

  @IsOptional()
  @IsString()
  @Matches(/^cat-[a-z]+-[0-9]{2}$/)
  catalogExerciseId?: string;
}

export class CreateRehabSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  focus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  progressionCriteria?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104)
  estimatedWeeks?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateRehabExerciseDto)
  exercises!: CreateRehabExerciseDto[];
}

export class RehabPlanBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(104)
  durationWeeks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(29)
  currentPhaseIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateRehabSessionDto)
  sessions!: CreateRehabSessionDto[];
}

export class CreateRehabPlanDto extends RehabPlanBodyDto {
  @IsUUID()
  clientId!: string;
}
