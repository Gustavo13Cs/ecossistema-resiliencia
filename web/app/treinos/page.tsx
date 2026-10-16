"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { isAxiosError } from "axios"
import { AsyncState } from "@/components/feedback/AsyncState"
import { WorkoutClientPicker } from "@/components/features/training/WorkoutClientPicker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useWorkouts } from "@/hooks/features/useWorkouts"

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-focus)]"

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Data não registrada"
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

export default function TreinosHubPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { listQuery } = useWorkouts({})
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerDenied, setPickerDenied] = useState(false)
  const handlePickerAccessDenied = useCallback(() => setPickerDenied(true), [])

  if (user?.role !== "PERSONAL") {
    return (
      <AsyncState
        kind="error"
        title="Área de treinamento indisponível"
        description="Esta área é exclusiva para profissionais de Educação Física."
      />
    )
  }

  const listErrorStatus = isAxiosError(listQuery.error) ? listQuery.error.response?.status : undefined
  if (pickerDenied || listErrorStatus === 401 || listErrorStatus === 403) {
    return (
      <AsyncState
        kind="error"
        title="Restabeleça seu acesso"
        description="Sua sessão não permite acessar as fichas de treino. Entre novamente ou restabeleça seu acesso para continuar."
        action={
          <Link href="/login" className={actionClass}>
            Entrar novamente
          </Link>
        }
      />
    )
  }

  const workouts = listQuery.data ?? []

  return (
    <div className="min-w-0 space-y-7 pb-10 text-[var(--sm-ink)]">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Treinos</h1>
          <p className="mt-2 max-w-[65ch] text-base text-[var(--sm-muted)]">
            Consulte as fichas salvas dos seus alunos ou inicie uma nova prescrição.
          </p>
        </div>
        <Button type="button" className="min-h-11" onClick={() => setPickerOpen(true)}>
          Nova prescrição
        </Button>
      </header>

      {listQuery.isPending ? (
        <div role="status" aria-label="Carregando fichas de treino" aria-busy="true" className="space-y-3 py-5">
          <span className="sr-only">Buscando as fichas de treino da sua base privada.</span>
          <Skeleton aria-hidden="true" className="h-12 w-full" />
          <Skeleton aria-hidden="true" className="h-12 w-full" />
        </div>
      ) : listQuery.error ? (
        <AsyncState
          kind="error"
          title="Treinos indisponíveis"
          description="Não foi possível carregar o histórico de prescrições agora."
          action={
            <Button type="button" className="min-h-11" onClick={() => void listQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : workouts.length === 0 ? (
        <AsyncState
          kind="empty"
          title="Nenhuma ficha de treino registrada"
          description="Inicie uma nova prescrição para registrar a primeira ficha de treino."
          action={
            <Button type="button" className="min-h-11" onClick={() => setPickerOpen(true)}>
              Nova prescrição
            </Button>
          }
        />
      ) : (
        <section
          aria-label="Fichas prescritas"
          className="overflow-hidden rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)]"
        >
          <ul className="divide-y divide-[var(--sm-border)]">
            {workouts.map(workout => (
              <li
                key={workout.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[var(--sm-ink)]">{workout.title}</span>
                    <span className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-2 py-0.5 text-xs font-semibold text-[var(--sm-muted)]">
                      {workout.isActive ? "Treino ativo" : "Treino anterior"}
                    </span>
                    {workout.client?.status === "ARCHIVED" ? (
                      <span className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] px-2 py-0.5 text-xs font-semibold text-[var(--sm-muted)]">
                        Aluno arquivado
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--sm-muted)]">
                    Aluno: <span className="font-semibold text-[var(--sm-ink)]">{workout.client?.name || "Aluno"}</span> ·{" "}
                    {workout.goal || "Objetivo não registrado"} · {formatDate(workout.updatedAt || workout.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/clientes/${workout.clientId}`} className={actionClass}>
                    Abrir prontuário
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => router.push(`/clientes/${workout.clientId}/treinos/${workout.id}`)}
                  >
                    Abrir ficha
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <WorkoutClientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAccessDenied={handlePickerAccessDenied}
        onSelect={clientId => router.push(`/clientes/${clientId}/novo-treino`)}
      />
    </div>
  )
}
