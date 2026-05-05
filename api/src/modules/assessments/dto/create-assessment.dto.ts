import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateAssessmentDto {
  @IsString() userId!: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsNumber() bodyFat?: number;
  @IsOptional() @IsNumber() muscleMass?: number;

  // Circunferências
  @IsOptional() @IsNumber() waist?: number;
  @IsOptional() @IsNumber() abdomen?: number;
  @IsOptional() @IsNumber() hips?: number;
  @IsOptional() @IsNumber() thorax?: number;
  @IsOptional() @IsNumber() armLeft?: number;
  @IsOptional() @IsNumber() armRight?: number;
  @IsOptional() @IsNumber() thighLeft?: number;
  @IsOptional() @IsNumber() thighRight?: number;
  @IsOptional() @IsNumber() calfLeft?: number;
  @IsOptional() @IsNumber() calfRight?: number;

  // Dobras
  @IsOptional() @IsNumber() skinfoldTriceps?: number;
  @IsOptional() @IsNumber() skinfoldSubscapular?: number;
  @IsOptional() @IsNumber() skinfoldChest?: number;
  @IsOptional() @IsNumber() skinfoldAxillary?: number;
  @IsOptional() @IsNumber() skinfoldSuprailiac?: number;
  @IsOptional() @IsNumber() skinfoldAbdominal?: number;
  @IsOptional() @IsNumber() skinfoldThigh?: number;

  // Performance
  @IsOptional() @IsNumber() benchPress1RM?: number;
  @IsOptional() @IsNumber() squat1RM?: number;
  @IsOptional() @IsNumber() deadlift1RM?: number;
  @IsOptional() @IsNumber() vo2Max?: number;

  @IsOptional() @IsString() notes?: string;
}