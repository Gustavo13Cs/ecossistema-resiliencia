import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  initialWeight?: number;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  pathologies?: string;

  @IsOptional()
  @IsString()
  typicalSleep?: string;

  @IsOptional()
  @IsNumber()
  stressLevel?: number;

  @IsOptional()
  @IsString()
  foodRelationship?: string;

  @IsOptional()
  @IsString()
  psychologyHistory?: string;

  @IsOptional()
  @IsString()
  exerciseType?: string;

  @IsOptional()
  @IsString()
  exerciseFrequency?: string;

  @IsOptional()
  @IsString()
  exerciseDuration?: string;

  @IsOptional()
  @IsString()
  workActivityLevel?: string;
  
  @IsOptional()
  @IsString()
  nutritionistNotes?: string;

  @IsOptional()
  @IsNumber()
  tmb?: number;

  @IsOptional()
  @IsNumber()
  get?: number;

  @IsOptional()
  @IsNumber()
  activityFactor?: number;
}