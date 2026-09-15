import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  ValidateIf,
} from 'class-validator';
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
  @IsOptional() @IsNumber() fiberG?: number;
  @IsOptional() @IsNumber() sodiumMg?: number;
  @IsOptional() @IsNumber() calciumMg?: number;
  @IsOptional() @IsNumber() ironMg?: number;

  @IsOptional() @IsString() notes?: string;

  @ValidateIf((dto: CreateDietPlanDto) => !dto.userId)
  @IsString()
  clientId?: string;

  // Compatibilidade temporária com versões anteriores do frontend. O service
  // sempre resolve este ID para um Client pertencente ao profissional atual.
  @ValidateIf((dto: CreateDietPlanDto) => !dto.clientId)
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  isTemplate?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealDto)
  meals!: CreateMealDto[];
}

export class CreateDietTemplateDto {
  @IsString()
  title!: string;

  @IsString()
  goal!: string;

  @IsNumber()
  targetKcal!: number;

  @IsNumber()
  proteinG!: number;

  @IsNumber()
  fatG!: number;

  @IsNumber()
  carbsG!: number;

  @IsOptional()
  @IsNumber()
  fiberG?: number;

  @IsOptional()
  @IsNumber()
  sodiumMg?: number;

  @IsOptional()
  @IsNumber()
  calciumMg?: number;

  @IsOptional()
  @IsNumber()
  ironMg?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealDto)
  meals!: CreateMealDto[];
}

export class UpdateDietTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsNumber()
  targetKcal?: number;

  @IsOptional()
  @IsNumber()
  proteinG?: number;

  @IsOptional()
  @IsNumber()
  fatG?: number;

  @IsOptional()
  @IsNumber()
  carbsG?: number;

  @IsOptional()
  @IsNumber()
  fiberG?: number;

  @IsOptional()
  @IsNumber()
  sodiumMg?: number;

  @IsOptional()
  @IsNumber()
  calciumMg?: number;

  @IsOptional()
  @IsNumber()
  ironMg?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealDto)
  meals?: CreateMealDto[];
}

export class ScaleAndImportTemplateDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsNumber()
  @Min(500)
  targetKcal?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;
}
