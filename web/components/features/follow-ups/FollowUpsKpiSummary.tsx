"use client"

import { CalendarClock, AlertTriangle, UserCheck, CalendarCheck, History, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { FollowUpsKpi } from "@/types/follow-up"

interface FollowUpsKpiSummaryProps {
  summary: FollowUpsKpi
  loading?: boolean
}

export function FollowUpsKpiSummary({ summary, loading = false }: FollowUpsKpiSummaryProps) {
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
      title: "Retornos Próximos",
      value: summary.upcoming30Days,
      subtext: `${summary.upcoming7Days} nos próximos 7 dias`,
      icon: CalendarClock,
      iconBg: "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]",
      badge: "Próximos 30 dias",
    },
    {
      title: "Em Atraso Clínico",
      value: summary.overdueCount,
      subtext: summary.overdueCount > 0 ? "Risco de evasão / abandono" : "Nenhum cliente em atraso",
      icon: AlertTriangle,
      iconBg: summary.overdueCount > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" : "bg-slate-100 text-slate-500",
      badge: summary.overdueCount > 0 ? "Reengajamento urgente" : "Tudo em dia",
    },
    {
      title: "Sem Agendamento",
      value: summary.unscheduledCount,
      subtext: "Clientes ativos sem retorno marcado",
      icon: Users,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      badge: "Pendente de marcação",
    },
    {
      title: "Taxa de Retenção",
      value: `${summary.retentionRatePercent}%`,
      subtext: `de ${summary.totalClients} clientes da carteira`,
      icon: UserCheck,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      badge: summary.retentionRatePercent >= 75 ? "Continuidade alta" : "Atenção a retenção",
    },
    {
      title: "Cadência Média",
      value: `${summary.averageCadenceDays} dias`,
      subtext: "Intervalo histórico entre retornos",
      icon: History,
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      badge: "Ciclo padrão 30d",
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
