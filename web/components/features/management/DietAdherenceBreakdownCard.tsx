"use client"

import React from "react"
import Link from "next/link"
import { Utensils, HeartPulse, CheckCircle2, AlertTriangle, ArrowRight, Droplets, Moon, Pill, Footprints } from "lucide-react"
import { DietAdherenceMetrics } from "@/types/management-reports"

interface DietAdherenceBreakdownCardProps {
  adherence: DietAdherenceMetrics
}

export const DietAdherenceBreakdownCard: React.FC<DietAdherenceBreakdownCardProps> = ({
  adherence,
}) => {
  const getHabitIcon = (habitName: string) => {
    if (habitName.toLowerCase().includes("água") || habitName.toLowerCase().includes("hidratação")) {
      return <Droplets className="h-3.5 w-3.5 text-sky-500" />
    }
    if (habitName.toLowerCase().includes("sono")) {
      return <Moon className="h-3.5 w-3.5 text-indigo-500" />
    }
    if (habitName.toLowerCase().includes("suplement")) {
      return <Pill className="h-3.5 w-3.5 text-emerald-500" />
    }
    return <Footprints className="h-3.5 w-3.5 text-amber-500" />
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Adesão a Planos Alimentares & Hábitos Prescritos
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitoramento quantitativo do cumprimento das refeições e rotina pactuada
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-muted-foreground block uppercase font-medium">
            Total de Check-ins
          </span>
          <span className="text-base font-bold text-foreground">
            {adherence.totalMealCheckIns} refeições
          </span>
        </div>
      </div>

      {/* Adherence Tier Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Alta Adesão (&gt; 80%)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {adherence.highAdherenceCount} pacientes
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            Seguem o plano com alta consistência
          </p>
        </div>

        <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              Média Adesão (50 - 80%)
            </span>
            <HeartPulse className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-700 dark:text-sky-400 mt-1">
            {adherence.mediumAdherenceCount} pacientes
          </div>
          <p className="text-[11px] text-sky-600/80 dark:text-sky-400/80 mt-1">
            Necessitam de reforço motivacional
          </p>
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Baixa Adesão (&lt; 50%)
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {adherence.lowAdherenceCount} paciente(s)
            </div>
          </div>
          <Link
            href="/metas"
            className="text-xs text-amber-800 dark:text-amber-300 font-semibold hover:underline flex items-center gap-1 mt-2"
          >
            Intervir nas Metas &rarr;
          </Link>
        </div>
      </div>

      {/* Two columns: Meals adherence vs Habits adherence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Meals breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Adesão por Horário da Refeição
          </h4>
          <div className="space-y-2.5">
            {adherence.mealsAdherenceBreakdown.map((m, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{m.meal}</span>
                  <span className="font-bold text-foreground">{m.adherencePercent}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      m.adherencePercent > 80
                        ? "bg-emerald-500"
                        : m.adherencePercent > 70
                        ? "bg-sky-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${m.adherencePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Habits breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Adesão a Metas & Hábitos Complementares
          </h4>
          <div className="space-y-2.5">
            {adherence.habitsAdherenceBreakdown.map((h, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {getHabitIcon(h.habit)}
                    {h.habit}
                  </span>
                  <span className="font-bold text-foreground">{h.adherencePercent}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${h.adherencePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
