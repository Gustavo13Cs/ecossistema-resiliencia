"use client"

import { Users, Activity, TrendingDown, TrendingUp, Scale } from "lucide-react"
import type { EvolutionSummary } from "@/hooks/features/useEvolution"

interface EvolutionSummaryCardsProps {
  summary: EvolutionSummary
  loading: boolean
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  accentColor,
  loading,
}: {
  icon: typeof Users
  label: string
  value: string
  detail?: string
  accentColor: string
  loading: boolean
}) {
  return (
    <div className="group relative rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)] transition-shadow hover:shadow-[var(--sm-shadow-elevated)]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--sm-muted)]">
            {label}
          </p>
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-[var(--sm-border)]" />
          ) : (
            <p className="text-3xl font-black tracking-tight text-[var(--sm-ink)]">{value}</p>
          )}
          {detail && !loading && (
            <p className="text-xs font-medium text-[var(--sm-muted)]">{detail}</p>
          )}
        </div>
        <div
          className="grid size-10 shrink-0 place-items-center rounded-[var(--sm-radius-md)] transition-transform group-hover:scale-110"
          style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, var(--sm-surface))` }}
        >
          <Icon className="size-5" style={{ color: accentColor }} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}

export function EvolutionSummaryCards({ summary, loading }: EvolutionSummaryCardsProps) {
  const deltaValue = summary.averageWeightDelta
  const deltaDisplay = deltaValue != null ? `${deltaValue > 0 ? "+" : ""}${deltaValue} kg` : "—"
  const DeltaIcon = deltaValue != null && deltaValue <= 0 ? TrendingDown : TrendingUp

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KpiCard
        icon={Users}
        label="Clientes Avaliados"
        value={String(summary.totalClients)}
        detail="com pelo menos 1 avaliação"
        accentColor="var(--sm-brand)"
        loading={loading}
      />
      <KpiCard
        icon={Activity}
        label="Total de Medições"
        value={String(summary.totalAssessments)}
        detail="registros no sistema"
        accentColor="#6366f1"
        loading={loading}
      />
      <KpiCard
        icon={deltaValue != null && deltaValue <= 0 ? Scale : DeltaIcon}
        label="Média Δ Peso"
        value={deltaDisplay}
        detail={deltaValue != null ? "variação média entre 1ª e última avaliação" : "sem dados de peso suficientes"}
        accentColor={deltaValue != null && deltaValue <= 0 ? "#10b981" : "#f59e0b"}
        loading={loading}
      />
    </div>
  )
}
