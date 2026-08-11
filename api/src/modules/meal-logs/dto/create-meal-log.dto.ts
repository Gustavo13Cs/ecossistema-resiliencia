import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MealLogStatus } from '@prisma/client';

export class CreateMealLogDto {
  @IsString()
  mealId!: string;

  @IsEnum(MealLogStatus)
  status!: MealLogStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
