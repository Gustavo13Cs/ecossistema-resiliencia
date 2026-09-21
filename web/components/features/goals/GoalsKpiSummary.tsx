"use client"

import { Target, CheckCircle2, AlertTriangle, Droplet, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { GoalsKpiSummary } from "@/types/goal"

interface GoalsKpiSummaryProps {
  summary: GoalsKpiSummary
  loading?: boolean
}

export function GoalsKpiSummary({ summary, loading = false }: GoalsKpiSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse border-[var(--sm-border)] bg-[var(--sm-surface)]">
            <CardContent className="p-5">
              <div className="h-4 w-24 rounded bg-[var(--sm-border)]" />
              <div className="mt-3 h-8 w-16 rounded bg-[var(--sm-border)]" />
              <div className="mt-2 h-3 w-32 rounded bg-[var(--sm-border)]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: "Metas Ativas",
      value: summary.activeGoalsCount,
      subtext: `de ${summary.totalClients} clientes da carteira`,
      icon: Target,
      iconBg: "bg-[var(--sm-brand-subtle)]",
      iconColor: "text-[var(--sm-brand)]",
      badge: `${Math.round((summary.activeGoalsCount / Math.max(1, summary.totalClients)) * 100)}% pactuadas`,
    },
    {
      title: "No Ritmo Alvo",
      value: summary.onTrackCount,
      subtext: `${summary.onTrackPercent}% dos clientes em acompanhamento`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      badge: "Evolução estável",
    },
    {
      title: "Clientes em Risco",
      value: summary.atRiskCount,
      subtext: summary.atRiskCount > 0 ? "Exigem intervenção clínica" : "Nenhum desvio crítico",
      icon: AlertTriangle,
      iconBg: summary.atRiskCount > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" : "bg-slate-100 text-slate-500",
      iconColor: summary.atRiskCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500",
      badge: summary.atRiskCount > 0 ? `${summary.atRiskPercent}% da carteira` : "Tudo em dia",
    },
    {
      title: "Adesão aos Hábitos",
      value: `${summary.averageHabitsAdherence}%`,
      subtext: "Água, sono, refeições e passos",
      icon: Droplet,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
      badge: summary.averageHabitsAdherence >= 80 ? "Alta adesão" : "Atenção a hábitos",
    },
    {
      title: "Metas Atingidas",
      value: summary.achievedCount,
      subtext: "Resultados consolidados",
      icon: Trophy,
      iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
      iconColor: "text-purple-600 dark:text-purple-400",
      badge: "Ciclos finalizados",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <Card
            key={idx}
            className="border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)] transition hover:shadow-md"
          >
            <CardContent className="flex flex-col justify-between p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sm-muted)]">
                    {card.title}
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-[var(--sm-ink)]">
                    {card.value}
                  </p>
                </div>
                <div className={`grid size-10 place-items-center rounded-[var(--sm-radius-md)] ${card.iconBg}`}>
                  <Icon className="size-5" strokeWidth={2} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--sm-border)] pt-3 text-xs">
                <span className="truncate text-[var(--sm-muted)]">{card.subtext}</span>
                <span className="shrink-0 font-medium text-[var(--sm-brand)]">
                  {card.badge}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
