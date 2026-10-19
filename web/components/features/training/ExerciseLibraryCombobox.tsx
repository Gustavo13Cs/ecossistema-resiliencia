"use client"

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  QueryClient,
  QueryClientContext,
  QueryClientProvider,
} from "@tanstack/react-query"
import { BookOpen, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useExerciseLibrary } from "@/hooks/features/useExerciseLibrary"
import { useAuth } from "@/contexts/auth-context"
import type { LibraryReference } from "@/types/exercise-demonstration"
import {
  EXERCISE_EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_OPTIONS,
  type ExerciseLibraryItem,
  type ExerciseEquipment,
  type MuscleGroup,
} from "@/types/workout"

export interface ExerciseLibraryComboboxProps {
  exerciseId: string
  currentName: string
  currentMuscleGroup: MuscleGroup | ""
  disabled?: boolean
  onSelect: (selection: { name: string; muscleGroup: MuscleGroup; libraryReference: LibraryReference }) => void
}

function ExerciseLibraryComboboxInner({
  exerciseId,
  currentName,
  currentMuscleGroup,
  disabled,
  onSelect,
}: ExerciseLibraryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [groupFilter, setGroupFilter] = useState<MuscleGroup | "">("")
  const [equipmentFilter, setEquipmentFilter] = useState<ExerciseEquipment | "">("")
  const [pendingSelection, setPendingSelection] = useState<{ id: string; owner: string } | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const { user } = useAuth()
  const currentOwner = useRef(user?.sub)
  const selectionRequest = useRef<AbortController | null>(null)
  const openRef = useRef(false)
  const selectionEpoch = useRef(0)
  useLayoutEffect(() => { currentOwner.current = user?.sub }, [user?.sub])
  useEffect(() => () => selectionRequest.current?.abort(), [user?.sub])

  useEffect(() => {
    if (pendingSelection && pendingSelection.owner !== user?.sub) {
      setPendingSelection(null)
      setSelectionError(null)
    }
  }, [pendingSelection, user?.sub])
  const [creatingCustom, setCreatingCustom] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customGroup, setCustomGroup] = useState<MuscleGroup>("CHEST")
  const [customError, setCustomError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim())
    }, 180)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { libraryQuery, loadDetail, createCustomMutation, deleteCustomMutation } =
    useExerciseLibrary({
      q: debouncedQuery,
      muscleGroup: groupFilter,
      equipment: equipmentFilter,
      enabled: open,
    })

  const items = libraryQuery.data ?? []
  const customItems = items.filter(item => item.source === "CUSTOM")
  const catalogItems = items.filter(item => item.source === "CATALOG")

  const handleOpenChange = (nextOpen: boolean) => {
    openRef.current = nextOpen
    setOpen(nextOpen)
    if (!nextOpen) {
      selectionEpoch.current += 1
      selectionRequest.current?.abort()
      setPendingSelection(null)
    }
    if (nextOpen) {
      setSelectionError(null)
      setCustomError(null)
      setCreatingCustom(false)
      setCustomName(currentName.trim())
      setCustomGroup(currentMuscleGroup || groupFilter || "CHEST")
    }
  }

  const selectItem = async (id: string) => {
    const owner = user?.sub
    if (!owner) return
    selectionRequest.current?.abort()
    const controller = new AbortController()
    selectionRequest.current = controller
    setSelectionError(null)
    setPendingSelection({ id, owner })
    try {
      const detail = await loadDetail(id, controller.signal)
      if (controller.signal.aborted || owner !== currentOwner.current || selectionRequest.current !== controller) return
      if (detail.id !== id) throw new Error("Detalhe incompatível")
      onSelect({
        name: detail.name,
        muscleGroup: detail.muscleGroup,
        libraryReference: { source: detail.source, exerciseId: detail.id, demonstrationRevision: detail.demonstration?.revision ?? null },
      })
      setPendingSelection(null)
      setOpen(false)
    } catch {
      if (!controller.signal.aborted && owner === currentOwner.current && selectionRequest.current === controller) {
        setSelectionError("Não foi possível conferir o exercício. Tente selecioná-lo novamente.")
      }
    }
  }

  const handlePick = (item: ExerciseLibraryItem) => { selectionEpoch.current += 1; void selectItem(item.id) }

  const handleStartCustom = () => {
    setCustomError(null)
    setCustomName(searchInput.trim() || currentName.trim())
    setCustomGroup(groupFilter || currentMuscleGroup || "CHEST")
    setCreatingCustom(true)
  }

  const handleCreateCustom = async () => {
    const trimmed = customName.trim()
    if (trimmed.length < 2) {
      setCustomError("Informe ao menos 2 caracteres para o exercício próprio.")
      return
    }
    setCustomError(null)
    const owner = user?.sub
    const attempt = ++selectionEpoch.current
    try {
      const created = await createCustomMutation.mutateAsync({
        name: trimmed,
        muscleGroup: customGroup,
      })
      if (!owner || owner !== currentOwner.current || !openRef.current || attempt !== selectionEpoch.current) return
      setCreatingCustom(false)
      await selectItem(created.id)
    } catch {
      setCustomError(
        "Não foi possível salvar o exercício próprio. Verifique se já existe um com este nome.",
      )
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label="Biblioteca de exercícios"
          className="min-h-11 shrink-0 gap-1.5 px-3 text-xs font-semibold"
        >
          <BookOpen className="size-4" aria-hidden="true" />
          Biblioteca
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(92vw,420px)] space-y-3 border-[var(--sm-border)] bg-[var(--sm-surface)] p-3 text-[var(--sm-ink)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
            Biblioteca de exercícios
          </span>
          <select
            aria-label="Filtrar biblioteca por grupo muscular"
            value={groupFilter}
            onChange={event =>
              setGroupFilter(event.target.value as MuscleGroup | "")
            }
            className="min-h-9 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2 text-xs font-medium text-[var(--sm-ink)]"
          >
            <option value="">Todos os grupos</option>
            {MUSCLE_GROUP_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar biblioteca por equipamento"
            value={equipmentFilter}
            onChange={event => setEquipmentFilter(event.target.value as ExerciseEquipment | "")}
            className="min-h-9 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2 text-xs font-medium text-[var(--sm-ink)]"
          >
            <option value="">Todos os equipamentos</option>
            {Object.entries(EXERCISE_EQUIPMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {selectionError ? <p role="alert" className="text-xs text-[var(--sm-danger)]">{selectionError}</p> : null}
        {pendingSelection && !selectionError ? <p role="status" className="text-xs">Conferindo exercício...</p> : null}

        <Command shouldFilter={false} className="border border-[var(--sm-border)]">
          <CommandInput
            placeholder="Buscar exercício (ex.: supino, agachamento)..."
            value={searchInput}
            onValueChange={setSearchInput}
          />
          <CommandList className="max-h-60">
            {libraryQuery.isPending ? (
              <p className="py-4 text-center text-xs text-[var(--sm-muted)]">
                Carregando biblioteca...
              </p>
            ) : libraryQuery.isError ? (
              <p className="py-4 text-center text-xs text-[var(--sm-danger)]">
                Não foi possível carregar a biblioteca.
              </p>
            ) : (
              <>
                <CommandEmpty>Nenhum exercício encontrado.</CommandEmpty>
                {customItems.length > 0 ? (
                  <CommandGroup heading="Meus exercícios">
                    {customItems.map(item => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handlePick(item)}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{item.name}</p>
                          <p className="text-xs text-[var(--sm-muted)]">
                            {MUSCLE_GROUP_LABELS[item.muscleGroup]} · Próprio
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Excluir exercício próprio ${item.name}`}
                          className="rounded p-1 text-[var(--sm-muted)] hover:bg-[var(--sm-subtle-hover)] hover:text-[var(--sm-danger)]"
                          onClick={event => {
                            event.stopPropagation()
                            void deleteCustomMutation.mutateAsync(item.id)
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}

                {catalogItems.length > 0 ? (
                  <CommandGroup heading="Catálogo SafeMove">
                    {catalogItems.map(item => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handlePick(item)}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="text-xs text-[var(--sm-muted)]">
                            {MUSCLE_GROUP_LABELS[item.muscleGroup]}
                            {item.equipment
                              ? ` · ${EXERCISE_EQUIPMENT_LABELS[item.equipment]}`
                              : ""}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>

        {!creatingCustom ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10 w-full gap-1.5 text-xs font-semibold"
            onClick={handleStartCustom}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Salvar como exercício próprio
          </Button>
        ) : (
          <div className="space-y-2.5 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3">
            <div className="space-y-1">
              <Label
                htmlFor={`custom-ex-name-${exerciseId}`}
                className="text-xs"
              >
                Nome do exercício próprio
              </Label>
              <Input
                id={`custom-ex-name-${exerciseId}`}
                value={customName}
                onChange={event => setCustomName(event.target.value)}
                placeholder="Ex.: Agachamento pausa 2s"
                className="min-h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor={`custom-ex-group-${exerciseId}`}
                className="text-xs"
              >
                Grupo muscular principal
              </Label>
              <select
                id={`custom-ex-group-${exerciseId}`}
                value={customGroup}
                onChange={event =>
                  setCustomGroup(event.target.value as MuscleGroup)
                }
                className="min-h-10 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
              >
                {MUSCLE_GROUP_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {customError ? (
              <p role="alert" className="text-xs text-[var(--sm-danger)]">
                {customError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-9 px-3 text-xs"
                onClick={() => setCreatingCustom(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={createCustomMutation.isPending}
                className="min-h-9 px-3 text-xs"
                onClick={() => void handleCreateCustom()}
              >
                {createCustomMutation.isPending
                  ? "Salvando..."
                  : "Confirmar exercício próprio"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function ExerciseLibraryCombobox(props: ExerciseLibraryComboboxProps) {
  const inheritedClient = useContext(QueryClientContext)
  const [fallbackClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      }),
  )

  if (inheritedClient) {
    return <ExerciseLibraryComboboxInner {...props} />
  }

  return (
    <QueryClientProvider client={fallbackClient}>
      <ExerciseLibraryComboboxInner {...props} />
    </QueryClientProvider>
  )
}
