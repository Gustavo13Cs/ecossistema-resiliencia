import { AgendaTaskCategory, AgendaTaskPriority } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAgendaTaskDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsEnum(AgendaTaskCategory)
  category!: AgendaTaskCategory;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string;

  @IsEnum(AgendaTaskPriority)
  priority!: AgendaTaskPriority;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsTimeZone()
  timeZone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  recurrenceRule?: string;
}
