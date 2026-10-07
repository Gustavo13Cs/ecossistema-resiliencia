import {
  Equals,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

// Classe concreta: Partial<CreateFoodDto> não fornece metadados ao ValidationPipe.
export class UpdateFoodDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  name?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  baseUnit?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @IsPositive()
  baseAmount?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  kcal?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  protein?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  fat?: number;

  // Compatibilidade com os formulários existentes; a origem persistida é imutável.
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Equals('MANUAL')
  source?: 'MANUAL';

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  sodium?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  calcium?: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @Min(0)
  iron?: number;
}
