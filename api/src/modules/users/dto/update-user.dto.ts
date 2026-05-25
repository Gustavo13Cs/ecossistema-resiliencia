import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  phone?: string;

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
  @IsString()
  exerciseType?: string;

  @IsOptional()
  @IsString()
  exerciseFrequency?: string;

  @IsOptional()
  @IsString()
  workActivityLevel?: string;
}