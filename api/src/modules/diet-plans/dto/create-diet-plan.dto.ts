import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMealItemDto {
  @IsNumber()
  @Min(0.1)
  quantity!: number;

  @IsString()
  measure!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  foodId!: string;
}

export class CreateMealDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealItemDto)
  items!: CreateMealItemDto[];
}

export class CreateDietPlanDto {
  @IsString()
  title!: string;

  @IsString()
  goal!: string;

  @IsOptional() @IsNumber() tmb?: number;
  @IsOptional() @IsNumber() get?: number;
  
  @IsNumber() targetKcal!: number;
  @IsNumber() proteinG!: number;
  @IsNumber() fatG!: number;
  @IsNumber() carbsG!: number;

  @IsOptional() @IsString() notes?: string;

  @IsString()
  userId!: string; 

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealDto)
  meals!: CreateMealDto[];
}