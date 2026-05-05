import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePhysioAssessmentDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() chiefComplaint?: string;
  @IsOptional() @IsString() historyOfIllness?: string;
  @IsOptional() @IsNumber() painLevel?: number;
  @IsOptional() @IsString() posturalAnalysis?: string;
  @IsOptional() @IsString() palpation?: string;
  @IsOptional() @IsString() jointMobility?: string;
  @IsOptional() @IsString() orthopedicTests?: string;
  @IsOptional() @IsString() treatmentPlan?: string;
}