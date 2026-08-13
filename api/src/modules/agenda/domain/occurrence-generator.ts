import { BadRequestException } from '@nestjs/common';
import { datetime, RRule } from 'rrule';
import type { Options } from 'rrule';

const MAX_OCCURRENCES_PER_CALL = 366;

export type GenerateOccurrenceInput = {
  startsAt: Date;
  endsAt?: Date | null;
  timeZone: string;
  recurrenceRule?: string | null;
  windowStart: Date;
  windowEnd: Date;
};

function parseRecurrenceRule(rule: string): Partial<Options> {
  if (/(?:^|;)COUNT=/i.test(rule)) {
    throw new BadRequestException('COUNT is not supported');
  }

  try {
    const options = RRule.parseString(rule);
    const interval = options.interval ?? 1;

    if (options.freq !== RRule.DAILY && options.freq !== RRule.WEEKLY) {
      throw new BadRequestException(
        'Only DAILY and WEEKLY recurrence is supported',
      );
    }

    if (!Number.isInteger(interval) || interval < 1 || interval > 30) {
      throw new BadRequestException('INTERVAL must be between 1 and 30');
    }

    if (
      options.freq === RRule.WEEKLY &&
      (options.byweekday == null ||
        (Array.isArray(options.byweekday) && options.byweekday.length === 0))
    ) {
      throw new BadRequestException('WEEKLY recurrence requires BYDAY');
    }

    return options;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException('Invalid recurrence rule');
  }
}

export function validateRecurrenceRule(rule: string): void {
  parseRecurrenceRule(rule);
}

function assertValidDate(date: Date, field: string): void {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
}

function createTimeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new BadRequestException('timeZone must be a valid IANA time zone');
  }
}

function toWallClockDate(date: Date, formatter: Intl.DateTimeFormat): Date {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  const wallClockDate = datetime(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  wallClockDate.setUTCMilliseconds(date.getUTCMilliseconds());

  return wallClockDate;
}

function assertValidInput(input: GenerateOccurrenceInput): Intl.DateTimeFormat {
  assertValidDate(input.startsAt, 'startsAt');
  assertValidDate(input.windowStart, 'windowStart');
  assertValidDate(input.windowEnd, 'windowEnd');

  if (input.endsAt != null) {
    assertValidDate(input.endsAt, 'endsAt');
    if (input.endsAt < input.startsAt) {
      throw new BadRequestException('endsAt must not be before startsAt');
    }
  }

  if (input.windowStart > input.windowEnd) {
    throw new BadRequestException('windowStart must not be after windowEnd');
  }

  return createTimeZoneFormatter(input.timeZone);
}

export function generateOccurrenceDates(
  input: GenerateOccurrenceInput,
): Date[] {
  const formatter = assertValidInput(input);
  const { startsAt, endsAt, timeZone, recurrenceRule, windowStart, windowEnd } =
    input;

  if (!recurrenceRule) {
    return startsAt >= windowStart && startsAt <= windowEnd ? [startsAt] : [];
  }

  const options = parseRecurrenceRule(recurrenceRule);
  const effectiveEnd = endsAt && endsAt < windowEnd ? endsAt : windowEnd;

  if (effectiveEnd < windowStart) {
    return [];
  }

  const rule = new RRule({
    ...options,
    dtstart: toWallClockDate(startsAt, formatter),
    tzid: timeZone,
  });
  let occurrenceLimitExceeded = false;
  const dates = rule.between(
    windowStart,
    effectiveEnd,
    true,
    (_date, length) => {
      if (length >= MAX_OCCURRENCES_PER_CALL) {
        occurrenceLimitExceeded = true;
        return false;
      }

      return true;
    },
  );

  if (occurrenceLimitExceeded || dates.length > MAX_OCCURRENCES_PER_CALL) {
    throw new BadRequestException(
      `A maximum of ${MAX_OCCURRENCES_PER_CALL} occurrences can be generated`,
    );
  }

  return dates;
}
