import {
  IsString,
  IsOptional,
  ValidateIf,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateConsultationNoteDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content?: string;
  @IsOptional() @IsString() @MaxLength(1000) tags?: string;
  @IsOptional() @IsString() @MaxLength(10000) nextSteps?: string;
}
