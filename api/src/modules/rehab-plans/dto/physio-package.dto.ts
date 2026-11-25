import { PhysioPackageStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePhysioPackageDto {
  @IsUUID()
  clientId!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsInt()
  @Min(1)
  @Max(200)
  totalSessions!: number;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(200)
  reassessEverySessions?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  startedAt?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  expiresAt?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  closePreviousActive?: boolean;
}

export class UpdatePhysioPackageDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  totalSessions?: number;

  @ValidateIf((_o, value: unknown) => value !== undefined && vNotNull(value))
  @IsInt()
  @Min(1)
  @Max(200)
  reassessEverySessions?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  expiresAt?: string | null;

  @IsOptional()
  @IsEnum(PhysioPackageStatus)
  status?: PhysioPackageStatus;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

function vNotNull(value: unknown): boolean {
  return value !== null;
}
