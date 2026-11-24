import { PhysioScaleType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePhysioFunctionalScaleDto {
  @IsUUID()
  clientId!: string;

  @IsEnum(PhysioScaleType)
  scaleType!: PhysioScaleType;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  evaluatedAt?: string | null;

  @IsObject()
  answers!: Record<string, unknown>;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
