import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  bodyFat?: number;

  @IsOptional()
  @IsNumber()
  muscleMass?: number;

  @IsOptional()
  @IsNumber()
  waist?: number;

  @IsOptional()
  @IsNumber()
  abdomen?: number;

  @IsOptional()
  @IsNumber()
  hips?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}