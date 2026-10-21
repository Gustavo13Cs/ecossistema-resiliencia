"use client"

import { useState } from "react"
import { isAxiosError } from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useClientRecord } from "@/hooks/features/useClientRecord"
import { useWorkouts } from "@/hooks/features/useWorkouts"
import { useWorkoutDrafts } from "@/hooks/features/useWorkoutDrafts"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import type { Client } from "@/types/client"
import type { DraftSummary, WorkoutDraftResource } from "@/types/workout-draft"
import { WorkoutDocumentBoundary } from "./WorkoutDocumentBoundary"
import { navigateToWorkoutPage } from "@/lib/workout-editor-navigation"
import { WorkoutDraftEditor } from "./WorkoutDraftEditor"
import { WorkoutDraftList } from "./WorkoutDraftList"
import { DraftDiscardDialog, draftAccessDenied } from "./WorkoutDraftSection"

export function WorkoutDraftWorkspace({ clientId, draftId }: { clientId: string; draftId?: string }) {
  const { user } = useAuth()
  if (!user?.sub || user.role !== "PERSONAL") return <AsyncState kind="error" title="Área de treinamento indisponível" description="Esta rota é exclusiva para profissionais de Educação Física." />
  return <WorkoutDocumentBoundary key={`${user.sub}:${clientId}:${draftId ?? "new"}`}><ResolveClient owner={user.sub} clientId={clientId} draftId={draftId} /></WorkoutDocumentBoundary>
}
function ResolveClient({ owner, clientId, draftId }: { owner: string; clientId: string; draftId?: string }) {
  const { client, status, refetch } = useClientRecord(clientId)
  const [verifiedClient, setVerifiedClient] = useState<Client | null>(null)
  const matches = client?.id === clientId && client?.professionalId === owner
  const retryable = status === "network-error" || status === "server-error"
  const nextVerifiedClient = matches && status === "ready" ? client : matches && retryable ? verifiedClient : null
  if (verifiedClient !== nextVerifiedClient) setVerifiedClient(nextVerifiedClient)
  if (status === "unauthorized") return <AccessDenied />
  if (status === "loading") return <AsyncState kind="loading" title="Carregando prontuário" description="Verificando o aluno da sua base privada." />
  if (status === "not-found" || (client && (client.id !== clientId || client.professionalId !== owner))) return <AsyncState kind="error" title="Prontuário indisponível" description="O aluno não pertence ao contexto solicitado." />
  const error = <AsyncState kind="error" title="Não foi possível carregar o prontuário" description={nextVerifiedClient ? "Tente novamente para consultar o aluno. Suas alterações locais permanecem nesta página." : "Tente novamente para consultar o aluno."} action={<Button onClick={() => void refetch()}>Tentar novamente</Button>} />
  if (!nextVerifiedClient) return error
  // Mantém a sessão no mesmo lugar da árvore somente após uma leitura autorizada.
  // Negação/404/mismatch limpam a referência; um 503 posterior não revalida acesso.
  return <>{status !== "ready" ? error : null}<DraftContext client={nextVerifiedClient} draftId={draftId} /></>
}
function AccessDenied() {
  const { logout } = useAuth()
  const [leaving, setLeaving] = useState(false)
  return <AsyncState kind="error" title="Restabeleça seu acesso" description="Sua sessão não permite acessar estes registros." action={<Button disabled={leaving} onClick={() => {
    setLeaving(true)
    // logout limpa Auth/cache e navega mesmo quando a chamada ao servidor falha.
    void logout().catch(() => undefined)
  }}>Entrar novamente</Button>} />
}
function DraftContext({ client, draftId }: { client: Client; draftId?: string }) {
  const router = useRouter()
  const { activeQuery } = useWorkouts({ clientId: client.id })
  const drafts = useWorkoutDrafts({ clientId: client.id, draftId, accessError: activeQuery.error })
  const [editing, setEditing] = useState(Boolean(draftId))
  const [denied, setDenied] = useState(false)
  const [selected, setSelected] = useState<DraftSummary | null>(null)
  const [copyError, setCopyError] = useState(false)
  const [verifiedDraft, setVerifiedDraft] = useState<WorkoutDraftResource | null>(null)
  const query = draftId ? drafts.detailQuery : drafts.listQuery
  // O hook oculta data em qualquer erro. Somente falhas HTTP/rede comuns podem
  // reutilizar o último recurso verificado neste contexto, nunca erros de contrato.
  const retryable = isAxiosError(query.error) && ![401, 403, 404].includes(query.error.response?.status ?? 0)
  const incomingDraft = draftId ? drafts.detailQuery.data : null
  const closingMutation = incomingDraft?.status === "FINALIZED" ? drafts.finalizeMutation : incomingDraft?.status === "DISCARDED" ? drafts.discardMutation : null
  // O refetch terminal pode terminar antes das outras invalidações da própria
  // mutation. O editor iniciador continua bloqueado até consumir o ACK e navegar.
  // Fechamentos externos, negação e mudanças de contexto não recebem esta retenção.
  const ownClosure = incomingDraft?.id === draftId && incomingDraft?.clientId === client.id && closingMutation &&
    (closingMutation.isPending || (closingMutation.data?.id === draftId && closingMutation.data?.status === incomingDraft.status))
  const draft = draftId ? ownClosure && verifiedDraft ? verifiedDraft : incomingDraft ?? (retryable ? verifiedDraft : null) : null
  const accessDenied = denied || draftAccessDenied(query.error) || draftAccessDenied(activeQuery.error)
  const nextVerifiedDraft = !accessDenied && draft?.id === draftId && draft?.clientId === client.id && draft.status === "OPEN" ? draft : null
  // Ajuste condicionado aos dados da própria renderização; limpa também em erro duro.
  if (verifiedDraft !== nextVerifiedDraft) setVerifiedDraft(nextVerifiedDraft)
  if (accessDenied) return <AccessDenied />
  const canKeepEditing = retryable && editing && (!draftId || Boolean(draft))
  const error = <AsyncState kind="error" title="Rascunho indisponível" description={canKeepEditing ? "Não foi possível verificar a elaboração salva. Suas alterações locais permanecem nesta página. Tente novamente." : "Não foi possível verificar a elaboração salva. Tente novamente."} action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>} />
  if (query.error && !canKeepEditing) return error
  if (query.isPending) return <AsyncState kind="loading" title="Carregando rascunho" description="Consultando as elaborações deste aluno." />
  if (draftId && (!draft || draft.id !== draftId || draft.clientId !== client.id)) return <AsyncState kind="error" title="Rascunho indisponível" description="A elaboração não pertence ao prontuário solicitado." />
  if (draft && draft.status !== "OPEN") return <AsyncState kind="empty" title={draft.status === "FINALIZED" ? "Prescrição finalizada" : "Rascunho descartado"} description="Esta elaboração já foi encerrada." action={draft.status === "FINALIZED" && draft.finalizedWorkoutId ? <Link href={`/clientes/${client.id}/treinos/${draft.finalizedWorkoutId}`}>Abrir ficha finalizada</Link> : <Link href={`/clientes/${client.id}`}>Voltar ao prontuário</Link>} />
  // A criação invalida a lista; sua resposta não pode trocar a prop draft durante create→finalize.
  if (editing) return <>{query.error ? error : null}<WorkoutDraftEditor client={client} draft={draft ?? null}
    onCreate={content => drafts.createMutation.mutateAsync({ content })}
    onSave={input => drafts.saveMutation.mutateAsync(input)}
    onFinalize={input => drafts.finalizeMutation.mutateAsync(input)}
    onRebase={input => drafts.rebaseMutation.mutateAsync(input)}
    onDiscard={input => drafts.discardMutation.mutateAsync(input)}
    onAccessDenied={() => setDenied(true)}
    onLoadActiveWorkout={async () => {
      const result = await activeQuery.refetch({ throwOnError: true })
      if (result.error) throw result.error
      if (result.data === undefined) throw new Error("Treino ativo indisponível")
      if (result.data && result.data.clientId !== client.id) throw new Error("Treino ativo incompatível")
      return result.data
    }} /></>
  const page = drafts.listQuery.data
  if (page?.items.length) return <div className="space-y-4 p-4"><h1 className="text-2xl font-bold">Já existe um rascunho aberto</h1><p>Continue a elaboração salva ou descarte explicitamente antes de começar outra.</p><WorkoutDraftList page={page} onContinue={item => navigateToWorkoutPage(router, `/clientes/${client.id}/rascunhos/${item.id}`)} onDiscard={setSelected} onNextPage={() => undefined} />{selected ? <DraftDiscardDialog draft={selected} onClose={() => setSelected(null)} onAccessDenied={() => setDenied(true)} /> : null}</div>
  if (client.status === "ARCHIVED") return <AsyncState kind="empty" title="Aluno arquivado" description="Novas elaborações estão bloqueadas. O histórico permanece disponível no prontuário." action={<Link href={`/clientes/${client.id}`}>Voltar ao prontuário</Link>} />
  return <div className="space-y-4 p-4"><h1 className="text-2xl font-bold">Nova elaboração de treino</h1><p>{client.name}</p><p>Comece do zero ou copie o treino ativo. O salvamento do rascunho é manual.</p><div className="flex flex-wrap gap-3"><Button onClick={() => setEditing(true)} disabled={drafts.createMutation.isPending}>Começar do zero</Button><Button variant="outline" disabled={!activeQuery.data || activeQuery.isPending || Boolean(activeQuery.error) || drafts.createMutation.isPending} onClick={() => {
    if (!activeQuery.data || activeQuery.data.clientId !== client.id) return
    setCopyError(false)
    void drafts.createMutation.mutateAsync({ sourceWorkoutId: activeQuery.data.id }).then(created => navigateToWorkoutPage(router, `/clientes/${client.id}/rascunhos/${created.id}`)).catch(error => { if (draftAccessDenied(error)) setDenied(true); setCopyError(true); void drafts.listQuery.refetch() })
  }}>Usar treino ativo como base</Button></div>{activeQuery.error ? <p role="alert">Não foi possível consultar o treino ativo. <Button variant="outline" onClick={() => void activeQuery.refetch()}>Tentar novamente o treino ativo</Button></p> : null}{copyError ? <p role="alert">Não foi possível criar a cópia. Verifique os rascunhos e tente novamente.</p> : null}</div>
}
