import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateConsultationNoteDto {
  @IsUUID() clientId!: string;
  @IsString() @MinLength(1) @MaxLength(20000) content!: string;
  @IsOptional() @IsString() @MaxLength(1000) tags?: string;
  @IsOptional() @IsString() @MaxLength(10000) nextSteps?: string;
}
