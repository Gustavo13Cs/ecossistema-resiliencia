"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { isAxiosError } from "axios"
import { FileCheck2, Printer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useCreatePhysioDischarge } from "@/hooks/features/usePhysioDischarges"
import {
  PHYSIO_DISCHARGE_REASON_LABELS,
  buildPhysioDischargePrintHtml,
} from "@/lib/physio-documents-print"
import { openPrintWindow } from "@/lib/print-document"
import type {
  PhysioActivePlan,
  PhysioAssessmentRecord,
  PhysioDischargeReason,
  PhysioDischargeRecord,
  PhysioSessionPackageRecord,
} from "@/types/physio"

interface PhysioDischargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  assessments: PhysioAssessmentRecord[]
  evolutionsCount: number
  activePlan: PhysioActivePlan | null
  activePackage: PhysioSessionPackageRecord | null
  onCreated?: (record: PhysioDischargeRecord) => void
  onAccessDenied?: () => void
}

const DISCHARGE_REASONS = Object.keys(
  PHYSIO_DISCHARGE_REASON_LABELS,
) as PhysioDischargeReason[]

function formatDateInput(value = new Date()): string {
  return value.toISOString().slice(0, 10)
}

function formatAssessmentOption(assessment: PhysioAssessmentRecord): string {
  const date = new Date(assessment.date)
  const dateLabel = Number.isNaN(date.getTime())
    ? assessment.date
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date)
  const painLabel =
    assessment.painLevel != null ? ` · EVA ${assessment.painLevel}/10` : ""
  const complaint = assessment.chiefComplaint?.trim()
    ? ` · ${assessment.chiefComplaint.trim().slice(0, 42)}`
    : ""
  return `${dateLabel}${painLabel}${complaint}`
}

function parsePainInput(raw: string): number | null {
  if (!raw.trim()) return null
  const num = Number(raw)
  if (!Number.isFinite(num)) return null
  return Math.max(0, Math.min(10, Math.round(num)))
}

export function PhysioDischargeDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  assessments,
  evolutionsCount,
  activePlan,
  activePackage,
  onCreated,
  onAccessDenied,
}: PhysioDischargeDialogProps) {
  const idPrefix = useId()
  const { user } = useAuth()
  const createDischarge = useCreatePhysioDischarge()

  const orderedAssessments = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [assessments],
  )

  const [dischargedAt, setDischargedAt] = useState(() => formatDateInput())
  const [reason, setReason] = useState<PhysioDischargeReason>("GOALS_MET")
  const [initialAssessmentId, setInitialAssessmentId] = useState("")
  const [finalAssessmentId, setFinalAssessmentId] = useState("")
  const [initialPainLevel, setInitialPainLevel] = useState("")
  const [finalPainLevel, setFinalPainLevel] = useState("")
  const [clinicalSummary, setClinicalSummary] = useState("")
  const [recommendations, setRecommendations] = useState("")
  const [deactivateActivePlan, setDeactivateActivePlan] = useState(true)
  const [credential, setCredential] = useState("")
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(() => {
    if (!open) return
    setPopupBlocked(false)
    setDischargedAt(formatDateInput())
    setReason("GOALS_MET")

    const oldest = orderedAssessments[0] ?? null
    const newest =
      orderedAssessments.length >= 2
        ? orderedAssessments[orderedAssessments.length - 1]
        : null

    setInitialAssessmentId(oldest?.id ?? "")
    setFinalAssessmentId(newest?.id ?? "")
    setInitialPainLevel(
      oldest?.painLevel != null ? String(oldest.painLevel) : "",
    )
    setFinalPainLevel(
      newest?.painLevel != null ? String(newest.painLevel) : "",
    )
    setClinicalSummary(
      "Paciente concluiu o plano terapêutico proposto com evolução funcional satisfatória e controle álgico progressivo.",
    )
    setRecommendations("")
    setDeactivateActivePlan(Boolean(activePlan || activePackage))
  }, [open, orderedAssessments, activePlan, activePackage])

  if (!open) return null

  const initialAssessment =
    orderedAssessments.find((a) => a.id === initialAssessmentId) ?? null
  const finalAssessment =
    orderedAssessments.find((a) => a.id === finalAssessmentId) ?? null

  const previewInitialPain = parsePainInput(initialPainLevel)
  const previewFinalPain = parsePainInput(finalPainLevel)
  const previewPainDelta =
    previewInitialPain != null && previewFinalPain != null
      ? previewInitialPain - previewFinalPain
      : null

  function handleSelectInitial(id: string) {
    setInitialAssessmentId(id)
    const found = orderedAssessments.find((a) => a.id === id)
    if (found?.painLevel != null) {
      setInitialPainLevel(String(found.painLevel))
    }
  }

  function handleSelectFinal(id: string) {
    setFinalAssessmentId(id)
    const found = orderedAssessments.find((a) => a.id === id)
    if (found?.painLevel != null) {
      setFinalPainLevel(String(found.painLevel))
    }
  }

  async function submitDischarge(shouldPrint: boolean) {
    const trimmedSummary = clinicalSummary.trim()
    if (!trimmedSummary) {
      toast.error("Informe o resumo clínico da alta fisioterapêutica.")
      return
    }
    setPopupBlocked(false)

    try {
      const record = await createDischarge.mutateAsync({
        clientId,
        reason,
        dischargedAt: dischargedAt
          ? new Date(`${dischargedAt}T12:00:00.000Z`).toISOString()
          : null,
        rehabPlanId: activePlan?.id ?? null,
        initialAssessmentId: initialAssessmentId || null,
        finalAssessmentId: finalAssessmentId || null,
        initialPainLevel: previewInitialPain,
        finalPainLevel: previewFinalPain,
        clinicalSummary: trimmedSummary,
        recommendations: recommendations.trim() || null,
        deactivateActivePlan,
      })

      onCreated?.(record)
      toast.success("Alta fisioterapêutica registrada.")

      if (shouldPrint) {
        const issueDateLabel = new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(new Date())
        const html = buildPhysioDischargePrintHtml({
          patientName: clientName,
          discharge: record,
          professionalName: user?.name ?? null,
          professionalCredential: credential.trim() || null,
          issueDateLabel,
        })
        const popup = openPrintWindow(html, "width=1024,height=780")
        if (!popup) {
          setPopupBlocked(true)
          return
        }
      }

      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
        onAccessDenied?.()
        return
      }
      toast.error("Não foi possível registrar a alta fisioterapêutica.")
    }
  }

  const selectClass =
    "mt-1 block min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)]"
  const textareaClass =
    "mt-1 block w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] px-3 py-2 text-sm text-[var(--sm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
          <FileCheck2 className="h-5 w-5 text-[var(--sm-brand)]" />
          Registrar alta fisioterapêutica
        </DialogTitle>
        <DialogDescription>
          Consolide o comparativo clínico inicial versus final de {clientName} e
          gere o relatório de alta.
        </DialogDescription>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submitDischarge(false)
          }}
          className="mt-2 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${idPrefix}-date`}>Data da alta</Label>
              <Input
                id={`${idPrefix}-date`}
                type="date"
                value={dischargedAt}
                onChange={(e) => setDischargedAt(e.target.value)}
                required
                className="mt-1 min-h-11"
              />
            </div>

            <div>
              <Label htmlFor={`${idPrefix}-reason`}>Motivo da alta</Label>
              <select
                id={`${idPrefix}-reason`}
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value as PhysioDischargeReason)
                }
                className={selectClass}
              >
                {DISCHARGE_REASONS.map((key) => (
                  <option key={key} value={key}>
                    {PHYSIO_DISCHARGE_REASON_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {orderedAssessments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${idPrefix}-initial-assessment`}>
                  Avaliação inicial (referência)
                </Label>
                <select
                  id={`${idPrefix}-initial-assessment`}
                  value={initialAssessmentId}
                  onChange={(e) => handleSelectInitial(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Selecionar automaticamente</option>
                  {orderedAssessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {formatAssessmentOption(assessment)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor={`${idPrefix}-final-assessment`}>
                  Avaliação final / reavaliação
                </Label>
                <select
                  id={`${idPrefix}-final-assessment`}
                  value={finalAssessmentId}
                  onChange={(e) => handleSelectFinal(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Nenhuma reavaliação selecionada</option>
                  {orderedAssessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {formatAssessmentOption(assessment)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor={`${idPrefix}-pain-initial`}>
                EVA inicial (0 a 10)
              </Label>
              <Input
                id={`${idPrefix}-pain-initial`}
                type="number"
                min={0}
                max={10}
                value={initialPainLevel}
                onChange={(e) => setInitialPainLevel(e.target.value)}
                placeholder="Ex: 8"
                className="mt-1 min-h-11"
              />
            </div>

            <div>
              <Label htmlFor={`${idPrefix}-pain-final`}>
                EVA na alta (0 a 10)
              </Label>
              <Input
                id={`${idPrefix}-pain-final`}
                type="number"
                min={0}
                max={10}
                value={finalPainLevel}
                onChange={(e) => setFinalPainLevel(e.target.value)}
                placeholder="Ex: 1"
                className="mt-1 min-h-11"
              />
            </div>

            <div>
              <Label htmlFor={`${idPrefix}-credential`}>
                Registro CREFITO (opcional)
              </Label>
              <Input
                id={`${idPrefix}-credential`}
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="CREFITO-3/00000-F"
                className="mt-1 min-h-11"
              />
            </div>
          </div>

          <div
            aria-label="Prévia comparativa da alta"
            className="grid gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-3.5 text-sm sm:grid-cols-3"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--sm-muted)]">
                Sessões registradas
              </p>
              <p className="font-bold tabular-nums">{evolutionsCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--sm-muted)]">
                Comparativo EVA
              </p>
              <p className="font-bold tabular-nums">
                {previewInitialPain != null || previewFinalPain != null
                  ? `${previewInitialPain ?? "—"} → ${previewFinalPain ?? "—"}/10`
                  : "Não informado"}
                {previewPainDelta != null
                  ? ` (${previewPainDelta >= 0 ? `-${previewPainDelta}` : `+${Math.abs(previewPainDelta)}`} pts)`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--sm-muted)]">
                Goniometria vinculada
              </p>
              <p className="font-bold tabular-nums">
                {initialAssessment?.goniometry?.length ||
                finalAssessment?.goniometry?.length
                  ? `${initialAssessment?.goniometry?.length ?? 0} → ${finalAssessment?.goniometry?.length ?? 0} medidas`
                  : "Comparativo automático"}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor={`${idPrefix}-summary`}>
              Desfecho clínico e resumo da evolução *
            </Label>
            <textarea
              id={`${idPrefix}-summary`}
              rows={3}
              required
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              className={textareaClass}
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}-recommendations`}>
              Orientações e manutenção pós-alta (opcional)
            </Label>
            <textarea
              id={`${idPrefix}-recommendations`}
              rows={2}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Ex: Manter fortalecimento domiciliar 2x/semana e retorno se houver recidiva álgica."
              className={textareaClass}
            />
          </div>

          {activePlan || activePackage ? (
            <label className="flex items-start gap-2.5 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 text-sm">
              <input
                type="checkbox"
                checked={deactivateActivePlan}
                onChange={(e) => setDeactivateActivePlan(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Encerrar protocolo ({activePlan?.title ?? "nenhum"}) e concluir
                pacote de sessões ativo ({activePackage?.title ?? "nenhum"}) ao
                registrar a alta.
              </span>
            </label>
          ) : null}

          {popupBlocked ? (
            <p role="alert" className="text-sm font-semibold text-amber-800">
              Alta registrada, mas o navegador bloqueou a janela de impressão.
              Libere pop-ups para imprimir pela seção de alta no prontuário.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="min-h-11"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={createDischarge.isPending}
              onClick={() => void submitDischarge(true)}
              className="min-h-11"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Salvar e imprimir relatório
            </Button>
            <Button
              type="submit"
              disabled={createDischarge.isPending}
              className="min-h-11"
            >
              {createDischarge.isPending ? "Registrando..." : "Salvar alta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
