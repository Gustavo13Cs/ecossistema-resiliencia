"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import { isAxiosError } from "axios"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useWorkoutDrafts } from "@/hooks/features/useWorkoutDrafts"
import type { DraftSummary } from "@/types/workout-draft"
import { WorkoutDraftList } from "./WorkoutDraftList"

export const draftErrorStatus = (error: unknown) => isAxiosError(error) ? error.response?.status : undefined
export const draftAccessDenied = (error: unknown) => [401, 403].includes(draftErrorStatus(error) ?? 0)

export function DraftDiscardDialog({ draft, onClose, onAccessDenied }: { draft: DraftSummary; onClose: () => void; onAccessDenied?: () => void }) {
  const { discardMutation } = useWorkoutDrafts({ clientId: draft.clientId, draftId: draft.id, enabled: false })
  const [error, setError] = useState(false)
  return <AlertDialog open onOpenChange={open => { if (!open && !discardMutation.isPending) onClose() }}>
    <AlertDialogContent><AlertDialogTitle>Descartar rascunho?</AlertDialogTitle><AlertDialogDescription>O rascunho salvo será encerrado. As fichas finalizadas permanecem no histórico.</AlertDialogDescription>
      {error ? <p role="alert">Não foi possível descartar. Atualize a lista antes de tentar novamente.</p> : null}
      <AlertDialogFooter><AlertDialogCancel disabled={discardMutation.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={discardMutation.isPending || draft.client.status === "ARCHIVED"} onClick={event => {
        event.preventDefault()
        void discardMutation.mutateAsync({ expectedVersion: draft.version }).then(onClose).catch(error => { if (draftAccessDenied(error)) onAccessDenied?.(); setError(true) })
      }}>Confirmar descarte</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}

export function WorkoutDraftSection({ clientId, onAccessDenied }: { clientId?: string; onAccessDenied?: () => void }) {
  const router = useRouter()
  const [cursor, setCursor] = useState<string>()
  const [selected, setSelected] = useState<DraftSummary | null>(null)
  const { listQuery } = useWorkoutDrafts({ clientId, cursor })
  const denied = draftAccessDenied(listQuery.error)
  useEffect(() => { if (denied) onAccessDenied?.() }, [denied, onAccessDenied])
  return <section aria-label="Rascunhos" className="min-w-0 space-y-3 border-t border-[var(--sm-border)] pt-5">
    <h2 className="text-xl font-bold">Rascunhos</h2>
    {listQuery.error ? <AsyncState kind="error" title={denied ? "Restabeleça seu acesso" : "Rascunhos indisponíveis"} description={cursor && draftErrorStatus(listQuery.error) === 400 ? "A lista mudou. Reinicie a consulta pela primeira página." : "Não foi possível consultar os rascunhos."} action={denied ? undefined : cursor && draftErrorStatus(listQuery.error) === 400 ? <Button onClick={() => setCursor(undefined)}>Voltar à primeira página</Button> : <Button onClick={() => void listQuery.refetch()}>Tentar novamente os rascunhos</Button>} /> : listQuery.isPending ? <p role="status">Carregando rascunhos</p> : listQuery.data ? <WorkoutDraftList page={listQuery.data} onContinue={draft => navigateToWorkoutPage(router, `/clientes/${draft.clientId}/rascunhos/${draft.id}`)} onDiscard={setSelected} onNextPage={setCursor} /> : null}
    {selected && !denied ? <DraftDiscardDialog key={selected.id} draft={selected} onClose={() => setSelected(null)} onAccessDenied={onAccessDenied} /> : null}
  </section>
}
