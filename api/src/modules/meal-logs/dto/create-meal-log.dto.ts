import { IsString, IsEnum, IsOptional } from 'class-validator';

export type MealLogStatus = 'FOLLOWED' | 'SUBSTITUTED' | 'SKIPPED';
const MEAL_LOG_STATUS_VALUES = ['FOLLOWED', 'SUBSTITUTED', 'SKIPPED'] as const;

export class CreateMealLogDto {
  @IsString()
  mealId!: string;

  @IsEnum(MEAL_LOG_STATUS_VALUES)
  status!: MealLogStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
