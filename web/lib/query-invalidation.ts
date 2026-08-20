import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

const PATIENT_SCOPED_QUERIES = new Set([
  "patient",
  "assessments",
  "anamneses",
  "diet",
  "patient-overview",
  "agenda",
])

export function removePatientScopedQueries(
  queryClient: QueryClient,
  sessionUserId: string,
  patientId: string,
) {
  queryClient.removeQueries({
    predicate: ({ queryKey }) =>
      PATIENT_SCOPED_QUERIES.has(String(queryKey[0])) &&
      queryKey[1] === sessionUserId &&
      queryKey[2] === patientId,
  })
}

export async function invalidatePatientProfile(
  queryClient: QueryClient,
  sessionUserId: string,
  patientId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.users(sessionUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patient(sessionUserId, patientId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patientOverview(sessionUserId, patientId) }),
  ])
}

export async function invalidatePatientAssessments(
  queryClient: QueryClient,
  sessionUserId: string,
  patientId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.assessments(sessionUserId, patientId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patientOverview(sessionUserId, patientId) }),
  ])
}

export async function invalidatePatientDiet(
  queryClient: QueryClient,
  sessionUserId: string,
  patientId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.diet(sessionUserId, patientId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.patientOverview(sessionUserId, patientId) }),
  ])
}
