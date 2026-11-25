import { PhysioDischargeReason } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsIn,
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

export class CreatePhysioDischargeDto {
  @IsUUID()
  clientId!: string;

  @IsEnum(PhysioDischargeReason)
  reason!: PhysioDischargeReason;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsISO8601()
  dischargedAt?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  rehabPlanId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  initialAssessmentId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsUUID()
  finalAssessmentId?: string | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10)
  initialPainLevel?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10)
  finalPainLevel?: number | null;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  clinicalSummary!: string;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(5000)
  recommendations?: string | null;

  @IsOptional()
  @IsBoolean()
  deactivateActivePlan?: boolean;
}

export type PhysioReportPeriod =
  | '30_DAYS'
  | '90_DAYS'
  | '180_DAYS'
  | '365_DAYS';

export class PhysioReportsQueryDto {
  @IsOptional()
  @IsIn(['30_DAYS', '90_DAYS', '180_DAYS', '365_DAYS'])
  period?: PhysioReportPeriod;
}
