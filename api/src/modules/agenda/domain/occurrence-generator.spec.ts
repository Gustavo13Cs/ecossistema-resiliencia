import { BadRequestException } from '@nestjs/common';
import { RRule } from 'rrule';
import {
  generateOccurrenceDates,
  validateRecurrenceRule,
} from './occurrence-generator';

describe('generateOccurrenceDates', () => {
  it('returns one date for a non-recurring task', () => {
    const startsAt = new Date('2026-08-13T11:00:00.000Z');

    expect(
      generateOccurrenceDates({
        startsAt,
        timeZone: 'America/Sao_Paulo',
        windowStart: new Date('2026-08-13T00:00:00.000Z'),
        windowEnd: new Date('2026-08-13T23:59:59.999Z'),
      }),
    ).toEqual([startsAt]);
  });

  it('returns no date when a non-recurring task is outside the window', () => {
    expect(
      generateOccurrenceDates({
        startsAt: new Date('2026-08-12T11:00:00.000Z'),
        timeZone: 'America/Sao_Paulo',
        windowStart: new Date('2026-08-13T00:00:00.000Z'),
        windowEnd: new Date('2026-08-13T23:59:59.999Z'),
      }),
    ).toEqual([]);
  });

  it('generates daily occurrences at the same Sao Paulo wall-clock time', () => {
    const dates = generateOccurrenceDates({
      startsAt: new Date('2026-08-13T11:00:00.000Z'),
      timeZone: 'America/Sao_Paulo',
      recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
      windowStart: new Date('2026-08-13T00:00:00.000Z'),
      windowEnd: new Date('2026-08-15T23:59:59.999Z'),
    });

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-08-13T11:00:00.000Z',
      '2026-08-14T11:00:00.000Z',
      '2026-08-15T11:00:00.000Z',
    ]);
  });

  it('generates weekly occurrences on the selected weekdays', () => {
    const dates = generateOccurrenceDates({
      startsAt: new Date('2026-08-17T11:00:00.000Z'),
      endsAt: new Date('2026-08-31T23:59:59.999Z'),
      timeZone: 'America/Sao_Paulo',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE',
      windowStart: new Date('2026-08-17T00:00:00.000Z'),
      windowEnd: new Date('2026-08-24T23:59:59.999Z'),
    });

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-08-17T11:00:00.000Z',
      '2026-08-19T11:00:00.000Z',
      '2026-08-24T11:00:00.000Z',
    ]);
  });

  it('preserves New York wall-clock time across daylight saving time', () => {
    const dates = generateOccurrenceDates({
      startsAt: new Date('2026-03-07T14:00:00.000Z'),
      timeZone: 'America/New_York',
      recurrenceRule: 'FREQ=DAILY',
      windowStart: new Date('2026-03-07T00:00:00.000Z'),
      windowEnd: new Date('2026-03-09T23:59:59.999Z'),
    });

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-03-07T14:00:00.000Z',
      '2026-03-08T13:00:00.000Z',
      '2026-03-09T13:00:00.000Z',
    ]);
  });

  it('does not generate recurring dates after endsAt', () => {
    const dates = generateOccurrenceDates({
      startsAt: new Date('2026-08-13T11:00:00.000Z'),
      endsAt: new Date('2026-08-15T11:00:00.000Z'),
      timeZone: 'America/Sao_Paulo',
      recurrenceRule: 'FREQ=DAILY',
      windowStart: new Date('2026-08-13T00:00:00.000Z'),
      windowEnd: new Date('2026-08-17T23:59:59.999Z'),
    });

    expect(dates.map((date) => date.toISOString())).toEqual([
      '2026-08-13T11:00:00.000Z',
      '2026-08-14T11:00:00.000Z',
      '2026-08-15T11:00:00.000Z',
    ]);
  });

  it('allows exactly 366 generated dates', () => {
    const dates = generateOccurrenceDates({
      startsAt: new Date('2026-01-01T12:00:00.000Z'),
      timeZone: 'UTC',
      recurrenceRule: 'FREQ=DAILY',
      windowStart: new Date('2026-01-01T00:00:00.000Z'),
      windowEnd: new Date('2027-01-01T12:00:00.000Z'),
    });

    expect(dates).toHaveLength(366);
  });

  it('rejects more than 366 generated dates', () => {
    expect(() =>
      generateOccurrenceDates({
        startsAt: new Date('2026-01-01T12:00:00.000Z'),
        timeZone: 'UTC',
        recurrenceRule: 'FREQ=DAILY',
        windowStart: new Date('2026-01-01T00:00:00.000Z'),
        windowEnd: new Date('2027-01-02T12:00:00.000Z'),
      }),
    ).toThrow(BadRequestException);
  });

  it('stops an extreme range while evaluating the 367th occurrence', () => {
    const originalBetween = RRule.prototype.between;
    let evaluatedOccurrences = 0;
    const betweenSpy = jest
      .spyOn(RRule.prototype, 'between')
      .mockImplementation(function (
        this: RRule,
        after: Date,
        before: Date,
        inc?: boolean,
        iterator?: (date: Date, length: number) => boolean,
      ) {
        if (!iterator) {
          throw new Error('between was called without a bounded iterator');
        }

        return originalBetween.call(
          this,
          after,
          before,
          inc,
          (date, length) => {
            evaluatedOccurrences += 1;
            return iterator(date, length);
          },
        );
      });

    try {
      expect(() =>
        generateOccurrenceDates({
          startsAt: new Date('1900-01-01T12:00:00.000Z'),
          timeZone: 'UTC',
          recurrenceRule: 'FREQ=DAILY',
          windowStart: new Date('1900-01-01T00:00:00.000Z'),
          windowEnd: new Date('9999-12-31T23:59:59.999Z'),
        }),
      ).toThrow(BadRequestException);
      expect(evaluatedOccurrences).toBe(367);
    } finally {
      betweenSpy.mockRestore();
    }
  });

  it('rejects an invalid IANA time zone', () => {
    expect(() =>
      generateOccurrenceDates({
        startsAt: new Date('2026-08-13T11:00:00.000Z'),
        timeZone: 'Invalid/Time_Zone',
        windowStart: new Date('2026-08-13T00:00:00.000Z'),
        windowEnd: new Date('2026-08-13T23:59:59.999Z'),
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects an invalid window range', () => {
    expect(() =>
      generateOccurrenceDates({
        startsAt: new Date('2026-08-13T11:00:00.000Z'),
        timeZone: 'America/Sao_Paulo',
        windowStart: new Date('2026-08-14T00:00:00.000Z'),
        windowEnd: new Date('2026-08-13T23:59:59.999Z'),
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects endsAt before startsAt', () => {
    expect(() =>
      generateOccurrenceDates({
        startsAt: new Date('2026-08-13T11:00:00.000Z'),
        endsAt: new Date('2026-08-12T11:00:00.000Z'),
        timeZone: 'America/Sao_Paulo',
        windowStart: new Date('2026-08-13T00:00:00.000Z'),
        windowEnd: new Date('2026-08-13T23:59:59.999Z'),
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid Date values', () => {
    expect(() =>
      generateOccurrenceDates({
        startsAt: new Date('invalid'),
        timeZone: 'America/Sao_Paulo',
        windowStart: new Date('2026-08-13T00:00:00.000Z'),
        windowEnd: new Date('2026-08-13T23:59:59.999Z'),
      }),
    ).toThrow(BadRequestException);
  });
});

describe('validateRecurrenceRule', () => {
  it.each([
    'FREQ=DAILY',
    'FREQ=DAILY;INTERVAL=30',
    'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE',
  ])('accepts supported recurrence %s', (rule) => {
    expect(() => validateRecurrenceRule(rule)).not.toThrow();
  });

  it.each(['HOURLY', 'MINUTELY', 'SECONDLY'])(
    'rejects %s recurrence',
    (frequency) => {
      expect(() =>
        validateRecurrenceRule(`FREQ=${frequency};INTERVAL=1`),
      ).toThrow(BadRequestException);
    },
  );

  it.each(['MONTHLY', 'YEARLY'])(
    'rejects unsupported %s recurrence',
    (frequency) => {
      expect(() => validateRecurrenceRule(`FREQ=${frequency}`)).toThrow(
        BadRequestException,
      );
    },
  );

  it.each([0, 31])(
    'rejects interval %s outside the allowed range',
    (interval) => {
      expect(() =>
        validateRecurrenceRule(`FREQ=DAILY;INTERVAL=${interval}`),
      ).toThrow(BadRequestException);
    },
  );

  it('rejects weekly recurrence without BYDAY', () => {
    expect(() => validateRecurrenceRule('FREQ=WEEKLY;INTERVAL=1')).toThrow(
      BadRequestException,
    );
  });

  it('rejects COUNT', () => {
    expect(() => validateRecurrenceRule('FREQ=DAILY;COUNT=3')).toThrow(
      BadRequestException,
    );
  });

  it('rejects malformed recurrence rules', () => {
    expect(() => validateRecurrenceRule('not-an-rrule')).toThrow(
      BadRequestException,
    );
  });
});
