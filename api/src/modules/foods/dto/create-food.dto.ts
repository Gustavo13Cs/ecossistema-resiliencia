import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFoodDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  baseUnit?: string;

  @IsOptional()
  @IsNumber()
  baseAmount?: number;

  @IsNumber()
  kcal!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  carbs!: number;

  @IsNumber()
  fat!: number;
}