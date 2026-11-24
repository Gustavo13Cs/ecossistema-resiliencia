"use client"

import { AsyncState } from "@/components/feedback/AsyncState"
import { useAuth } from "@/contexts/auth-context"
import { PhysioDashboard } from "../physio/PhysioDashboard"
import { PersonalDashboard } from "../training/PersonalDashboard"
import { BaseProfessionalDashboard } from "./BaseProfessionalDashboard"

export function ProfessionalDashboard() {
  const { user } = useAuth()
  if (!user || !["PERSONAL", "NUTRITIONIST", "PHYSIO"].includes(user.role)) {
    return <AsyncState kind="error" title="Base privada indisponível" description="Esta área é exclusiva para contas profissionais." />
  }
  if (user.role === "PERSONAL") return <PersonalDashboard key={user.sub} />
  if (user.role === "PHYSIO") return <PhysioDashboard key={user.sub} />
  return <BaseProfessionalDashboard key={user.sub} />
}
