"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { isAxiosError } from "axios"
import { AsyncState } from "@/components/feedback/AsyncState"
import { WorkoutReadView } from "@/components/features/training/WorkoutReadView"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useWorkouts } from "@/hooks/features/useWorkouts"

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string; workoutId: string }>()
  const clientId = params.id
  const workoutId = params.workoutId
  const { user } = useAuth()
  const { detailQuery } = useWorkouts({ clientId, workoutId })

  if (user?.role !== "PERSONAL") {
    return (
      <AsyncState
        kind="error"
        title="Área de treinamento indisponível"
        description="Esta rota é exclusiva para profissionais de Educação Física."
      />
    )
  }

  if (detailQuery.isPending) {
    return (
      <AsyncState
        kind="loading"
        title="Carregando ficha de treino"
        description="Consultando o conteúdo salvo desta prescrição."
      />
    )
  }

  if (detailQuery.error) {
    const status = isAxiosError(detailQuery.error) ? detailQuery.error.response?.status : undefined
    const isIncompatible =
      detailQuery.error instanceof Error &&
      detailQuery.error.message.includes("Treino incompatível")

    if (status === 401 || status === 403) {
      return (
        <AsyncState
          kind="error"
          title="Restabeleça seu acesso"
          description="Sua sessão não permite acessar esta ficha de treino. Entre novamente ou restabeleça seu acesso para continuar."
          action={
            <Link href="/login" className={actionClass}>
              Entrar novamente
            </Link>
          }
        />
      )
    }

    if (status === 404 || status === 400 || isIncompatible) {
      return (
        <AsyncState
          kind="error"
          title="Ficha de treino indisponível"
          description="A prescrição solicitada não existe ou não pertence a este prontuário."
          action={
            <Link href={`/clientes/${clientId}`} className={actionClass}>
              Voltar ao prontuário
            </Link>
          }
        />
      )
    }

    return (
      <AsyncState
        kind="error"
        title="Não foi possível carregar a ficha"
        description="A prescrição não pôde ser consultada agora. Tente novamente em instantes."
        action={
          <Button type="button" className="min-h-11" onClick={() => void detailQuery.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    )
  }

  if (!detailQuery.data) {
    return null
  }

  return <WorkoutReadView workout={detailQuery.data} />
}
