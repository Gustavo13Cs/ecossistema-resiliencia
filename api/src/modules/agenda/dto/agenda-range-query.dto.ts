import { IsISO8601, ValidateBy } from 'class-validator';

const MAX_RANGE_MILLISECONDS = 31 * 24 * 60 * 60 * 1000;

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
  from!: string;

  @IsISO8601()
  @IsValidAgendaRange()
  to!: string;
}
