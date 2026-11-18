"use client"

import { useState } from "react"
import { isAxiosError } from "axios"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
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
import { useAuth } from "@/contexts/auth-context"
import { useCreateTrainingAnamnesis } from "@/hooks/features/useTrainingAnamnesis"
import {
  EMPTY_PARQ_ANSWERS,
  PARQ_QUESTIONS,
  TRAINING_ENVIRONMENT_DEFAULT_EQUIPMENT,
  TRAINING_ENVIRONMENT_LABELS,
  TRAINING_EXPERIENCE_LABELS,
  type ParqAnswers,
  type TrainingAnamnesisRecord,
  type TrainingEnvironment,
  type TrainingExperienceLevel,
} from "@/types/training-anamnesis"
import {
  EXERCISE_EQUIPMENT_LABELS,
  type ExerciseEquipment,
} from "@/types/workout"

export interface TrainingAnamnesisDialogProps {
  isOpen: boolean
  clientId: string
  initialRecord?: TrainingAnamnesisRecord | null
  onClose: () => void
  onSuccess: () => void
  onAccessDenied: () => void
}

const ALL_EQUIPMENT_KEYS = Object.keys(
  EXERCISE_EQUIPMENT_LABELS,
) as ExerciseEquipment[]

export function TrainingAnamnesisDialog(props: TrainingAnamnesisDialogProps) {
  const { user } = useAuth()
  if (!props.isOpen || !user?.sub || user.role !== "PERSONAL") return null
  return (
    <TrainingAnamnesisFormSession
      key={`${user.sub}:${props.clientId}:${props.initialRecord?.id ?? "fresh"}`}
      {...props}
    />
  )
}

function TrainingAnamnesisFormSession({
  isOpen,
  clientId,
  initialRecord,
  onClose,
  onSuccess,
  onAccessDenied,
}: TrainingAnamnesisDialogProps) {
  const createMutation = useCreateTrainingAnamnesis(clientId)

  const [parqAnswers, setParqAnswers] = useState<ParqAnswers>(() =>
    initialRecord?.parqAnswers
      ? { ...initialRecord.parqAnswers }
      : { ...EMPTY_PARQ_ANSWERS },
  )
  const [medicalClearanceNotes, setMedicalClearanceNotes] = useState(
    () => initialRecord?.medicalClearanceNotes ?? "",
  )
  const [musculoskeletalHistory, setMusculoskeletalHistory] = useState(
    () => initialRecord?.musculoskeletalHistory ?? "",
  )
  const [trainingExperience, setTrainingExperience] = useState<
    TrainingExperienceLevel | ""
  >(() => initialRecord?.trainingExperience ?? "")
  const [daysPerWeek, setDaysPerWeek] = useState(() =>
    initialRecord?.daysPerWeek != null ? String(initialRecord.daysPerWeek) : "",
  )
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(() =>
    initialRecord?.maxSessionMinutes != null
      ? String(initialRecord.maxSessionMinutes)
      : "",
  )
  const [environment, setEnvironment] = useState<TrainingEnvironment>(
    () => initialRecord?.environment ?? "FULL_GYM",
  )
  const [availableEquipment, setAvailableEquipment] = useState<
    ExerciseEquipment[]
  >(() =>
    initialRecord
      ? [...initialRecord.availableEquipment]
      : [...TRAINING_ENVIRONMENT_DEFAULT_EQUIPMENT.FULL_GYM],
  )
  const [equipmentCustomized, setEquipmentCustomized] = useState(() =>
    Boolean(initialRecord),
  )
  const [notes, setNotes] = useState(() => initialRecord?.notes ?? "")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hasPositiveParq = Object.values(parqAnswers).some(Boolean)
  const busy = createMutation.isPending

  const handleEnvironmentChange = (nextEnv: TrainingEnvironment) => {
    setEnvironment(nextEnv)
    if (!equipmentCustomized) {
      setAvailableEquipment([...TRAINING_ENVIRONMENT_DEFAULT_EQUIPMENT[nextEnv]])
    }
  }

  const applyPresetEquipment = () => {
    setAvailableEquipment([
      ...TRAINING_ENVIRONMENT_DEFAULT_EQUIPMENT[environment],
    ])
    setEquipmentCustomized(false)
  }

  const toggleEquipment = (item: ExerciseEquipment, checked: boolean) => {
    setEquipmentCustomized(true)
    setAvailableEquipment(prev =>
      checked
        ? prev.includes(item)
          ? prev
          : [...prev, item]
        : prev.filter(eq => eq !== item),
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    let parsedDays: number | null = null
    if (daysPerWeek.trim() !== "") {
      const n = Number(daysPerWeek)
      if (!Number.isInteger(n) || n < 1 || n > 7) {
        setErrorMessage(
          "Informe uma disponibilidade semanal válida entre 1 e 7 dias.",
        )
        return
      }
      parsedDays = n
    }

    let parsedMinutes: number | null = null
    if (maxSessionMinutes.trim() !== "") {
      const m = Number(maxSessionMinutes)
      if (!Number.isInteger(m) || m < 15 || m > 240) {
        setErrorMessage(
          "Informe uma duração máxima por sessão entre 15 e 240 minutos.",
        )
        return
      }
      parsedMinutes = m
    }

    try {
      await createMutation.mutateAsync({
        parqAnswers,
        medicalClearanceNotes: medicalClearanceNotes.trim() || null,
        musculoskeletalHistory: musculoskeletalHistory.trim() || null,
        trainingExperience: trainingExperience || null,
        daysPerWeek: parsedDays,
        maxSessionMinutes: parsedMinutes,
        environment,
        availableEquipment,
        notes: notes.trim() || null,
      })
      onSuccess()
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        onAccessDenied()
        return
      }
      setErrorMessage(
        "Não foi possível salvar a anamnese de treinamento. Revise os dados e tente novamente.",
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !busy) onClose() }}>
      <DialogContent
        overlayClassName="print:hidden"
        className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl print:hidden"
      >
        <DialogHeader>
          <DialogTitle>Anamnese de Treinamento, PAR-Q+ e Ambiente</DialogTitle>
          <DialogDescription>
            Registre a triagem pré-participação (PAR-Q+), histórico
            osteomuscular e os equipamentos disponíveis no local onde o aluno
            treina.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={event => void handleSubmit(event)} className="space-y-5">
          <fieldset className="space-y-2.5 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-4">
            <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-[var(--sm-muted)]">
              Triagem de prontidão física (PAR-Q+ — marque quando for SIM)
            </legend>
            <div className="space-y-2">
              {PARQ_QUESTIONS.map(question => {
                const checked = parqAnswers[question.key]
                return (
                  <label
                    key={question.key}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--sm-radius-sm)] border p-2.5 text-sm transition-colors ${
                      checked
                        ? "border-amber-500/60 bg-amber-500/10"
                        : "border-transparent hover:bg-[var(--sm-subtle-hover)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={event =>
                        setParqAnswers(prev => ({
                          ...prev,
                          [question.key]: event.target.checked,
                        }))
                      }
                      className="mt-1 size-4 shrink-0 accent-[var(--sm-brand)]"
                    />
                    <span>{question.label}</span>
                  </label>
                )
              })}
            </div>

            <div
              role="status"
              className={`mt-2 flex items-start gap-2 rounded-[var(--sm-radius-sm)] p-3 text-xs font-semibold ${
                hasPositiveParq
                  ? "border border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  : "border border-[var(--sm-border)] bg-[var(--sm-canvas)] text-[var(--sm-muted)]"
              }`}
            >
              {hasPositiveParq ? (
                <>
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    PAR-Q+ positivo detectado: documente abaixo a liberação
                    médica ou restrições de intensidade antes de progredir
                    cargas máximas.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Nenhuma resposta positiva no PAR-Q+ geral. Aluno apto à
                    progressão graduada.
                  </span>
                </>
              )}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="training-anamnesis-clearance">
              Liberação médica / Cautelas cardiovasculares
            </Label>
            <Textarea
              id="training-anamnesis-clearance"
              value={medicalClearanceNotes}
              disabled={busy}
              maxLength={3000}
              onChange={event => setMedicalClearanceNotes(event.target.value)}
              placeholder="Ex.: Atestado cardiológico sem restrições (10/2026); manter PA controlada."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="training-anamnesis-musculoskeletal">
              Histórico osteomuscular, cirurgias e restrições articulares
            </Label>
            <Textarea
              id="training-anamnesis-musculoskeletal"
              value={musculoskeletalHistory}
              disabled={busy}
              maxLength={4000}
              onChange={event => setMusculoskeletalHistory(event.target.value)}
              placeholder="Ex.: Condromalácia patelar direita; desconforto em desenvolvimento atrás da nuca."
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="training-anamnesis-experience">
                Experiência de treino
              </Label>
              <select
                id="training-anamnesis-experience"
                value={trainingExperience}
                disabled={busy}
                onChange={event =>
                  setTrainingExperience(
                    event.target.value as TrainingExperienceLevel | "",
                  )
                }
                className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
              >
                <option value="">Não informada</option>
                {Object.entries(TRAINING_EXPERIENCE_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-anamnesis-days">
                Dias disponíveis / semana
              </Label>
              <select
                id="training-anamnesis-days"
                value={daysPerWeek}
                disabled={busy}
                onChange={event => setDaysPerWeek(event.target.value)}
                className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
              >
                <option value="">Não informado</option>
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <option key={day} value={String(day)}>
                    {day} {day === 1 ? "dia/semana" : "dias/semana"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-anamnesis-minutes">
                Tempo máx. por sessão (min)
              </Label>
              <Input
                id="training-anamnesis-minutes"
                inputMode="numeric"
                value={maxSessionMinutes}
                disabled={busy}
                onChange={event => setMaxSessionMinutes(event.target.value)}
                placeholder="Ex.: 60"
                className="min-h-11 tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[220px] flex-1 space-y-2">
                <Label htmlFor="training-anamnesis-environment">
                  Ambiente principal de treino do aluno
                </Label>
                <select
                  id="training-anamnesis-environment"
                  value={environment}
                  disabled={busy}
                  onChange={event =>
                    handleEnvironmentChange(
                      event.target.value as TrainingEnvironment,
                    )
                  }
                  className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
                >
                  {Object.entries(TRAINING_ENVIRONMENT_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="min-h-11 text-xs"
                onClick={applyPresetEquipment}
              >
                Usar padrão deste ambiente
              </Button>
            </div>

            <fieldset className="space-y-2 pt-1">
              <legend className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                Equipamentos disponíveis neste ambiente
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {ALL_EQUIPMENT_KEYS.map(eq => (
                  <label
                    key={eq}
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--sm-subtle-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={availableEquipment.includes(eq)}
                      disabled={busy}
                      onChange={event =>
                        toggleEquipment(eq, event.target.checked)
                      }
                      className="size-4 accent-[var(--sm-brand)]"
                    />
                    <span>{EXERCISE_EQUIPMENT_LABELS[eq]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="space-y-2">
            <Label htmlFor="training-anamnesis-notes">
              Observações operacionais de treinamento
            </Label>
            <Textarea
              id="training-anamnesis-notes"
              value={notes}
              disabled={busy}
              maxLength={4000}
              onChange={event => setNotes(event.target.value)}
              placeholder="Preferências de horário, histórico esportivo, aderência..."
              rows={2}
            />
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger)] bg-[var(--sm-surface)] p-3 text-sm text-[var(--sm-danger)]"
            >
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="min-h-11"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="min-h-11">
              {busy ? "Salvando triagem..." : "Salvar anamnese / PAR-Q+"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
