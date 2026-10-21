import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ExerciseEquipment, MuscleGroup } from '@prisma/client';

export class CreateCustomExerciseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsEnum(MuscleGroup)
  muscleGroup!: MuscleGroup;

  @IsOptional()
  @IsEnum(ExerciseEquipment)
  equipment?: ExerciseEquipment;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
