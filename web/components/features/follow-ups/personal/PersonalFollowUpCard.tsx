"use client"

import Link from "next/link"
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Dumbbell,
  FileEdit,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  AssessmentCycleStatus,
  PersonalFollowUpItem,
  WorkoutCycleStatus,
} from "@/hooks/features/usePersonalFollowUps"

export interface PersonalFollowUpCardProps {
  item: PersonalFollowUpItem
  onEvaluate: (clientId: string) => void
  onSchedule: (clientId: string) => void
  onQuickMessage: (item: PersonalFollowUpItem) => void
}

const WORKOUT_BADGES: Record<
  WorkoutCycleStatus,
  { label: string; className: string }
> = {
  NO_ACTIVE_WORKOUT: {
    label: "Sem treino ativo",
    className:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  },
  CYCLE_COMPLETED: {
    label: "Bloco concluído / vencido",
    className:
      "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  },
  DELOAD_WEEK: {
    label: "Em Semana de Deload",
    className:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800",
  },
  ENDING_SOON: {
    label: "Reta final do bloco (≤ 14 dias)",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  },
  ACTIVE_ON_TRACK: {
    label: "Mesociclo em dia",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  },
}

const ASSESSMENT_BADGES: Record<
  AssessmentCycleStatus,
  { label: string; className: string }
> = {
  NEVER_ASSESSED: {
    label: "Nunca avaliado",
    className:
      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  },
  ASSESSMENT_OVERDUE: {
    label: "Reavaliação em atraso (>45d)",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  ASSESSMENT_DUE_SOON: {
    label: "Reavaliar em breve (30-45d)",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  },
  ASSESSMENT_UP_TO_DATE: {
    label: "Avaliação em dia",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function PersonalFollowUpCard({
  item,
  onEvaluate,
  onSchedule,
  onQuickMessage,
}: PersonalFollowUpCardProps) {
  const workoutBadge = WORKOUT_BADGES[item.workoutCycleStatus]
  const assessmentBadge = ASSESSMENT_BADGES[item.assessmentStatus]

  const primaryWorkoutHref = item.openDraft
    ? `/clientes/${item.client.id}/rascunhos/${item.openDraft.id}`
    : item.activeWorkout
      ? `/clientes/${item.client.id}/treinos/${item.activeWorkout.id}`
      : `/clientes/${item.client.id}/novo-treino`

  const primaryWorkoutLabel = item.openDraft
    ? "Continuar Rascunho"
    : item.activeWorkout
      ? "Abrir Ficha Ativa"
      : "Prescrever 1º Treino"

  return (
    <article className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)] transition hover:border-[var(--sm-brand)]/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Coluna Esquerda: Identificação + Badges */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/clientes/${item.client.id}`}
              className="text-base font-extrabold text-[var(--sm-ink)] hover:text-[var(--sm-brand)]"
            >
              {item.client.name}
            </Link>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${workoutBadge.className}`}
            >
              <Dumbbell className="size-3" />
              {workoutBadge.label}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${assessmentBadge.className}`}
            >
              <ClipboardCheck className="size-3" />
              {assessmentBadge.label}
            </span>

            {item.openDraft && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                <FileEdit className="size-3" />
                Rascunho aberto
              </span>
            )}

            {item.hasRecentNoShow && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">
                <AlertTriangle className="size-3" />
                Falta recente (No-show)
              </span>
            )}
          </div>

          {item.client.goal && (
            <p className="text-xs font-medium text-[var(--sm-muted)]">
              Objetivo: <span className="text-[var(--sm-ink)]">{item.client.goal}</span>
            </p>
          )}

          {/* Grid de 3 blocos de status operacional */}
          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            {/* 1. Estado do Mesociclo */}
            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                Prescrição &amp; Periodização
              </p>
              {item.activeWorkout ? (
                <>
                  <p className="mt-1 truncate text-xs font-bold text-[var(--sm-ink)]">
                    {item.activeWorkout.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sm-muted)]">
                    {item.currentWeek && item.totalWeeks
                      ? `Semana ${item.currentWeek} de ${item.totalWeeks}`
                      : "Sem duração fixa"}
                    {item.currentPhaseName ? ` · ${item.currentPhaseName}` : ""}
                    {item.remainingWorkoutDays !== null
                      ? ` (${item.remainingWorkoutDays}d restantes)`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  Nenhuma ficha ativa vinculada
                </p>
              )}
              {item.openDraft && (
                <p className="mt-1 truncate text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Em revisão: {item.openDraft.title || "Rascunho sem título"}
                </p>
              )}
            </div>

            {/* 2. Estado de Avaliação Física */}
            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                Avaliação Física &amp; 1RM
              </p>
              {item.lastAssessmentDate ? (
                <>
                  <p className="mt-1 text-xs font-bold text-[var(--sm-ink)]">
                    Última em {formatDateShort(item.lastAssessmentDate)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sm-muted)]">
                    {item.daysSinceLastAssessment === 0
                      ? "Realizada hoje"
                      : `Há ${item.daysSinceLastAssessment} dias`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  Nenhuma avaliação registrada
                </p>
              )}
            </div>

            {/* 3. Estado da Agenda */}
            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                Agenda de Sessões
              </p>
              {item.nextAppointment ? (
                <>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    Próxima: {formatDateShort(item.nextAppointment.startsAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sm-muted)]">
                    {item.daysUntilNextAppointment === 0
                      ? "Hoje na agenda"
                      : `Em ${item.daysUntilNextAppointment} dia(s)`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Clock className="size-3.5 shrink-0" />
                    Sem sessão futura agendada
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--sm-muted)]">
                    {item.daysSinceLastAppointment !== null
                      ? `Último atendimento há ${item.daysSinceLastAppointment}d`
                      : "Sem atendimentos recentes"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-stretch lg:justify-start">
          <Link href={primaryWorkoutHref}>
            <Button size="sm" className="w-full gap-1.5 font-bold">
              <Sparkles className="size-3.5" />
              {primaryWorkoutLabel}
            </Button>
          </Link>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEvaluate(item.client.id)}
            className="gap-1.5"
          >
            <ClipboardCheck className="size-3.5" />
            Avaliar Agora
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSchedule(item.client.id)}
            className="gap-1.5"
          >
            <CalendarPlus className="size-3.5" />
            Agendar Sessão
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onQuickMessage(item)}
            className="gap-1.5 text-[var(--sm-brand)] hover:bg-[var(--sm-brand-subtle)]"
          >
            <MessageSquare className="size-3.5" />
            Mensagem Rápida
          </Button>
        </div>
      </div>
    </article>
  )
}
