import { RecipeCategory, RecipeStatus } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

const optionalBoolean = ({ value }: TransformFnParams) => {
  const rawValue = value as unknown;
  if (rawValue === undefined) return undefined;
  if (rawValue === 'true' || rawValue === true) return true;
  if (rawValue === 'false' || rawValue === false) return false;
  return rawValue;
};

export class ListRecipesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(RecipeCategory)
  category?: RecipeCategory;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isGlutenFree?: boolean;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isLactoseFree?: boolean;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  isVegan?: boolean;

  @IsOptional()
  @IsEnum(RecipeStatus)
  status: RecipeStatus = RecipeStatus.ACTIVE;
}
