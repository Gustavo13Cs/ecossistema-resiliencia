import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

interface AssessmentRaw {
  id: string
  clientId: string | null
  userId: string | null
  date: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  client: { id: string; name: string } | null
}

export interface ClientEvolution {
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
  firstMuscleMass: number | null
  lastMuscleMass: number | null
  muscleMassDelta: number | null
  assessments: AssessmentRaw[]
}

export interface EvolutionSummary {
  totalClients: number
  totalAssessments: number
  averageWeightDelta: number | null
}

function computeDelta(first: number | null, last: number | null): number | null {
  if (first == null || last == null) return null
  return Math.round((last - first) * 10) / 10
}

function findFirstNonNull(assessments: AssessmentRaw[], key: "weight" | "bodyFat" | "muscleMass"): number | null {
  for (const a of assessments) {
    if (a[key] != null) return a[key]
  }
  return null
}

function findLastNonNull(assessments: AssessmentRaw[], key: "weight" | "bodyFat" | "muscleMass"): number | null {
  for (let i = assessments.length - 1; i >= 0; i--) {
    if (assessments[i][key] != null) return assessments[i][key]
  }
  return null
}

function aggregateEvolutions(assessments: AssessmentRaw[]): {
  clientEvolutions: ClientEvolution[]
  summary: EvolutionSummary
} {
  const byClient = new Map<string, AssessmentRaw[]>()

  for (const a of assessments) {
    if (!a.clientId || !a.client) continue
    const existing = byClient.get(a.clientId)
    if (existing) {
      existing.push(a)
    } else {
      byClient.set(a.clientId, [a])
    }
  }

  const clientEvolutions: ClientEvolution[] = []
  const weightDeltas: number[] = []

  for (const [clientId, clientAssessments] of byClient) {
    // Sort by date ascending
    clientAssessments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const clientName = clientAssessments[0].client?.name ?? "Cliente"
    const firstWeight = findFirstNonNull(clientAssessments, "weight")
    const lastWeight = findLastNonNull(clientAssessments, "weight")
    const firstBodyFat = findFirstNonNull(clientAssessments, "bodyFat")
    const lastBodyFat = findLastNonNull(clientAssessments, "bodyFat")
    const firstMuscleMass = findFirstNonNull(clientAssessments, "muscleMass")
    const lastMuscleMass = findLastNonNull(clientAssessments, "muscleMass")

    const weightDelta = computeDelta(firstWeight, lastWeight)
    const bodyFatDelta = computeDelta(firstBodyFat, lastBodyFat)
    const muscleMassDelta = computeDelta(firstMuscleMass, lastMuscleMass)

    if (weightDelta != null) {
      weightDeltas.push(weightDelta)
    }

    clientEvolutions.push({
      clientId,
      clientName,
      assessmentCount: clientAssessments.length,
      firstDate: clientAssessments[0].date,
      lastDate: clientAssessments[clientAssessments.length - 1].date,
      firstWeight,
      lastWeight,
      weightDelta,
      firstBodyFat,
      lastBodyFat,
      bodyFatDelta,
      firstMuscleMass,
      lastMuscleMass,
      muscleMassDelta,
      assessments: clientAssessments,
    })
  }

  // Sort by last assessment date descending
  clientEvolutions.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())

  const averageWeightDelta =
    weightDeltas.length > 0
      ? Math.round((weightDeltas.reduce((sum, d) => sum + d, 0) / weightDeltas.length) * 10) / 10
      : null

  return {
    clientEvolutions,
    summary: {
      totalClients: clientEvolutions.length,
      totalAssessments: assessments.filter((a) => a.clientId).length,
      averageWeightDelta,
    },
  }
}

export function useEvolution() {
  const { user } = useAuth()
  const sessionUserId = user?.sub ?? "anonymous"

  const query = useQuery({
    queryKey: queryKeys.evolution(sessionUserId),
    queryFn: async () => {
      const response = await api.get<AssessmentRaw[]>("/assessments")
      return aggregateEvolutions(response.data ?? [])
    },
    enabled: Boolean(user?.sub),
  })

  return {
    clientEvolutions: query.data?.clientEvolutions ?? [],
    summary: query.data?.summary ?? { totalClients: 0, totalAssessments: 0, averageWeightDelta: null },
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
