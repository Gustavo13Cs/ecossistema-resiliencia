import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MuscleGroup } from '@prisma/client';

export class ExerciseLibraryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;
}
