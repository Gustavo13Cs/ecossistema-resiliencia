"use client"

import React from "react"
import Link from "next/link"
import { Users, AlertTriangle, CheckCircle2, Clock, ArrowRight, ShieldCheck } from "lucide-react"
import { RetentionMetrics } from "@/types/management-reports"

interface RetentionFunnelCardProps {
  retention: RetentionMetrics
}

export const RetentionFunnelCard: React.FC<RetentionFunnelCardProps> = ({ retention }) => {
  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Retenção & Ciclo de Continuidade do Tratamento
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhamento da permanência de pacientes da 1ª consulta aos ciclos de manutenção
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground block uppercase font-medium">
              Tempo Médio de Retenção
            </span>
            <span className="text-base font-bold text-foreground">
              {retention.averageRetentionMonths} meses
            </span>
          </div>
        </div>
      </div>

      {/* Cohort Funnel Bar Steps */}
      <div className="space-y-3.5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Curva de Retenção por Fase do Tratamento
        </div>

        <div className="space-y-2.5">
          {retention.cohortData.map((step, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{step.month}</span>
                <span className="font-bold text-foreground">
                  {step.activeRate}%{" "}
                  <span className="text-muted-foreground font-normal">
                    ({step.retainedCount} clientes)
                  </span>
                </span>
              </div>
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    step.activeRate > 85
                      ? "bg-emerald-500"
                      : step.activeRate > 75
                      ? "bg-sky-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${step.activeRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention stats & Risk callout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Taxa de Comparecimento
          </span>
          <div className="text-lg font-bold text-foreground mt-0.5">
            {retention.showUpRatePercent}%
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Compareceram às consultas agendadas
          </span>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Taxa de Falta / No-Show
          </span>
          <div className="text-lg font-bold text-foreground mt-0.5">
            {retention.noShowRatePercent}%
          </div>
          <span className="text-[11px] text-muted-foreground">
            Desmarcações de última hora
          </span>
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Clientes em Risco de Evasão
            </span>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              {retention.clientsAtRiskCount} paciente(s)
            </div>
          </div>
          <Link
            href="/retornos"
            className="text-xs text-amber-800 dark:text-amber-300 font-semibold hover:underline flex items-center gap-1 mt-2"
          >
            Fazer Resgate Ativo &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
