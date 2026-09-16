"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  History,
  CalendarCheck,
  Clock,
  CheckCircle2,
  CalendarPlus,
  ExternalLink,
  MapPin,
  Video,
  XCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import type { ClientFollowUpSummary } from "@/types/follow-up"

interface ClientCadenceDrawerProps {
  item: ClientFollowUpSummary | null
  isOpen: boolean
  onClose: () => void
  onSchedule: (clientId: string) => void
}

export function ClientCadenceDrawer({
  item,
  isOpen,
  onClose,
  onSchedule,
}: ClientCadenceDrawerProps) {
  if (!item) return null

  const { client, appointmentsHistory, averageIntervalDays, regularity } = item

  const regularityConfig = {
    EXCELLENT: { label: "Excelente (Cadência Estável)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    REGULAR: { label: "Regular (Intervalos Aceitáveis)", color: "text-blue-700 bg-blue-50 border-blue-200" },
    IRREGULAR: { label: "Irregular (Grandes Espaçamentos)", color: "text-amber-700 bg-amber-50 border-amber-200" },
    NEW_CLIENT: { label: "Novo Cliente (1ª Consulta)", color: "text-purple-700 bg-purple-50 border-purple-200" },
  }[regularity]

  const sortedHistory = [...appointmentsHistory].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  )

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[var(--sm-brand)]">
            <History className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Histórico & Periodicidade</span>
          </div>
          <DialogTitle className="text-xl font-black text-[var(--sm-ink)]">
            {client.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--sm-muted)]">
            Análise de cadência entre consultas e continuidade do tratamento no SafeMove.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Card de Métricas de Cadência */}
          <div className="grid grid-cols-2 gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4 text-center">
            <div className="rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3">
              <span className="text-[11px] font-semibold text-[var(--sm-muted)]">
                Intervalo Médio
              </span>
              <p className="mt-1 text-2xl font-black text-[var(--sm-brand)]">
                {averageIntervalDays ? `${averageIntervalDays} dias` : "—"}
              </p>
              <p className="text-[10px] text-[var(--sm-muted)]">Padrão clínico: 28-35 dias</p>
            </div>

            <div className="rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3">
              <span className="text-[11px] font-semibold text-[var(--sm-muted)]">
                Total de Atendimentos
              </span>
              <p className="mt-1 text-2xl font-black text-[var(--sm-ink)]">
                {item.completedAppointmentsCount}
              </p>
              <p className="text-[10px] text-[var(--sm-muted)]">consultas realizadas</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 text-xs">
            <span className="font-semibold text-[var(--sm-ink)]">Classificação da Regularidade:</span>
            <span className={`rounded-full border px-2.5 py-0.5 font-bold ${regularityConfig.color}`}>
              {regularityConfig.label}
            </span>
          </div>

          {/* Linha do Tempo dos Atendimentos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Linha do Tempo de Atendimentos ({sortedHistory.length})
            </h4>

            {sortedHistory.length === 0 ? (
              <p className="mt-3 text-center text-xs text-[var(--sm-muted)] italic">
                Nenhum agendamento encontrado no histórico deste cliente.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {sortedHistory.map((app) => {
                  const isFuture = new Date(app.startsAt).getTime() > Date.now()
                  const isDone = app.status === "COMPLETED"
                  const isCancelled = app.status === "CANCELLED"
                  const isNoShow = app.status === "NO_SHOW"

                  return (
                    <div
                      key={app.id}
                      className="flex items-start justify-between rounded-lg border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {isDone ? (
                            <CheckCircle2 className="size-4 text-emerald-600" />
                          ) : isFuture ? (
                            <CalendarCheck className="size-4 text-blue-600" />
                          ) : isNoShow ? (
                            <XCircle className="size-4 text-red-600" />
                          ) : isCancelled ? (
                            <XCircle className="size-4 text-slate-400" />
                          ) : (
                            <Clock className="size-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--sm-ink)]">
                            {app.kind === "FIRST_VISIT"
                              ? "Primeira Consulta"
                              : app.kind === "FOLLOW_UP"
                              ? "Consulta de Retorno"
                              : app.kind === "ASSESSMENT"
                              ? "Reavaliação Física"
                              : "Atendimento Clínico"}
                          </p>
                          <p className="text-[11px] text-[var(--sm-muted)]">
                            {formatDateTime(app.startsAt)}
                          </p>
                          {app.notes && (
                            <p className="mt-1 text-[11px] italic text-[var(--sm-muted)]">
                              "{app.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            isDone
                              ? "bg-emerald-100 text-emerald-800"
                              : isFuture
                              ? "bg-blue-100 text-blue-800"
                              : isNoShow
                              ? "bg-red-100 text-red-800"
                              : isCancelled
                              ? "bg-slate-100 text-slate-600"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {isDone
                            ? "Realizada"
                            : isFuture
                            ? "Agendada"
                            : isNoShow
                            ? "Falta (No-show)"
                            : isCancelled
                            ? "Cancelada"
                            : app.status}
                        </span>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--sm-muted)]">
                          {app.modality === "ONLINE" ? (
                            <>
                              <Video className="size-3" /> Online
                            </>
                          ) : (
                            <>
                              <MapPin className="size-3" /> Presencial
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--sm-border)] pt-4">
          <Link href={`/clientes/${client.id}/visao-360`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-[var(--sm-muted)]">
              <span>Prontuário 360</span>
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => {
              onClose()
              onSchedule(client.id)
            }}
            className="gap-1.5 bg-[var(--sm-brand)] text-white hover:bg-[var(--sm-brand-hover)]"
          >
            <CalendarPlus className="size-3.5" />
            <span>Agendar Novo Retorno</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
