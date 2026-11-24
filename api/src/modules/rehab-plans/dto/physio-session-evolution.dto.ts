import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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

export class CreatePhysioSessionEvolutionDto {
  @IsUUID()
  clientId!: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  appointmentId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  rehabPlanId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  sessionDate?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10)
  painBefore?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10)
  painAfter?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  proceduresApplied?: string[];

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  patientResponse!: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  nextSteps?: string | null;
}

export class UpdatePhysioSessionEvolutionDto {
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  rehabPlanId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  sessionDate?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10)
  painBefore?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10)
  painAfter?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  proceduresApplied?: string[];

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  patientResponse?: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  nextSteps?: string | null;
}
