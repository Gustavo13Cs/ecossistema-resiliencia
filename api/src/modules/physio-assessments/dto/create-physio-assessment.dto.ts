import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const BODY_PAIN_VIEWS = ['ANTERIOR', 'POSTERIOR'] as const;
export const BODY_PAIN_SYMPTOMS = [
  'SHARP',
  'BURNING',
  'RADIATING',
  'ACHING',
  'STIFFNESS',
  'TINGLING',
] as const;
export const ANATOMICAL_SIDES = ['LEFT', 'RIGHT', 'AXIAL'] as const;
export const ORTHOPEDIC_TEST_SIDES = [
  'LEFT',
  'RIGHT',
  'BILATERAL',
  'AXIAL',
] as const;
export const ORTHOPEDIC_TEST_RESULTS = [
  'POSITIVE',
  'NEGATIVE',
  'INCONCLUSIVE',
] as const;

export class BodyPainMapEntryDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  region!: string;

  @IsIn(BODY_PAIN_VIEWS)
  view!: (typeof BODY_PAIN_VIEWS)[number];

  @IsInt()
  @Min(0)
  @Max(10)
  intensity!: number;

  @IsIn(BODY_PAIN_SYMPTOMS)
  symptomType!: (typeof BODY_PAIN_SYMPTOMS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class GoniometryEntryDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  joint!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  movement!: string;

  @IsIn(ANATOMICAL_SIDES)
  side!: (typeof ANATOMICAL_SIDES)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsNumber()
  @Min(0)
  @Max(360)
  activeDeg?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsNumber()
  @Min(0)
  @Max(360)
  passiveDeg?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsNumber()
  @Min(0)
  @Max(360)
  referenceDeg?: number | null;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class MuscleStrengthEntryDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  muscleGroup!: string;

  @IsIn(ANATOMICAL_SIDES)
  side!: (typeof ANATOMICAL_SIDES)[number];

  @IsInt()
  @Min(0)
  @Max(5)
  grade!: number;

  @IsOptional()
  @IsBoolean()
  painOnResistance?: boolean;

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class OrthopedicTestItemDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  region!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  testName!: string;

  @IsIn(ORTHOPEDIC_TEST_SIDES)
  side!: (typeof ORTHOPEDIC_TEST_SIDES)[number];

  @IsIn(ORTHOPEDIC_TEST_RESULTS)
  result!: (typeof ORTHOPEDIC_TEST_RESULTS)[number];

  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class CreatePhysioAssessmentDto {
  @IsUUID() clientId!: string;
  @IsOptional() @IsString() @MaxLength(5000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(10000) historyOfIllness?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) painLevel?: number;
  @IsOptional() @IsString() @MaxLength(10000) posturalAnalysis?: string;
  @IsOptional() @IsString() @MaxLength(10000) palpation?: string;
  @IsOptional() @IsString() @MaxLength(10000) jointMobility?: string;
  @IsOptional() @IsString() @MaxLength(10000) orthopedicTests?: string;
  @IsOptional() @IsString() @MaxLength(10000) treatmentPlan?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BodyPainMapEntryDto)
  bodyPainMap?: BodyPainMapEntryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => GoniometryEntryDto)
  goniometry?: GoniometryEntryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => MuscleStrengthEntryDto)
  muscleStrength?: MuscleStrengthEntryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => OrthopedicTestItemDto)
  orthopedicTestItems?: OrthopedicTestItemDto[];
}
