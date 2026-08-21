import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateConsultationNoteDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsString() nextSteps?: string;
}
