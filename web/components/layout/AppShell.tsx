"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { ProfessionalRole } from "@/types/auth"
import { MobileNavigation } from "./MobileNavigation"
import { ProfessionalSidebar } from "./ProfessionalSidebar"
import { WorkspaceHeader } from "./WorkspaceHeader"

const ROLE_LABELS: Record<ProfessionalRole, string> = {
  NUTRITIONIST: "Nutricionista",
  PERSONAL: "Personal Trainer",
  PHYSIO: "Fisioterapeuta",
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (!user || user.role === "ADMIN") {
    return <>{children}</>
  }

  const role = user.role
  const roleLabel = ROLE_LABELS[role]

  return (
    <div className="min-h-screen bg-[var(--sm-canvas)] text-[var(--sm-ink)] lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <a
        href="#conteudo-principal"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-[var(--sm-radius-sm)] bg-[var(--sm-ink)] px-4 py-3 text-sm font-semibold text-[var(--sm-on-brand)] transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <ProfessionalSidebar user={user} role={role} roleLabel={roleLabel} />
      <div className="min-w-0">
        <WorkspaceHeader user={user} role={role} roleLabel={roleLabel} />
        <main
          id="conteudo-principal"
          aria-label="Conteúdo principal"
          className="mx-auto min-h-[calc(100vh-7rem)] w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
      <MobileNavigation user={user} role={role} roleLabel={roleLabel} />
    </div>
  )
}
