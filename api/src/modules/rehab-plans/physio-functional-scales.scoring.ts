import { BadRequestException } from '@nestjs/common';
import { PhysioScaleType } from '@prisma/client';

export type ScoredPhysioScaleResult = {
  canonicalAnswers: Record<string, unknown>;
  rawScore: number;
  normalizedScore: number;
  scoreUnit: string;
  classification: string;
};

const TUG_DEVICES = ['NONE', 'CANE', 'WALKER', 'CRUTCHES'] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function assertIntegerInRange(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new BadRequestException(
      `${label} deve ser um número inteiro entre ${min} e ${max}.`,
    );
  }
  return value;
}

function scoreSectionDisabilityScale(
  scaleName: 'OSWESTRY' | 'NDI',
  rawAnswers: Record<string, unknown>,
): ScoredPhysioScaleResult {
  const rawSections = rawAnswers.sections;
  if (!Array.isArray(rawSections) || rawSections.length !== 10) {
    throw new BadRequestException(
      `${scaleName} exige exatamente 10 seções (use null para seção não aplicável).`,
    );
  }

  let sum = 0;
  let answered = 0;
  const sections: (number | null)[] = rawSections.map((value, idx) => {
    if (value === null || value === undefined) return null;
    const score = assertIntegerInRange(
      value,
      0,
      5,
      `${scaleName} seção ${idx + 1}`,
    );
    sum += score;
    answered += 1;
    return score;
  });

  if (answered < 8) {
    throw new BadRequestException(
      `${scaleName} exige pelo menos 8 seções respondidas para cálculo válido.`,
    );
  }

  const pct = round1((sum / (answered * 5)) * 100);
  let classification: string;
  if (scaleName === 'OSWESTRY') {
    classification =
      pct <= 20
        ? 'Incapacidade mínima'
        : pct <= 40
          ? 'Incapacidade moderada'
          : pct <= 60
            ? 'Incapacidade intensa'
            : pct <= 80
              ? 'Incapacidade severa'
              : 'Incapacidade máxima';
  } else {
    classification =
      pct < 10
        ? 'Sem incapacidade'
        : pct < 30
          ? 'Incapacidade leve'
          : pct < 50
            ? 'Incapacidade moderada'
            : pct < 70
              ? 'Incapacidade severa'
              : 'Incapacidade completa';
  }

  return {
    canonicalAnswers: { sections, answeredCount: answered },
    rawScore: sum,
    normalizedScore: pct,
    scoreUnit: '%',
    classification,
  };
}

export function scorePhysioFunctionalScale(
  scaleType: PhysioScaleType,
  rawAnswers: Record<string, unknown>,
): ScoredPhysioScaleResult {
  switch (scaleType) {
    case 'PSFS': {
      const rawActivities = rawAnswers.activities;
      if (
        !Array.isArray(rawActivities) ||
        rawActivities.length < 1 ||
        rawActivities.length > 5
      ) {
        throw new BadRequestException(
          'PSFS exige entre 1 e 5 atividades funcionais.',
        );
      }
      let sum = 0;
      const activities = rawActivities.map((entry, idx) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          throw new BadRequestException(`Atividade ${idx + 1} inválida.`);
        }
        const record = entry as Record<string, unknown>;
        const description =
          typeof record.description === 'string'
            ? record.description.trim()
            : '';
        if (!description || description.length > 200) {
          throw new BadRequestException(
            `Informe uma descrição válida (até 200 caracteres) para a atividade ${idx + 1}.`,
          );
        }
        const score = assertIntegerInRange(
          record.score,
          0,
          10,
          `Pontuação da atividade "${description}"`,
        );
        sum += score;
        return { description, score };
      });

      const avg = round1(sum / activities.length);
      const classification =
        avg < 4
          ? 'Limitação funcional acentuada'
          : avg < 7
            ? 'Limitação funcional moderada'
            : 'Boa capacidade funcional';

      return {
        canonicalAnswers: { activities },
        rawScore: avg,
        normalizedScore: round1(avg * 10),
        scoreUnit: '/10',
        classification,
      };
    }

    case 'OSWESTRY':
      return scoreSectionDisabilityScale('OSWESTRY', rawAnswers);

    case 'NDI':
      return scoreSectionDisabilityScale('NDI', rawAnswers);

    case 'LEFS': {
      const rawItems = rawAnswers.items;
      if (!Array.isArray(rawItems) || rawItems.length !== 20) {
        throw new BadRequestException(
          'LEFS exige exatamente 20 itens respondidos.',
        );
      }
      let sum = 0;
      const items = rawItems.map((val, idx) => {
        const score = assertIntegerInRange(val, 0, 4, `LEFS item ${idx + 1}`);
        sum += score;
        return score;
      });
      const pct = round1((sum / 80) * 100);
      const classification =
        sum < 20
          ? 'Limitação funcional muito severa'
          : sum < 40
            ? 'Limitação funcional severa'
            : sum < 60
              ? 'Limitação funcional moderada'
              : sum < 72
                ? 'Limitação funcional leve'
                : 'Função próxima ao normal';

      return {
        canonicalAnswers: { items },
        rawScore: sum,
        normalizedScore: pct,
        scoreUnit: '/80',
        classification,
      };
    }

    case 'SPADI': {
      const rawPain = rawAnswers.painItems;
      const rawDisability = rawAnswers.disabilityItems;
      if (!Array.isArray(rawPain) || rawPain.length !== 5) {
        throw new BadRequestException(
          'SPADI exige exatamente 5 itens na subescala de dor.',
        );
      }
      if (!Array.isArray(rawDisability) || rawDisability.length !== 8) {
        throw new BadRequestException(
          'SPADI exige exatamente 8 itens na subescala de incapacidade.',
        );
      }
      let painSum = 0;
      const painItems = rawPain.map((val, idx) => {
        const score = assertIntegerInRange(val, 0, 10, `SPADI dor ${idx + 1}`);
        painSum += score;
        return score;
      });
      let disabilitySum = 0;
      const disabilityItems = rawDisability.map((val, idx) => {
        const score = assertIntegerInRange(
          val,
          0,
          10,
          `SPADI incapacidade ${idx + 1}`,
        );
        disabilitySum += score;
        return score;
      });

      const painSubscore = round1((painSum / 50) * 100);
      const disabilitySubscore = round1((disabilitySum / 80) * 100);
      const total = round1((painSubscore + disabilitySubscore) / 2);
      const classification =
        total <= 20
          ? 'Comprometimento mínimo'
          : total <= 40
            ? 'Comprometimento leve a moderado'
            : total <= 60
              ? 'Comprometimento moderado a intenso'
              : total <= 80
                ? 'Comprometimento severo'
                : 'Comprometimento extremo';

      return {
        canonicalAnswers: {
          painItems,
          disabilityItems,
          painSubscore,
          disabilitySubscore,
        },
        rawScore: total,
        normalizedScore: total,
        scoreUnit: '%',
        classification,
      };
    }

    case 'TUG': {
      const timeSeconds = rawAnswers.timeSeconds;
      if (
        typeof timeSeconds !== 'number' ||
        !Number.isFinite(timeSeconds) ||
        timeSeconds < 0.1 ||
        timeSeconds > 300
      ) {
        throw new BadRequestException(
          'TUG exige tempo em segundos entre 0,1 e 300.',
        );
      }
      const assistiveDevice = rawAnswers.assistiveDevice;
      if (
        typeof assistiveDevice !== 'string' ||
        !(TUG_DEVICES as readonly string[]).includes(assistiveDevice)
      ) {
        throw new BadRequestException(
          'Informe o dispositivo auxiliar do TUG (NONE, CANE, WALKER ou CRUTCHES).',
        );
      }
      const rounded = round1(timeSeconds);
      const classification =
        rounded < 10
          ? 'Mobilidade normal e independente'
          : rounded <= 13.5
            ? 'Bom equilíbrio funcional'
            : rounded <= 20
              ? 'Mobilidade reduzida / risco moderado de queda'
              : 'Mobilidade comprometida / alto risco de queda';

      return {
        canonicalAnswers: {
          timeSeconds: rounded,
          assistiveDevice,
        },
        rawScore: rounded,
        normalizedScore: rounded,
        scoreUnit: 's',
        classification,
      };
    }
  }
}
