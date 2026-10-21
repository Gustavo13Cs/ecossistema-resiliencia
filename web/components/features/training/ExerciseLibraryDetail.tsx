"use client"

import { useRef, useState } from "react"
import { isAxiosError } from "axios"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useExerciseLibrary } from "@/hooks/features/useExerciseLibrary"
import { MUSCLE_GROUP_LABELS, EXERCISE_EQUIPMENT_LABELS, type ExerciseLibraryDetail as Detail } from "@/types/workout"
import type { DemonstrationPresentation } from "@/types/exercise-demonstration"
import { ExerciseDemonstration } from "./ExerciseDemonstration"

interface Props {
  exerciseId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect?: (exerciseId: string) => void
  saved?: { name: string; snapshot: DemonstrationPresentation }
  allowVideoEdit?: boolean
  fallbackFocus?: () => HTMLElement | null
}

function VideoEditor({ detail }: { detail: Detail }) {
  const [videoUrl, setVideoUrl] = useState(detail.demonstration?.personalVideoUrl ?? "")
  const [expectedVersion, setExpectedVersion] = useState(detail.mediaVersion!)
  const [message, setMessage] = useState("")
  const [conflict, setConflict] = useState(false)
  const { updateVideoMutation, loadDetail } = useExerciseLibrary({ enabled: false })
  const request = useRef<AbortController | null>(null)
  const save = async () => {
    setMessage("")
    try {
      const updated = await updateVideoMutation.mutateAsync({ id: detail.id, expectedMediaVersion: expectedVersion, videoUrl: videoUrl.trim() || null })
      setExpectedVersion(updated.mediaVersion!)
      setVideoUrl(updated.demonstration?.personalVideoUrl ?? "")
      setMessage("Link atualizado.")
    } catch (error) {
      const stale = isAxiosError(error) && error.response?.status === 409
      setConflict(stale)
      setMessage(stale ? "Este link foi alterado em outra sessão. Confira a versão atual antes de salvar novamente." : "Não foi possível salvar. Informe um link de vídeo individual do YouTube ou Vimeo e tente novamente.")
    }
  }
  const reload = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    try {
      const fresh = await loadDetail(detail.id, controller.signal)
      if (controller.signal.aborted) return
      setExpectedVersion(fresh.mediaVersion!)
      setConflict(false)
      setMessage(`Versão atual conferida. Link atual: ${fresh.demonstration?.personalVideoUrl ?? "sem link"}. Sua alteração foi preservada; salve para confirmá-la.`)
    } catch { setMessage("Não foi possível conferir a versão atual. Tente novamente.") }
  }
  return <form onSubmit={event => { event.preventDefault(); void save() }} className="space-y-3 border-t border-[var(--sm-border)] pt-4">
    <label className="block space-y-2 text-sm font-semibold">Link do vídeo (opcional)<Input type="url" maxLength={2048} value={videoUrl} onChange={event => setVideoUrl(event.target.value)} className="min-h-11" placeholder="https://www.youtube.com/watch?v=…" /></label>
    <p className="text-xs text-[var(--sm-muted)]">YouTube ou Vimeo. Deixe em branco para remover o link. Fichas anteriores preservam a demonstração salva.</p>
    {message ? <p role={updateVideoMutation.isError || conflict ? "alert" : "status"} className="break-words text-sm">{message}</p> : null}
    <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11" disabled={updateVideoMutation.isPending || conflict}>{updateVideoMutation.isPending ? "Salvando..." : "Salvar link"}</Button>{conflict ? <Button type="button" className="min-h-11" variant="outline" onClick={() => void reload()}>Conferir versão atual</Button> : null}</div>
  </form>
}

function CurrentDetail({ exerciseId, onSelect, allowVideoEdit }: Pick<Props, "onSelect" | "allowVideoEdit"> & { exerciseId: string }) {
  const { detailQuery } = useExerciseLibrary({ exerciseId })
  if (detailQuery.isPending) return <p role="status">Carregando exercício...</p>
  if (detailQuery.error || !detailQuery.data) return <div className="space-y-3"><p role="alert">Não foi possível carregar o exercício.</p><Button type="button" className="min-h-11" onClick={() => void detailQuery.refetch()}>Tentar novamente</Button></div>
  const detail = detailQuery.data
  return <>
    <h3 className="break-words text-xl font-bold">{detail.name}</h3>
    <p className="text-sm text-[var(--sm-muted)]">{detail.source === "CATALOG" ? "SafeMove" : "Meus exercícios"} · {MUSCLE_GROUP_LABELS[detail.muscleGroup]}{detail.equipment ? ` · ${EXERCISE_EQUIPMENT_LABELS[detail.equipment]}` : ""}</p>
    {detail.notes ? <p className="whitespace-pre-wrap break-words text-sm">{detail.notes}</p> : null}
    <ExerciseDemonstration snapshot={detail.demonstration} />
    {onSelect ? <Button type="button" className="min-h-11" onClick={() => onSelect(detail.id)}>Adicionar ao treino</Button> : null}
    {allowVideoEdit && detail.source === "CUSTOM" && detail.mediaVersion != null ? <VideoEditor key={detail.id} detail={detail} /> : null}
  </>
}

export function ExerciseLibraryDetail({ exerciseId, open, onOpenChange, onSelect, saved, allowVideoEdit = false, fallbackFocus }: Props) {
  const { user } = useAuth()
  const previousFocus = useRef<HTMLElement | null>(null)
  const restoreFocus = (event: Event) => {
    event.preventDefault()
    const previous = previousFocus.current
    // O filtro pendente pode substituir o botão enquanto o detalhe está aberto.
    const replacement = previous?.id ? document.getElementById(previous.id) : null
    const target = [previous, replacement, fallbackFocus?.()]
      .find(element => element?.isConnected && !element.matches(":disabled"))
    target?.focus()
  }
  if (user?.role !== "PERSONAL") return null
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent overlayClassName="print:hidden" showCloseButton={false} className="max-h-[85dvh] overflow-y-auto bg-[var(--sm-surface)] text-[var(--sm-ink)] sm:max-w-2xl print:hidden" onOpenAutoFocus={() => { previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={restoreFocus}>
      <div className="flex items-center justify-between gap-3"><DialogTitle>Execução do exercício</DialogTitle><DialogClose asChild><Button type="button" variant="outline" className="min-h-11">Fechar</Button></DialogClose></div>
      <DialogDescription>{saved ? "Demonstração registrada nesta ficha." : "Consulte as orientações e os créditos da demonstração."}</DialogDescription>
      {open ? saved ? <><h3 className="break-words text-xl font-bold">{saved.name}</h3><ExerciseDemonstration snapshot={saved.snapshot} /></> : exerciseId ? <CurrentDetail key={`${user.sub}:${exerciseId}`} exerciseId={exerciseId} onSelect={onSelect} allowVideoEdit={allowVideoEdit} /> : null : null}
    </DialogContent>
  </Dialog>
}
