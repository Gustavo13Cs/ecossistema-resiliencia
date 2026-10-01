const legacyPrefixes = [
  "safemove_client_goals_v1",
  "safemove_central_lab_exams_v1",
  "safemove_issued_lab_orders_v1",
]

export function discardLegacyClinicalStorage(): void {
  if (typeof window === "undefined") return
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName]
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index)
        if (key && legacyPrefixes.some(prefix => key === prefix || key.startsWith(`${prefix}_`))) storage.removeItem(key)
      }
    } catch {
      // Storage bloqueado pelo navegador não impede a sessão nem a limpeza do outro storage.
    }
  }
}
