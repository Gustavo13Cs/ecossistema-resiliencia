"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Target,
  Trophy,
  Edit2,
  Trash2,
  ExternalLink,
  Droplet,
  Moon,
  Utensils,
  Footprints,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Activity,
} from "lucide-react"
import Link from "next/link"
import type { ClientWithGoalSummary } from "@/types/goal"

interface ClientGoalDetailDrawerProps {
  item: ClientWithGoalSummary | null
  isOpen: boolean
  onClose: () => void
  onEdit: (item: ClientWithGoalSummary) => void
  onDelete: (goalId: string) => void
  onMarkAchieved: (goalId: string) => void
}

export function ClientGoalDetailDrawer({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMarkAchieved,
}: ClientGoalDetailDrawerProps) {
  if (!item || !item.goal || !item.progress) return null

  const { client, goal, progress, alerts } = item
  const isAchieved = progress.percentAchieved >= 100 || goal.status === "ACHIEVED"

  // Clean phone for whatsapp
  const rawPhone = client.phone?.replace(/\D/g, "")
  const whatsappUrl =
    rawPhone && rawPhone.length >= 10
      ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(
          `Olá ${client.name}! Acompanhando seu progresso em nosso ciclo de metas: você já atingiu ${progress.percentAchieved}% do planejado. Continuamos juntos no foco!`,
        )}`
      : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--sm-brand)]">
              <Target className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Acompanhamento Individual</span>
            </div>
            {isAchieved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <Trophy className="size-3.5" />
                Meta Conquistada
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-black text-[var(--sm-ink)]">
            {client.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--sm-muted)]">
            Ciclo de {new Date(goal.startDate).toLocaleDateString("pt-BR")} até{" "}
            {new Date(goal.targetDate).toLocaleDateString("pt-BR")} ({progress.daysRemaining} dias restantes)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Composição Corporal Detalhada */}
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sm-ink)]">
              Evolução da Composição Corporal
            </h4>

            <div className="mt-3 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3">
                <p className="text-[11px] text-[var(--sm-muted)]">Peso Inicial</p>
                <p className="mt-1 text-base font-bold text-[var(--sm-ink)]">
                  {goal.startWeightKg} kg
                </p>
                {goal.startBodyFatPercent && (
                  <p className="text-[10px] text-[var(--sm-muted)]">{goal.startBodyFatPercent}% BF</p>
                )}
              </div>

              <div className="rounded-lg border-2 border-[var(--sm-brand)] bg-[var(--sm-surface)] p-3">
                <p className="text-[11px] font-bold text-[var(--sm-brand)]">Peso Atual</p>
                <p className="mt-1 text-lg font-black text-[var(--sm-brand)]">
                  {progress.currentWeightKg} kg
                </p>
                <p className={`text-[11px] font-bold ${progress.weightDeltaKg && progress.weightDeltaKg < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {progress.weightDeltaKg && progress.weightDeltaKg > 0 ? `+${progress.weightDeltaKg}` : progress.weightDeltaKg} kg
                </p>
              </div>

              <div className="rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3">
                <p className="text-[11px] text-[var(--sm-muted)]">Peso Alvo</p>
                <p className="mt-1 text-base font-bold text-[var(--sm-ink)]">
                  {goal.targetWeightKg} kg
                </p>
                {goal.targetBodyFatPercent && (
                  <p className="text-[10px] text-[var(--sm-muted)]">{goal.targetBodyFatPercent}% BF</p>
                )}
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--sm-ink)]">Atingimento Global</span>
                <span className="font-bold text-[var(--sm-brand)]">{progress.percentAchieved}%</span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-[var(--sm-border)]">
                <div
                  className="h-full rounded-full bg-[var(--sm-brand)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(5, progress.percentAchieved))}%` }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sm-border)] pt-3 text-xs text-[var(--sm-muted)]">
              <span>Ritmo necessário: <strong>{progress.requiredWeeklyRateKg} kg/semana</strong></span>
              <span>Ritmo observado: <strong>{progress.actualWeeklyRateKg ?? "—"} kg/semana</strong></span>
            </div>
          </div>

          {/* Adesão aos Hábitos */}
          <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 shadow-[var(--sm-shadow-rest)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sm-ink)]">
              Adesão aos Hábitos Diários ({progress.habitsAdherence.overall}%)
            </h4>

            <div className="mt-3 space-y-3">
              {/* Água */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--sm-ink)]">
                    <Droplet className="size-3.5 text-blue-600" />
                    Hidratação: meta de {goal.habits.waterTargetMl} mL/dia
                  </span>
                  <span className="font-bold text-blue-600">{progress.habitsAdherence.water}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress.habitsAdherence.water}%` }} />
                </div>
              </div>

              {/* Sono */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--sm-ink)]">
                    <Moon className="size-3.5 text-indigo-600" />
                    Sono: meta de {goal.habits.sleepTargetHours} horas/noite
                  </span>
                  <span className="font-bold text-indigo-600">{progress.habitsAdherence.sleep}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress.habitsAdherence.sleep}%` }} />
                </div>
              </div>

              {/* Refeições */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--sm-ink)]">
                    <Utensils className="size-3.5 text-emerald-600" />
                    Adesão à Dieta: meta de {goal.habits.mealsAdherencePercent}% das refeições
                  </span>
                  <span className="font-bold text-emerald-600">{progress.habitsAdherence.meals}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress.habitsAdherence.meals}%` }} />
                </div>
              </div>

              {/* Passos */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--sm-ink)]">
                    <Footprints className="size-3.5 text-amber-600" />
                    Atividade: meta de {goal.habits.dailyStepsTarget.toLocaleString()} passos/dia
                  </span>
                  <span className="font-bold text-amber-600">{progress.habitsAdherence.steps}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${progress.habitsAdherence.steps}%` }} />
                </div>
              </div>
            </div>

            {goal.habits.habitsNotes && (
              <p className="mt-3 rounded-md bg-[var(--sm-canvas)] p-2.5 text-xs text-[var(--sm-muted)]">
                <strong>Orientações:</strong> {goal.habits.habitsNotes}
              </p>
            )}
          </div>

          {/* Observações Clínicas */}
          {goal.clinicalNotes && (
            <div className="rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3 text-xs">
              <strong className="text-[var(--sm-ink)]">Anotações do Profissional:</strong>
              <p className="mt-1 text-[var(--sm-muted)]">{goal.clinicalNotes}</p>
            </div>
          )}

          {/* Alertas Ativos */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Alertas Clínicos Ativos ({alerts.length})
              </h4>
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="size-4 text-amber-600" />
                    <span>{al.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">{al.description}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[var(--sm-ink)]">
                    Conduta: {al.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sm-border)] pt-4">
          <div className="flex items-center gap-2">
            {!isAchieved && (
              <Button
                size="sm"
                onClick={() => {
                  onMarkAchieved(goal.id)
                  onClose()
                }}
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Trophy className="size-3.5" />
                Marcar Atingida
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose()
                onEdit(item)
              }}
              className="gap-1.5"
            >
              <Edit2 className="size-3.5" />
              Editar Meta
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Tem certeza que deseja excluir esta meta?")) {
                  onDelete(goal.id)
                  onClose()
                }
              }}
              className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="size-3.5" />
              Excluir
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600">
                  <MessageSquare className="size-3.5" />
                  WhatsApp
                </Button>
              </a>
            )}
            <Link href={`/clientes/${client.id}/visao-360`}>
              <Button size="sm" className="gap-1.5 bg-[var(--sm-brand)] text-white hover:bg-[var(--sm-brand-hover)]">
                <span>Prontuário 360</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
