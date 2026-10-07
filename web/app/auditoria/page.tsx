"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AsyncState } from "@/components/feedback/AsyncState"

interface AuditRow {
  id: string
  occurredAt: string
  clientId: string
  actorType: "PROFESSIONAL" | "SYSTEM"
  domain: string
  action: string
}
interface AuditPageResult { items: AuditRow[]; nextCursor: string | null }
const domains: Record<string, string> = {
  CLIENT: "Prontuário", OVERVIEW: "Visão completa", DIET: "Plano alimentar",
  WORKOUT: "Treino", REHAB: "Reabilitação", ASSESSMENT: "Avaliação física",
  PHYSIO_ASSESSMENT: "Avaliação fisioterapêutica", ANAMNESIS: "Anamnese",
  CONSULTATION_NOTE: "Nota de consulta", SUPPLEMENT: "Suplementação",
  LAB_EXAM: "Exame", LAB_ORDER: "Pedido de exame", CLIENT_GOAL: "Meta",
  APPOINTMENT: "Agendamento", ALERT: "Alerta", AUDIT: "Histórico de acessos",
}
export default function AuditPage() {
  const { user } = useAuth()
  const professional = Boolean(user && ["NUTRITIONIST", "PERSONAL", "PHYSIO"].includes(user.role))
  const [draft, setDraft] = useState("")
  const [clientId, setClientId] = useState("")
  const [cursor, setCursor] = useState<string | undefined>()
  const query = useQuery({
    queryKey: ["read-audit", user?.sub ?? "anonymous", clientId, cursor],
    enabled: professional,
    queryFn: async () => (await api.get<AuditPageResult>("/read-audit", {params: {clientId: clientId || undefined, cursor, limit: 50}})).data,
  })
  if (!professional) return <AsyncState kind="error" title="Área profissional indisponível" description="Entre com sua conta profissional para consultar seus acessos." />
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold">Histórico de acessos</h1>
        <p className="mt-2 text-[var(--sm-muted)]">Consulte os acessos registrados aos prontuários da sua base privada.</p>
      </header>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {event.preventDefault(); setClientId(draft.trim()); setCursor(undefined)}}>
        <label className="flex-1 space-y-2" htmlFor="audit-client">Identificador do prontuário
          <Input id="audit-client" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Todos os prontuários" maxLength={200} />
        </label>
        <Button type="submit">Filtrar</Button>
        <Button type="button" variant="outline" onClick={() => {setCursor(undefined); void query.refetch()}}>Atualizar</Button>
      </form>
      {query.isPending ? <AsyncState kind="loading" title="Consultando acessos" description="Carregando os registros da sua conta." />
        : query.isError ? <AsyncState kind="error" title="Não foi possível consultar os acessos" description="Tente novamente em instantes." action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>} />
        : !query.data?.items.length ? <AsyncState kind="empty" title="Nenhum acesso encontrado" description="Os registros aparecerão após os acessos aos prontuários." />
        : <div className="space-y-4">
          <ul className="divide-y divide-[var(--sm-border)] rounded-xl border border-[var(--sm-border)] bg-[var(--sm-surface)]">
            {query.data.items.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{domains[row.domain] ?? row.domain}</p>
                <p className="text-sm text-[var(--sm-muted)]">{row.actorType === "SYSTEM" ? "Rotina de alertas" : "Sua sessão profissional"} · {row.action === "LIST" ? "Consulta de lista" : row.action === "EXPORT" ? "Exportação" : "Consulta"}</p>
                <time className="text-sm" dateTime={row.occurredAt}>{new Date(row.occurredAt).toLocaleString("pt-BR")}</time>
              </div>
              <Button asChild variant="outline"><Link href={`/clientes/${encodeURIComponent(row.clientId)}`} aria-label={`Abrir prontuário ${row.clientId}`}>Abrir prontuário</Link></Button>
            </li>)}
          </ul>
          <div className="flex flex-wrap gap-3">
            {cursor && <Button variant="outline" onClick={() => setCursor(undefined)}>Página inicial</Button>}
            <Button disabled={!query.data.nextCursor} onClick={() => setCursor(query.data!.nextCursor!)}>Próxima página</Button>
          </div>
        </div>}
    </main>
  )
}
