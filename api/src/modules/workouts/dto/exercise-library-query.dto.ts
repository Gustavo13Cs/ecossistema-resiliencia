import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExerciseEquipment, MuscleGroup } from '@prisma/client';

export class ExerciseLibraryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(ExerciseEquipment)
  equipment?: ExerciseEquipment;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;
}
