"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ProfessionalRouteBoundary } from "@/components/auth/ProfessionalRouteBoundary"
import { AppShell } from "@/components/layout/AppShell"

const PUBLIC_ROUTES = new Set(["/", "/auth/login", "/auth/register"])

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  if (PUBLIC_ROUTES.has(pathname)) {
    return <>{children}</>
  }

  if (isLoading || !user) {
    return null
  }

  if (user.role === "ADMIN") {
    return <>{children}</>
  }

  return (
    <ProfessionalRouteBoundary>
      <AppShell>{children}</AppShell>
    </ProfessionalRouteBoundary>
  )
}
