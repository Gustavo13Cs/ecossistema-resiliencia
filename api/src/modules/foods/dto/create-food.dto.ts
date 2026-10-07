import {
  Equals,
  IsString,
  IsNumber,
  Matches,
  Min,
  IsPositive,
  ValidateIf,
} from 'class-validator';

export class CreateFoodDto {
  @IsString()
  @Matches(/\S/)
  name!: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  baseUnit?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsNumber()
  @IsPositive()
  baseAmount?: number;

  @IsNumber()
  @Min(0)
  kcal!: number;

  @IsNumber()
  @Min(0)
  protein!: number;

  @IsNumber()
  @Min(0)
  carbs!: number;

  @IsNumber()
  @Min(0)
  fat!: number;

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
