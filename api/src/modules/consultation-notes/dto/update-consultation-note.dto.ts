import { IsString, IsOptional } from 'class-validator';

export class UpdateConsultationNoteDto {
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsString() nextSteps?: string;
}
