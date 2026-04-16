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


  @IsOptional()
  @IsString()
  source?: string; 

  @IsOptional()
  @IsNumber()
  fiber?: number;  

  @IsOptional()
  @IsNumber()
  sodium?: number; 

  @IsOptional()
  @IsNumber()
  calcium?: number;
  @IsOptional()
  @IsNumber()
  iron?: number; 
}