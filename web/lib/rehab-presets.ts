import type {
  RehabItemCategory,
  RehabModalityParams,
  RehabPlan,
  RehabSession,
} from "@/hooks/features/useFisio"

export interface ModalityPreset {
  id: string
  label: string
  category: "ELECTROTHERAPY" | "THERMOTHERAPY"
  defaultName: string
  sets: string
  reps: string
  params: RehabModalityParams
}

export const ELECTRO_THERMO_PRESETS: readonly ModalityPreset[] = [
  {
    id: "tens-convencional",
    label: "TENS Convencional",
    category: "ELECTROTHERAPY",
    defaultName: "TENS Convencional (Analgesia)",
    sets: "20 min",
    reps: "Contínuo",
    params: {
      modality: "TENS",
      frequency: "100 Hz",
      pulseWidth: "80 µs",
      intensity: "Limiar sensitivo forte e confortável",
      emissionMode: "Convencional contínuo",
      durationMinutes: 20,
    },
  },
  {
    id: "tens-vif",
    label: "TENS VIF / Burst",
    category: "ELECTROTHERAPY",
    defaultName: "TENS Modulado (VIF)",
    sets: "20 min",
    reps: "Modulado",
    params: {
      modality: "TENS",
      frequency: "80 Hz",
      pulseWidth: "150 µs",
      intensity: "Sensitivo sem fasciculação excessiva",
      emissionMode: "VIF (Variação de Intensidade e Frequência)",
      durationMinutes: 20,
    },
  },
  {
    id: "fes",
    label: "FES (Eletroestimulação Funcional)",
    category: "ELECTROTHERAPY",
    defaultName: "FES (Ativação Muscular)",
    sets: "20 min",
    reps: "10s ON / 10s OFF",
    params: {
      modality: "FES",
      frequency: "50 Hz",
      pulseWidth: "300 µs",
      intensity: "Contração muscular visível e indolor",
      emissionMode: "Síncrono 10s ON / 10s OFF",
      durationMinutes: 20,
    },
  },
  {
    id: "corrente-russa",
    label: "Corrente Russa",
    category: "ELECTROTHERAPY",
    defaultName: "Corrente Russa (Fortalecimento)",
    sets: "15 min",
    reps: "10s ON / 20s OFF",
    params: {
      modality: "Corrente Russa",
      frequency: "2500 Hz (burst 50 Hz)",
      pulseWidth: "200 µs",
      intensity: "Contração motora submáxima",
      emissionMode: "Recíproco / Burst 50 Hz",
      durationMinutes: 15,
    },
  },
  {
    id: "corrente-aussie",
    label: "Corrente Aussie",
    category: "ELECTROTHERAPY",
    defaultName: "Corrente Aussie",
    sets: "20 min",
    reps: "Contínuo / 10s ON",
    params: {
      modality: "Corrente Aussie",
      frequency: "1000 Hz / 4000 Hz",
      pulseWidth: "Burst 2 ms / 4 ms",
      intensity: "Conforme objetivo motor ou analgésico",
      emissionMode: "Burst modulado 50 Hz / 100 Hz",
      durationMinutes: 20,
    },
  },
  {
    id: "ultrassom-1mhz",
    label: "Ultrassom 1 MHz (Profundo)",
    category: "ELECTROTHERAPY",
    defaultName: "Ultrassom Terapêutico 1 MHz",
    sets: "6 min",
    reps: "Pulsado 50%",
    params: {
      modality: "Ultrassom Terapêutico",
      frequency: "1 MHz",
      intensity: "0,8 W/cm²",
      emissionMode: "Pulsado 50% (subagudo)",
      durationMinutes: 6,
    },
  },
  {
    id: "ultrassom-3mhz",
    label: "Ultrassom 3 MHz (Superficial)",
    category: "ELECTROTHERAPY",
    defaultName: "Ultrassom Terapêutico 3 MHz",
    sets: "5 min",
    reps: "Pulsado 20%",
    params: {
      modality: "Ultrassom Terapêutico",
      frequency: "3 MHz",
      intensity: "0,6 W/cm²",
      emissionMode: "Pulsado 20%",
      durationMinutes: 5,
    },
  },
  {
    id: "laser",
    label: "Laser de Baixa Potência",
    category: "ELECTROTHERAPY",
    defaultName: "Fotobiomodulação / Laserterapia",
    sets: "4 min",
    reps: "Pontual",
    params: {
      modality: "Laserterapia",
      frequency: "660 nm / 808 nm",
      intensity: "4 J por ponto",
      emissionMode: "Pontual em contato",
      durationMinutes: 4,
    },
  },
  {
    id: "crioterapia",
    label: "Crioterapia (Gelo)",
    category: "THERMOTHERAPY",
    defaultName: "Crioterapia Compressiva",
    sets: "20 min",
    reps: "Contínuo",
    params: {
      modality: "Crioterapia",
      emissionMode: "Compressa fria protegida por tecido",
      durationMinutes: 20,
    },
  },
  {
    id: "termoterapia",
    label: "Termoterapia Superficial",
    category: "THERMOTHERAPY",
    defaultName: "Termoterapia Superficial (Calor)",
    sets: "15 min",
    reps: "Contínuo",
    params: {
      modality: "Termoterapia",
      intensity: "Calor morno agradável",
      emissionMode: "Bolsa térmica protegida por toalha",
      durationMinutes: 15,
    },
  },
]

export interface DraftRehabExercise {
  id: string
  name: string
  sets: string
  reps: string
  notes: string
  category: RehabItemCategory
  modalityParams: RehabModalityParams | null
  isHomeExercise: boolean
  homeFrequency: string
  patientInstructions: string
  catalogExerciseId: string | null
  demonstrationSnapshot: RehabSession["exercises"][number]["demonstrationSnapshot"]
}

export interface DraftRehabSession {
  id: string
  name: string
  focus: string
  progressionCriteria: string
  estimatedWeeks: string
  exercises: DraftRehabExercise[]
}

let draftCounter = 1
export function nextDraftId(prefix: string): string {
  draftCounter += 1
  return `${prefix}-${Date.now()}-${draftCounter}`
}

export function createEmptyExercise(): DraftRehabExercise {
  return {
    id: nextDraftId("ex"),
    name: "",
    sets: "",
    reps: "",
    notes: "",
    category: "KINESIOTHERAPY",
    modalityParams: null,
    isHomeExercise: false,
    homeFrequency: "",
    patientInstructions: "",
    catalogExerciseId: null,
    demonstrationSnapshot: null,
  }
}

export function cleanOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function cleanModalityParams(
  category: RehabItemCategory,
  params: RehabModalityParams | null,
): RehabModalityParams | undefined {
  if (category !== "ELECTROTHERAPY" && category !== "THERMOTHERAPY") {
    return undefined
  }
  const modality = params?.modality?.trim()
  if (!modality) return undefined
  const durationMinutes =
    params?.durationMinutes != null &&
    Number.isInteger(params.durationMinutes) &&
    params.durationMinutes >= 1
      ? Math.min(params.durationMinutes, 240)
      : undefined

  return {
    modality,
    ...(cleanOptionalText(params?.frequency ?? "")
      ? { frequency: cleanOptionalText(params?.frequency ?? "") }
      : {}),
    ...(cleanOptionalText(params?.pulseWidth ?? "")
      ? { pulseWidth: cleanOptionalText(params?.pulseWidth ?? "") }
      : {}),
    ...(cleanOptionalText(params?.intensity ?? "")
      ? { intensity: cleanOptionalText(params?.intensity ?? "") }
      : {}),
    ...(cleanOptionalText(params?.emissionMode ?? "")
      ? { emissionMode: cleanOptionalText(params?.emissionMode ?? "") }
      : {}),
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(cleanOptionalText(params?.applicationSite ?? "")
      ? { applicationSite: cleanOptionalText(params?.applicationSite ?? "") }
      : {}),
  }
}

export function serializeRehabBody(input: {
  title: string
  goal: string
  durationWeeks: number
  currentPhaseIndex: number
  notes: string
  sessions: DraftRehabSession[]
}) {
  const safePhaseIndex =
    input.currentPhaseIndex >= 0 && input.currentPhaseIndex < input.sessions.length
      ? input.currentPhaseIndex
      : 0

  return {
    title: input.title.trim(),
    ...(cleanOptionalText(input.goal) ? { goal: cleanOptionalText(input.goal) } : {}),
    ...(Number.isInteger(input.durationWeeks) && input.durationWeeks >= 1
      ? { durationWeeks: input.durationWeeks }
      : {}),
    currentPhaseIndex: safePhaseIndex,
    ...(cleanOptionalText(input.notes) ? { notes: cleanOptionalText(input.notes) } : {}),
    sessions: input.sessions.map(session => {
      const weeksNum = Number(session.estimatedWeeks)
      const validWeeks =
        session.estimatedWeeks.trim() && Number.isInteger(weeksNum) && weeksNum >= 1
          ? weeksNum
          : undefined
      return {
        name: session.name.trim(),
        ...(cleanOptionalText(session.focus)
          ? { focus: cleanOptionalText(session.focus) }
          : {}),
        ...(cleanOptionalText(session.progressionCriteria)
          ? { progressionCriteria: cleanOptionalText(session.progressionCriteria) }
          : {}),
        ...(validWeeks !== undefined ? { estimatedWeeks: validWeeks } : {}),
        exercises: session.exercises.map(ex => {
          const modalityParams = cleanModalityParams(ex.category, ex.modalityParams)
          const isHome = ex.category === "ELECTROTHERAPY" ? false : ex.isHomeExercise
          return {
            name: ex.name.trim(),
            ...(cleanOptionalText(ex.sets) ? { sets: cleanOptionalText(ex.sets) } : {}),
            ...(cleanOptionalText(ex.reps) ? { reps: cleanOptionalText(ex.reps) } : {}),
            ...(cleanOptionalText(ex.notes) ? { notes: cleanOptionalText(ex.notes) } : {}),
            category: ex.category,
            ...(modalityParams ? { modalityParams } : {}),
            isHomeExercise: isHome,
            ...(isHome && cleanOptionalText(ex.homeFrequency)
              ? { homeFrequency: cleanOptionalText(ex.homeFrequency) }
              : {}),
            ...(isHome && cleanOptionalText(ex.patientInstructions)
              ? { patientInstructions: cleanOptionalText(ex.patientInstructions) }
              : {}),
            ...(ex.catalogExerciseId ? { catalogExerciseId: ex.catalogExerciseId } : {}),
          }
        }),
      }
    }),
  }
}

export function mapPlanToDraftSessions(
  sessions: Array<{
    id?: string
    name: string
    focus?: string | null
    progressionCriteria?: string | null
    estimatedWeeks?: number | null
    exercises: Array<{
      id?: string
      name: string
      sets?: string | null
      reps?: string | null
      notes?: string | null
      category?: RehabItemCategory
      modalityParams?: RehabModalityParams | null
      isHomeExercise?: boolean
      homeFrequency?: string | null
      patientInstructions?: string | null
      catalogExerciseId?: string | null
      demonstrationSnapshot?: RehabSession["exercises"][number]["demonstrationSnapshot"]
    }>
  }>,
): DraftRehabSession[] {
  return sessions.map(s => ({
    id: s.id || nextDraftId("s"),
    name: s.name,
    focus: s.focus || "",
    progressionCriteria: s.progressionCriteria || "",
    estimatedWeeks: s.estimatedWeeks != null ? String(s.estimatedWeeks) : "",
    exercises: s.exercises.map(e => ({
      id: e.id || nextDraftId("ex"),
      name: e.name,
      sets: e.sets || "",
      reps: e.reps || "",
      notes: e.notes || "",
      category: e.category ?? "KINESIOTHERAPY",
      modalityParams: e.modalityParams ?? null,
      isHomeExercise: Boolean(e.isHomeExercise),
      homeFrequency: e.homeFrequency || "",
      patientInstructions: e.patientInstructions || "",
      catalogExerciseId: e.catalogExerciseId ?? null,
      demonstrationSnapshot: e.demonstrationSnapshot ?? null,
    })),
  }))
}

export function draftToPrintablePlan(input: {
  id: string
  title: string
  goal: string
  durationWeeks: number
  currentPhaseIndex: number
  notes: string
  sessions: DraftRehabSession[]
}): RehabPlan {
  return {
    id: input.id,
    title: input.title,
    goal: input.goal || null,
    durationWeeks: Number.isInteger(input.durationWeeks) ? input.durationWeeks : null,
    currentPhaseIndex: input.currentPhaseIndex,
    notes: input.notes || null,
    sessions: input.sessions.map((s, sIdx) => ({
      id: s.id,
      name: s.name,
      focus: s.focus || null,
      position: sIdx,
      progressionCriteria: s.progressionCriteria || null,
      estimatedWeeks: s.estimatedWeeks ? Number(s.estimatedWeeks) : null,
      exercises: s.exercises.map((e, eIdx) => ({
        id: e.id,
        name: e.name,
        sets: e.sets || null,
        reps: e.reps || null,
        notes: e.notes || null,
        position: eIdx,
        category: e.category,
        modalityParams: e.modalityParams,
        isHomeExercise: e.isHomeExercise,
        homeFrequency: e.homeFrequency || null,
        patientInstructions: e.patientInstructions || null,
        catalogExerciseId: e.catalogExerciseId,
        demonstrationSnapshot: e.demonstrationSnapshot,
      })),
    })),
  }
}
