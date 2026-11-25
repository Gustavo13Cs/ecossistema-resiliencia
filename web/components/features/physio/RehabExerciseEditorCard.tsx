"use client"

import {
  ArrowDown,
  ArrowUp,
  Home,
  ImageIcon,
  Repeat,
  Timer,
  Trash2,
  Unlink,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  REHAB_ITEM_CATEGORY_LABELS,
  type RehabItemCategory,
  type RehabModalityParams,
} from "@/hooks/features/useFisio"
import { isExerciseMediaUrl } from "@/lib/exercise-media-policy"
import {
  ELECTRO_THERMO_PRESETS,
  type DraftRehabExercise,
} from "@/lib/rehab-presets"

interface RehabExerciseEditorCardProps {
  sessionId: string
  exercise: DraftRehabExercise
  index: number
  total: number
  onChange: (updater: (ex: DraftRehabExercise) => DraftRehabExercise) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onOpenCatalog: () => void
}

export function RehabExerciseEditorCard({
  sessionId,
  exercise,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  onOpenCatalog,
}: RehabExerciseEditorCardProps) {
  const isModality =
    exercise.category === "ELECTROTHERAPY" ||
    exercise.category === "THERMOTHERAPY"

  const availablePresets = ELECTRO_THERMO_PRESETS.filter(
    preset => preset.category === exercise.category,
  )

  const approvedIllustration = exercise.demonstrationSnapshot?.assets?.find(
    asset =>
      asset.type === "IMAGE" &&
      asset.displayAllowed === true &&
      isExerciseMediaUrl(asset.url),
  )

  const updateModalityParam = (
    key: keyof RehabModalityParams,
    value: string | number | undefined,
  ) => {
    onChange(prev => ({
      ...prev,
      modalityParams: {
        modality: prev.modalityParams?.modality ?? "",
        ...prev.modalityParams,
        [key]: value,
      },
    }))
  }

  const fieldPrefix = `${sessionId}-${exercise.id}`

  return (
    <div className="space-y-3 p-4 transition-colors hover:bg-purple-50/20 md:px-6">
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12 md:gap-4">
        <div className="col-span-1 space-y-2 md:col-span-5">
          <div className="flex items-center gap-2">
            <span className="w-5 font-black text-slate-300">{index + 1}.</span>
            <Input
              placeholder="Nome da terapia/exercício..."
              value={exercise.name}
              onChange={e =>
                onChange(prev => ({ ...prev, name: e.target.value }))
              }
              className="h-9 font-bold text-slate-800"
            />
          </div>

          <div className="ml-7 flex flex-wrap items-center gap-2">
            <select
              aria-label={`Categoria do item ${index + 1}`}
              value={exercise.category}
              onChange={e => {
                const nextCategory = e.target.value as RehabItemCategory
                onChange(prev => ({
                  ...prev,
                  category: nextCategory,
                  isHomeExercise:
                    nextCategory === "ELECTROTHERAPY" ? false : prev.isHomeExercise,
                }))
              }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
            >
              {Object.entries(REHAB_ITEM_CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>

            {exercise.category !== "ELECTROTHERAPY" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onOpenCatalog}
              >
                <ImageIcon className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                Biblioteca Visual
              </Button>
            ) : null}

            {exercise.catalogExerciseId ? (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[11px]">
                  {approvedIllustration
                    ? "Ilustração vinculada"
                    : "Catálogo vinculado"}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-500"
                  aria-label="Remover vínculo da biblioteca visual"
                  onClick={() =>
                    onChange(prev => ({
                      ...prev,
                      catalogExerciseId: null,
                      demonstrationSnapshot: null,
                    }))
                  }
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>

          <Input
            placeholder="Notas clínicas internas (ex: ajustar ângulo se dor > 3)..."
            value={exercise.notes}
            onChange={e =>
              onChange(prev => ({ ...prev, notes: e.target.value }))
            }
            className="ml-7 h-8 border-dashed bg-slate-50 text-xs text-slate-600"
          />
        </div>

        <div className="col-span-1 flex items-center gap-2 md:col-span-3">
          <Timer className="h-4 w-4 text-slate-400 md:hidden" />
          <Input
            value={exercise.sets}
            onChange={e =>
              onChange(prev => ({ ...prev, sets: e.target.value }))
            }
            className="h-9 w-full text-center font-bold"
            placeholder="Ex: 20 min ou 3"
          />
        </div>

        <div className="col-span-1 flex items-center gap-2 md:col-span-3">
          <Repeat className="h-4 w-4 text-slate-400 md:hidden" />
          <Input
            value={exercise.reps}
            onChange={e =>
              onChange(prev => ({ ...prev, reps: e.target.value }))
            }
            className="h-9 w-full text-center font-bold"
            placeholder="Ex: Contínuo ou 15"
          />
        </div>

        <div className="col-span-1 flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            aria-label={`Mover item ${index + 1} para cima`}
            onClick={() => onMove(-1)}
            className="h-8 w-8 text-slate-500"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index >= total - 1}
            aria-label={`Mover item ${index + 1} para baixo`}
            onClick={() => onMove(1)}
            className="h-8 w-8 text-slate-500"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remover item ${index + 1}`}
            className="h-8 w-8 text-rose-700 hover:bg-rose-50"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isModality ? (
        <div className="ml-0 space-y-3 rounded-lg border border-purple-200 bg-purple-50/40 p-3 md:ml-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <Zap className="h-3.5 w-3.5 text-purple-600" />
              Parâmetros de {REHAB_ITEM_CATEGORY_LABELS[exercise.category]}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availablePresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onChange(prev => ({
                      ...prev,
                      name: prev.name.trim() ? prev.name : preset.defaultName,
                      sets: prev.sets.trim() ? prev.sets : preset.sets,
                      reps: prev.reps.trim() ? prev.reps : preset.reps,
                      modalityParams: {
                        ...preset.params,
                        applicationSite: prev.modalityParams?.applicationSite,
                      },
                    }))
                  }
                  className="rounded-full border border-purple-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor={`${fieldPrefix}-mod`} className="text-[11px] text-slate-600">
                Recurso / Aparelho
              </Label>
              <Input
                id={`${fieldPrefix}-mod`}
                value={exercise.modalityParams?.modality ?? ""}
                onChange={e => updateModalityParam("modality", e.target.value)}
                placeholder="Ex: TENS, FES, Ultrassom"
                className="h-8 bg-white text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`${fieldPrefix}-freq`} className="text-[11px] text-slate-600">
                Frequência (Hz / MHz)
              </Label>
              <Input
                id={`${fieldPrefix}-freq`}
                value={exercise.modalityParams?.frequency ?? ""}
                onChange={e => updateModalityParam("frequency", e.target.value)}
                placeholder="Ex: 100 Hz ou 1 MHz"
                className="h-8 bg-white text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`${fieldPrefix}-pw`} className="text-[11px] text-slate-600">
                Largura de Pulso (µs)
              </Label>
              <Input
                id={`${fieldPrefix}-pw`}
                value={exercise.modalityParams?.pulseWidth ?? ""}
                onChange={e => updateModalityParam("pulseWidth", e.target.value)}
                placeholder="Ex: 80 µs ou 300 µs"
                className="h-8 bg-white text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`${fieldPrefix}-int`} className="text-[11px] text-slate-600">
                Intensidade / Dose
              </Label>
              <Input
                id={`${fieldPrefix}-int`}
                value={exercise.modalityParams?.intensity ?? ""}
                onChange={e => updateModalityParam("intensity", e.target.value)}
                placeholder="Ex: 0,8 W/cm² ou Limiar sensitivo"
                className="h-8 bg-white text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`${fieldPrefix}-mode`} className="text-[11px] text-slate-600">
                Modo de Emissão / Ciclo
              </Label>
              <Input
                id={`${fieldPrefix}-mode`}
                value={exercise.modalityParams?.emissionMode ?? ""}
                onChange={e =>
                  updateModalityParam("emissionMode", e.target.value)
                }
                placeholder="Ex: Pulsado 50% ou 10s/10s"
                className="h-8 bg-white text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`${fieldPrefix}-dur`} className="text-[11px] text-slate-600">
                Duração (min)
              </Label>
              <Input
                id={`${fieldPrefix}-dur`}
                type="number"
                min={1}
                max={240}
                value={exercise.modalityParams?.durationMinutes ?? ""}
                onChange={e => {
                  const raw = e.target.value
                  updateModalityParam(
                    "durationMinutes",
                    raw ? Number(raw) : undefined,
                  )
                }}
                placeholder="20"
                className="h-8 bg-white text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor={`${fieldPrefix}-site`} className="text-[11px] text-slate-600">
                Local de Aplicação / Posição dos Eletrodos
              </Label>
              <Input
                id={`${fieldPrefix}-site`}
                value={exercise.modalityParams?.applicationSite ?? ""}
                onChange={e =>
                  updateModalityParam("applicationSite", e.target.value)
                }
                placeholder="Ex: Paravertebral L3–S1 bilateral ou Quadríceps (vasto medial)"
                className="h-8 bg-white text-xs"
              />
            </div>
          </div>
        </div>
      ) : null}

      {exercise.category !== "ELECTROTHERAPY" ? (
        <div className="ml-0 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 md:ml-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={exercise.isHomeExercise}
                onChange={e =>
                  onChange(prev => ({
                    ...prev,
                    isHomeExercise: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[var(--sm-brand)]"
              />
              <Home className="h-3.5 w-3.5 text-purple-600" />
              Exercício para casa (Cartilha do Paciente em PDF)
            </label>

            {approvedIllustration ? (
              <div className="flex items-center gap-2">
                <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded bg-slate-800 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={approvedIllustration.url}
                    alt={approvedIllustration.alt}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  {approvedIllustration.licenseName}
                </span>
              </div>
            ) : null}
          </div>

          {exercise.isHomeExercise ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label htmlFor={`${fieldPrefix}-hfreq`} className="text-[11px] text-slate-600">
                  Frequência domiciliar
                </Label>
                <Input
                  id={`${fieldPrefix}-hfreq`}
                  value={exercise.homeFrequency}
                  onChange={e =>
                    onChange(prev => ({
                      ...prev,
                      homeFrequency: e.target.value,
                    }))
                  }
                  placeholder="Ex: 2x ao dia"
                  className="h-8 bg-white text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor={`${fieldPrefix}-pinst`} className="text-[11px] text-slate-600">
                  Instruções ao paciente (aparece no PDF domiciliar)
                </Label>
                <textarea
                  id={`${fieldPrefix}-pinst`}
                  rows={2}
                  value={exercise.patientInstructions}
                  onChange={e =>
                    onChange(prev => ({
                      ...prev,
                      patientInstructions: e.target.value,
                    }))
                  }
                  placeholder="Instruções em linguagem simples para o paciente realizar em casa..."
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
