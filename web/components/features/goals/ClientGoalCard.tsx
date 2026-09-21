"use client"

import {
  TrendingDown,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  Droplet,
  Moon,
  Utensils,
  Footprints,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Edit2,
  ExternalLink,
  MessageSquare,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ClientWithGoalSummary, GoalCategory } from "@/types/goal"

interface ClientGoalCardProps {
  item: ClientWithGoalSummary
  onSelect: (item: ClientWithGoalSummary) => void
  onEdit: (item: ClientWithGoalSummary) => void
  onNewGoal: (clientId: string) => void
}

const CATEGORY_MAP: Record<GoalCategory, { label: string; color: string; icon: typeof TrendingDown }> = {
  WEIGHT_LOSS: { label: "Emagrecimento", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300", icon: TrendingDown },
  HYPERTROPHY: { label: "Hipertrofia", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300", icon: TrendingUp },
  RECOMPOSITION: { label: "Recomposição", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300", icon: Activity },
  HEALTH_MAINTENANCE: { label: "Saúde & Hábitos", color: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300", icon: Activity },
  PERFORMANCE: { label: "Performance", color: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300", icon: TrendingUp },
}

export function ClientGoalCard({ item, onSelect, onEdit, onNewGoal }: ClientGoalCardProps) {
  const { client, goal, progress, alerts } = item

  // Empty state if client has no goal
  if (!goal || !progress) {
    return (
      <Card className="border border-dashed border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 transition hover:border-[var(--sm-brand)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-[var(--sm-surface-muted)] text-sm font-bold text-[var(--sm-ink)]">
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--sm-ink)]">{client.name}</h3>
                <p className="text-xs text-[var(--sm-muted)]">
                  {client.goal ? `Foco inicial: ${client.goal}` : "Sem objetivo cadastrado na ficha"}
                  {client.initialWeight ? ` • Peso inicial: ${client.initialWeight} kg` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNewGoal(client.id)}
              className="gap-1.5 border-[var(--sm-brand)] text-[var(--sm-brand)] hover:bg-[var(--sm-brand-subtle)]"
            >
              <Plus className="size-4" />
              Pactuar Meta
            </Button>
            <Link href={`/clientes/${client.id}/visao-360`}>
              <Button size="sm" variant="ghost" className="text-[var(--sm-muted)] hover:text-[var(--sm-ink)]">
                <ExternalLink className="size-4" />
                <span className="sr-only">Prontuário</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    )
  }

  const categoryConfig = CATEGORY_MAP[goal.category] || CATEGORY_MAP.WEIGHT_LOSS
  const CategoryIcon = categoryConfig.icon
  const hasAlert = alerts.length > 0
  const isAchieved = progress.percentAchieved >= 100 || goal.status === "ACHIEVED"

  // Feasibility pill
  const feasibilityPill = {
    HEALTHY: { label: "Ritmo Saudável", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" },
    AGGRESSIVE: { label: "Ritmo Intenso", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
    UNREALISTIC: { label: "Ajuste Necessário", color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" },
    MAINTAIN: { label: "Manutenção", color: "text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300" },
  }[progress.rateFeasibility]

  // Clean phone for whatsapp
  const rawPhone = client.phone?.replace(/\D/g, "")
  const whatsappUrl =
    rawPhone && rawPhone.length >= 10
      ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(
          alerts[0]?.suggestedWhatsAppMessage ||
            `Olá ${client.name}! Como tem sido a rotina nesta semana com as metas pactuadas de água e refeições? Estou acompanhando sua evolução!`,
        )}`
      : null

  return (
    <Card
      className={`border bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)] transition hover:shadow-md ${
        hasAlert ? "border-amber-300 dark:border-amber-800/60" : "border-[var(--sm-border)]"
      }`}
    >
      <CardContent className="p-5 sm:p-6">
        {/* Top bar: Client info + Badges + Actions */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--sm-brand-subtle)] text-sm font-black text-[var(--sm-brand)]">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--sm-ink)]">{client.name}</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryConfig.color}`}>
                  <CategoryIcon className="size-3" />
                  {categoryConfig.label}
                </span>
                {isAchieved ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="size-3" />
                    Meta Atingida
                  </span>
                ) : hasAlert ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <AlertTriangle className="size-3" />
                    Atenção Clínica
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    No Alvo
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--sm-muted)]">
                Início: {new Date(goal.startDate).toLocaleDateString("pt-BR")} • Prazo:{" "}
                {new Date(goal.targetDate).toLocaleDateString("pt-BR")} ({progress.daysRemaining} dias restantes)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Conversar no WhatsApp com mensagem sugerida"
              >
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                  <MessageSquare className="size-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(item)}
              title="Editar meta clínica"
              className="h-8 gap-1 text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            >
              <Edit2 className="size-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onSelect(item)}
              className="h-8 gap-1 bg-[var(--sm-brand)] text-white hover:bg-[var(--sm-brand-hover)]"
            >
              <span>Detalhes</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar & Weight Markers */}
        <div className="mt-5 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
          <div className="flex flex-col justify-between gap-2 text-xs sm:flex-row sm:items-center">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[var(--sm-muted)]">Início:</span>{" "}
                <strong className="font-semibold text-[var(--sm-ink)]">{goal.startWeightKg} kg</strong>
              </div>
              <div>
                <span className="text-[var(--sm-muted)]">Atual:</span>{" "}
                <strong className="text-sm font-black text-[var(--sm-brand)]">
                  {progress.currentWeightKg} kg
                </strong>{" "}
                <span className={`font-semibold ${progress.weightDeltaKg && progress.weightDeltaKg < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  ({progress.weightDeltaKg && progress.weightDeltaKg > 0 ? `+${progress.weightDeltaKg}` : progress.weightDeltaKg} kg)
                </span>
              </div>
              <div>
                <span className="text-[var(--sm-muted)]">Meta:</span>{" "}
                <strong className="font-semibold text-[var(--sm-ink)]">{goal.targetWeightKg} kg</strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${feasibilityPill.color}`}>
                {feasibilityPill.label}: {progress.requiredWeeklyRateKg} kg/sem
              </span>
              <span className="font-bold text-[var(--sm-ink)]">{progress.percentAchieved}%</span>
            </div>
          </div>

          {/* Bar */}
          <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--sm-border)]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAchieved
                  ? "bg-emerald-500"
                  : hasAlert
                  ? "bg-amber-500"
                  : "bg-[var(--sm-brand)]"
              }`}
              style={{ width: `${Math.min(100, Math.max(4, progress.percentAchieved))}%` }}
            />
          </div>

          {goal.targetBodyFatPercent && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--sm-muted)]">
              <span>
                Gordura corporal: {goal.startBodyFatPercent ? `${goal.startBodyFatPercent}%` : "—"}{" "}
                → {progress.currentBodyFatPercent ? `${progress.currentBodyFatPercent}% (atual)` : "—"}{" "}
                → Meta: <strong>{goal.targetBodyFatPercent}%</strong>
              </span>
              <span>
                Faltam {Math.abs(progress.weightRemainingKg ?? 0)} kg
              </span>
            </div>
          )}
        </div>

        {/* Daily Habits Adherence Chips */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sm-muted)]">
            Adesão aos Hábitos Pactuados ({progress.habitsAdherence.overall}%)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-2">
              <div className="grid size-7 shrink-0 place-items-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Droplet className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--sm-ink)]">
                  {goal.habits.waterTargetMl} mL
                </p>
                <p className="text-[10px] text-[var(--sm-muted)]">
                  Água • {progress.habitsAdherence.water}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-2">
              <div className="grid size-7 shrink-0 place-items-center rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Moon className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--sm-ink)]">
                  {goal.habits.sleepTargetHours} h/noite
                </p>
                <p className="text-[10px] text-[var(--sm-muted)]">
                  Sono • {progress.habitsAdherence.sleep}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-2">
              <div className="grid size-7 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Utensils className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--sm-ink)]">
                  {goal.habits.mealsAdherencePercent}% dieta
                </p>
                <p className="text-[10px] text-[var(--sm-muted)]">
                  Refeições • {progress.habitsAdherence.meals}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-2">
              <div className="grid size-7 shrink-0 place-items-center rounded bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Footprints className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--sm-ink)]">
                  {goal.habits.dailyStepsTarget.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--sm-muted)]">
                  Passos • {progress.habitsAdherence.steps}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Alert Callout if present */}
        {hasAlert && (
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{alerts[0].title}</p>
              <p className="mt-0.5 text-[11px] opacity-90">{alerts[0].description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
