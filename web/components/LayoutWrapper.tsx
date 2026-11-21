"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ProfessionalRouteBoundary } from "@/components/auth/ProfessionalRouteBoundary"
import { AppShell } from "@/components/layout/AppShell"
import { isPublicRoute } from "@/lib/public-routes"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  if (isPublicRoute(pathname)) {
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
