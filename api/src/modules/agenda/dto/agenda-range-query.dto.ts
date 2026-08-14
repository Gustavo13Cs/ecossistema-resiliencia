import { IsISO8601, Matches, ValidateBy } from 'class-validator';

const MAX_RANGE_MILLISECONDS = 31 * 24 * 60 * 60 * 1000;
const EXPLICIT_UTC_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

function IsValidAgendaRange(): PropertyDecorator {
  return ValidateBy({
    name: 'isValidAgendaRange',
    validator: {
      validate(toValue: unknown, arguments_) {
        if (!arguments_) {
          return false;
        }

        const { from } = arguments_.object as AgendaRangeQueryDto;

        if (typeof from !== 'string' || typeof toValue !== 'string') {
          return false;
        }

        const fromTime = new Date(from).getTime();
        const toTime = new Date(toValue).getTime();

        return (
          Number.isFinite(fromTime) &&
          Number.isFinite(toTime) &&
          toTime >= fromTime &&
          toTime - fromTime <= MAX_RANGE_MILLISECONDS
        );
      },
      defaultMessage() {
        return 'from and to must define a range of at most 31 days';
      },
    },
  });
}

export class AgendaRangeQueryDto {
  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'from must include Z or an explicit UTC offset',
  })
  from!: string;

  @IsISO8601()
  @Matches(EXPLICIT_UTC_OFFSET, {
    message: 'to must include Z or an explicit UTC offset',
  })
  @IsValidAgendaRange()
  to!: string;
}
