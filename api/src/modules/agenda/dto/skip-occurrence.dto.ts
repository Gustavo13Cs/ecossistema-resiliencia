import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SkipOccurrenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
