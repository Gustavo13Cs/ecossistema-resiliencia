"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { PERSONAL_ASSESSMENT_FIELDS, PERSONAL_ASSESSMENT_GROUPS } from "@/lib/personal-assessment"
import { queryKeys } from "@/lib/query-keys"
import type { PersonalNumericField } from "@/types/assessment"

export interface PersonalAssessmentRaw {
  id: string
  clientId: string | null
  userId?: string | null
  date: string
  weight?: number | null
  bodyFat?: number | null
  waist?: number | null
  abdomen?: number | null
  hips?: number | null
  thorax?: number | null
  armLeft?: number | null
  armRight?: number | null
  thighLeft?: number | null
  thighRight?: number | null
  calfLeft?: number | null
  calfRight?: number | null
  skinfoldTriceps?: number | null
  skinfoldSubscapular?: number | null
  skinfoldChest?: number | null
  skinfoldAxillary?: number | null
  skinfoldSuprailiac?: number | null
  skinfoldAbdominal?: number | null
  skinfoldThigh?: number | null
  benchPress1RM?: number | null
  squat1RM?: number | null
  deadlift1RM?: number | null
  notes?: string | null
  client: { id: string; name: string } | null
}

export interface EnrichedPersonalAssessment extends PersonalAssessmentRaw {
  formattedDate: string
  skinfoldSum: number | null
  powerliftingTotal: number | null
  relativeBench: number | null
  relativeSquat: number | null
  relativeDeadlift: number | null
}

export interface PersonalClientEvolution {
  clientId: string
  clientName: string
  assessmentCount: number
  firstDate: string
  lastDate: string
  firstWeight: number | null
  lastWeight: number | null
  weightDelta: number | null
  firstBodyFat: number | null
  lastBodyFat: number | null
  bodyFatDelta: number | null
  firstWaist: number | null
  lastWaist: number | null
  waistDelta: number | null
  firstHips: number | null
  lastHips: number | null
  hipsDelta: number | null
  firstBench1RM: number | null
  lastBench1RM: number | null
  bench1RMDelta: number | null
  firstSquat1RM: number | null
  lastSquat1RM: number | null
  squat1RMDelta: number | null
  firstDeadlift1RM: number | null
  lastDeadlift1RM: number | null
  deadlift1RMDelta: number | null
  firstSkinfoldSum: number | null
  lastSkinfoldSum: number | null
  skinfoldSumDelta: number | null
  latestRelativeBench: number | null
  latestRelativeSquat: number | null
  latestRelativeDeadlift: number | null
  has1RMData: boolean
  assessments: EnrichedPersonalAssessment[]
}

export interface PersonalEvolutionSummary {
  totalClients: number
  totalAssessments: number
  averageSquatDelta: number | null
  averageBodyFatDelta: number | null
}

export interface AssessmentFieldComparison {
  field: PersonalNumericField
  label: string
  unit: string
  groupTitle: string
  firstValue: number | null
  secondValue: number | null
  delta: number | null
}

const SKINFOLD_FIELDS: readonly PersonalNumericField[] = [
  "skinfoldTriceps",
  "skinfoldSubscapular",
  "skinfoldChest",
  "skinfoldAxillary",
  "skinfoldSuprailiac",
  "skinfoldAbdominal",
  "skinfoldThigh",
]

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeDelta(
  first: number | null | undefined,
  last: number | null | undefined,
): number | null {
  if (first == null || last == null || !Number.isFinite(first) || !Number.isFinite(last)) {
    return null
  }
  return round1(last - first)
}

function computeDistinctDelta<T>(
  items: readonly T[],
  getter: (item: T) => number | null | undefined,
): { first: number | null; last: number | null; delta: number | null } {
  let firstIdx = -1
  let lastIdx = -1

  for (let i = 0; i < items.length; i++) {
    const val = getter(items[i])
    if (val != null && Number.isFinite(val)) {
      if (firstIdx === -1) firstIdx = i
      lastIdx = i
    }
  }

  const first = firstIdx !== -1 ? (getter(items[firstIdx]) ?? null) : null
  const last = lastIdx !== -1 ? (getter(items[lastIdx]) ?? null) : null
  const delta =
    firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx
      ? computeDelta(first, last)
      : null

  return { first, last, delta }
}

export function enrichAssessment(raw: PersonalAssessmentRaw): EnrichedPersonalAssessment {
  const validSkinfolds = SKINFOLD_FIELDS.map((key) => raw[key]).filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  )
  const skinfoldSum =
    validSkinfolds.length > 0
      ? round1(validSkinfolds.reduce((acc, v) => acc + v, 0))
      : null

  const lifts = [raw.benchPress1RM, raw.squat1RM, raw.deadlift1RM].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  )
  const powerliftingTotal =
    lifts.length > 0 ? round1(lifts.reduce((acc, v) => acc + v, 0)) : null

  const weight =
    typeof raw.weight === "number" && Number.isFinite(raw.weight) && raw.weight > 0
      ? raw.weight
      : null

  const relativeBench =
    weight && typeof raw.benchPress1RM === "number" && Number.isFinite(raw.benchPress1RM)
      ? round2(raw.benchPress1RM / weight)
      : null
  const relativeSquat =
    weight && typeof raw.squat1RM === "number" && Number.isFinite(raw.squat1RM)
      ? round2(raw.squat1RM / weight)
      : null
  const relativeDeadlift =
    weight && typeof raw.deadlift1RM === "number" && Number.isFinite(raw.deadlift1RM)
      ? round2(raw.deadlift1RM / weight)
      : null

  const formattedDate = new Date(raw.date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })

  return {
    ...raw,
    formattedDate,
    skinfoldSum,
    powerliftingTotal,
    relativeBench,
    relativeSquat,
    relativeDeadlift,
  }
}

export function comparePersonalAssessments(
  first: PersonalAssessmentRaw,
  second: PersonalAssessmentRaw,
): AssessmentFieldComparison[] {
  const rows: AssessmentFieldComparison[] = []

  for (const group of PERSONAL_ASSESSMENT_GROUPS) {
    for (const field of group.fields) {
      const def = PERSONAL_ASSESSMENT_FIELDS[field]
      const v1 =
        typeof first[field] === "number" && Number.isFinite(first[field])
          ? (first[field] as number)
          : null
      const v2 =
        typeof second[field] === "number" && Number.isFinite(second[field])
          ? (second[field] as number)
          : null
      if (v1 === null && v2 === null) continue
      rows.push({
        field,
        label: def.label,
        unit: def.unit,
        groupTitle: group.title,
        firstValue: v1,
        secondValue: v2,
        delta: first.id === second.id ? null : computeDelta(v1, v2),
      })
    }
  }

  return rows
}

export function aggregatePersonalEvolutions(assessments: PersonalAssessmentRaw[]): {
  clientEvolutions: PersonalClientEvolution[]
  summary: PersonalEvolutionSummary
} {
  const byClient = new Map<string, PersonalAssessmentRaw[]>()

  for (const a of assessments) {
    if (!a.clientId || !a.client) continue
    const list = byClient.get(a.clientId)
    if (list) list.push(a)
    else byClient.set(a.clientId, [a])
  }

  const clientEvolutions: PersonalClientEvolution[] = []
  const squatDeltas: number[] = []
  const bodyFatDeltas: number[] = []

  for (const [clientId, rawList] of byClient) {
    const sorted = [...rawList].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    const enriched = sorted.map(enrichAssessment)
    const clientName = enriched[0].client?.name ?? "Aluno"

    const weightStats = computeDistinctDelta(enriched, (x) => x.weight)
    const bfStats = computeDistinctDelta(enriched, (x) => x.bodyFat)
    const waistStats = computeDistinctDelta(enriched, (x) => x.waist)
    const hipsStats = computeDistinctDelta(enriched, (x) => x.hips)
    const benchStats = computeDistinctDelta(enriched, (x) => x.benchPress1RM)
    const squatStats = computeDistinctDelta(enriched, (x) => x.squat1RM)
    const deadliftStats = computeDistinctDelta(enriched, (x) => x.deadlift1RM)
    const skinfoldStats = computeDistinctDelta(enriched, (x) => x.skinfoldSum)

    if (squatStats.delta !== null) squatDeltas.push(squatStats.delta)
    if (bfStats.delta !== null) bodyFatDeltas.push(bfStats.delta)

    const latestBenchRel = computeDistinctDelta(enriched, (x) => x.relativeBench).last
    const latestSquatRel = computeDistinctDelta(enriched, (x) => x.relativeSquat).last
    const latestDeadliftRel = computeDistinctDelta(enriched, (x) => x.relativeDeadlift).last

    const has1RMData =
      benchStats.last !== null ||
      squatStats.last !== null ||
      deadliftStats.last !== null

    clientEvolutions.push({
      clientId,
      clientName,
      assessmentCount: enriched.length,
      firstDate: enriched[0].date,
      lastDate: enriched[enriched.length - 1].date,
      firstWeight: weightStats.first,
      lastWeight: weightStats.last,
      weightDelta: weightStats.delta,
      firstBodyFat: bfStats.first,
      lastBodyFat: bfStats.last,
      bodyFatDelta: bfStats.delta,
      firstWaist: waistStats.first,
      lastWaist: waistStats.last,
      waistDelta: waistStats.delta,
      firstHips: hipsStats.first,
      lastHips: hipsStats.last,
      hipsDelta: hipsStats.delta,
      firstBench1RM: benchStats.first,
      lastBench1RM: benchStats.last,
      bench1RMDelta: benchStats.delta,
      firstSquat1RM: squatStats.first,
      lastSquat1RM: squatStats.last,
      squat1RMDelta: squatStats.delta,
      firstDeadlift1RM: deadliftStats.first,
      lastDeadlift1RM: deadliftStats.last,
      deadlift1RMDelta: deadliftStats.delta,
      firstSkinfoldSum: skinfoldStats.first,
      lastSkinfoldSum: skinfoldStats.last,
      skinfoldSumDelta: skinfoldStats.delta,
      latestRelativeBench: latestBenchRel,
      latestRelativeSquat: latestSquatRel,
      latestRelativeDeadlift: latestDeadliftRel,
      has1RMData,
      assessments: enriched,
    })
  }

  clientEvolutions.sort(
    (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
  )

  const averageSquatDelta =
    squatDeltas.length > 0
      ? round1(squatDeltas.reduce((acc, v) => acc + v, 0) / squatDeltas.length)
      : null

  const averageBodyFatDelta =
    bodyFatDeltas.length > 0
      ? round1(bodyFatDeltas.reduce((acc, v) => acc + v, 0) / bodyFatDeltas.length)
      : null

  return {
    clientEvolutions,
    summary: {
      totalClients: clientEvolutions.length,
      totalAssessments: assessments.filter((a) => Boolean(a.clientId && a.client)).length,
      averageSquatDelta,
      averageBodyFatDelta,
    },
  }
}

export function usePersonalEvolution() {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"

  const query = useQuery({
    queryKey: queryKeys.personalEvolution(sessionUserId),
    queryFn: async () => {
      const response = await api.get<PersonalAssessmentRaw[]>("/assessments")
      return aggregatePersonalEvolutions(response.data ?? [])
    },
    enabled: Boolean(user?.sub && user.role === "PERSONAL"),
  })

  return {
    clientEvolutions: query.data?.clientEvolutions ?? [],
    summary: query.data?.summary ?? {
      totalClients: 0,
      totalAssessments: 0,
      averageSquatDelta: null,
      averageBodyFatDelta: null,
    },
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
