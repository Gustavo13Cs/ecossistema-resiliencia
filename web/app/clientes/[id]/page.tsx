"use client"

import axios from "axios"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientForm } from "@/components/features/clients/ClientForm"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientFormValues } from "@/types/client"

type ArchiveClientDialogProps = {
  pending: boolean
  onConfirm: () => void
}

function ArchiveClientDialog({ pending, onConfirm }: ArchiveClientDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={pending}>
          Arquivar cliente
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            O prontuário será preservado e poderá ser restaurado depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? "Arquivando..." : "Confirmar arquivamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function isNotFoundError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404
}

function isConflictError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 409
}

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const lifecycleMutationInFlight = useRef(false)
  const [isLifecycleOperationActive, setIsLifecycleOperationActive] = useState(false)
  const [isReloadingLatest, setIsReloadingLatest] = useState(false)
  const [formRevision, setFormRevision] = useState(0)
  const sessionUserId = user?.sub ?? "anonymous"
  const clientQuery = useQuery({
    queryKey: queryKeys.client(sessionUserId, clientId),
    queryFn: async () => (await api.get<Client>(`/clients/${clientId}`)).data,
    enabled: Boolean(user?.sub && clientId),
    retry: false,
  })
  const updateClient = useMutation({
    mutationFn: async ({
      values,
      expectedUpdatedAt,
    }: {
      values: ClientFormValues
      expectedUpdatedAt: string
    }) => {
      const response = await api.patch<Client>(`/clients/${clientId}`, {
        ...values,
        expectedUpdatedAt,
      })
      return response.data
    },
  })
  const archiveClient = useMutation({
    mutationFn: async () => {
      const response = await api.patch<Client>(`/clients/${clientId}/status`, { status: "ARCHIVED" })
      return response.data
    },
  })
  const lifecyclePending =
    isLifecycleOperationActive ||
    isReloadingLatest ||
    updateClient.isPending ||
    archiveClient.isPending

  const invalidateClientRecords = async () => {
    if (!user?.sub) return

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ACTIVE") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ARCHIVED") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, clientId) }),
    ])
  }

  const handleUpdate = async (
    values: ClientFormValues,
    expectedUpdatedAt: string,
  ) => {
    if (lifecyclePending || lifecycleMutationInFlight.current) {
      throw new Error("Já existe uma operação em andamento")
    }

    lifecycleMutationInFlight.current = true
    setIsLifecycleOperationActive(true)
    try {
      const updatedClient = await updateClient.mutateAsync({
        values,
        expectedUpdatedAt,
      })
      await invalidateClientRecords()
      return updatedClient
    } finally {
      lifecycleMutationInFlight.current = false
      setIsLifecycleOperationActive(false)
    }
  }

  const handleReloadLatest = async () => {
    if (isReloadingLatest || lifecycleMutationInFlight.current) return

    setIsReloadingLatest(true)
    try {
      const result = await clientQuery.refetch()
      if (result.error || !result.data) {
        throw result.error ?? new Error("Cliente não encontrado")
      }

      updateClient.reset()
      setFormRevision((currentRevision) => currentRevision + 1)
    } catch {
      toast.error("Não foi possível carregar a versão mais recente.")
    } finally {
      setIsReloadingLatest(false)
    }
  }

  const handleArchive = async () => {
    if (lifecyclePending || lifecycleMutationInFlight.current) return

    lifecycleMutationInFlight.current = true
    setIsLifecycleOperationActive(true)
    try {
      await archiveClient.mutateAsync()
      await invalidateClientRecords()
      toast.success("Cliente arquivado com sucesso.")
      router.push("/clientes")
    } catch {
      toast.error("Não foi possível arquivar o cliente. Tente novamente.")
      lifecycleMutationInFlight.current = false
      setIsLifecycleOperationActive(false)
    }
  }

  if (clientQuery.isPending) {
    return <p role="status" className="p-8">Carregando cliente...</p>
  }

  if (clientQuery.error) {
    return (
      <p role="alert" className="p-8 text-red-600">
        {isNotFoundError(clientQuery.error) ? "Cliente não encontrado" : "Não foi possível carregar o cliente. Tente novamente."}
      </p>
    )
  }

  if (!clientQuery.data) {
    return <p role="alert" className="p-8 text-red-600">Cliente não encontrado</p>
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <main className="mx-auto w-full max-w-4xl space-y-6 px-6 md:px-12">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{clientQuery.data.name}</h1>
            <p className="mt-1 text-slate-500">Edite e mantenha o prontuário privado deste cliente.</p>
          </div>
          {clientQuery.data.status === "ARCHIVED" ? (
            <p className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
              Cliente arquivado
            </p>
          ) : (
            <ArchiveClientDialog pending={lifecyclePending} onConfirm={handleArchive} />
          )}
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {updateClient.error ? isConflictError(updateClient.error) ? (
              <div role="alert" className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>O prontuário mudou desde que você abriu esta tela.</p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isReloadingLatest}
                  onClick={handleReloadLatest}
                >
                  {isReloadingLatest ? "Carregando..." : "Carregar versão mais recente"}
                </Button>
              </div>
            ) : (
              <p role="alert" className="mb-4 text-sm text-red-600">
                Não foi possível salvar as alterações. Tente novamente.
              </p>
            ) : null}
            {archiveClient.error ? (
              <p role="alert" className="mb-4 text-sm text-red-600">
                Não foi possível arquivar o cliente. Tente novamente.
              </p>
            ) : null}
            <ClientForm
              key={`${clientId}:${formRevision}`}
              mode="update"
              initialValues={clientQuery.data}
              initialVersion={clientQuery.data.updatedAt}
              submitLabel="Salvar alterações"
              pending={lifecyclePending}
              onSubmit={handleUpdate}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
