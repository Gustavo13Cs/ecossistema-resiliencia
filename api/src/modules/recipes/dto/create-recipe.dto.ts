import { RecipeCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientDto {
  @IsUUID()
  foodId!: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  measure!: string;
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RecipeCategory)
  category!: RecipeCategory;

  @IsNumber()
  @Min(0.000001)
  servings!: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsBoolean()
  isGlutenFree!: boolean;

  @IsBoolean()
  isLactoseFree!: boolean;

  @IsBoolean()
  isVegan!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
