"use client"

import { useId, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { openPrintWindow } from "@/lib/print-document"
import {
  buildWorkoutBlockSheetPrintHtml,
  buildWorkoutGymSheetPrintHtml,
  type WorkoutPrintMode,
} from "@/lib/workout-print-document"
import { validatePeriodization } from "@/lib/workout-periodization"
import type { WorkoutDetail } from "@/types/workout"

export interface WorkoutPrintDialogProps {
  open: boolean
  workout: WorkoutDetail
  onClose: () => void
}

function formatIssueDate(now = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now)
}

export function WorkoutPrintDialog({ open, workout, onClose }: WorkoutPrintDialogProps) {
  const { user } = useAuth()
  if (!open || !user?.sub || user.role !== "PERSONAL") return null
  return (
    <WorkoutPrintDialogSession
      key={`${user.sub}:${workout.id}:${workout.weekProjection?.week ?? "base"}`}
      open={open}
      workout={workout}
      professionalName={user.name ?? null}
      onClose={onClose}
    />
  )
}

function WorkoutPrintDialogSession({
  open,
  workout,
  professionalName,
  onClose,
}: WorkoutPrintDialogProps & { professionalName: string | null }) {
  const idPrefix = useId()
  const hasValidPeriodization = Boolean(
    workout.periodization &&
      workout.durationWeeks &&
      validatePeriodization(workout.periodization, workout.durationWeeks, true).length === 0,
  )
  const initialWeek =
    hasValidPeriodization && workout.weekProjection?.week ? workout.weekProjection.week : null

  const [mode, setMode] = useState<WorkoutPrintMode>("gym-sheet")
  const [selectedWeek, setSelectedWeek] = useState<number | null>(initialWeek)
  const [includeLoads, setIncludeLoads] = useState(true)
  const [includeExerciseNotes, setIncludeExerciseNotes] = useState(true)
  const [includeGeneralNotes, setIncludeGeneralNotes] = useState(true)
  const [credential, setCredential] = useState("")
  const [popupBlocked, setPopupBlocked] = useState(false)

  const modeGymId = `${idPrefix}-mode-gym`
  const modeBlockId = `${idPrefix}-mode-block`
  const weekSelectId = `${idPrefix}-week`
  const credentialId = `${idPrefix}-credential`
  const credentialHintId = `${idPrefix}-credential-hint`
  const loadCheckId = `${idPrefix}-loads`
  const exNotesCheckId = `${idPrefix}-ex-notes`
  const genNotesCheckId = `${idPrefix}-gen-notes`

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPopupBlocked(false)
    const input = {
      workout,
      professionalName,
      professionalCredential: credential,
      dateLabel: formatIssueDate(),
      options: {
        includeLoads,
        includeExerciseNotes,
        includeGeneralNotes,
        selectedWeek: mode === "gym-sheet" ? selectedWeek : null,
      },
    }
    const html =
      mode === "block-sheet"
        ? buildWorkoutBlockSheetPrintHtml(input)
        : buildWorkoutGymSheetPrintHtml(input)
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
        <DialogTitle>Exportar PDF A4</DialogTitle>
        <DialogDescription>
          Gere um documento tipográfico limpo para impressão ou envio em PDF ao aluno, sem incluir anotações privadas do prontuário.
        </DialogDescription>

        <form className="space-y-5 pt-1" onSubmit={handleGenerate}>
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-bold text-[var(--sm-ink)]">Formato do documento</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-md border border-[var(--sm-border)] p-3">
                <input
                  id={modeGymId}
                  type="radio"
                  name="workout-print-mode"
                  value="gym-sheet"
                  checked={mode === "gym-sheet"}
                  onChange={() => {
                    setMode("gym-sheet")
                    setPopupBlocked(false)
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label htmlFor={modeGymId} className="cursor-pointer space-y-0.5 text-sm">
                  <span className="block font-bold text-[var(--sm-ink)]">Modo Ficha de Academia</span>
                  <span className="block text-xs text-[var(--sm-muted)]">
                    Retrato A4 enxuto por divisão (A/B/C), ideal para WhatsApp e consulta rápida.
                  </span>
                </label>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-[var(--sm-border)] p-3">
                <input
                  id={modeBlockId}
                  type="radio"
                  name="workout-print-mode"
                  value="block-sheet"
                  checked={mode === "block-sheet"}
                  onChange={() => {
                    setMode("block-sheet")
                    setPopupBlocked(false)
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label htmlFor={modeBlockId} className="cursor-pointer space-y-0.5 text-sm">
                  <span className="block font-bold text-[var(--sm-ink)]">Planilha do Bloco</span>
                  <span className="block text-xs text-[var(--sm-muted)]">
                    Paisagem A4 (prancheta) com colunas Semana 1 → Semana N e espaço para anotar cargas.
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

          {mode === "gym-sheet" && hasValidPeriodization && workout.durationWeeks ? (
            <div className="space-y-1.5">
              <Label htmlFor={weekSelectId}>Metas exibidas na Ficha de Academia</Label>
              <select
                id={weekSelectId}
                name="selectedWeek"
                value={selectedWeek == null ? "" : String(selectedWeek)}
                onChange={event => {
                  const raw = event.target.value
                  setSelectedWeek(raw ? Number(raw) : null)
                  setPopupBlocked(false)
                }}
                className="min-h-11 w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
              >
                <option value="">Prescrição base (valores originais)</option>
                {Array.from({ length: workout.durationWeeks }, (_, index) => index + 1).map(week => {
                  const phase = workout.periodization?.phases.find(
                    item => week >= item.startWeek && week <= item.endWeek,
                  )
                  return (
                    <option key={week} value={String(week)}>
                      Semana {week}{phase ? ` · ${phase.name}` : ""}
                    </option>
                  )
                })}
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={credentialId}>Registro / identificação no cabeçalho (opcional)</Label>
            <p id={credentialHintId} className="text-xs text-[var(--sm-muted)]">
              Ex.: CREF 012345-G/SP ou nome do studio para compor o cabeçalho junto ao seu nome.
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
              placeholder="Ex.: CREF 012345-G/SP"
              onChange={event => {
                setCredential(event.target.value)
                setPopupBlocked(false)
              }}
              className="min-h-11"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-[var(--sm-ink)]">Conteúdo incluído</legend>
            <div className="space-y-2">
              <div className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--sm-border)] px-3 py-2">
                <input
                  id={loadCheckId}
                  type="checkbox"
                  name="includeLoads"
                  checked={includeLoads}
                  onChange={event => {
                    setIncludeLoads(event.target.checked)
                    setPopupBlocked(false)
                  }}
                  className="h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label htmlFor={loadCheckId} className="flex-1 cursor-pointer text-sm">
                  Incluir cargas de referência prescritas
                </label>
              </div>

              <div className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--sm-border)] px-3 py-2">
                <input
                  id={exNotesCheckId}
                  type="checkbox"
                  name="includeExerciseNotes"
                  checked={includeExerciseNotes}
                  onChange={event => {
                    setIncludeExerciseNotes(event.target.checked)
                    setPopupBlocked(false)
                  }}
                  className="h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label htmlFor={exNotesCheckId} className="flex-1 cursor-pointer text-sm">
                  Incluir observações técnicas dos exercícios
                </label>
              </div>

              <div className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--sm-border)] px-3 py-2">
                <input
                  id={genNotesCheckId}
                  type="checkbox"
                  name="includeGeneralNotes"
                  checked={includeGeneralNotes}
                  onChange={event => {
                    setIncludeGeneralNotes(event.target.checked)
                    setPopupBlocked(false)
                  }}
                  className="h-4 w-4 accent-[var(--sm-brand)]"
                />
                <label htmlFor={genNotesCheckId} className="flex-1 cursor-pointer text-sm">
                  Incluir orientações gerais da ficha
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
