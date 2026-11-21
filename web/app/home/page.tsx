"use client"

import dynamic from "next/dynamic"
import { ProfessionalDashboard } from "@/components/features/dashboard/ProfessionalDashboard"
import { useAuth } from "@/contexts/auth-context"

const AdminWebVitalsDashboard = dynamic(
  () =>
    import("@/components/features/observability/AdminWebVitalsDashboard").then(
      (mod) => mod.AdminWebVitalsDashboard,
    ),
  { ssr: false },
)

export default function HomePage() {
  const { user } = useAuth()

  if (user?.role === "ADMIN") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-6xl bg-[var(--sm-canvas)] px-6 py-12">
        <section className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-8 shadow-[var(--sm-shadow-rest)]">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">
            Painel administrativo
          </h1>
          <p className="mt-3 max-w-[65ch] text-base text-[var(--sm-muted)]">
            Sessão interna ativa. As áreas profissionais permanecem isoladas deste painel.
          </p>
        </section>
        <AdminWebVitalsDashboard />
      </main>
    )
  }

  return <ProfessionalDashboard />
}
