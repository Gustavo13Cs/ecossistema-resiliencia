"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { canAccessProfessionalPath } from "@/lib/professional-workspace"

export function ProfessionalRouteBoundary({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isDenied = !isLoading && user !== null
    ? !canAccessProfessionalPath(user.role, pathname)
    : false

  useEffect(() => {
    if (isDenied) {
      router.replace("/home?access=denied")
    }
  }, [isDenied, router])

  if (isLoading || !user || isDenied) {
    return null
  }

  return <>{children}</>
}
