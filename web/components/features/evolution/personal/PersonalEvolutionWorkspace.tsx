"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Dumbbell,
  Plus,
  Search,
  TrendingUp,
  Users,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usePersonalEvolution } from "@/hooks/features/usePersonalEvolution"
import { PersonalAssessmentDialog } from "@/components/features/training/PersonalAssessmentDialog"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PersonalEvolutionDetail } from "./PersonalEvolutionDetail"

type FilterMode = "all" | "with_1rm" | "multi_assessments"

function formatSigned(value: number | null, unit: string): string {
  if (value === null) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value} ${unit}`
}

export function PersonalEvolutionWorkspace() {
  const router = useRouter()
  const { user } = useAuth()
  const { clientEvolutions, summary, loading, error, refetch } =
    usePersonalEvolution()

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [assessmentClientId, setAssessmentClientId] = useState<string | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")

  const filteredEvolutions = useMemo(() => {
    return clientEvolutions.filter((item) => {
      if (
        searchQuery.trim() &&
        !item.clientName
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      ) {
        return false
      }
      if (filterMode === "with_1rm" && !item.has1RMData) return false
      if (filterMode === "multi_assessments" && item.assessmentCount < 2)
        return false
      return true
    })
  }, [clientEvolutions, searchQuery, filterMode])

  const effectiveSelectedId =
    selectedClientId ?? filteredEvolutions[0]?.clientId ?? null
  const selectedEvolution =
    filteredEvolutions.find((e) => e.clientId === effectiveSelectedId) ?? null

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AsyncState
          kind="error"
          title="Erro ao carregar evolução de treinamento"
          description="Não foi possível carregar o histórico de avaliações físicas e de força. Verifique sua conexão e tente novamente."
          action={
            <Button onClick={() => void refetch()} variant="outline">
              Tentar novamente
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <header className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6 shadow-[var(--sm-shadow-rest)] sm:p-8">
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center gap-2 rounded-[var(--sm-radius-sm)] px-3 text-sm font-bold text-[var(--sm-muted)] transition hover:bg-[var(--sm-surface-muted)] hover:text-[var(--sm-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sm-brand)]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para Visão geral
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-[var(--sm-radius-md)] bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]">
              <TrendingUp className="size-6" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sm-brand)]">
                Acompanhamento de Treinamento
              </p>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--sm-ink)] sm:text-3xl">
                Evolução Física &amp; Força (1RM)
              </h1>
              <p className="mt-1 text-xs text-[var(--sm-muted)] sm:text-sm">
                Curvas longitudinais de 1RM, força relativa, composição corporal, perímetros e emissão de relatório comparativo A4.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/avaliacoes">
              <Button variant="outline" className="min-h-10 gap-2">
                <ClipboardCheck className="size-4" />
                Central de Avaliações
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Alunos Avaliados
            </span>
            <Users className="size-4 text-[var(--sm-brand)]" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-[var(--sm-ink)]">
            {loading ? "—" : summary.totalClients}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Com histórico na base privada
          </p>
        </div>

        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Avaliações Físicas
            </span>
            <ClipboardCheck className="size-4 text-[var(--sm-brand)]" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-[var(--sm-ink)]">
            {loading ? "—" : summary.totalAssessments}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Registros antropométricos e de 1RM
          </p>
        </div>

        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Evolução Média Squat 1RM
            </span>
            <Dumbbell className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">
            {loading ? "—" : formatSigned(summary.averageSquatDelta, "kg")}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Média entre alunos reavaliados em força
          </p>
        </div>

        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Variação Média % Gordura
            </span>
            <Activity className="size-4 text-[var(--sm-brand)]" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-[var(--sm-ink)]">
            {loading ? "—" : formatSigned(summary.averageBodyFatDelta, "%")}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Comparativo 1ª vs. última avaliação
          </p>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" />
          <Input
            placeholder="Buscar aluno por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Todos os alunos"],
              ["with_1rm", "Com 1RM de Força"],
              ["multi_assessments", "Com 2+ avaliações"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterMode(key)}
              className={`rounded-[var(--sm-radius-sm)] px-3 py-1.5 text-xs font-bold transition ${
                filterMode === key
                  ? "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]"
                  : "text-[var(--sm-muted)] hover:bg-[var(--sm-surface-muted)] hover:text-[var(--sm-ink)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <AsyncState
          kind="loading"
          title="Carregando evolução de treinamento"
          description="Calculando curvas de força 1RM, perímetros e composição corporal..."
        />
      )}

      {!loading && filteredEvolutions.length === 0 && (
        <AsyncState
          kind="empty"
          title="Nenhuma evolução encontrada"
          description="Registre avaliações físicas e de 1RM nos prontuários dos seus alunos para acompanhar os gráficos de evolução."
          action={
            <Link href="/avaliacoes">
              <Button>Ir para Avaliações</Button>
            </Link>
          }
        />
      )}

      {!loading && filteredEvolutions.length > 0 && (
        <div className="space-y-6">
          {/* Painel Expandido do Aluno Selecionado */}
          {selectedEvolution && (
            <PersonalEvolutionDetail
              key={selectedEvolution.clientId}
              evolution={selectedEvolution}
              professionalName={user?.name}
              onNewAssessment={(clientId) => setAssessmentClientId(clientId)}
              onViewRecord={(clientId) => router.push(`/clientes/${clientId}`)}
              onClose={() => setSelectedClientId(null)}
            />
          )}

          {/* Lista de Alunos com Resumo de Deltas */}
          <div className="overflow-hidden rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]">
            <div className="border-b border-[var(--sm-border)] bg-[var(--sm-surface-muted)] px-5 py-3.5">
              <h2 className="text-sm font-bold text-[var(--sm-ink)]">
                Alunos Avaliados ({filteredEvolutions.length})
              </h2>
            </div>

            <div className="divide-y divide-[var(--sm-border)]">
              {filteredEvolutions.map((item) => {
                const isSelected =
                  selectedEvolution?.clientId === item.clientId
                return (
                  <div
                    key={item.clientId}
                    className={`flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                      isSelected
                        ? "bg-[var(--sm-brand-subtle)]/40"
                        : "hover:bg-[var(--sm-canvas)]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedClientId((prev) =>
                              prev === item.clientId ? null : item.clientId,
                            )
                          }
                          className="text-left text-base font-bold text-[var(--sm-ink)] hover:text-[var(--sm-brand)]"
                        >
                          {item.clientName}
                        </button>
                        <span className="rounded-full bg-[var(--sm-surface-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sm-muted)]">
                          {item.assessmentCount}{" "}
                          {item.assessmentCount === 1
                            ? "avaliação"
                            : "avaliações"}
                        </span>
                        {item.has1RMData && (
                          <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            1RM monitorado
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--sm-muted)]">
                        <span>
                          Peso:{" "}
                          <strong className="text-[var(--sm-ink)]">
                            {item.lastWeight !== null
                              ? `${item.lastWeight} kg`
                              : "—"}
                          </strong>{" "}
                          ({formatSigned(item.weightDelta, "kg")})
                        </span>
                        <span>
                          % GC:{" "}
                          <strong className="text-[var(--sm-ink)]">
                            {item.lastBodyFat !== null
                              ? `${item.lastBodyFat}%`
                              : "—"}
                          </strong>{" "}
                          ({formatSigned(item.bodyFatDelta, "%")})
                        </span>
                        <span>
                          Agachamento 1RM:{" "}
                          <strong className="text-[var(--sm-ink)]">
                            {item.lastSquat1RM !== null
                              ? `${item.lastSquat1RM} kg`
                              : "—"}
                          </strong>{" "}
                          ({formatSigned(item.squat1RMDelta, "kg")})
                        </span>
                        <span>
                          Terra 1RM:{" "}
                          <strong className="text-[var(--sm-ink)]">
                            {item.lastDeadlift1RM !== null
                              ? `${item.lastDeadlift1RM} kg`
                              : "—"}
                          </strong>{" "}
                          ({formatSigned(item.deadlift1RMDelta, "kg")})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAssessmentClientId(item.clientId)}
                        className="gap-1.5"
                      >
                        <Plus className="size-3.5" />
                        Avaliar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "secondary"}
                        onClick={() =>
                          setSelectedClientId((prev) =>
                            prev === item.clientId ? null : item.clientId,
                          )
                        }
                        className="gap-1.5"
                      >
                        {isSelected ? (
                          <>
                            Ocultar Gráficos
                            <ChevronUp className="size-3.5" />
                          </>
                        ) : (
                          <>
                            Ver Gráficos &amp; Comparativo
                            <ChevronDown className="size-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <PersonalAssessmentDialog
        isOpen={Boolean(assessmentClientId)}
        clientId={assessmentClientId ?? ""}
        onClose={() => setAssessmentClientId(null)}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
