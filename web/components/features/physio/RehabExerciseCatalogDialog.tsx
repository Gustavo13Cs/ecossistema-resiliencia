"use client"

import { useState } from "react"
import { ImageIcon, Search } from "lucide-react"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PhysioExerciseCatalogItem } from "@/hooks/features/useFisio"
import { usePhysioExerciseCatalog } from "@/hooks/features/useRehabCatalog"
import { isExerciseMediaUrl } from "@/lib/exercise-media-policy"
import {
  EXERCISE_EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_OPTIONS,
  type ExerciseEquipment,
} from "@/types/workout"

export interface RehabExerciseCatalogDialogProps {
  open: boolean
  onClose: () => void
  onSelectExercise: (item: PhysioExerciseCatalogItem) => void
}

export function RehabExerciseCatalogDialog({
  open,
  onClose,
  onSelectExercise,
}: RehabExerciseCatalogDialogProps) {
  const [search, setSearch] = useState("")
  const [muscleGroup, setMuscleGroup] = useState("ALL")
  const [onlyWithIllustration, setOnlyWithIllustration] = useState(true)

  const query = usePhysioExerciseCatalog(
    { q: search, muscleGroup, onlyWithIllustration },
    open,
  )

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-purple-600" />
          Biblioteca Visual de Exercícios SafeMove
        </DialogTitle>
        <DialogDescription>
          Vincule exercícios do catálogo SafeMove para levar ilustrações anatômicas e instruções passo a passo à cartilha domiciliar em PDF do paciente.
        </DialogDescription>

        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-3.5 left-3 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar exercício (ex: Agachamento, Dead bug, Prancha)..."
                aria-label="Buscar exercício na biblioteca visual"
                className="min-h-11 pl-9"
              />
            </div>
            <div>
              <select
                value={muscleGroup}
                onChange={event => setMuscleGroup(event.target.value)}
                aria-label="Filtrar por grupo muscular"
                className="min-h-11 w-full rounded-md border border-[var(--sm-border)] bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">Todos os grupos musculares</option>
                {MUSCLE_GROUP_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex min-h-11 items-center gap-2.5 rounded-md border border-[var(--sm-border)] px-3 py-2">
            <input
              id="physio-catalog-only-illustrated"
              type="checkbox"
              checked={onlyWithIllustration}
              onChange={event => setOnlyWithIllustration(event.target.checked)}
              className="h-4 w-4 accent-[var(--sm-brand)]"
            />
            <Label
              htmlFor="physio-catalog-only-illustrated"
              className="cursor-pointer text-sm font-medium"
            >
              Apenas exercícios com ilustração visual disponível para PDF
            </Label>
          </div>

          {query.isPending ? (
            <AsyncState
              kind="loading"
              title="Carregando biblioteca de exercícios"
              description="Consultando o catálogo oficial de demonstrações."
            />
          ) : query.isError ? (
            <AsyncState
              kind="error"
              title="Biblioteca indisponível"
              description="Não foi possível consultar o catálogo de exercícios."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void query.refetch()}
                >
                  Tentar novamente
                </Button>
              }
            />
          ) : !query.data?.length ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum exercício encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {query.data.map(item => {
                const asset = item.demonstration?.assets?.find(
                  candidate =>
                    candidate.type === "IMAGE" &&
                    candidate.displayAllowed === true &&
                    isExerciseMediaUrl(candidate.url),
                )
                const equipmentLabel =
                  EXERCISE_EQUIPMENT_LABELS[item.equipment as ExerciseEquipment] ??
                  item.equipment
                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-[var(--sm-border)] bg-white p-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">
                          {MUSCLE_GROUP_LABELS[item.muscleGroup]}
                        </Badge>
                        <Badge variant="outline">{equipmentLabel}</Badge>
                        {item.hasIllustration ? (
                          <Badge variant="outline">Com ilustração</Badge>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.name}
                      </h3>
                      {asset ? (
                        <figure className="space-y-1">
                          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-slate-800 p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={asset.url}
                              alt={asset.alt}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <figcaption className="text-[11px] text-slate-500">
                            {asset.author} · {asset.licenseName}
                          </figcaption>
                        </figure>
                      ) : null}
                      {item.demonstration?.instruction ? (
                        <p className="line-clamp-3 text-xs text-slate-600">
                          {item.demonstration.instruction}
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      className="min-h-11 w-full"
                      onClick={() => {
                        onSelectExercise(item)
                        onClose()
                      }}
                    >
                      Selecionar exercício
                    </Button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
