import { AppointmentKind, AppointmentModality } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const EXPLICIT_UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;
const trimOptionalText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateAppointmentDto {
  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'expectedUpdatedAt must include Z or an explicit UTC offset',
  })
  expectedUpdatedAt!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(AppointmentKind)
  kind?: AppointmentKind;

  @IsOptional()
  @IsEnum(AppointmentModality)
  modality?: AppointmentModality;

  @IsOptional()
  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'startsAt must include Z or an explicit UTC offset',
  })
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'endsAt must include Z or an explicit UTC offset',
  })
  endsAt?: string;

  @IsOptional()
  @IsTimeZone()
  timeZone?: string;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(240)
  location?: string | null;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  @MaxLength(500)
  meetingUrl?: string | null;

  @IsOptional()
  @Transform(trimOptionalText)
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
