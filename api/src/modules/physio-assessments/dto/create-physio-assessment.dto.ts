import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

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
}
