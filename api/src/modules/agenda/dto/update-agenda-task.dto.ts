import { AgendaTaskCategory, AgendaTaskPriority } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateAgendaTaskDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(AgendaTaskCategory)
  category?: AgendaTaskCategory;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(AgendaTaskPriority)
  priority?: AgendaTaskPriority;

  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsTimeZone()
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  recurrenceRule?: string | null;
}
