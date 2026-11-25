"use client"

import { useEffect, useMemo, useState } from "react"
import { isAxiosError } from "axios"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useFisio, type RehabPlan } from "@/hooks/features/useFisio"
import {
  useCreatePhysioEvolution,
  useUpdatePhysioEvolution,
} from "@/hooks/features/usePhysioEvolutions"
import type {
  PhysioEvolutionAppointmentSummary,
  PhysioSessionEvolution,
} from "@/types/physio"

interface PhysioSessionEvolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName?: string
  appointmentId?: string | null
  appointmentLabel?: string | null
  defaultSessionDate?: string | null
  unlinkedAppointments?: PhysioEvolutionAppointmentSummary[]
  activePlan?: RehabPlan | null
  evolution?: PhysioSessionEvolution | null
  onSuccess?: (evolution: PhysioSessionEvolution) => void
  onAccessDenied?: () => void
}

function toLocalDateTimeInput(value?: string | null): string {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) {
    return toLocalDateTimeInput(new Date().toISOString())
  }
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function parsePainInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (!Number.isInteger(num) || num < 0 || num > 10) return null
  return num
}

function isPainInputInvalid(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  const num = Number(trimmed)
  return !Number.isInteger(num) || num < 0 || num > 10
}

function formatAppointmentOption(item: PhysioEvolutionAppointmentSummary): string {
  const date = new Date(item.startsAt)
  const label = Number.isNaN(date.getTime())
    ? item.startsAt
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
  return `${label} (${item.modality === "ONLINE" ? "Online" : "Presencial"})`
}

export function PhysioSessionEvolutionDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  appointmentId,
  appointmentLabel,
  defaultSessionDate,
  unlinkedAppointments = [],
  activePlan,
  evolution,
  onSuccess,
  onAccessDenied,
}: PhysioSessionEvolutionDialogProps) {
  const shouldFetchPlan = open && activePlan === undefined
  const fetchedPlan = useFisio(shouldFetchPlan ? clientId : undefined)
  const resolvedPlan = activePlan !== undefined ? activePlan : fetchedPlan.rehabPlan

  const createEvolution = useCreatePhysioEvolution()
  const updateEvolution = useUpdatePhysioEvolution(clientId)

  const [sessionDateInput, setSessionDateInput] = useState("")
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("")
  const [painBeforeInput, setPainBeforeInput] = useState("")
  const [painAfterInput, setPainAfterInput] = useState("")
  const [proceduresApplied, setProceduresApplied] = useState<string[]>([])
  const [customProcedure, setCustomProcedure] = useState("")
  const [patientResponse, setPatientResponse] = useState("")
  const [nextSteps, setNextSteps] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setCustomProcedure("")
    if (evolution) {
      setSessionDateInput(toLocalDateTimeInput(evolution.sessionDate))
      setSelectedAppointmentId(evolution.appointmentId ?? "")
      setPainBeforeInput(
        evolution.painBefore != null ? String(evolution.painBefore) : "",
      )
      setPainAfterInput(
        evolution.painAfter != null ? String(evolution.painAfter) : "",
      )
      setProceduresApplied(evolution.proceduresApplied ?? [])
      setPatientResponse(evolution.patientResponse ?? "")
      setNextSteps(evolution.nextSteps ?? "")
    } else {
      setSessionDateInput(toLocalDateTimeInput(defaultSessionDate))
      setSelectedAppointmentId(appointmentId ?? "")
      setPainBeforeInput("")
      setPainAfterInput("")
      setProceduresApplied([])
      setPatientResponse("")
      setNextSteps("")
    }
  }, [open, evolution, appointmentId, defaultSessionDate])

  const planProcedures = useMemo(() => {
    if (!resolvedPlan) return []
    const seen = new Set<string>()
    const items: Array<{ name: string; sessionName: string }> = []
    for (const session of resolvedPlan.sessions ?? []) {
      for (const exercise of session.exercises ?? []) {
        const clean = exercise.name.trim()
        if (!clean || seen.has(clean)) continue
        seen.add(clean)
        items.push({ name: clean, sessionName: session.name })
      }
    }
    return items
  }, [resolvedPlan])

  const isEditing = Boolean(evolution)
  const isPending = createEvolution.isPending || updateEvolution.isPending
  const painInvalid =
    isPainInputInvalid(painBeforeInput) || isPainInputInvalid(painAfterInput)
  const canSubmit = !isPending && patientResponse.trim().length > 0 && !painInvalid

  const toggleProcedure = (name: string) => {
    setProceduresApplied((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    )
  }

  const addCustomProcedure = () => {
    const clean = customProcedure.trim()
    if (!clean) return
    setProceduresApplied((current) =>
      current.includes(clean) ? current : [...current, clean],
    )
    setCustomProcedure("")
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitError(null)

    const parsedDate = sessionDateInput ? new Date(sessionDateInput) : new Date()
    const isoDate = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString()

    const painBefore = parsePainInput(painBeforeInput)
    const painAfter = parsePainInput(painAfterInput)

    try {
      let saved: PhysioSessionEvolution
      if (evolution) {
        saved = await updateEvolution.mutateAsync({
          id: evolution.id,
          input: {
            sessionDate: isoDate,
            painBefore,
            painAfter,
            proceduresApplied,
            patientResponse: patientResponse.trim(),
            nextSteps: nextSteps.trim() ? nextSteps.trim() : null,
          },
        })
        toast.success("Evolução da sessão atualizada.")
      } else {
        saved = await createEvolution.mutateAsync({
          clientId,
          appointmentId: selectedAppointmentId || null,
          rehabPlanId: resolvedPlan?.id ?? null,
          sessionDate: isoDate,
          painBefore,
          painAfter,
          proceduresApplied,
          patientResponse: patientResponse.trim(),
          nextSteps: nextSteps.trim() ? nextSteps.trim() : null,
        })
        toast.success("Evolução da sessão registrada.")
      }
      onSuccess?.(saved)
      onOpenChange(false)
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        onAccessDenied?.()
        onOpenChange(false)
        return
      }
      const apiMessage = isAxiosError<{ message?: string | string[] }>(error)
        ? error.response?.data?.message
        : null
      const message = Array.isArray(apiMessage)
        ? apiMessage[0]
        : typeof apiMessage === "string"
          ? apiMessage
          : "Não foi possível salvar a evolução da sessão."
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-[var(--sm-surface)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar evolução de sessão" : "Registrar evolução de sessão"}
          </DialogTitle>
          <DialogDescription>
            {clientName
              ? `Registro clínico do atendimento de ${clientName}.`
              : "Registre dor (EVA), condutas aplicadas e resposta clínica da sessão."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {appointmentLabel ? (
            <p className="rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand-subtle)] px-3 py-2 text-sm font-semibold text-[var(--sm-ink)]">
              Atendimento vinculado: {appointmentLabel}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="physio-evo-date">Data e hora da sessão</Label>
              <Input
                id="physio-evo-date"
                type="datetime-local"
                value={sessionDateInput}
                onChange={(e) => setSessionDateInput(e.target.value)}
                className="min-h-11 bg-[var(--sm-surface)]"
              />
            </div>

            {!isEditing && !appointmentId && unlinkedAppointments.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="physio-evo-appointment">
                  Vincular atendimento da agenda (opcional)
                </Label>
                <select
                  id="physio-evo-appointment"
                  value={selectedAppointmentId}
                  onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
                >
                  <option value="">Sem vínculo com agendamento</option>
                  {unlinkedAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {formatAppointmentOption(appt)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="physio-evo-pain-before">
                Dor inicial — EVA (0 a 10)
              </Label>
              <Input
                id="physio-evo-pain-before"
                type="number"
                min={0}
                max={10}
                step={1}
                inputMode="numeric"
                placeholder="Ex: 7"
                value={painBeforeInput}
                onChange={(e) => setPainBeforeInput(e.target.value)}
                className="min-h-11 bg-[var(--sm-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="physio-evo-pain-after">
                Dor final — EVA (0 a 10)
              </Label>
              <Input
                id="physio-evo-pain-after"
                type="number"
                min={0}
                max={10}
                step={1}
                inputMode="numeric"
                placeholder="Ex: 3"
                value={painAfterInput}
                onChange={(e) => setPainAfterInput(e.target.value)}
                className="min-h-11 bg-[var(--sm-surface)]"
              />
            </div>
          </div>

          {painInvalid ? (
            <p role="alert" className="text-sm font-medium text-[var(--sm-danger)]">
              Informe valores inteiros entre 0 e 10 para a Escala Visual Analógica (EVA).
            </p>
          ) : null}

          <div className="space-y-2.5">
            <Label htmlFor="physio-evo-custom-procedure">Condutas aplicadas</Label>

            {planProcedures.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[var(--sm-muted)]">
                  Do protocolo ativo ({resolvedPlan?.title}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {planProcedures.map((proc) => {
                    const selected = proceduresApplied.includes(proc.name)
                    return (
                      <button
                        key={proc.name}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleProcedure(proc.name)}
                        className={`min-h-11 rounded-[var(--sm-radius-sm)] border px-3 py-1.5 text-sm font-semibold transition-colors ${
                          selected
                            ? "border-[var(--sm-brand)] bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                            : "border-[var(--sm-border)] bg-[var(--sm-canvas)] text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
                        }`}
                      >
                        {proc.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Input
                id="physio-evo-custom-procedure"
                type="text"
                value={customProcedure}
                onChange={(e) => setCustomProcedure(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustomProcedure()
                  }
                }}
                placeholder="Adicionar conduta ou recurso (ex: TENS, liberação miofascial)"
                className="min-h-11 flex-1 bg-[var(--sm-surface)]"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={addCustomProcedure}
                disabled={!customProcedure.trim()}
              >
                <Plus aria-hidden="true" className="mr-1 size-4" />
                Adicionar
              </Button>
            </div>

            {proceduresApplied.length > 0 ? (
              <ul aria-label="Condutas selecionadas" className="flex flex-wrap gap-2 pt-1">
                {proceduresApplied.map((proc) => (
                  <li
                    key={proc}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sm-border)] bg-[var(--sm-brand-subtle)] px-3 py-1 text-xs font-bold text-[var(--sm-ink)]"
                  >
                    <span>{proc}</span>
                    <button
                      type="button"
                      aria-label={`Remover conduta ${proc}`}
                      onClick={() => toggleProcedure(proc)}
                      className="rounded-full p-0.5 text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="physio-evo-response">
              Evolução e resposta do paciente <span className="text-[var(--sm-danger)]">*</span>
            </Label>
            <Textarea
              id="physio-evo-response"
              required
              rows={4}
              value={patientResponse}
              onChange={(e) => setPatientResponse(e.target.value)}
              placeholder="Descreva a resposta clínica, tolerância às condutas, amplitude ou queixas durante a sessão..."
              className="bg-[var(--sm-surface)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="physio-evo-next-steps">
              Observações para a próxima sessão (opcional)
            </Label>
            <Textarea
              id="physio-evo-next-steps"
              rows={2}
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="Progressão planejada, orientações domiciliares ou pontos de atenção..."
              className="bg-[var(--sm-surface)]"
            />
          </div>

          {submitError ? (
            <p
              role="alert"
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)] px-3 py-2 text-sm font-semibold text-[var(--sm-danger)]"
            >
              {submitError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={!canSubmit}>
              {isPending
                ? "Salvando..."
                : isEditing
                  ? "Salvar alterações"
                  : "Salvar evolução"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
