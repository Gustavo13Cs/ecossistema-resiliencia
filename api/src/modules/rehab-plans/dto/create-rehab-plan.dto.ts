import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRehabExerciseDto {
  @IsString() name!: string;
  @IsOptional() @IsString() sets?: string;
  @IsOptional() @IsString() reps?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateRehabSessionDto {
  @IsString() name!: string;
  @IsOptional() @IsString() focus?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRehabExerciseDto)
  exercises!: CreateRehabExerciseDto[];
}

export class CreateRehabPlanDto {
  @IsString() title!: string;
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsNumber() durationWeeks?: number;
  @IsOptional() @IsString() notes?: string;
  @IsString() userId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRehabSessionDto)
  sessions!: CreateRehabSessionDto[];
}