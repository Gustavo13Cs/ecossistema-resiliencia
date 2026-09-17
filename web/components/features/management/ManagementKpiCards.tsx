"use client"

import React from "react"
import { Users, TrendingUp, HeartPulse, Calendar, CheckCircle2, ArrowUpRight } from "lucide-react"
import { ConsolidatedManagementReport } from "@/types/management-reports"

interface ManagementKpiCardsProps {
  report: ConsolidatedManagementReport
  onNavigateTab?: (tab: string) => void
}

export const ManagementKpiCards: React.FC<ManagementKpiCardsProps> = ({
  report,
  onNavigateTab,
}) => {
  const { retention, dietAdherence, appointments, growth } = report

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Taxa de Retenção */}
      <div
        onClick={() => onNavigateTab && onNavigateTab("retention")}
        className="bg-card rounded-xl border border-border/80 p-5 shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Retenção da Carteira
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {retention.retentionRatePercent}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5" /> +8% vs mercado
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Evasão (Churn): <strong className="text-foreground">{retention.churnRatePercent}%</strong></span>
          <span className="text-primary font-medium hover:underline">Ver Funil &rarr;</span>
        </div>
      </div>

      {/* 2. Adesão aos Planos */}
      <div
        onClick={() => onNavigateTab && onNavigateTab("adherence")}
        className="bg-card rounded-xl border border-border/80 p-5 shadow-xs hover:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Adesão Alimentar Média
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {dietAdherence.averageAdherencePercent}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({dietAdherence.highAdherenceCount} com alta adesão)
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>{dietAdherence.totalMealCheckIns} refeições registradas</span>
          <span className="text-primary font-medium hover:underline">Detalhar &rarr;</span>
        </div>
      </div>

      {/* 3. Volume de Consultas */}
      <div
        onClick={() => onNavigateTab && onNavigateTab("appointments")}
        className="bg-card rounded-xl border border-border/80 p-5 shadow-xs hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Consultas Realizadas
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {appointments.totalAppointments}
            </span>
            <span className="text-xs text-muted-foreground">
              (~{appointments.weeklyAverage}/semana)
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Ocupação da agenda: <strong className="text-foreground">{appointments.capacityOccupancyPercent}%</strong></span>
          <span className="text-primary font-medium hover:underline">Histórico &rarr;</span>
        </div>
      </div>

      {/* 4. Base Privada */}
      <div
        onClick={() => onNavigateTab && onNavigateTab("growth")}
        className="bg-card rounded-xl border border-border/80 p-5 shadow-xs hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Base Privada Ativa
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {growth.totalActiveClients}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5" /> +{growth.netNewClients} novos
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Crescimento: <strong className="text-foreground">+{growth.growthRatePercent}%</strong></span>
          <span className="text-primary font-medium hover:underline">Evolução &rarr;</span>
        </div>
      </div>
    </div>
  )
}
