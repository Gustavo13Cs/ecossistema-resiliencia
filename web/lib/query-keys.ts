export const queryKeys = {
  users: (sessionUserId: string) => ["users", sessionUserId] as const,
}
