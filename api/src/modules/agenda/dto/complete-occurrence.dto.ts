import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteOccurrenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  patientNote?: string;
}
