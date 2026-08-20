export const queryKeys = {
  users: (sessionUserId: string) => ["users", sessionUserId] as const,
  patient: (sessionUserId: string, patientId: string) => ["patient", sessionUserId, patientId] as const,
  assessments: (sessionUserId: string, patientId: string) => ["assessments", sessionUserId, patientId] as const,
  anamneses: (sessionUserId: string, patientId: string) => ["anamneses", sessionUserId, patientId] as const,
}
