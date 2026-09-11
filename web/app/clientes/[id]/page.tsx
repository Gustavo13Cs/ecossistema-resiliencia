"use client"

import { useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AsyncState } from "@/components/feedback/AsyncState"
import { ClientOverviewSection } from "@/components/features/clients/ClientOverviewSection"
import { ClientRecordHeader } from "@/components/features/clients/ClientRecordHeader"
import { ProfessionalScopePanel } from "@/components/features/clients/ProfessionalScopePanel"
import type { ClientFormPayload } from "@/components/features/clients/client-field-policy"
import { NutritionistQuickActions } from "@/components/features/clients/NutritionistQuickActions"
import { BodyCompositionChart } from "@/components/features/clients/BodyCompositionChart"
import { AssessmentModal } from "@/components/AssessmentModal"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useClientRecord, type ClientRecordStatus } from "@/hooks/features/useClientRecord"
import { api } from "@/lib/api"
import { getWorkspaceDefinition } from "@/lib/professional-workspace"
import { queryKeys } from "@/lib/query-keys"
import type { ProfessionalRole } from "@/types/auth"
import type { Client } from "@/types/client"

const ERROR_STATES: Record<Exclude<ClientRecordStatus, "loading" | "ready">, { title: string; description: string }> = {
  "not-found": {
    title: "Prontuário não encontrado",
    description: "O registro solicitado não existe ou não está disponível na sua base privada.",
  },
  unauthorized: {
    title: "Prontuário indisponível",
    description: "Sua sessão não tem acesso a este registro profissional.",
  },
  "network-error": {
    title: "Sem conexão com o SafeMove",
    description: "Não foi possível acessar sua base privada. Verifique a conexão e tente novamente.",
  },
  "server-error": {
    title: "SafeMove temporariamente indisponível",
    description: "O prontuário não pôde ser carregado agora. Tente novamente em instantes.",
  },
}

const isProfessionalRole = (role: string | undefined): role is ProfessionalRole =>
  role === "NUTRITIONIST" || role === "PERSONAL" || role === "PHYSIO"

export default function ClienteHubPage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { client, status, refetch } = useClientRecord(clientId)
  const lifecycleMutationInFlight = useRef(false)
  const [lifecycleActive, setLifecycleActive] = useState(false)
  const [reloadingLatest, setReloadingLatest] = useState(false)
  const [formRevision, setFormRevision] = useState(0)
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)

  const updateClient = useMutation({
    mutationFn: async ({ values, expectedUpdatedAt }: { values: ClientFormPayload; expectedUpdatedAt: string }) => {
      const response = await api.patch<Client>(`/clients/${clientId}`, { ...values, expectedUpdatedAt })
      return response.data
    },
  })

  const archiveClient = useMutation({
    mutationFn: async () => {
      const response = await api.patch<Client>(`/clients/${clientId}/status`, { status: "ARCHIVED" })
      return response.data
    },
  })

  const pending = lifecycleActive || reloadingLatest || updateClient.isPending || archiveClient.isPending

  const invalidateClientRecords = async () => {
    if (!user?.sub) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ACTIVE") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ARCHIVED") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, clientId) }),
    ])
  }

  const handleUpdate = async (values: ClientFormPayload, expectedUpdatedAt: string) => {
    if (pending || lifecycleMutationInFlight.current) throw new Error("Já existe uma operação em andamento")
    lifecycleMutationInFlight.current = true
    setLifecycleActive(true)
    try {
      const updatedClient = await updateClient.mutateAsync({ values, expectedUpdatedAt })
      await invalidateClientRecords()
      toast.success("Prontuário atualizado com sucesso.")
      return updatedClient
    } finally {
      lifecycleMutationInFlight.current = false
      setLifecycleActive(false)
    }
  }

  const handleReloadLatest = async () => {
    if (pending || lifecycleMutationInFlight.current) return
    lifecycleMutationInFlight.current = true
    setReloadingLatest(true)
    try {
      await refetch({ throwOnError: true })
      updateClient.reset()
      setFormRevision((revision) => revision + 1)
      toast.success("Versão mais recente do prontuário carregada.")
    } catch {
      toast.error("Não foi possível recarregar a versão mais recente. Tente novamente.")
    } finally {
      lifecycleMutationInFlight.current = false
      setReloadingLatest(false)
    }
  }

  const handleArchive = async () => {
    if (pending || lifecycleMutationInFlight.current) return
    lifecycleMutationInFlight.current = true
    setLifecycleActive(true)
    try {
      await archiveClient.mutateAsync()
      await invalidateClientRecords()
      toast.success("Prontuário arquivado com sucesso.")
      router.push("/clientes")
    } catch {
      toast.error("Não foi possível arquivar o prontuário. Tente novamente.")
    } finally {
      lifecycleMutationInFlight.current = false
      setLifecycleActive(false)
    }
  }

  if (!isProfessionalRole(user?.role)) {
    return (
      <AsyncState
        kind="error"
        title="Área profissional indisponível"
        description="Escolha uma conta de Nutrição, Treinamento ou Fisioterapia para acessar prontuários profissionais."
      />
    )
  }

  if (status === "loading") {
    return <AsyncState kind="loading" title="Carregando prontuário" description="Acessando os dados autorizados deste registro." />
  }

  if (status !== "ready" || !client) {
    const state = ERROR_STATES[status === "ready" ? "server-error" : status]
    return (
      <AsyncState
        kind="error"
        title={state.title}
        description={state.description}
        action={
          status === "network-error" || status === "server-error"
            ? <Button type="button" className="min-h-11" onClick={() => void refetch()}>Tentar novamente</Button>
            : undefined
        }
      />
    )
  }

  const workspace = getWorkspaceDefinition(user.role)

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ClientRecordHeader client={client} workspace={workspace} pending={pending} onArchive={handleArchive} />
      
      {user.role === "NUTRITIONIST" && (
        <NutritionistQuickActions clientId={clientId} />
      )}

      <div className={`grid items-start gap-6 ${user.role === "NUTRITIONIST" ? "xl:grid-cols-[380px_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1fr)_320px]"}`}>
        <ClientOverviewSection
          client={client}
          role={user.role}
          formRevision={formRevision}
          pending={pending}
          updateError={updateClient.error}
          reloadingLatest={reloadingLatest}
          onUpdate={handleUpdate}
          onReloadLatest={handleReloadLatest}
        />
        {user.role === "NUTRITIONIST" ? (
          <BodyCompositionChart clientId={clientId} onNewAssessment={() => setShowAssessmentModal(true)} />
        ) : (
          <ProfessionalScopePanel role={user.role} />
        )}
      </div>

      {showAssessmentModal && (
        <AssessmentModal
          isOpen={showAssessmentModal}
          clientId={clientId}
          onClose={() => setShowAssessmentModal(false)}
          onSuccess={() => {
            setShowAssessmentModal(false)
            if (user.sub) {
              void queryClient.invalidateQueries({ queryKey: queryKeys.assessments(user.sub, clientId) })
            }
          }}
        />
      )}
    </div>
  )
}
