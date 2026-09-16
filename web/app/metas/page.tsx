"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Target,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Layers,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useClientGoals } from "@/hooks/features/useClientGoals"
import { GoalsKpiSummary } from "@/components/features/goals/GoalsKpiSummary"
import { ClientGoalCard } from "@/components/features/goals/ClientGoalCard"
import { GoalFormModal } from "@/components/features/goals/GoalFormModal"
import { GoalAlertsSection } from "@/components/features/goals/GoalAlertsSection"
import { ClientGoalDetailDrawer } from "@/components/features/goals/ClientGoalDetailDrawer"
import type { ClientWithGoalSummary, GoalCategory } from "@/types/goal"

type TabType = "all_goals" | "alerts"
type StatusFilter = "all" | "on_track" | "at_risk" | "achieved" | "no_goal"

export default function MetasPage() {
  const {
    clientsWithGoals,
    kpiSummary,
    allAlerts,
    loading,
    error,
    saveGoal,
    deleteGoal,
    markGoalAchieved,
    availableClients,
  } = useClientGoals()

  const [activeTab, setActiveTab] = useState<TabType>("all_goals")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<ClientWithGoalSummary | null>(null)
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<ClientWithGoalSummary | null>(null)
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | null>(null)

  // Filter clients
  const filteredClients = useMemo(() => {
    return clientsWithGoals.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchName = item.client.name.toLowerCase().includes(query)
        const matchGoal = item.client.goal?.toLowerCase().includes(query)
        if (!matchName && !matchGoal) return false
      }

      // Status filter
      if (statusFilter === "no_goal" && item.goal !== null) return false
      if (statusFilter === "on_track") {
        if (!item.goal || !item.progress) return false
        if (item.alerts.length > 0 || item.progress.percentAchieved >= 100) return false
      }
      if (statusFilter === "at_risk") {
        if (!item.goal || item.alerts.length === 0) return false
      }
      if (statusFilter === "achieved") {
        if (!item.goal || (item.progress?.percentAchieved ?? 0) < 100 && item.goal.status !== "ACHIEVED") {
          return false
        }
      }

      // Category filter
      if (categoryFilter !== "all") {
        if (!item.goal || item.goal.category !== categoryFilter) return false
      }

      return true
    })
  }, [clientsWithGoals, searchQuery, statusFilter, categoryFilter])

  const handleOpenNewGoal = (clientId?: string) => {
    setSelectedClientForEdit(null)
    setPreSelectedClientId(clientId || null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (item: ClientWithGoalSummary) => {
    setSelectedClientForEdit(item)
    setPreSelectedClientId(item.client.id)
    setIsFormOpen(true)
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AsyncState
          kind="error"
          title="Erro ao carregar metas clínicas"
          description="Não foi possível consultar os dados da base de clientes. Verifique a conexão e tente novamente."
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
              <Target className="size-6" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sm-brand)]">
                  Acompanhamento
                </p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Módulo Ativo
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--sm-ink)] sm:text-3xl">
                Metas Clínicas & Hábitos
              </h1>
              <p className="mt-1 text-xs text-[var(--sm-muted)] sm:text-sm">
                Definição de marcos de composição corporal (peso alvo, % de gordura) e acompanhamento diário de adesão a água, sono e refeições.
              </p>
            </div>
          </div>

          <Button
            onClick={() => handleOpenNewGoal()}
            className="gap-2 bg-[var(--sm-brand)] font-bold text-white hover:bg-[var(--sm-brand-hover)]"
          >
            <Plus className="size-4" />
            Pactuar Nova Meta
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <GoalsKpiSummary summary={kpiSummary} loading={loading} />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sm-border)] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all_goals")}
            className={`inline-flex items-center gap-2 rounded-[var(--sm-radius-sm)] px-3.5 py-2 text-sm font-bold transition ${
              activeTab === "all_goals"
                ? "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]"
                : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            }`}
          >
            <Users className="size-4" />
            Painel da Carteira
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {clientsWithGoals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`inline-flex items-center gap-2 rounded-[var(--sm-radius-sm)] px-3.5 py-2 text-sm font-bold transition ${
              activeTab === "alerts"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            }`}
          >
            <AlertTriangle className="size-4 text-amber-600" />
            Alertas de Desvio
            {allAlerts.length > 0 && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                {allAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Painel da Carteira */}
      {activeTab === "all_goals" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" />
              <Input
                placeholder="Buscar cliente por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[var(--sm-muted)]">
                <Filter className="size-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs text-[var(--sm-ink)] focus:border-[var(--sm-brand)] focus:outline-none"
              >
                <option value="all">Todos os Clientes</option>
                <option value="on_track">No Ritmo Alvo</option>
                <option value="at_risk">Em Atenção / Alerta</option>
                <option value="achieved">Metas Atingidas</option>
                <option value="no_goal">Sem Meta Definida</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs text-[var(--sm-ink)] focus:border-[var(--sm-brand)] focus:outline-none"
              >
                <option value="all">Todas as Categorias</option>
                <option value="WEIGHT_LOSS">Emagrecimento</option>
                <option value="HYPERTROPHY">Hipertrofia</option>
                <option value="RECOMPOSITION">Recomposição</option>
                <option value="HEALTH_MAINTENANCE">Saúde & Hábitos</option>
                <option value="PERFORMANCE">Performance</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <AsyncState
              kind="loading"
              title="Carregando metas e progresso"
              description="Processando avaliações físicas e metas pactuadas da base..."
            />
          )}

          {/* Empty State */}
          {!loading && filteredClients.length === 0 && (
            <AsyncState
              kind="empty"
              title="Nenhum cliente encontrado"
              description={
                searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Nenhum cliente corresponde aos filtros aplicados. Tente limpar os termos de busca."
                  : "Nenhum cliente cadastrado no momento. Cadastre clientes para pactuar metas de composição e hábitos."
              }
              action={
                searchQuery || statusFilter !== "all" || categoryFilter !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("all")
                      setCategoryFilter("all")
                    }}
                  >
                    Limpar Filtros
                  </Button>
                ) : (
                  <Link href="/clientes/novo">
                    <Button>Cadastrar Novo Cliente</Button>
                  </Link>
                )
              }
            />
          )}

          {/* Client Cards List */}
          {!loading && filteredClients.length > 0 && (
            <div className="space-y-4">
              {filteredClients.map((item) => (
                <ClientGoalCard
                  key={item.client.id}
                  item={item}
                  onSelect={(selected) => setSelectedClientForDetail(selected)}
                  onEdit={(selected) => handleOpenEdit(selected)}
                  onNewGoal={(clientId) => handleOpenNewGoal(clientId)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Alertas Clínicos */}
      {activeTab === "alerts" && (
        <GoalAlertsSection
          alerts={allAlerts}
          onOpenClientDetails={(clientId) => {
            const found = clientsWithGoals.find((c) => c.client.id === clientId)
            if (found) setSelectedClientForDetail(found)
          }}
        />
      )}

      {/* Modal Pactuar / Editar Meta */}
      <GoalFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={saveGoal}
        clients={availableClients}
        initialData={selectedClientForEdit}
        preSelectedClientId={preSelectedClientId}
      />

      {/* Drawer Detalhes do Cliente */}
      <ClientGoalDetailDrawer
        item={selectedClientForDetail}
        isOpen={Boolean(selectedClientForDetail)}
        onClose={() => setSelectedClientForDetail(null)}
        onEdit={(item) => {
          setSelectedClientForDetail(null)
          handleOpenEdit(item)
        }}
        onDelete={deleteGoal}
        onMarkAchieved={markGoalAchieved}
      />
    </div>
  )
}
