import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

export const normalizeOptionalText = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() || null : value;

export const normalizeOptionalEmail = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() || null : value;

export const trimRequiredText = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value;

export class ClientOptionalFieldsDto {
  @IsOptional()
  @IsEmail()
  @Transform(normalizeOptionalEmail)
  email?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  phone?: string | null;

  @IsOptional()
  @IsDateString()
  @Transform(normalizeOptionalText)
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  goal?: string | null;

  @IsOptional()
  @IsNumber()
  height?: number | null;

  @IsOptional()
  @IsNumber()
  initialWeight?: number | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  allergies?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  pathologies?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  typicalSleep?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stressLevel?: number | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  foodRelationship?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  psychologyHistory?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  exerciseType?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  exerciseFrequency?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  exerciseDuration?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  hasPersonal?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  workActivityLevel?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  professionalNotes?: string | null;

  @IsOptional()
  @IsString()
  @Transform(normalizeOptionalText)
  privacyNotes?: string | null;
}
