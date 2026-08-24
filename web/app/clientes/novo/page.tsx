"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClientForm } from "@/components/features/clients/ClientForm"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientFormValues } from "@/types/client"

export default function NovoClientePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const createClient = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const response = await api.post<Client>("/clients", values)
      return response.data
    },
  })

  const handleCreate = async (values: ClientFormValues) => {
    if (!user?.sub) {
      throw new Error("Sessão profissional indisponível")
    }

    await createClient.mutateAsync(values)
    await queryClient.invalidateQueries({
      queryKey: queryKeys.clients(user.sub, "ACTIVE"),
    })
    router.push("/clientes")
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <main className="mx-auto w-full max-w-4xl px-6 md:px-12">
        <Card>
          <CardHeader>
            <CardTitle>Novo cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {createClient.error ? (
              <p role="alert" className="mb-4 text-sm text-red-600">
                Não foi possível salvar o cliente. Tente novamente.
              </p>
            ) : null}
            <ClientForm
              submitLabel="Salvar cliente"
              pending={createClient.isPending}
              onSubmit={handleCreate}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
