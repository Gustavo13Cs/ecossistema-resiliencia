"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AsyncState } from "@/components/feedback/AsyncState"
import { ClientForm } from "@/components/features/clients/ClientForm"
import type { ClientFormPayload } from "@/components/features/clients/client-field-policy"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import { queryKeys } from "@/lib/query-keys"
import type { Client } from "@/types/client"

export default function NovoClientePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const createClient = useMutation({
    mutationFn: async (values: ClientFormPayload) => {
      const response = await api.post<Client>("/clients", values)
      return response.data
    },
  })

  const handleCreate = async (values: ClientFormPayload) => {
    if (!user?.sub) {
      throw new Error("Sessão profissional indisponível")
    }

    await createClient.mutateAsync(values)
    await queryClient.invalidateQueries({
      queryKey: queryKeys.clients(user.sub, "ACTIVE"),
    })
    router.push("/clientes")
  }

  if (!user || user.role === "ADMIN") {
    return (
      <AsyncState
        kind="error"
        title="Cadastro indisponível"
        description="Esta área é exclusiva para contas profissionais."
      />
    )
  }

  const workspace = getWorkspaceDefinition(user.role)
  const singular = workspace.clientSingular.toLocaleLowerCase("pt-BR")

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-7 pb-10">
      <header>
        <Link href="/clientes" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sm-brand)] no-underline hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Voltar para {workspace.clientPlural.toLocaleLowerCase("pt-BR")}
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-[var(--sm-ink)]">Novo {singular}</h1>
        <p className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">
          Abra um prontuário privado com somente o contexto necessário para sua área de {workspace.areaLabel.toLocaleLowerCase("pt-BR")}.
        </p>
      </header>

      <section aria-label={`Cadastro de ${singular}`} className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)] sm:p-7">
            {createClient.error ? (
              <p role="alert" className="mb-6 rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--sm-danger)]">
                Não foi possível salvar o {singular}. Revise os dados e tente novamente.
              </p>
            ) : null}
            <ClientForm
              mode="create"
              role={user.role}
              submitLabel={`Salvar ${singular}`}
              pending={createClient.isPending}
              onSubmit={handleCreate}
            />
      </section>
    </div>
  )
}
