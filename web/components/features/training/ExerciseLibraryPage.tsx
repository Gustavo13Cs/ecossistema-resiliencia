"use client"

import { useEffect, useState } from "react"
import { BookOpen, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useExerciseLibrary } from "@/hooks/features/useExerciseLibrary"
import { EXERCISE_EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, MUSCLE_GROUP_OPTIONS, type ExerciseEquipment, type MuscleGroup } from "@/types/workout"
import { ExerciseLibraryDetail } from "./ExerciseLibraryDetail"

const selectClass = "min-h-11 w-full rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm text-[var(--sm-ink)]"
function PersonalLibrary() {
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState<MuscleGroup | "">("")
  const [equipment, setEquipment] = useState<ExerciseEquipment | "">("")
  const [source, setSource] = useState("")
  const [selectedId, setSelectedId] = useState<string>()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [customGroup, setCustomGroup] = useState<MuscleGroup>("CHEST")
  const [customEquipment, setCustomEquipment] = useState<ExerciseEquipment | "">("")
  const [videoUrl, setVideoUrl] = useState("")
  const [message, setMessage] = useState("")
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 180); return () => clearTimeout(timer) }, [search])
  const { libraryQuery, createCustomMutation } = useExerciseLibrary({ q: query, muscleGroup: group, equipment })
  const items = (libraryQuery.data ?? []).filter(item => !source || item.source === source)
  const create = async () => {
    if (name.trim().length < 2) { setMessage("Informe ao menos 2 caracteres para o nome."); return }
    setMessage("")
    try {
      await createCustomMutation.mutateAsync({ name: name.trim(), muscleGroup: customGroup, ...(customEquipment ? { equipment: customEquipment } : {}), ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}) })
      setCreating(false); setName(""); setVideoUrl(""); setMessage("Exercício salvo na sua biblioteca.")
    } catch { setMessage("Não foi possível salvar. Confira o nome e, se informado, o link individual do YouTube ou Vimeo.") }
  }
  return <div className="min-w-0 space-y-6 pb-10 text-[var(--sm-ink)]">
    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--sm-brand)]">Treinamento</p><h1 className="text-3xl font-extrabold tracking-[-0.03em]">Exercícios</h1><p className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">Explore a biblioteca SafeMove, confira a execução e organize seus exercícios próprios.</p></div>
      <Button type="button" className="min-h-11 shrink-0 gap-2" onClick={() => { setCreating(true); setMessage("") }}><Plus className="size-4" aria-hidden="true" />Novo exercício</Button>
    </header>
    {creating ? <section aria-label="Cadastrar exercício próprio" className="space-y-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
      <h2 className="text-lg font-bold">Novo exercício próprio</h2><p className="text-sm text-[var(--sm-muted)]">Disponível apenas na sua biblioteca. O vídeo é opcional.</p>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void create() }}>
        <label className="block space-y-2 text-sm font-semibold">Nome do exercício<Input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} className="min-h-11" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold">Grupo muscular principal<select className={selectClass} value={customGroup} onChange={event => setCustomGroup(event.target.value as MuscleGroup)}>{MUSCLE_GROUP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="space-y-2 text-sm font-semibold">Equipamento do exercício<select className={selectClass} value={customEquipment} onChange={event => setCustomEquipment(event.target.value as ExerciseEquipment | "")}><option value="">Não informado</option>{Object.entries(EXERCISE_EQUIPMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <label className="block space-y-2 text-sm font-semibold">Link do vídeo (opcional)<Input type="url" maxLength={2048} value={videoUrl} onChange={event => setVideoUrl(event.target.value)} className="min-h-11" placeholder="Link individual do YouTube ou Vimeo" /></label>
        <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11" disabled={createCustomMutation.isPending}>{createCustomMutation.isPending ? "Salvando..." : "Salvar exercício"}</Button><Button type="button" className="min-h-11" variant="outline" disabled={createCustomMutation.isPending} onClick={() => setCreating(false)}>Cancelar</Button></div>
      </form>
    </section> : null}
    {message ? <p role={createCustomMutation.isError ? "alert" : "status"} className="text-sm">{message}</p> : null}
    <section aria-label="Buscar na biblioteca" className="space-y-4 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
      <label className="block space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><Search className="size-4" aria-hidden="true" />Buscar exercício</span><Input value={search} onChange={event => setSearch(event.target.value)} className="min-h-11" placeholder="Ex.: supino, remada, agachamento" /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-semibold">Grupo muscular<select value={group} onChange={event => setGroup(event.target.value as MuscleGroup | "")} className={selectClass}><option value="">Todos os grupos</option>{MUSCLE_GROUP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="space-y-2 text-sm font-semibold">Equipamento<select value={equipment} onChange={event => setEquipment(event.target.value as ExerciseEquipment | "")} className={selectClass}><option value="">Todos os equipamentos</option>{Object.entries(EXERCISE_EQUIPMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="space-y-2 text-sm font-semibold">Fonte<select value={source} onChange={event => setSource(event.target.value)} className={selectClass}><option value="">Todas as fontes</option><option value="CATALOG">SafeMove</option><option value="CUSTOM">Meus exercícios</option></select></label>
      </div>
    </section>
    <section aria-label="Exercícios da biblioteca" className="space-y-3">
      {libraryQuery.isPending ? <p role="status">Carregando biblioteca...</p> : libraryQuery.error ? <div className="space-y-3"><p role="alert">Não foi possível carregar a biblioteca.</p><Button type="button" className="min-h-11" onClick={() => void libraryQuery.refetch()}>Tentar novamente</Button></div> : <>
        <p role="status" className="text-sm text-[var(--sm-muted)]">{items.length} {items.length === 1 ? "exercício encontrado" : "exercícios encontrados"}</p>
        {items.length === 0 ? <p className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-6 text-sm">Nenhum exercício encontrado. Ajuste os filtros ou cadastre um exercício próprio.</p> : <ul className="grid gap-3 md:grid-cols-2">{items.map(item => <li key={item.id} className="flex min-w-0 flex-col gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide text-[var(--sm-muted)]">{item.source === "CATALOG" ? "SafeMove" : "Meus exercícios"}</span><span className="text-xs text-[var(--sm-muted)]">{item.demonstrationTypes.includes("IMAGE") ? "Ilustração" : item.hasDemonstration ? "Vídeo" : "Sem demonstração"}</span></div>
          <h2 className="break-words text-lg font-bold">{item.name}</h2><p className="text-sm text-[var(--sm-muted)]">{MUSCLE_GROUP_LABELS[item.muscleGroup]}{item.equipment ? ` · ${EXERCISE_EQUIPMENT_LABELS[item.equipment]}` : ""}</p>
          <Button type="button" variant="outline" className="mt-auto min-h-11 gap-2 self-start" aria-label={`Ver execução de ${item.name}`} onClick={() => setSelectedId(item.id)}><BookOpen aria-hidden="true" className="size-4" />Ver execução</Button>
        </li>)}</ul>}
      </>}
    </section>
    <ExerciseLibraryDetail exerciseId={selectedId} open={Boolean(selectedId)} onOpenChange={open => { if (!open) setSelectedId(undefined) }} allowVideoEdit />
  </div>
}

export function ExerciseLibraryPage() {
  const { user } = useAuth()
  if (user?.role !== "PERSONAL") return <div role="alert"><h1>Área de treinamento indisponível</h1><p>Esta área é exclusiva para profissionais de Educação Física.</p></div>
  return <PersonalLibrary key={user.sub} />
}
