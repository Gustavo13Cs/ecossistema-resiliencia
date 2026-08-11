import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkoutLogSetDto {
  @IsString()
  exerciseId!: string;

  @IsInt()
  @Min(1)
  setNumber!: number;

  @IsInt()
  @Min(0)
  repsActual!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;
}

export class CreateWorkoutLogDto {
  @IsString()
  workoutId!: string;

  @IsString()
  splitId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  pse?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutLogSetDto)
  sets!: WorkoutLogSetDto[];
}
