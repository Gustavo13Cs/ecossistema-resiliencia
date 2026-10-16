"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { isAxiosError } from "axios"
import { toast } from "sonner"
import { AsyncState } from "@/components/feedback/AsyncState"
import { WorkoutEditor } from "@/components/features/training/WorkoutEditor"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useClientRecord } from "@/hooks/features/useClientRecord"
import { useWorkouts } from "@/hooks/features/useWorkouts"

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"

export default function NovoTreinoPage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id
  const router = useRouter()
  const { user } = useAuth()
  const { client, status, refetch } = useClientRecord(clientId)
  const clientReady = status === "ready" && client?.id === clientId
  const { activeQuery, createMutation } = useWorkouts({
    clientId,
    enabled: clientReady,
  })
  const [deniedContext, setDeniedContext] = useState<string | null>(null)
  const contextKey = `${user?.sub}:${clientId}`
  const handleAccessDenied = useCallback(() => setDeniedContext(contextKey), [contextKey])

  if (user?.role !== "PERSONAL") {
    return (
      <AsyncState
        kind="error"
        title="Área de treinamento indisponível"
        description="Esta rota é exclusiva para profissionais de Educação Física."
      />
    )
  }

  const activeErrorStatus = isAxiosError(activeQuery.error) ? activeQuery.error.response?.status : undefined
  if (
    status === "unauthorized" ||
    deniedContext === contextKey ||
    activeErrorStatus === 401 ||
    activeErrorStatus === 403
  ) {
    return (
      <AsyncState
        kind="error"
        title="Restabeleça seu acesso"
        description="Sua sessão não permite acessar estes registros. Entre novamente ou restabeleça seu acesso para continuar."
        action={
          <Link href="/login" className={actionClass}>
            Entrar novamente
          </Link>
        }
      />
    )
  }

  if (status === "loading" || (clientReady && activeQuery.isPending)) {
    return (
      <AsyncState
        kind="loading"
        title="Carregando contexto de prescrição"
        description="Verificando o prontuário e o treino ativo deste aluno."
      />
    )
  }

  if (status === "not-found") {
    return (
      <AsyncState
        kind="error"
        title="Prontuário não encontrado"
        description="O aluno solicitado não existe ou não pertence à sua base privada."
        action={
          <Link href="/clientes" className={actionClass}>
            Voltar para alunos
          </Link>
        }
      />
    )
  }

  if (status !== "ready" || !client) {
    return (
      <AsyncState
        kind="error"
        title="Não foi possível carregar o prontuário"
        description="Verifique sua conexão e tente novamente."
        action={
          <Button type="button" className="min-h-11" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        }
      />
    )
  }

  if (activeQuery.error) {
    return (
      <AsyncState
        kind="error"
        title="Contexto de treino indisponível"
        description="Não foi possível verificar se este aluno já possui um treino ativo. Tente novamente antes de criar uma prescrição."
        action={
          <Button type="button" className="min-h-11" onClick={() => void activeQuery.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    )
  }

  return (
    <WorkoutEditor
      key={contextKey}
      client={client}
      activeWorkout={activeQuery.data ?? null}
      onAccessDenied={handleAccessDenied}
      onSubmit={async input => {
        try {
          const created = await createMutation.mutateAsync(input)
          toast.success("Prescrição salva com sucesso.")
          router.push(`/clientes/${client.id}`)
          return created
        } catch (error) {
          toast.error("Não foi possível salvar a prescrição.")
          throw error
        }
      }}
    />
  )
}
