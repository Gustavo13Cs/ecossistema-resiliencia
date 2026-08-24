"use client"

import axios from "axios"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
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

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const sessionUserId = user?.sub ?? "anonymous"
  const clientQuery = useQuery({
    queryKey: queryKeys.client(sessionUserId, clientId),
    queryFn: async () => (await api.get<Client>(`/clients/${clientId}`)).data,
    enabled: Boolean(user?.sub && clientId),
    retry: false,
  })
  const updateClient = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const response = await api.patch<Client>(`/clients/${clientId}`, values)
      return response.data
    },
  })
  const archiveClient = useMutation({
    mutationFn: async () => {
      const response = await api.patch<Client>(`/clients/${clientId}/status`, { status: "ARCHIVED" })
      return response.data
    },
  })

  const invalidateClientRecords = async () => {
    if (!user?.sub) return

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ACTIVE") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ARCHIVED") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, clientId) }),
    ])
  }

  const handleUpdate = async (values: ClientFormValues) => {
    await updateClient.mutateAsync(values)
    await invalidateClientRecords()
  }

  const handleArchive = () => {
    void (async () => {
      try {
        await archiveClient.mutateAsync()
        await invalidateClientRecords()
        toast.success("Cliente arquivado com sucesso.")
        router.push("/clientes")
      } catch {
        toast.error("Não foi possível arquivar o cliente. Tente novamente.")
      }
    })()
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
          <ArchiveClientDialog pending={archiveClient.isPending} onConfirm={handleArchive} />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {updateClient.error ? (
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
              initialValues={clientQuery.data}
              submitLabel="Salvar alterações"
              pending={updateClient.isPending}
              onSubmit={handleUpdate}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
