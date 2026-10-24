import { BadRequestException } from '@nestjs/common';
import {
  normalizeDraftContent,
  toFinalizedWorkoutInput,
} from './workout-draft-content';
import { suggestPeriodization } from './workout-periodization';

const base = {
  title: 'P3',
  durationWeeks: 8,
  splits: [
    {
      name: 'A',
      weeklyFrequency: 2,
      exercises: [
        {
          name: 'Supino',
          sets: '4',
          reps: '8',
          muscleGroup: 'CHEST' as const,
          secondaryMuscles: [{ muscleGroup: 'TRICEPS', weight: 0.5 }],
        },
      ],
    },
  ],
};
describe('P3 draft/finalization contracts', () => {
  it('preserves pending phase values in drafts and rejects finalization', () => {
    const periodization = suggestPeriodization(8);
    periodization.phases[0].effortTarget = '';
    periodization.phases[0].endWeek = 0;
    const normalized = normalizeDraftContent({ ...base, periodization });
    expect(normalized.periodization).toEqual(periodization);
    expect(() =>
      toFinalizedWorkoutInput(
        '91000000-0000-4000-8000-000000000001',
        normalized,
      ),
    ).toThrow(BadRequestException);
  });
  it('roundtrips frequency, secondary muscles and periodization', () => {
    const input = {
      ...base,
      periodization: { ...suggestPeriodization(8), startsOn: '2026-10-23' },
    };
    const normalized = normalizeDraftContent(input);
    expect(normalized).toMatchObject(input);
    expect(
      toFinalizedWorkoutInput(
        '91000000-0000-4000-8000-000000000001',
        normalized,
      ),
    ).toMatchObject(input);
  });
  it('accepts incomplete start date in draft and rejects finalization', () => {
    const input = { ...base, periodization: suggestPeriodization(8) };
    const normalized = normalizeDraftContent(input);
    expect(() =>
      toFinalizedWorkoutInput(
        '91000000-0000-4000-8000-000000000001',
        normalized,
      ),
    ).toThrow(BadRequestException);
  });
  it.each([0, 8, 1.5])('rejects frequency %s', (weeklyFrequency) => {
    expect(() =>
      normalizeDraftContent({
        ...base,
        splits: [{ ...base.splits[0], weeklyFrequency }],
      }),
    ).toThrow(BadRequestException);
  });
  it.each(
    [
      [{ muscleGroup: 'TRICEPS', weight: 0.2 }],
      [{ muscleGroup: 'CHEST', weight: 0.5 }],
      [
        { muscleGroup: 'TRICEPS', weight: 0.5 },
        { muscleGroup: 'TRICEPS', weight: 1 },
      ],
      [{ muscleGroup: 'UNKNOWN', weight: 0.5 }],
      [{ muscleGroup: 'TRICEPS', weight: 0.5, extra: 'forged' }],
    ].map((value) => [value] as const),
  )('rejects invalid secondary contributions %#', (secondaryMuscles) => {
    const input = {
      ...base,
      splits: [
        {
          ...base.splits[0],
          exercises: [{ ...base.splits[0].exercises[0], secondaryMuscles }],
        },
      ],
    };
    expect(() => normalizeDraftContent(input)).toThrow(BadRequestException);
  });
});
