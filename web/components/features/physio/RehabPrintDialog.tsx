"use client"

import { useId, useMemo, useState } from "react"
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
import type { RehabPlan } from "@/hooks/features/useFisio"
import { openPrintWindow } from "@/lib/print-document"
import {
  buildRehabClinicalProtocolPrintHtml,
  buildRehabHomeProgramPrintHtml,
  selectHomeProgramExercises,
  type RehabPrintMode,
} from "@/lib/rehab-print-document"

export interface RehabPrintDialogProps {
  open: boolean
  plan: RehabPlan
  patientName: string
  defaultMode?: RehabPrintMode
  onClose: () => void
}

function formatIssueDate(now = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now)
}

export function RehabPrintDialog({
  open,
  plan,
  patientName,
  defaultMode = "home-program",
  onClose,
}: RehabPrintDialogProps) {
  const { user } = useAuth()
  if (!open || !user?.sub || user.role !== "PHYSIO") return null
  return (
    <RehabPrintDialogSession
      key={`${user.sub}:${plan.id}:${defaultMode}`}
      open={open}
      plan={plan}
      patientName={patientName}
      professionalName={user.name ?? null}
      defaultMode={defaultMode}
      onClose={onClose}
    />
  )
}

function RehabPrintDialogSession({
  open,
  plan,
  patientName,
  professionalName,
  defaultMode,
  onClose,
}: RehabPrintDialogProps & {
  professionalName: string | null
  defaultMode: RehabPrintMode
}) {
  const idPrefix = useId()
  const hasExplicitHomeExercises = useMemo(
    () =>
      plan.sessions.some(session =>
        session.exercises.some(
          ex => ex.isHomeExercise && ex.category !== "ELECTROTHERAPY",
        ),
      ),
    [plan.sessions],
  )

  const [mode, setMode] = useState<RehabPrintMode>(defaultMode)
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(
    null,
  )
  const [includeFallbackKinesiotherapy, setIncludeFallbackKinesiotherapy] =
    useState(!hasExplicitHomeExercises)
  const [includeIllustrations, setIncludeIllustrations] = useState(true)
  const [includeGeneralNotes, setIncludeGeneralNotes] = useState(true)
  const [credential, setCredential] = useState("")
  const [popupBlocked, setPopupBlocked] = useState(false)

  const homeExerciseCount = useMemo(() => {
    const targetSessions =
      selectedSessionIndex != null && plan.sessions[selectedSessionIndex]
        ? [plan.sessions[selectedSessionIndex]]
        : plan.sessions
    return targetSessions.reduce(
      (total, session) =>
        total +
        selectHomeProgramExercises(session, includeFallbackKinesiotherapy).length,
      0,
    )
  }, [plan.sessions, selectedSessionIndex, includeFallbackKinesiotherapy])

  const modeHomeId = `${idPrefix}-mode-home`
  const modeClinicalId = `${idPrefix}-mode-clinical`
  const sessionSelectId = `${idPrefix}-phase`
  const credentialId = `${idPrefix}-credential`
  const credentialHintId = `${idPrefix}-credential-hint`
  const fallbackCheckId = `${idPrefix}-fallback-kine`
  const illustrationsCheckId = `${idPrefix}-illustrations`
  const generalNotesCheckId = `${idPrefix}-general-notes`

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPopupBlocked(false)
    const input = {
      plan,
      patientName,
      professionalName,
      professionalCredential: credential,
      dateLabel: formatIssueDate(),
      options: {
        selectedSessionIndex,
        includeAllKinesiotherapyIfNoHomeFlag: includeFallbackKinesiotherapy,
        includeIllustrations,
        includeGeneralNotes,
      },
    }
    const html =
      mode === "clinical-protocol"
        ? buildRehabClinicalProtocolPrintHtml(input)
        : buildRehabHomeProgramPrintHtml(input)
    const popup = openPrintWindow(html, "width=1024,height=780")
    if (!popup) {
      setPopupBlocked(true)
      return
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent
        overlayClassName="print:hidden"
        className="print:hidden max-h-[90dvh] overflow-y-auto sm:max-w-xl"
      >
        <DialogTitle>Exportar PDF A4 de Fisioterapia</DialogTitle>
        <DialogDescription>
          Gere uma cartilha visual de exercícios para o paciente levar para casa ou o protocolo completo da clínica.
        </DialogDescription>

        <form className="space-y-5 pt-1" onSubmit={handleGenerate}>
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-bold text-[var(--sm-ink)]">
              Formato do documento
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-md border border-[var(--sm-border)] p-3">
                <input
                  id={modeHomeId}
                  type="radio"
                  name="rehab-print-mode"
                  value="home-program"
                  checked={mode === "home-program"}
                  onChange={() => {
                    setMode("home-program")
                    setPopupBlocked(false)
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label htmlFor={modeHomeId} className="cursor-pointer space-y-0.5 text-sm">
                  <span className="block font-bold text-[var(--sm-ink)]">
                    Cartilha de Exercícios para Casa
                  </span>
                  <span className="block text-xs text-[var(--sm-muted)]">
                    Apenas exercícios domiciliares, com ilustrações e instruções ao paciente. Notas clínicas e eletroterapia ficam ocultas.
                  </span>
                </label>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-[var(--sm-border)] p-3">
                <input
                  id={modeClinicalId}
                  type="radio"
                  name="rehab-print-mode"
                  value="clinical-protocol"
                  checked={mode === "clinical-protocol"}
                  onChange={() => {
                    setMode("clinical-protocol")
                    setPopupBlocked(false)
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label
                  htmlFor={modeClinicalId}
                  className="cursor-pointer space-y-0.5 text-sm"
                >
                  <span className="block font-bold text-[var(--sm-ink)]">
                    Protocolo Completo (Clínica)
                  </span>
                  <span className="block text-xs text-[var(--sm-muted)]">
                    Todas as fases, critérios de avanço, parâmetros de eletro/termoterapia e anotações clínicas.
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

          {plan.sessions.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor={sessionSelectId}>Fases incluídas</Label>
              <select
                id={sessionSelectId}
                name="selectedSessionIndex"
                value={selectedSessionIndex == null ? "" : String(selectedSessionIndex)}
                onChange={event => {
                  const raw = event.target.value
                  setSelectedSessionIndex(raw === "" ? null : Number(raw))
                  setPopupBlocked(false)
                }}
                className="min-h-11 w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas as fases do protocolo</option>
                {plan.sessions.map((session, idx) => (
                  <option key={session.id || idx} value={String(idx)}>
                    {session.name}
                    {(plan.currentPhaseIndex ?? 0) === idx ? " (Fase atual)" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={credentialId}>CREFITO / registro profissional (opcional)</Label>
            <p id={credentialHintId} className="text-xs text-[var(--sm-muted)]">
              Ex.: CREFITO-3 123456-F ou nome da clínica no cabeçalho.
            </p>
            <Input
              id={credentialId}
              name="professionalCredential"
              value={credential}
              maxLength={80}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={credentialHintId}
              placeholder="Ex.: CREFITO-3 123456-F"
              onChange={event => {
                setCredential(event.target.value)
                setPopupBlocked(false)
              }}
              className="min-h-11"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-[var(--sm-ink)]">
              Conteúdo incluído
            </legend>
            <div className="space-y-2">
              {mode === "home-program" ? (
                <>
                  <p className="rounded-md bg-[var(--sm-brand-subtle)] px-3 py-2 text-xs font-medium text-[var(--sm-ink)]">
                    {homeExerciseCount} {homeExerciseCount === 1 ? "exercício domiciliar selecionado" : "exercícios domiciliares selecionados"} para esta impressão.
                  </p>
                  <div className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--sm-border)] px-3 py-2">
                    <input
                      id={fallbackCheckId}
                      type="checkbox"
                      checked={includeFallbackKinesiotherapy}
                      onChange={event => {
                        setIncludeFallbackKinesiotherapy(event.target.checked)
                        setPopupBlocked(false)
                      }}
                      className="h-4 w-4 accent-[var(--sm-brand)]"
                    />
                    <label
                      htmlFor={fallbackCheckId}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      Incluir exercícios de cinesioterapia sem marcação domiciliar
                    </label>
                  </div>
                  <div className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--sm-border)] px-3 py-2">
                    <input
                      id={illustrationsCheckId}
                      type="checkbox"
                      checked={includeIllustrations}
                      onChange={event => {
                        setIncludeIllustrations(event.target.checked)
                        setPopupBlocked(false)
                      }}
                      className="h-4 w-4 accent-[var(--sm-brand)]"
                    />
                    <label
                      htmlFor={illustrationsCheckId}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      Incluir ilustrações visuais dos exercícios vinculados
                    </label>
                  </div>
                </>
              ) : null}

              <div className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--sm-border)] px-3 py-2">
                <input
                  id={generalNotesCheckId}
                  type="checkbox"
                  checked={includeGeneralNotes}
                  onChange={event => {
                    setIncludeGeneralNotes(event.target.checked)
                    setPopupBlocked(false)
                  }}
                  className="h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label
                  htmlFor={generalNotesCheckId}
                  className="flex-1 cursor-pointer text-sm"
                >
                  Incluir orientações gerais para casa
                </label>
              </div>
            </div>
          </fieldset>

          {popupBlocked ? (
            <p role="alert" className="rounded-md border border-amber-500 p-3 text-sm font-medium">
              O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11">
              Gerar PDF A4
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
