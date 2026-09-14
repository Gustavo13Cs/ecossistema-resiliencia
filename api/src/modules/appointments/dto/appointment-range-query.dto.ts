import { AppointmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
  ValidateBy,
} from 'class-validator';

const MAX_RANGE_MILLISECONDS = 42 * 24 * 60 * 60 * 1_000;
const EXPLICIT_UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

function IsValidAppointmentRange(): PropertyDecorator {
  return ValidateBy({
    name: 'isValidAppointmentRange',
    validator: {
      validate(toValue: unknown, arguments_) {
        if (!arguments_) return false;
        const { from } = arguments_.object as AppointmentRangeQueryDto;
        if (typeof from !== 'string' || typeof toValue !== 'string') {
          return false;
        }
        const fromTime = new Date(from).getTime();
        const toTime = new Date(toValue).getTime();
        return (
          Number.isFinite(fromTime) &&
          Number.isFinite(toTime) &&
          toTime > fromTime &&
          toTime - fromTime <= MAX_RANGE_MILLISECONDS
        );
      },
      defaultMessage() {
        return 'from and to must define a positive range of at most 42 days';
      },
    },
  });
}

export class AppointmentRangeQueryDto {
  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'from must include Z or an explicit UTC offset',
  })
  from!: string;

  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'to must include Z or an explicit UTC offset',
  })
  @IsValidAppointmentRange()
  to!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
