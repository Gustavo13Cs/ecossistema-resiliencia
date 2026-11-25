export const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/auth/login",
  "/auth/register",
])

/**
 * Returns whether the given pathname is a public route that can render
 * immediately without waiting for session hydration.
 */
export function isPublicRoute(pathname: string | null | undefined): boolean {
  return pathname !== null && pathname !== undefined && PUBLIC_ROUTES.has(pathname)
}
