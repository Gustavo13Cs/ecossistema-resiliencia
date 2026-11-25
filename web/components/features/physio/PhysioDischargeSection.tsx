"use client"

import { useState } from "react"
import { isAxiosError } from "axios"
import { Award, Printer, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useDeletePhysioDischarge } from "@/hooks/features/usePhysioDischarges"
import {
  PHYSIO_DISCHARGE_REASON_LABELS,
  buildPhysioDischargePrintHtml,
} from "@/lib/physio-documents-print"
import { openPrintWindow } from "@/lib/print-document"
import type { PhysioDischargeRecord } from "@/types/physio"

interface PhysioDischargeSectionProps {
  clientId: string
  clientName: string
  discharges: PhysioDischargeRecord[]
  isPending: boolean
  isError: boolean
  blocked: boolean
  onRegisterNew: () => void
  onAccessDenied?: () => void
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date)
}

export function PhysioDischargeSection({
  clientId,
  clientName,
  discharges,
  isPending,
  isError,
  blocked,
  onRegisterNew,
  onAccessDenied,
}: PhysioDischargeSectionProps) {
  const { user } = useAuth()
  const deleteDischarge = useDeletePhysioDischarge(clientId)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    try {
      await deleteDischarge.mutateAsync(id)
      setConfirmDeleteId(null)
      toast.success("Registro de alta removido.")
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        onAccessDenied?.()
        return
      }
      toast.error("Não foi possível excluir o registro de alta.")
    }
  }

  function handlePrint(discharge: PhysioDischargeRecord) {
    const issueDateLabel = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date())
    const html = buildPhysioDischargePrintHtml({
      patientName: clientName,
      discharge,
      professionalName: user?.name ?? null,
      issueDateLabel,
    })
    const popup = openPrintWindow(html, "width=1024,height=780")
    if (!popup) {
      toast.error("Libere pop-ups para imprimir o relatório de alta.")
    }
  }

  return (
    <section
      aria-labelledby="physio-discharges-heading"
      className="min-w-0 space-y-4 border-t border-[var(--sm-border)] pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--sm-brand)]" />
          <h3 id="physio-discharges-heading" className="text-lg font-bold">
            Registros de alta e desfecho clínico
          </h3>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={blocked}
          onClick={onRegisterNew}
          className="min-h-11"
        >
          Nova alta fisioterapêutica
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-[var(--sm-muted)]">
          Carregando registros de alta...
        </p>
      ) : isError ? (
        <p className="text-sm text-rose-700">
          Não foi possível consultar os registros de alta.
        </p>
      ) : discharges.length === 0 ? (
        <p className="text-sm text-[var(--sm-muted)]">
          Nenhuma alta fisioterapêutica registrada para este paciente.
        </p>
      ) : (
        <div className="space-y-3">
          {discharges.map((discharge) => {
            const snapshot = discharge.comparisonSnapshot
            const painDelta =
              snapshot?.painDelta ??
              (discharge.initialPainLevel != null &&
              discharge.finalPainLevel != null
                ? discharge.initialPainLevel - discharge.finalPainLevel
                : null)
            const romCount = snapshot?.romComparisons.length ?? 0
            const scaleCount = snapshot?.scaleComparisons.length ?? 0

            return (
              <article
                key={discharge.id}
                className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">
                        {PHYSIO_DISCHARGE_REASON_LABELS[discharge.reason]}
                      </Badge>
                      <span className="text-sm font-semibold text-[var(--sm-ink)]">
                        {formatDate(discharge.dischargedAt)}
                      </span>
                    </div>
                    {discharge.rehabPlan ? (
                      <p className="mt-1 text-xs text-[var(--sm-muted)]">
                        Protocolo: {discharge.rehabPlan.title}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(discharge)}
                      className="min-h-9"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Imprimir alta
                    </Button>
                    {confirmDeleteId === discharge.id ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={blocked || deleteDischarge.isPending}
                        onClick={() => void handleDelete(discharge.id)}
                        className="min-h-9"
                      >
                        Confirmar exclusão da alta
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={blocked}
                        aria-label={`Excluir alta de ${formatDate(discharge.dischargedAt)}`}
                        onClick={() => setConfirmDeleteId(discharge.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-700" />
                      </Button>
                    )}
                  </div>
                </div>

                <dl className="grid gap-3 rounded-[var(--sm-radius-sm)] bg-[var(--sm-canvas)] p-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-[var(--sm-muted)]">Sessões</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums">
                      {discharge.sessionsCompleted}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">EVA (Inicial → Alta)</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums">
                      {discharge.initialPainLevel != null ||
                      discharge.finalPainLevel != null
                        ? `${discharge.initialPainLevel ?? "—"} → ${discharge.finalPainLevel ?? "—"}/10`
                        : "Não informada"}
                      {painDelta != null
                        ? ` (${painDelta >= 0 ? `-${painDelta}` : `+${Math.abs(painDelta)}`})`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">Goniometria</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums">
                      {romCount} {romCount === 1 ? "articulação" : "articulações"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--sm-muted)]">Escalas funcionais</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums">
                      {scaleCount} {scaleCount === 1 ? "escala" : "escalas"}
                    </dd>
                  </div>
                </dl>

                <p className="whitespace-pre-wrap break-words text-sm text-[var(--sm-ink)]">
                  {discharge.clinicalSummary}
                </p>

                {discharge.recommendations ? (
                  <p className="whitespace-pre-wrap break-words text-xs text-[var(--sm-muted)]">
                    <span className="font-semibold text-[var(--sm-ink)]">
                      Orientações pós-alta:{" "}
                    </span>
                    {discharge.recommendations}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
