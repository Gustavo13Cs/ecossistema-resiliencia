import type { PhysioScaleType, TugAssistiveDevice } from "@/types/physio"

export interface PhysioScaleDefinition {
  type: PhysioScaleType
  name: string
  shortName: string
  region: string
  description: string
  directionHint: string
}

export const PHYSIO_SCALE_DEFINITIONS: Record<
  PhysioScaleType,
  PhysioScaleDefinition
> = {
  PSFS: {
    type: "PSFS",
    name: "Escala Funcional Específica do Paciente (PSFS)",
    shortName: "PSFS",
    region: "Universal (qualquer queixa)",
    description:
      "O paciente pontua de 0 (incapaz) a 10 (nível pré-lesão) em até 5 atividades importantes com dificuldade.",
    directionHint: "Maior pontuação indica melhor função (0 a 10).",
  },
  OSWESTRY: {
    type: "OSWESTRY",
    name: "Índice de Incapacidade de Oswestry (ODI)",
    shortName: "Oswestry (ODI)",
    region: "Coluna Lombar",
    description:
      "Avalia o impacto da dor lombar em 10 domínios da vida diária (0 a 5 pontos por seção).",
    directionHint: "Menor percentual indica menor incapacidade (0% a 100%).",
  },
  NDI: {
    type: "NDI",
    name: "Índice de Incapacidade Cervical (NDI)",
    shortName: "NDI",
    region: "Coluna Cervical",
    description:
      "Avalia o impacto da dor cervical em 10 domínios funcionais (0 a 5 pontos por seção).",
    directionHint: "Menor percentual indica menor incapacidade (0% a 100%).",
  },
  LEFS: {
    type: "LEFS",
    name: "Escala Funcional de Extremidade Inferior (LEFS)",
    shortName: "LEFS",
    region: "Membros Inferiores",
    description:
      "20 atividades cotidianas e esportivas avaliadas de 0 (dificuldade extrema) a 4 (sem dificuldade).",
    directionHint: "Maior pontuação indica melhor função (0 a 80).",
  },
  SPADI: {
    type: "SPADI",
    name: "Índice de Dor e Incapacidade do Ombro (SPADI)",
    shortName: "SPADI",
    region: "Ombro",
    description:
      "5 itens de dor e 8 itens de incapacidade funcional pontuados de 0 a 10.",
    directionHint: "Menor percentual indica menor comprometimento (0% a 100%).",
  },
  TUG: {
    type: "TUG",
    name: "Timed Up and Go (TUG)",
    shortName: "TUG",
    region: "Mobilidade e Equilíbrio",
    description:
      "Tempo em segundos para levantar da cadeira, caminhar 3 metros, girar, retornar e sentar.",
    directionHint: "Menor tempo em segundos indica melhor mobilidade.",
  },
}

export const DISABILITY_SECTION_TITLES_OSWESTRY: readonly string[] = [
  "1. Intensidade da dor",
  "2. Cuidados pessoais (banho, vestir-se)",
  "3. Levantar objetos",
  "4. Caminhar",
  "5. Sentar",
  "6. Ficar em pé",
  "7. Dormir",
  "8. Vida sexual (se aplicável)",
  "9. Vida social",
  "10. Viajar / Locomoção",
]

export const DISABILITY_SECTION_TITLES_NDI: readonly string[] = [
  "1. Intensidade da dor cervical",
  "2. Cuidados pessoais",
  "3. Levantar peso",
  "4. Leitura",
  "5. Dores de cabeça",
  "6. Concentração",
  "7. Trabalho",
  "8. Dirigir (se aplicável)",
  "9. Dormir",
  "10. Lazer / Recreação",
]

export const DISABILITY_LEVEL_LABELS: readonly string[] = [
  "0 — Nenhuma dor / limitação",
  "1 — Muito leve",
  "2 — Moderada",
  "3 — Bastante intensa",
  "4 — Muito severa",
  "5 — Incapaz / Máxima",
]

export const LEFS_ITEMS: readonly string[] = [
  "1. Qualquer trabalho habitual, afazeres domésticos ou atividades escolares",
  "2. Seus hobbies habituais, atividades recreativas ou esportivas",
  "3. Entrar e sair do box/banheira",
  "4. Caminhar entre cômodos",
  "5. Calçar sapatos ou meias",
  "6. Ficar agachado",
  "7. Levantar um objeto, como uma sacola de compras do chão",
  "8. Realizar atividades leves em casa",
  "9. Realizar atividades pesadas em casa",
  "10. Entrar e sair de um carro",
  "11. Caminhar 2 quarteirões",
  "12. Caminhar 1,5 km (cerca de 15–20 min)",
  "13. Subir ou descer 10 degraus (1 lance de escadas)",
  "14. Ficar em pé por 1 hora",
  "15. Ficar sentado por 1 hora",
  "16. Correr em terreno plano",
  "17. Correr em terreno irregular",
  "18. Fazer mudanças bruscas de direção correndo rápido",
  "19. Dar saltos (pular)",
  "20. Rolar na cama",
]

export const LEFS_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: "0 — Extremamente difícil / Incapaz" },
  { value: 1, label: "1 — Bastante dificuldade" },
  { value: 2, label: "2 — Dificuldade moderada" },
  { value: 3, label: "3 — Pouca dificuldade" },
  { value: 4, label: "4 — Nenhuma dificuldade" },
]

export const SPADI_PAIN_ITEMS: readonly string[] = [
  "1. No pior momento da sua dor no ombro",
  "2. Ao deitar sobre o lado afetado",
  "3. Ao tentar alcançar algo em uma prateleira alta",
  "4. Ao colocar a mão atrás do pescoço",
  "5. Ao empurrar algo com o braço afetado",
]

export const SPADI_DISABILITY_ITEMS: readonly string[] = [
  "1. Lavar o cabelo",
  "2. Lavar as costas",
  "3. Vestir uma camiseta ou camisa pela cabeça",
  "4. Vestir uma camisa com botões na frente",
  "5. Vestir uma calça",
  "6. Colocar um objeto em uma prateleira alta",
  "7. Carregar um objeto pesado (cerca de 4,5 kg)",
  "8. Retirar algo do bolso de trás",
]

export const TUG_DEVICE_LABELS: Record<TugAssistiveDevice, string> = {
  NONE: "Sem dispositivo auxiliar",
  CANE: "Bengala",
  WALKER: "Andador",
  CRUTCHES: "Muletas",
}

export interface ScalePreviewResult {
  valid: boolean
  rawScore: number | null
  normalizedScore: number | null
  scoreUnit: string
  classification: string
  detail?: string
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function previewPhysioScaleScore(
  scaleType: PhysioScaleType,
  answers: Record<string, unknown>,
): ScalePreviewResult {
  if (scaleType === "PSFS") {
    const activities = Array.isArray(answers.activities)
      ? (answers.activities as Array<{ description?: string; score?: number }>)
      : []
    const validItems = activities.filter(
      (a) =>
        typeof a.description === "string" &&
        a.description.trim().length > 0 &&
        typeof a.score === "number" &&
        Number.isInteger(a.score) &&
        a.score >= 0 &&
        a.score <= 10,
    )
    if (validItems.length === 0 || validItems.length !== activities.length) {
      return {
        valid: false,
        rawScore: null,
        normalizedScore: null,
        scoreUnit: "/10",
        classification: "Preencha ao menos 1 atividade com nota de 0 a 10.",
      }
    }
    const avg = round1(
      validItems.reduce((acc, item) => acc + (item.score ?? 0), 0) /
        validItems.length,
    )
    return {
      valid: true,
      rawScore: avg,
      normalizedScore: round1(avg * 10),
      scoreUnit: "/10",
      classification:
        avg < 4
          ? "Limitação funcional acentuada"
          : avg < 7
            ? "Limitação funcional moderada"
            : "Boa capacidade funcional",
    }
  }

  if (scaleType === "OSWESTRY" || scaleType === "NDI") {
    const sections = Array.isArray(answers.sections)
      ? (answers.sections as Array<number | null>)
      : []
    const answered = sections.filter(
      (v): v is number => typeof v === "number" && Number.isInteger(v),
    )
    if (sections.length !== 10 || answered.length < 8) {
      return {
        valid: false,
        rawScore: null,
        normalizedScore: null,
        scoreUnit: "%",
        classification: `Responda pelo menos 8 de 10 seções (${answered.length}/10 respondidas).`,
      }
    }
    const sum = answered.reduce((acc, v) => acc + v, 0)
    const pct = round1((sum / (answered.length * 5)) * 100)
    const classification =
      scaleType === "OSWESTRY"
        ? pct <= 20
          ? "Incapacidade mínima"
          : pct <= 40
            ? "Incapacidade moderada"
            : pct <= 60
              ? "Incapacidade intensa"
              : pct <= 80
                ? "Incapacidade severa"
                : "Incapacidade máxima"
        : pct < 10
          ? "Sem incapacidade"
          : pct < 30
            ? "Incapacidade leve"
            : pct < 50
              ? "Incapacidade moderada"
              : pct < 70
                ? "Incapacidade severa"
                : "Incapacidade completa"

    return {
      valid: true,
      rawScore: sum,
      normalizedScore: pct,
      scoreUnit: "%",
      classification,
      detail: `${sum} pts em ${answered.length * 5} possíveis`,
    }
  }

  if (scaleType === "LEFS") {
    const items = Array.isArray(answers.items)
      ? (answers.items as Array<number | null>)
      : []
    if (
      items.length !== 20 ||
      items.some((v) => typeof v !== "number" || v < 0 || v > 4)
    ) {
      return {
        valid: false,
        rawScore: null,
        normalizedScore: null,
        scoreUnit: "/80",
        classification: "Responda todos os 20 itens da escala LEFS.",
      }
    }
    const sum = (items as number[]).reduce((acc, v) => acc + v, 0)
    return {
      valid: true,
      rawScore: sum,
      normalizedScore: round1((sum / 80) * 100),
      scoreUnit: "/80",
      classification:
        sum < 20
          ? "Limitação funcional muito severa"
          : sum < 40
            ? "Limitação funcional severa"
            : sum < 60
              ? "Limitação funcional moderada"
              : sum < 72
                ? "Limitação funcional leve"
                : "Função próxima ao normal",
    }
  }

  if (scaleType === "SPADI") {
    const painItems = Array.isArray(answers.painItems)
      ? (answers.painItems as number[])
      : []
    const disabilityItems = Array.isArray(answers.disabilityItems)
      ? (answers.disabilityItems as number[])
      : []
    if (painItems.length !== 5 || disabilityItems.length !== 8) {
      return {
        valid: false,
        rawScore: null,
        normalizedScore: null,
        scoreUnit: "%",
        classification: "Preencha os 5 itens de dor e 8 de incapacidade.",
      }
    }
    const painSub = round1(
      (painItems.reduce((a, b) => a + b, 0) / 50) * 100,
    )
    const disSub = round1(
      (disabilityItems.reduce((a, b) => a + b, 0) / 80) * 100,
    )
    const total = round1((painSub + disSub) / 2)
    return {
      valid: true,
      rawScore: total,
      normalizedScore: total,
      scoreUnit: "%",
      classification:
        total <= 20
          ? "Comprometimento mínimo"
          : total <= 40
            ? "Comprometimento leve a moderado"
            : total <= 60
              ? "Comprometimento moderado a intenso"
              : total <= 80
                ? "Comprometimento severo"
                : "Comprometimento extremo",
      detail: `Dor ${painSub}% · Incapacidade ${disSub}%`,
    }
  }

  // TUG
  const timeSeconds =
    typeof answers.timeSeconds === "number" ? answers.timeSeconds : NaN
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0.1 || timeSeconds > 300) {
    return {
      valid: false,
      rawScore: null,
      normalizedScore: null,
      scoreUnit: "s",
      classification: "Informe o tempo em segundos (0,1 a 300).",
    }
  }
  const rounded = round1(timeSeconds)
  return {
    valid: true,
    rawScore: rounded,
    normalizedScore: rounded,
    scoreUnit: "s",
    classification:
      rounded < 10
        ? "Mobilidade normal e independente"
        : rounded <= 13.5
          ? "Bom equilíbrio funcional"
          : rounded <= 20
            ? "Mobilidade reduzida / risco moderado de queda"
            : "Mobilidade comprometida / alto risco de queda",
  }
}
