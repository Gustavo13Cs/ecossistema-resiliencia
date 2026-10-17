import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EffortType, MuscleGroup, TrainingMethod } from '@prisma/client';
import { WORKOUT_TEMPO_REGEX } from './create-workout.dto';

export class DraftExerciseDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(200)
  name?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  sets?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  reps?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  rest?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  load?: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsEnum(EffortType)
  effortType?: EffortType | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(20)
  effortTarget?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsString()
  @MaxLength(20)
  @Matches(WORKOUT_TEMPO_REGEX)
  tempo?: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsEnum(TrainingMethod)
  method?: TrainingMethod | null;
}

export class DraftSplitDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(500)
  focus?: string;

  @IsArray()
  @IsObject({ each: true })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DraftExerciseDto)
  exercises!: DraftExerciseDto[];
}

export class DraftContentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  @Max(104)
  durationWeeks?: number | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsArray()
  @IsObject({ each: true })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => DraftSplitDto)
  splits!: DraftSplitDto[];
}

@ValidatorConstraint({ name: 'draftCreationSource', async: false })
class DraftCreationSourceConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const input = args.object as CreateWorkoutDraftDto;
    return (
      (input.content !== undefined) !== (input.sourceWorkoutId !== undefined)
    );
  }
  defaultMessage(): string {
    return 'Envie content ou sourceWorkoutId, exclusivamente.';
  }
}

export class CreateWorkoutDraftDto {
  @IsUUID()
  @Validate(DraftCreationSourceConstraint)
  clientId!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  sourceWorkoutId?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => DraftContentDto)
  content?: DraftContentDto;
}

export class DraftVersionDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;
}
export class SaveWorkoutDraftDto extends DraftVersionDto {
  @IsObject()
  @ValidateNested()
  @Type(() => DraftContentDto)
  content!: DraftContentDto;
}
export class RebaseWorkoutDraftDto extends DraftVersionDto {
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsUUID()
  expectedActiveWorkoutId!: string | null;
}
