"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { AsyncState } from "@/components/feedback/AsyncState"
import { ClientFilters } from "@/components/features/clients/ClientFilters"
import { ClientList } from "@/components/features/clients/ClientList"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { api } from "@/lib/api"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientStatus } from "@/types/client"

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase("pt-BR")

export default function ClientesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status: ClientStatus = searchParams.get("status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE"
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const mutationLock = useRef(false)
  const [search, setSearch] = useState("")
  const [pendingClientId, setPendingClientId] = useState<string | null>(null)
  const { data: clients = [], error, isPending } = useClients(status)

  const changeStatus = useMutation({
    mutationFn: async ({ clientId, nextStatus }: { clientId: string; nextStatus: ClientStatus }) => {
      const response = await api.patch<Client>(`/clients/${clientId}/status`, { status: nextStatus })
      return response.data
    },
  })

  if (!user || user.role === "ADMIN") {
    return (
      <AsyncState
        kind="error"
        title="Base privada indisponível"
        description="Esta área é exclusiva para contas profissionais."
      />
    )
  }

  const workspace = getWorkspaceDefinition(user.role)
  const singular = workspace.clientSingular.toLocaleLowerCase("pt-BR")
  const plural = workspace.clientPlural.toLocaleLowerCase("pt-BR")

  const handleStatusChange = async (client: Client) => {
    if (mutationLock.current) return
    mutationLock.current = true
    setPendingClientId(client.id)
    const nextStatus: ClientStatus = status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"

    try {
      await changeStatus.mutateAsync({ clientId: client.id, nextStatus })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ACTIVE") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ARCHIVED") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, client.id) }),
      ])
      toast.success(
        nextStatus === "ARCHIVED"
          ? `${workspace.clientSingular} arquivado com sucesso.`
          : `${workspace.clientSingular} restaurado com sucesso.`,
      )
    } catch {
      toast.error(`Não foi possível ${nextStatus === "ARCHIVED" ? "arquivar" : "restaurar"} o ${singular}. Tente novamente.`)
    } finally {
      mutationLock.current = false
      setPendingClientId(null)
    }
  }

  const normalizedSearch = normalizeSearch(search)
  const filteredClients = normalizedSearch
    ? clients.filter((client) => [client.name, client.email, client.phone, client.goal]
        .some((value) => normalizeSearch(value ?? "").includes(normalizedSearch)))
    : clients

  const statusWord = status === "ACTIVE" ? "ativos" : "arquivados"
  const emptyTitle = `Nenhum ${singular} ${status === "ACTIVE" ? "ativo" : "arquivado"}`

  return (
    <div className="min-w-0 space-y-7 pb-10">
      <header className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">{workspace.clientPlural}</h1>
          <p className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">
            Gerencie os prontuários privados dos seus {plural}.
          </p>
        </div>
        <Link
          href="/clientes/novo"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand)] px-4 py-2.5 text-sm font-bold text-[var(--sm-on-brand)] no-underline hover:bg-[var(--sm-brand-hover)]"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
          Novo {singular}
        </Link>
      </header>

      <section aria-labelledby="client-directory-title" className="min-w-0 overflow-hidden rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]">
        <div className="px-4 pt-5 sm:px-5">
          <h2 id="client-directory-title" className="text-lg font-bold tracking-[-0.015em] text-[var(--sm-ink)]">
            {workspace.clientPlural} {statusWord}
          </h2>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">
            Busque na lista autorizada e mantenha o histórico sem excluir prontuários.
          </p>
        </div>

        <ClientFilters
          search={search}
          status={status}
          workspace={workspace}
          onSearchChange={setSearch}
          onStatusChange={(nextStatus) => router.replace(`/clientes?status=${nextStatus}`)}
        />

        {isPending ? (
          <div className="p-4 sm:p-5">
            <AsyncState kind="loading" title={`Carregando ${plural}`} description="Buscando os registros da sua base privada." />
          </div>
        ) : null}

        {error ? (
          <div className="p-4 sm:p-5">
            <AsyncState kind="error" title={`Não foi possível carregar os ${plural}`} description="Tente novamente em alguns instantes." />
          </div>
        ) : null}

        {!isPending && !error && clients.length === 0 ? (
          <div className="p-4 sm:p-5">
            <AsyncState
              kind="empty"
              title={emptyTitle}
              description={status === "ACTIVE"
                ? `Cadastre seu primeiro ${singular} para iniciar um prontuário privado.`
                : `Prontuários arquivados aparecerão aqui e poderão ser restaurados.`}
              action={status === "ACTIVE" ? (
                <Link href="/clientes/novo" className="font-bold text-[var(--sm-brand)]">Novo {singular}</Link>
              ) : undefined}
            />
          </div>
        ) : null}

        {!isPending && !error && clients.length > 0 && filteredClients.length === 0 ? (
          <div className="p-4 sm:p-5">
            <AsyncState kind="empty" title={`Nenhum ${singular} encontrado`} description="Revise o termo da busca para ver outros registros desta lista." />
          </div>
        ) : null}

        {!isPending && !error && filteredClients.length > 0 ? (
          <ClientList
            clients={filteredClients}
            status={status}
            workspace={workspace}
            pendingClientId={pendingClientId}
            onChangeStatus={handleStatusChange}
          />
        ) : null}
      </section>
    </div>
  )
}
