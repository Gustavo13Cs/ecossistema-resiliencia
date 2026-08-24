"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { useClients } from "@/hooks/features/useClients"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientStatus } from "@/types/client"

type ClientRowProps = {
  client: Client
  status: ClientStatus
  restoring: boolean
  onRestore: (clientId: string) => void
}

function ClientRow({ client, status, restoring, onRestore }: ClientRowProps) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-4 font-medium text-slate-800">
        <Link href={`/clientes/${client.id}`} className="text-blue-700 underline-offset-4 hover:underline">
          {client.name}
        </Link>
      </td>
      <td className="px-3 py-4 text-slate-600">{client.email ?? "-"}</td>
      <td className="px-3 py-4 text-slate-600">{client.phone ?? "-"}</td>
      <td className="px-3 py-4 text-slate-600">{client.goal ?? "-"}</td>
      <td className="px-3 py-4 text-right">
        {status === "ARCHIVED" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={restoring}
            onClick={() => onRestore(client.id)}
          >
            {restoring ? "Restaurando..." : "Restaurar cliente"}
          </Button>
        ) : null}
      </td>
    </tr>
  )
}

export default function ClientesPage() {
  const [status, setStatus] = useState<ClientStatus>("ACTIVE")
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const restoringClientLocks = useRef(new Set<string>())
  const [restoringClientIds, setRestoringClientIds] = useState<Set<string>>(
    () => new Set(),
  )
  const { data: clients = [], error, isPending } = useClients(status)
  const restoreClient = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await api.patch<Client>(`/clients/${clientId}/status`, { status: "ACTIVE" })
      return response.data
    },
  })

  const handleRestore = async (clientId: string) => {
    if (!user?.sub) {
      toast.error("Sessão profissional indisponível")
      return
    }

    if (restoringClientLocks.current.has(clientId)) return

    restoringClientLocks.current.add(clientId)
    setRestoringClientIds((currentIds) => new Set(currentIds).add(clientId))

    try {
      await restoreClient.mutateAsync(clientId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ACTIVE") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ARCHIVED") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, clientId) }),
      ])
      toast.success("Cliente restaurado com sucesso.")
    } catch {
      toast.error("Não foi possível restaurar o cliente. Tente novamente.")
    } finally {
      restoringClientLocks.current.delete(clientId)
      setRestoringClientIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(clientId)
        return nextIds
      })
    }
  }

  const title = status === "ACTIVE" ? "Clientes ativos" : "Clientes arquivados"
  const emptyMessage = status === "ACTIVE" ? "Nenhum cliente ativo" : "Nenhum cliente arquivado"

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <main className="mx-auto w-full max-w-6xl space-y-8 px-6 md:px-12 lg:px-20">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Clientes</h1>
            <p className="mt-1 text-slate-500">Gerencie os prontuários privados dos seus clientes.</p>
          </div>
          <Button asChild>
            <Link href="/clientes/novo">Novo cliente</Link>
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div role="group" aria-label="Filtrar clientes" className="mb-6 flex gap-2">
              <Button
                type="button"
                variant={status === "ACTIVE" ? "default" : "outline"}
                aria-pressed={status === "ACTIVE"}
                onClick={() => setStatus("ACTIVE")}
              >
                Ativos
              </Button>
              <Button
                type="button"
                variant={status === "ARCHIVED" ? "default" : "outline"}
                aria-pressed={status === "ARCHIVED"}
                onClick={() => setStatus("ARCHIVED")}
              >
                Arquivados
              </Button>
            </div>
            {isPending ? <p role="status">Carregando clientes...</p> : null}
            {error ? <p role="alert">Não foi possível carregar os clientes. Tente novamente.</p> : null}
            {!isPending && !error && clients.length === 0 ? (
              <p role="status">{emptyMessage}</p>
            ) : null}
            {!isPending && !error && clients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-600">
                    <tr>
                      <th scope="col" className="px-3 py-3">Nome</th>
                      <th scope="col" className="px-3 py-3">E-mail</th>
                      <th scope="col" className="px-3 py-3">Telefone</th>
                      <th scope="col" className="px-3 py-3">Objetivo</th>
                      <th scope="col" className="px-3 py-3 text-right"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        status={status}
                        restoring={restoringClientIds.has(client.id)}
                        onRestore={handleRestore}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
