import {
  BadRequestException,
  PayloadTooLargeException,
  ValidationPipe,
} from '@nestjs/common';
import { EffortType } from '@prisma/client';
import {
  normalizeDraftContent,
  assertDraftContentSize,
  toFinalizedWorkoutInput,
} from './workout-draft-content';
import {
  CreateWorkoutDraftDto,
  DraftContentDto,
  RebaseWorkoutDraftDto,
  SaveWorkoutDraftDto,
} from './dto/workout-draft.dto';

const clientId = '91000000-0000-4000-8000-000000000001';
const complete = () => ({
  title: ' Treino ',
  splits: [
    {
      name: ' A ',
      exercises: [{ name: ' Agachamento ', sets: ' 3 ', reps: ' 10 ' }],
    },
  ],
});
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const parse = (metatype: new () => object, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype });

describe('Workout draft content V1', () => {
  it('normalizes_empty_fields_without_inventing_exercises', () => {
    expect(normalizeDraftContent({ title: '', splits: [] })).toEqual({
      title: '',
      goal: '',
      durationWeeks: null,
      notes: '',
      splits: [],
    });
    expect(
      normalizeDraftContent({
        title: '   ',
        splits: [{ name: '', exercises: [] }],
      }).splits,
    ).toEqual([{ name: '', focus: '', exercises: [] }]);
  });
  it('preserves incomplete exercises and pending effort without coercing duration', () => {
    const result = normalizeDraftContent({
      title: '',
      splits: [
        {
          name: '',
          exercises: [{ name: ' B ', effortTarget: ' 2 ' }, { name: '' }],
        },
      ],
    });
    expect(result.splits[0].exercises[0]).toEqual({
      name: 'B',
      sets: '',
      reps: '',
      rest: '',
      notes: '',
      load: '',
      effortType: null,
      effortTarget: '2',
      tempo: '',
      method: null,
      muscleGroup: null,
    });
    expect(result.splits[0].exercises[1].name).toBe('');
    expect(() =>
      normalizeDraftContent({
        title: '',
        splits: [],
        durationWeeks: '',
      } as unknown as DraftContentDto),
    ).toThrow(BadRequestException);
  });
  it.each(['x', 'é', '🙂'])(
    'rejects_payload_above_65536_bytes (%s)',
    (character) => {
      const content = normalizeDraftContent({ title: '', splits: [] });
      const overhead = Buffer.byteLength(JSON.stringify(content));
      content.notes = character.repeat(
        Math.floor((65536 - overhead) / Buffer.byteLength(character)),
      );
      expect(() => assertDraftContentSize(content)).not.toThrow();
      content.notes += character;
      expect(() => assertDraftContentSize(content)).toThrow(
        PayloadTooLargeException,
      );
      try {
        assertDraftContentSize(content);
      } catch (error) {
        expect((error as PayloadTooLargeException).getStatus()).toBe(413);
      }
    },
  );
  it.each([
    { title: '', splits: [] },
    { title: 'x', splits: [{ name: '', exercises: [] }] },
    {
      title: 'x',
      splits: [
        { name: 'A', exercises: [{ name: ' ', sets: '3', reps: '10' }] },
      ],
    },
    {
      title: 'x',
      splits: [{ name: 'A', exercises: [{ name: 'x', sets: '', reps: '10' }] }],
    },
    {
      title: 'x',
      splits: [{ name: 'A', exercises: [{ name: 'x', sets: '3', reps: '' }] }],
    },
    {
      title: 'x',
      splits: [
        {
          name: 'A',
          exercises: [{ name: 'x', sets: '3', reps: '10', effortTarget: '2' }],
        },
      ],
    },
    {
      title: 'x',
      splits: [
        {
          name: 'A',
          exercises: [
            { name: 'x', sets: '3', reps: '10', effortType: EffortType.RIR },
          ],
        },
      ],
    },
  ])('finalization_requires_name_sets_reps_and_effort_pair %#', (input) => {
    expect(() =>
      toFinalizedWorkoutInput(clientId, normalizeDraftContent(input)),
    ).toThrow(BadRequestException);
  });
  it('converts complete content to the existing creation contract', () => {
    const dto = toFinalizedWorkoutInput(
      clientId,
      normalizeDraftContent(complete()),
    );
    expect(dto).toMatchObject({
      clientId,
      title: 'Treino',
      splits: [
        {
          name: 'A',
          exercises: [{ name: 'Agachamento', sets: '3', reps: '10' }],
        },
      ],
    });
    expect(dto.durationWeeks).toBeUndefined();
    expect(dto.splits[0].exercises[0].tempo).toBeUndefined();
  });
  it.each([
    { title: '', splits: [], professionalId: clientId },
    { title: '', splits: [{ name: '', exercises: [], id: clientId }] },
    { title: '', splits: [{ name: '', exercises: [{ name: '', clientId }] }] },
    { title: '', splits: [], durationWeeks: 0 },
    { title: '', splits: [], durationWeeks: 105 },
    { title: '', splits: [], durationWeeks: 1.5 },
    { title: '', splits: [[]] },
    { title: '', splits: [{ name: '', exercises: [[]] }] },
    { title: null, splits: [] },
    { title: '', splits: null },
    { title: '', splits: [{ name: '', exercises: [{ method: 'INVALID' }] }] },
    { title: '', splits: [{ name: '', exercises: [{ tempo: 'bad' }] }] },
  ])('rejects malformed structure and untrusted fields %#', (input) => {
    expect(() =>
      normalizeDraftContent(input as unknown as DraftContentDto),
    ).toThrow(BadRequestException);
  });
  it.each([
    ['title', 200],
    ['goal', 1000],
    ['notes', 5000],
  ] as const)('enforces %s maximum', (field, max) => {
    expect(() =>
      normalizeDraftContent({
        title: '',
        splits: [],
        [field]: 'x'.repeat(max + 1),
      }),
    ).toThrow(BadRequestException);
  });
  it.each([
    ['name', 200],
    ['sets', 100],
    ['reps', 100],
    ['rest', 100],
    ['load', 100],
    ['notes', 2000],
    ['effortTarget', 20],
    ['tempo', 20],
  ] as const)('enforces exercise %s maximum', (field, max) => {
    expect(() =>
      normalizeDraftContent({
        title: '',
        splits: [{ name: '', exercises: [{ [field]: 'x'.repeat(max + 1) }] }],
      }),
    ).toThrow(BadRequestException);
  });
  it('enforces split and array limits', () => {
    for (const splits of [
      Array.from({ length: 31 }, () => ({ name: '', exercises: [] })),
      [{ name: 'x'.repeat(201), exercises: [] }],
      [{ name: '', focus: 'x'.repeat(501), exercises: [] }],
      [{ name: '', exercises: Array.from({ length: 101 }, () => ({})) }],
    ]) {
      expect(() => normalizeDraftContent({ title: '', splits })).toThrow(
        BadRequestException,
      );
    }
  });
  it('requires exactly one creation source and forbids external ownership/base', async () => {
    await expect(
      parse(CreateWorkoutDraftDto, {
        clientId,
        content: { title: '', splits: [] },
      }),
    ).resolves.toBeInstanceOf(CreateWorkoutDraftDto);
    await expect(
      parse(CreateWorkoutDraftDto, { clientId, sourceWorkoutId: clientId }),
    ).resolves.toBeInstanceOf(CreateWorkoutDraftDto);
    for (const value of [
      { clientId },
      {
        clientId,
        content: { title: '', splits: [] },
        sourceWorkoutId: clientId,
      },
      { clientId, content: null },
      { clientId, sourceWorkoutId: null },
      {
        clientId,
        content: { title: '', splits: [] },
        professionalId: clientId,
      },
      { clientId, sourceWorkoutId: clientId, baseActiveWorkoutId: clientId },
    ]) {
      await expect(parse(CreateWorkoutDraftDto, value)).rejects.toThrow(
        BadRequestException,
      );
    }
  });
  it('requires integer versions and explicit nullable rebase target', async () => {
    await expect(
      parse(SaveWorkoutDraftDto, {
        expectedVersion: 1,
        content: { title: '', splits: [] },
      }),
    ).resolves.toBeInstanceOf(SaveWorkoutDraftDto);
    for (const expectedVersion of [undefined, null, 0, 1.5, '1'])
      await expect(
        parse(SaveWorkoutDraftDto, {
          expectedVersion,
          content: { title: '', splits: [] },
        }),
      ).rejects.toThrow(BadRequestException);
    await expect(
      parse(RebaseWorkoutDraftDto, {
        expectedVersion: 1,
        expectedActiveWorkoutId: null,
      }),
    ).resolves.toBeInstanceOf(RebaseWorkoutDraftDto);
    await expect(
      parse(RebaseWorkoutDraftDto, { expectedVersion: 1 }),
    ).rejects.toThrow(BadRequestException);
  });
});
