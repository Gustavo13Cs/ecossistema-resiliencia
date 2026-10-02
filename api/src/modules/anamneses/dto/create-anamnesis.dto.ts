import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateAnamnesisDto {
  @IsUUID() clientId!: string;
  @IsOptional() @IsString() @MaxLength(10000) clinicalHistory?: string;
  @IsOptional() @IsString() @MaxLength(10000) medications?: string;
  @IsOptional() @IsString() @MaxLength(10000) pathologies?: string;
  @IsOptional() @IsString() @MaxLength(1000) bowelMovement?: string;
  @IsOptional() @IsInt() @Min(1) @Max(7) bristolScale?: number;
  @IsOptional() @IsString() @MaxLength(1000) urineColor?: string;
  @IsOptional() @IsString() @MaxLength(10000) symptoms?: string;
  @IsOptional() @IsString() @MaxLength(10000) familyHistory?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(20) waterIntake?: number;
  @IsOptional() @IsString() @MaxLength(10000) alcoholAndSmoking?: string;
}
