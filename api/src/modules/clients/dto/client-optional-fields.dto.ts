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

export class ClientOptionalFieldsDto {
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  gender?: string | null;

  @IsOptional()
  @IsString()
  goal?: string | null;

  @IsOptional()
  @IsNumber()
  height?: number | null;

  @IsOptional()
  @IsNumber()
  initialWeight?: number | null;

  @IsOptional()
  @IsString()
  allergies?: string | null;

  @IsOptional()
  @IsString()
  pathologies?: string | null;

  @IsOptional()
  @IsString()
  typicalSleep?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stressLevel?: number | null;

  @IsOptional()
  @IsString()
  foodRelationship?: string | null;

  @IsOptional()
  @IsString()
  psychologyHistory?: string | null;

  @IsOptional()
  @IsString()
  exerciseType?: string | null;

  @IsOptional()
  @IsString()
  exerciseFrequency?: string | null;

  @IsOptional()
  @IsString()
  exerciseDuration?: string | null;

  @IsOptional()
  @IsString()
  hasPersonal?: string | null;

  @IsOptional()
  @IsString()
  workActivityLevel?: string | null;

  @IsOptional()
  @IsString()
  professionalNotes?: string | null;

  @IsOptional()
  @IsString()
  privacyNotes?: string | null;
}
