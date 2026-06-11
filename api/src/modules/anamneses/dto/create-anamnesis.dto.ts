import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateAnamnesisDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsOptional() @IsString() clinicalHistory?: string;
  @IsOptional() @IsString() medications?: string;
  @IsOptional() @IsString() pathologies?: string;
  @IsOptional() @IsString() bowelMovement?: string;
  @IsOptional() @IsNumber() bristolScale?: number;
  @IsOptional() @IsString() urineColor?: string;
  @IsOptional() @IsString() symptoms?: string;
  @IsOptional() @IsString() familyHistory?: string;
  @IsOptional() @IsNumber() waterIntake?: number;
  @IsOptional() @IsString() alcoholAndSmoking?: string;
}