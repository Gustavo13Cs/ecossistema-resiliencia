import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExerciseDto {
  @IsString()
  name!: string;

  @IsString()
  sets!: string;

  @IsString()
  reps!: string;

  @IsOptional()
  @IsString()
  rest?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSplitDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  focus?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseDto)
  exercises!: CreateExerciseDto[];
}

export class CreateWorkoutDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsNumber()
  durationWeeks?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  userId!: string; 

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSplitDto)
  splits!: CreateSplitDto[];
}