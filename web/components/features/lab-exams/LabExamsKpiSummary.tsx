"use client"

import React from "react"
import { FlaskConical, Users, AlertTriangle, FileText, CheckCircle2 } from "lucide-react"
import { LabExamsKpi } from "@/types/lab-exam"

interface LabExamsKpiSummaryProps {
  kpis: LabExamsKpi
  onFilterAlerts?: () => void
  onFilterOrders?: () => void
}

export const LabExamsKpiSummary: React.FC<LabExamsKpiSummaryProps> = ({
  kpis,
  onFilterAlerts,
  onFilterOrders,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total de Laudos */}
      <div className="bg-card rounded-xl border border-border/80 p-4 sm:p-5 shadow-xs transition-all hover:border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Laudos Registrados
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FlaskConical className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {kpis.totalExams}
          </span>
          <span className="text-xs text-muted-foreground">laudos analisados</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Histórico bioquímico consolidado</span>
        </div>
      </div>

      {/* 2. Cobertura da Base */}
      <div className="bg-card rounded-xl border border-border/80 p-4 sm:p-5 shadow-xs transition-all hover:border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cobertura da Carteira
          </span>
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {kpis.clientsCoveragePercent}%
          </span>
          <span className="text-xs text-muted-foreground">
            ({kpis.clientsWithExamsCount} pacientes com exames)
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-500"
            style={{ width: `${kpis.clientsCoveragePercent}%` }}
          />
        </div>
      </div>

      {/* 3. Marcadores Alterados */}
      <div
        onClick={onFilterAlerts}
        className={`bg-card rounded-xl border border-border/80 p-4 sm:p-5 shadow-xs transition-all hover:border-amber-400/50 ${
          onFilterAlerts ? "cursor-pointer" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Marcadores em Atenção
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {kpis.alteredMarkersCount}
          </span>
          <span className="text-xs text-muted-foreground">biomarcadores fora do ótimo</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <span>Critério SBPC/ML & Diretrizes</span>
        </div>
      </div>

      {/* 4. Pedidos Emitidos */}
      <div
        onClick={onFilterOrders}
        className={`bg-card rounded-xl border border-border/80 p-4 sm:p-5 shadow-xs transition-all hover:border-primary/50 ${
          onFilterOrders ? "cursor-pointer" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Pedidos Emitidos
          </span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {kpis.ordersIssuedCount}
          </span>
          <span className="text-xs text-muted-foreground">requisições ativas</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
          <span>Prontos para impressão / WhatsApp</span>
        </div>
      </div>
    </div>
  )
}
