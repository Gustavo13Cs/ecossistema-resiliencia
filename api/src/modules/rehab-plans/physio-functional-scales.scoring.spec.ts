import { BadRequestException } from '@nestjs/common';
import { scorePhysioFunctionalScale } from './physio-functional-scales.scoring';

describe('scorePhysioFunctionalScale', () => {
  it('scores PSFS accurately across 1 to 5 activities', () => {
    const scored = scorePhysioFunctionalScale('PSFS', {
      activities: [
        { description: '  Subir escadas  ', score: 4 },
        { description: 'Correr 15 min', score: 6 },
      ],
    });
    expect(scored).toEqual({
      canonicalAnswers: {
        activities: [
          { description: 'Subir escadas', score: 4 },
          { description: 'Correr 15 min', score: 6 },
        ],
      },
      rawScore: 5,
      normalizedScore: 50,
      scoreUnit: '/10',
      classification: 'Limitação funcional moderada',
    });
  });

  it('scores Oswestry (ODI) allowing up to 2 omitted sections', () => {
    const scored = scorePhysioFunctionalScale('OSWESTRY', {
      sections: [2, 1, 2, 1, 1, 2, 1, null, 2, 1],
    });
    expect(scored.rawScore).toBe(13);
    expect(scored.normalizedScore).toBe(28.9);
    expect(scored.scoreUnit).toBe('%');
    expect(scored.classification).toBe('Incapacidade moderada');

    expect(() =>
      scorePhysioFunctionalScale('OSWESTRY', {
        sections: [1, 1, 1, 1, 1, 1, 1, null, null, null],
      }),
    ).toThrow(BadRequestException);
  });

  it('scores NDI with cervical classification thresholds', () => {
    const scored = scorePhysioFunctionalScale('NDI', {
      sections: [1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
    });
    expect(scored.rawScore).toBe(7);
    expect(scored.normalizedScore).toBe(14);
    expect(scored.classification).toBe('Incapacidade leve');
  });

  it('scores LEFS across 20 items (0..80)', () => {
    const scored = scorePhysioFunctionalScale('LEFS', {
      items: Array.from({ length: 20 }, () => 3),
    });
    expect(scored.rawScore).toBe(60);
    expect(scored.normalizedScore).toBe(75);
    expect(scored.scoreUnit).toBe('/80');
    expect(scored.classification).toBe('Limitação funcional leve');

    expect(() => scorePhysioFunctionalScale('LEFS', { items: [3, 3] })).toThrow(
      BadRequestException,
    );
  });

  it('scores SPADI pain and disability subscores', () => {
    const scored = scorePhysioFunctionalScale('SPADI', {
      painItems: [6, 6, 6, 6, 6], // 30/50 = 60%
      disabilityItems: [4, 4, 4, 4, 4, 4, 4, 4], // 32/80 = 40%
    });
    expect(scored.rawScore).toBe(50);
    expect(scored.normalizedScore).toBe(50);
    expect(scored.canonicalAnswers).toMatchObject({
      painSubscore: 60,
      disabilitySubscore: 40,
    });
    expect(scored.classification).toBe('Comprometimento moderado a intenso');
  });

  it('scores TUG seconds and mobility risk thresholds', () => {
    const scored = scorePhysioFunctionalScale('TUG', {
      timeSeconds: 14.24,
      assistiveDevice: 'CANE',
    });
    expect(scored.rawScore).toBe(14.2);
    expect(scored.normalizedScore).toBe(14.2);
    expect(scored.scoreUnit).toBe('s');
    expect(scored.classification).toBe(
      'Mobilidade reduzida / risco moderado de queda',
    );

    expect(() =>
      scorePhysioFunctionalScale('TUG', {
        timeSeconds: 0,
        assistiveDevice: 'NONE',
      }),
    ).toThrow(BadRequestException);
  });
});
