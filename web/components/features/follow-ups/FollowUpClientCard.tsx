"use client"

import {
  CalendarClock,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarPlus,
  MessageSquare,
  History,
  ExternalLink,
  MapPin,
  Video,
  ChevronRight,
  TrendingDown,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ClientFollowUpSummary, FollowUpStatus } from "@/types/follow-up"

interface FollowUpClientCardProps {
  item: ClientFollowUpSummary
  onSchedule: (clientId: string) => void
  onQuickMessage: (item: ClientFollowUpSummary) => void
  onViewCadence: (item: ClientFollowUpSummary) => void
}

const STATUS_CONFIG: Record<
  FollowUpStatus,
  { label: string; badgeColor: string; icon: typeof CalendarClock }
> = {
  UPCOMING_7_DAYS: {
    label: "Retorno Próximo (< 7 dias)",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    icon: CalendarClock,
  },
  UPCOMING_15_DAYS: {
    label: "Retorno em 8-15 dias",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    icon: Calendar,
  },
  UPCOMING_30_DAYS: {
    label: "Retorno em 16-30 dias",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
    icon: Calendar,
  },
  OVERDUE: {
    label: "Em Atraso Clínico",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    icon: AlertTriangle,
  },
  UNSCHEDULED: {
    label: "Sem Retorno Marcado",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    icon: Clock,
  },
  NO_SHOW: {
    label: "Falta Recente (No-show)",
    badgeColor: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
    icon: AlertTriangle,
  },
  COMPLETED_RECENT: {
    label: "Consulta Recente (< 7d)",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    icon: CheckCircle2,
  },
}

export function FollowUpClientCard({
  item,
  onSchedule,
  onQuickMessage,
  onViewCadence,
}: FollowUpClientCardProps) {
  const { client, lastAppointment, nextAppointment, daysSinceLastAppointment, daysUntilNextAppointment, status, churnRisk, regularity, averageIntervalDays } = item

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.UNSCHEDULED
  const StatusIcon = statusConfig.icon
  const isOverdue = status === "OVERDUE" || status === "NO_SHOW"

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card
      className={`border bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)] transition hover:shadow-md ${
        isOverdue ? "border-rose-300 dark:border-rose-900/60" : "border-[var(--sm-border)]"
      }`}
    >
      <CardContent className="p-5 sm:p-6">
        {/* Header Row: Info, Status badges, Actions */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--sm-brand-subtle)] text-sm font-black text-[var(--sm-brand)]">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--sm-ink)]">{client.name}</h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    daysUntilNextAppointment === 0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                      : statusConfig.badgeColor
                  }`}
                >
                  <StatusIcon className="size-3" />
                  {daysUntilNextAppointment === 0 ? "Retorno Hoje" : statusConfig.label}
                </span>

                {churnRisk === "HIGH" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    <TrendingDown className="size-2.5" />
                    Risco de Evasão
                  </span>
                )}
                {churnRisk === "MEDIUM" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Atenção
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--sm-muted)]">
                {client.goal ? `Foco: ${client.goal}` : "Foco não informado"}
                {client.phone ? ` • Tel: ${client.phone}` : ""}
                {averageIntervalDays ? ` • Cadência histórica: ~${averageIntervalDays} dias` : ""}
              </p>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onQuickMessage(item)}
              className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            >
              <MessageSquare className="size-3.5" />
              <span>WhatsApp</span>
            </Button>

            <Button
              size="sm"
              onClick={() => onSchedule(client.id)}
              className="h-8 gap-1.5 bg-[var(--sm-brand)] text-white hover:bg-[var(--sm-brand-hover)]"
            >
              <CalendarPlus className="size-3.5" />
              <span>Agendar Retorno</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewCadence(item)}
              title="Ver histórico de cadência e consultas"
              className="h-8 gap-1 text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            >
              <History className="size-3.5" />
              <span className="hidden sm:inline">Cadência</span>
            </Button>
          </div>
        </div>

        {/* Timeline strip: Last visit vs Next visit */}
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-3.5 sm:grid-cols-2">
          {/* Last appointment */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sm-muted)]">
              Último Atendimento
            </span>
            {lastAppointment ? (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-[var(--sm-ink)]">
                  {formatDate(lastAppointment.startsAt)}
                </span>
                <span className="text-[var(--sm-muted)]">
                  ({daysSinceLastAppointment} dias atrás)
                </span>
                <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {lastAppointment.kind === "FIRST_VISIT"
                    ? "Primeira consulta"
                    : lastAppointment.kind === "FOLLOW_UP"
                    ? "Retorno"
                    : lastAppointment.kind === "ASSESSMENT"
                    ? "Avaliação"
                    : "Atendimento"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-[var(--sm-muted)] italic">
                Nenhum atendimento anterior registrado
              </p>
            )}
          </div>

          {/* Next appointment */}
          <div className="space-y-1 sm:border-l sm:border-[var(--sm-border)] sm:pl-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sm-muted)]">
              Próximo Retorno Previsto
            </span>
            {nextAppointment ? (
              <div className="flex items-center gap-2 text-xs">
                <CalendarClock className="size-3.5 text-[var(--sm-brand)] shrink-0" />
                <strong
                  className={
                    daysUntilNextAppointment === 0
                      ? "font-black text-emerald-700 dark:text-emerald-300"
                      : "text-[var(--sm-brand)]"
                  }
                >
                  {daysUntilNextAppointment === 0 ? "Hoje" : formatDate(nextAppointment.startsAt)} às{" "}
                  {formatTime(nextAppointment.startsAt)}
                </strong>
                <span
                  className={`text-[var(--sm-muted)] ${
                    daysUntilNextAppointment === 0
                      ? "font-bold text-emerald-700 dark:text-emerald-300"
                      : ""
                  }`}
                >
                  ({daysUntilNextAppointment === 0 ? "Hoje" : `em ${daysUntilNextAppointment} dias`})
                </span>
                {nextAppointment.modality === "ONLINE" ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600">
                    <Video className="size-3" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-600">
                    <MapPin className="size-3" /> Presencial
                  </span>
                )}
              </div>
            ) : isOverdue ? (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                Sem retorno agendado há mais de {daysSinceLastAppointment ?? 35} dias
              </p>
            ) : (
              <p className="text-xs text-[var(--sm-muted)]">
                Nenhum retorno agendado (ciclo sugerido: a cada 30 dias)
              </p>
            )}
          </div>
        </div>

        {/* Footer info: Link to 360 record */}
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--sm-muted)]">
          <span>
            {item.completedAppointmentsCount} consulta(s) no histórico do prontuário
          </span>
          <Link
            href={`/clientes/${client.id}/visao-360`}
            className="inline-flex items-center gap-1 font-medium text-[var(--sm-brand)] hover:underline"
          >
            <span>Ver Prontuário 360</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
