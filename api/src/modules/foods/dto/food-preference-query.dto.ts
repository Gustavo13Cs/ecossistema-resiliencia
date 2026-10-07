import { Transform } from 'class-transformer';
import { IsNumber, IsUUID, Min, ValidateIf } from 'class-validator';

export class FoodPreferenceQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  )
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUUID()
  nutritionistId?: string;
}
