"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { useEvolution } from "@/hooks/features/useEvolution"
import { EvolutionSummaryCards } from "@/components/features/evolution/EvolutionSummaryCards"
import { ClientEvolutionList } from "@/components/features/evolution/ClientEvolutionList"
import { ClientEvolutionDetail } from "@/components/features/evolution/ClientEvolutionDetail"
import { AssessmentModal } from "@/components/AssessmentModal"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"

export default function EvolucaoPage() {
  const router = useRouter()
  const { clientEvolutions, summary, loading, error, refetch } = useEvolution()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [assessmentClientId, setAssessmentClientId] = useState<string | null>(null)

  const selectedEvolution = clientEvolutions.find((e) => e.clientId === selectedClientId) ?? null

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AsyncState
          kind="error"
          title="Erro ao carregar evolução"
          description="Não foi possível carregar os dados de evolução. Verifique sua conexão e tente novamente."
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
    <div className="mx-auto w-full max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
                Atendimento
              </p>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--sm-ink)] sm:text-3xl">
                Evolução Clínica
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <EvolutionSummaryCards summary={summary} loading={loading} />

      {/* Loading State */}
      {loading && (
        <AsyncState
          kind="loading"
          title="Carregando evolução"
          description="Buscando dados de avaliações dos seus clientes..."
        />
      )}

      {/* Empty State */}
      {!loading && clientEvolutions.length === 0 && (
        <AsyncState
          kind="empty"
          title="Nenhuma evolução registrada"
          description="Registre avaliações nos prontuários dos seus clientes para acompanhar a evolução corporal ao longo do tempo."
          action={
            <Link href="/avaliacoes">
              <Button>Ir para Avaliações</Button>
            </Link>
          }
        />
      )}

      {/* Client List + Detail */}
      {!loading && clientEvolutions.length > 0 && (
        <div className="space-y-4">
          <ClientEvolutionList
            clientEvolutions={clientEvolutions}
            selectedClientId={selectedClientId}
            onSelectClient={(id) =>
              setSelectedClientId((prev) => (prev === id ? null : id))
            }
          />

          {selectedEvolution && (
            <ClientEvolutionDetail
              evolution={selectedEvolution}
              onNewAssessment={(clientId) => setAssessmentClientId(clientId)}
              onViewRecord={(clientId) => router.push(`/clientes/${clientId}`)}
              onClose={() => setSelectedClientId(null)}
            />
          )}
        </div>
      )}

      {/* Assessment Modal */}
      <AssessmentModal
        isOpen={Boolean(assessmentClientId)}
        clientId={assessmentClientId ?? ""}
        onClose={() => setAssessmentClientId(null)}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
