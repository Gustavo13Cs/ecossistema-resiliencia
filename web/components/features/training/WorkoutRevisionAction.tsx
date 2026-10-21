"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import { Button } from "@/components/ui/button"
import { useWorkoutDrafts } from "@/hooks/features/useWorkoutDrafts"
import type { WorkoutDetail } from "@/types/workout"
import { DraftDiscardDialog, draftAccessDenied } from "./WorkoutDraftSection"

export function WorkoutRevisionAction({ workout, onAccessDenied }: { workout: WorkoutDetail; onAccessDenied: () => void }) {
  const router = useRouter()
  const { listQuery, createMutation } = useWorkoutDrafts({ clientId: workout.clientId })
  const [choosing, setChoosing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [failed, setFailed] = useState(false)
  const existing = listQuery.data?.items[0]
  const denied = draftAccessDenied(listQuery.error)
  useEffect(() => { if (denied) onAccessDenied() }, [denied, onAccessDenied])
  return <div className="space-y-2">
    <Button disabled={listQuery.isPending || Boolean(listQuery.error) || createMutation.isPending} onClick={() => {
      if (existing) { setChoosing(true); return }
      setFailed(false)
      void createMutation.mutateAsync({ sourceWorkoutId: workout.id }).then(draft => navigateToWorkoutPage(router, `/clientes/${workout.clientId}/rascunhos/${draft.id}`)).catch(error => { if (draftAccessDenied(error)) onAccessDenied(); setFailed(true); setChoosing(true); void listQuery.refetch() })
    }}>Revisar esta ficha</Button>
    {listQuery.error ? <p role="alert">Não foi possível verificar os rascunhos. <Button variant="outline" onClick={() => void listQuery.refetch()}>Tentar novamente</Button></p> : null}
    {failed ? <p role="alert">Não foi possível criar a revisão. Confira o rascunho aberto antes de tentar novamente.</p> : null}
    {choosing && existing ? <div><p>Já existe um rascunho aberto. Continue ou descarte antes de revisar esta ficha.</p><Button variant="outline" onClick={() => navigateToWorkoutPage(router, `/clientes/${workout.clientId}/rascunhos/${existing.id}`)}>Continuar rascunho</Button><Button variant="outline" disabled={existing.client.status === "ARCHIVED"} onClick={() => setDiscarding(true)}>Descartar rascunho</Button></div> : null}
    {discarding && existing ? <DraftDiscardDialog draft={existing} onClose={() => setDiscarding(false)} onAccessDenied={onAccessDenied} /> : null}
  </div>
}
