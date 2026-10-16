"use client"

import { AsyncState } from "@/components/feedback/AsyncState"
import { useAuth } from "@/contexts/auth-context"
import { PersonalDashboard } from "../training/PersonalDashboard"
import { BaseProfessionalDashboard } from "./BaseProfessionalDashboard"

export function ProfessionalDashboard() {
  const { user } = useAuth()
  if (!user || !["PERSONAL", "NUTRITIONIST", "PHYSIO"].includes(user.role)) {
    return <AsyncState kind="error" title="Base privada indisponível" description="Esta área é exclusiva para contas profissionais." />
  }
  return user.role === "PERSONAL"
    ? <PersonalDashboard key={user.sub} />
    : <BaseProfessionalDashboard key={user.sub} />
}
