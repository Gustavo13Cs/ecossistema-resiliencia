"use client"

import { useEffect, useMemo, useState } from "react"
import { isAxiosError } from "axios"
import { Plus, Trash2 } from "lucide-react"
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
import { useCreatePhysioScale } from "@/hooks/features/usePhysioScales"
import {
  DISABILITY_LEVEL_LABELS,
  DISABILITY_SECTION_TITLES_NDI,
  DISABILITY_SECTION_TITLES_OSWESTRY,
  LEFS_ITEMS,
  LEFS_OPTIONS,
  PHYSIO_SCALE_DEFINITIONS,
  SPADI_DISABILITY_ITEMS,
  SPADI_PAIN_ITEMS,
  TUG_DEVICE_LABELS,
  previewPhysioScaleScore,
} from "@/lib/physio-scales"
import type { PhysioScaleType, TugAssistiveDevice } from "@/types/physio"

const SCALE_TYPES: readonly PhysioScaleType[] = [
  "PSFS",
  "OSWESTRY",
  "NDI",
  "LEFS",
  "SPADI",
  "TUG",
]

interface PsfsActivityState {
  description: string
  score: string
}

export function PhysioFunctionalScaleDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onAccessDenied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName?: string
  onAccessDenied?: () => void
}) {
  const createScale = useCreatePhysioScale()

  const [scaleType, setScaleType] = useState<PhysioScaleType>("PSFS")
  const [notes, setNotes] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)

  // PSFS
  const [psfsActivities, setPsfsActivities] = useState<PsfsActivityState[]>([
    { description: "", score: "5" },
  ])

  // OSWESTRY & NDI
  const [sections, setSections] = useState<Array<number | null>>(
    Array.from({ length: 10 }, () => 0),
  )

  // LEFS
  const [lefsItems, setLefsItems] = useState<number[]>(
    Array.from({ length: 20 }, () => 2),
  )

  // SPADI
  const [spadiPain, setSpadiPain] = useState<number[]>(
    Array.from({ length: 5 }, () => 5),
  )
  const [spadiDisability, setSpadiDisability] = useState<number[]>(
    Array.from({ length: 8 }, () => 5),
  )

  // TUG
  const [tugSeconds, setTugSeconds] = useState("")
  const [tugDevice, setTugDevice] = useState<TugAssistiveDevice>("NONE")

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setNotes("")
    setPsfsActivities([{ description: "", score: "5" }])
    setSections(Array.from({ length: 10 }, () => 0))
    setLefsItems(Array.from({ length: 20 }, () => 2))
    setSpadiPain(Array.from({ length: 5 }, () => 5))
    setSpadiDisability(Array.from({ length: 8 }, () => 5))
    setTugSeconds("")
    setTugDevice("NONE")
  }, [open])

  const answersPayload = useMemo<Record<string, unknown>>(() => {
    switch (scaleType) {
      case "PSFS":
        return {
          activities: psfsActivities.map((item) => ({
            description: item.description,
            score:
              item.score.trim() === ""
                ? -1
                : Number.isInteger(Number(item.score))
                  ? Number(item.score)
                  : -1,
          })),
        }
      case "OSWESTRY":
      case "NDI":
        return { sections }
      case "LEFS":
        return { items: lefsItems }
      case "SPADI":
        return { painItems: spadiPain, disabilityItems: spadiDisability }
      case "TUG":
        return {
          timeSeconds: tugSeconds.trim() ? Number(tugSeconds) : NaN,
          assistiveDevice: tugDevice,
        }
    }
  }, [
    scaleType,
    psfsActivities,
    sections,
    lefsItems,
    spadiPain,
    spadiDisability,
    tugSeconds,
    tugDevice,
  ])

  const preview = useMemo(
    () => previewPhysioScaleScore(scaleType, answersPayload),
    [scaleType, answersPayload],
  )

  const definition = PHYSIO_SCALE_DEFINITIONS[scaleType]

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!preview.valid || createScale.isPending) return
    setSubmitError(null)

    try {
      await createScale.mutateAsync({
        clientId,
        scaleType,
        answers: answersPayload,
        notes: notes.trim() ? notes.trim() : null,
      })
      toast.success(`${definition.shortName} registrada com sucesso.`)
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
      const apiMsg = isAxiosError<{ message?: string | string[] }>(error)
        ? error.response?.data?.message
        : null
      const msg = Array.isArray(apiMsg)
        ? apiMsg[0]
        : typeof apiMsg === "string"
          ? apiMsg
          : "Não foi possível salvar a escala funcional."
      setSubmitError(msg)
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-[var(--sm-surface)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aplicar escala funcional</DialogTitle>
          <DialogDescription>
            {clientName
              ? `Pontuação e classificação automática para ${clientName}.`
              : "Escolha o instrumento clínico e preencha os itens."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="physio-scale-type">Instrumento clínico</Label>
            <select
              id="physio-scale-type"
              value={scaleType}
              onChange={(e) => {
                setScaleType(e.target.value as PhysioScaleType)
                setSubmitError(null)
              }}
              className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm font-semibold text-[var(--sm-ink)]"
            >
              {SCALE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PHYSIO_SCALE_DEFINITIONS[type].name} —{" "}
                  {PHYSIO_SCALE_DEFINITIONS[type].region}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--sm-muted)]">
              {definition.description} {definition.directionHint}
            </p>
          </div>

          {/* Live automatic score preview */}
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-brand-subtle)] p-4"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                Pontuação calculada ({definition.shortName})
              </p>
              <p className="text-sm font-bold text-[var(--sm-ink)]">
                {preview.classification}
              </p>
              {preview.detail ? (
                <p className="text-xs text-[var(--sm-muted)]">
                  {preview.detail}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold tabular-nums text-[var(--sm-brand)]">
                {preview.valid && preview.rawScore !== null
                  ? `${preview.rawScore}${preview.scoreUnit}`
                  : "—"}
              </span>
            </div>
          </div>

          {/* PSFS */}
          {scaleType === "PSFS" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--sm-ink)]">
                  Atividades específicas (1 a 5)
                </span>
                {psfsActivities.length < 5 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() =>
                      setPsfsActivities((prev) => [
                        ...prev,
                        { description: "", score: "5" },
                      ])
                    }
                  >
                    <Plus className="mr-1 size-4" /> Adicionar atividade
                  </Button>
                ) : null}
              </div>
              {psfsActivities.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 items-end gap-3 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 sm:grid-cols-[1fr_130px_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`psfs-desc-${idx}`}>
                      Atividade {idx + 1}
                    </Label>
                    <Input
                      id={`psfs-desc-${idx}`}
                      value={item.description}
                      onChange={(e) =>
                        setPsfsActivities((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, description: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Ex: Subir 2 lances de escada"
                      className="min-h-11 bg-[var(--sm-surface)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`psfs-score-${idx}`}>Nota (0 a 10)</Label>
                    <Input
                      id={`psfs-score-${idx}`}
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={item.score}
                      onChange={(e) =>
                        setPsfsActivities((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, score: e.target.value } : row,
                          ),
                        )
                      }
                      className="min-h-11 bg-[var(--sm-surface)] font-bold"
                    />
                  </div>
                  {psfsActivities.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover atividade ${idx + 1}`}
                      className="min-h-11 text-[var(--sm-danger)]"
                      onClick={() =>
                        setPsfsActivities((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* OSWESTRY / NDI */}
          {scaleType === "OSWESTRY" || scaleType === "NDI" ? (
            <div className="space-y-3">
              {(scaleType === "OSWESTRY"
                ? DISABILITY_SECTION_TITLES_OSWESTRY
                : DISABILITY_SECTION_TITLES_NDI
              ).map((title, idx) => (
                <div
                  key={title}
                  className="grid grid-cols-1 items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 sm:grid-cols-[1fr_240px]"
                >
                  <Label htmlFor={`disability-sec-${idx}`}>{title}</Label>
                  <select
                    id={`disability-sec-${idx}`}
                    value={sections[idx] === null ? "NA" : String(sections[idx])}
                    onChange={(e) => {
                      const nextVal =
                        e.target.value === "NA" ? null : Number(e.target.value)
                      setSections((prev) =>
                        prev.map((v, i) => (i === idx ? nextVal : v)),
                      )
                    }}
                    className="min-h-11 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm"
                  >
                    {DISABILITY_LEVEL_LABELS.map((label, score) => (
                      <option key={label} value={String(score)}>
                        {label}
                      </option>
                    ))}
                    <option value="NA">Não aplicável (omitir seção)</option>
                  </select>
                </div>
              ))}
            </div>
          ) : null}

          {/* LEFS */}
          {scaleType === "LEFS" ? (
            <div className="space-y-2.5">
              {LEFS_ITEMS.map((itemLabel, idx) => (
                <div
                  key={itemLabel}
                  className="grid grid-cols-1 items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 sm:grid-cols-[1fr_250px]"
                >
                  <Label htmlFor={`lefs-item-${idx}`}>{itemLabel}</Label>
                  <select
                    id={`lefs-item-${idx}`}
                    value={String(lefsItems[idx])}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setLefsItems((prev) =>
                        prev.map((v, i) => (i === idx ? val : v)),
                      )
                    }}
                    className="min-h-11 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm"
                  >
                    {LEFS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}

          {/* SPADI */}
          {scaleType === "SPADI" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--sm-ink)]">
                  Subescala de Dor (0 = sem dor, 10 = pior dor imaginável)
                </h3>
                {SPADI_PAIN_ITEMS.map((label, idx) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 sm:grid-cols-[1fr_110px]"
                  >
                    <Label htmlFor={`spadi-pain-${idx}`}>{label}</Label>
                    <Input
                      id={`spadi-pain-${idx}`}
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={spadiPain[idx]}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(10, Math.round(Number(e.target.value) || 0)),
                        )
                        setSpadiPain((prev) =>
                          prev.map((v, i) => (i === idx ? val : v)),
                        )
                      }}
                      className="min-h-11 bg-[var(--sm-surface)] font-bold"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--sm-ink)]">
                  Subescala de Incapacidade (0 = sem dificuldade, 10 = incapaz)
                </h3>
                {SPADI_DISABILITY_ITEMS.map((label, idx) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 items-center gap-2 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 sm:grid-cols-[1fr_110px]"
                  >
                    <Label htmlFor={`spadi-dis-${idx}`}>{label}</Label>
                    <Input
                      id={`spadi-dis-${idx}`}
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={spadiDisability[idx]}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(10, Math.round(Number(e.target.value) || 0)),
                        )
                        setSpadiDisability((prev) =>
                          prev.map((v, i) => (i === idx ? val : v)),
                        )
                      }}
                      className="min-h-11 bg-[var(--sm-surface)] font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* TUG */}
          {scaleType === "TUG" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tug-seconds">Tempo observado (segundos)</Label>
                <Input
                  id="tug-seconds"
                  type="number"
                  min={0.1}
                  max={300}
                  step={0.1}
                  placeholder="Ex: 11.4"
                  value={tugSeconds}
                  onChange={(e) => setTugSeconds(e.target.value)}
                  className="min-h-11 bg-[var(--sm-surface)] font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tug-device">Dispositivo auxiliar</Label>
                <select
                  id="tug-device"
                  value={tugDevice}
                  onChange={(e) =>
                    setTugDevice(e.target.value as TugAssistiveDevice)
                  }
                  className="min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm"
                >
                  {(Object.keys(TUG_DEVICE_LABELS) as TugAssistiveDevice[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {TUG_DEVICE_LABELS[key]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="physio-scale-notes">
              Observações clínicas (opcional)
            </Label>
            <Textarea
              id="physio-scale-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto do teste, uso de órtese, fadiga..."
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
              disabled={createScale.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="min-h-11"
              disabled={!preview.valid || createScale.isPending}
            >
              {createScale.isPending ? "Salvando..." : "Salvar escala"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
