import {
  P3ExerciseDto,
  P3SplitDto,
  PeriodizationConstraint,
  type Periodization,
} from './workout-p3.dto';
import { LibraryReferenceDto } from './library-reference.dto';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EffortType, MuscleGroup, TrainingMethod } from '@prisma/client';

export const WORKOUT_TEMPO_REGEX =
  /^\d{1,2}-[0-9xX]{1,2}-[0-9xX]{1,2}-\d{1,2}$/;

export class CreateExerciseDto extends P3ExerciseDto {
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsObject()
  @ValidateNested()
  @Type(() => LibraryReferenceDto)
  libraryReference?: LibraryReferenceDto | null;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sets!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reps!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  rest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  load?: string;

  @ValidateIf(
    (exercise: CreateExerciseDto) =>
      (exercise.effortType !== undefined && exercise.effortType !== null) ||
      (exercise.effortTarget !== undefined && exercise.effortTarget !== null),
  )
  @IsEnum(EffortType)
  effortType?: EffortType;

  @ValidateIf(
    (exercise: CreateExerciseDto) =>
      (exercise.effortTarget !== undefined && exercise.effortTarget !== null) ||
      (exercise.effortType !== undefined && exercise.effortType !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  effortTarget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(WORKOUT_TEMPO_REGEX, {
    message:
      'Cadência deve seguir o formato excêntrica-pausa-concêntrica-pausa (ex.: 3-0-1-0).',
  })
  tempo?: string;

  @IsOptional()
  @IsEnum(TrainingMethod)
  method?: TrainingMethod;
}

export class CreateSplitDto extends P3SplitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  focus?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseDto)
  exercises!: CreateExerciseDto[];
}

export class CreateWorkoutDto {
  @Validate(PeriodizationConstraint, [true])
  periodization?: Periodization | null;

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
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsUUID()
  clientId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateSplitDto)
  splits!: CreateSplitDto[];
}
