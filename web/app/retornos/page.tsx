"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Search,
  Filter,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AsyncState } from "@/components/feedback/AsyncState"
import { useFollowUps } from "@/hooks/features/useFollowUps"
import { FollowUpsKpiSummary } from "@/components/features/follow-ups/FollowUpsKpiSummary"
import { FollowUpClientCard } from "@/components/features/follow-ups/FollowUpClientCard"
import { FollowUpQuickMessageModal } from "@/components/features/follow-ups/FollowUpQuickMessageModal"
import { ClientCadenceDrawer } from "@/components/features/follow-ups/ClientCadenceDrawer"
import { AppointmentDialog } from "@/components/features/appointments/AppointmentDialog"
import { api } from "@/lib/api"
import type { ClientFollowUpSummary, FollowUpStatus } from "@/types/follow-up"
import type { CreateAppointmentCommand, UpdateAppointmentCommand, Appointment } from "@/types/appointment"

type TabType = "upcoming" | "overdue" | "unscheduled" | "all"
type HorizonFilter = "all" | "7_days" | "15_days" | "30_days"

export default function RetornosPage() {
  const {
    followUpSummaries,
    kpiSummary,
    loading,
    error,
    refetch,
    activeClients,
  } = useFollowUps()

  const [activeTab, setActiveTab] = useState<TabType>("upcoming")
  const [searchQuery, setSearchQuery] = useState("")
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>("all")
  const [sortOrder, setSortOrder] = useState<"urgency" | "name" | "days_since">("urgency")

  // Modals state
  const [selectedForMessage, setSelectedForMessage] = useState<ClientFollowUpSummary | null>(null)
  const [selectedForCadence, setSelectedForCadence] = useState<ClientFollowUpSummary | null>(null)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [schedulingClientId, setSchedulingClientId] = useState<string | null>(null)
  const [isSavingAppointment, setIsSavingAppointment] = useState(false)
  const [timeZone, setTimeZone] = useState("America/Sao_Paulo")

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo")
  }, [])

  // Filter and sort clients
  const filteredSummaries = useMemo(() => {
    return followUpSummaries
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          const matchName = item.client.name.toLowerCase().includes(query)
          const matchGoal = item.client.goal?.toLowerCase().includes(query)
          if (!matchName && !matchGoal) return false
        }

        // Tab filter
        if (activeTab === "upcoming") {
          const isUpcoming =
            item.status === "UPCOMING_7_DAYS" ||
            item.status === "UPCOMING_15_DAYS" ||
            item.status === "UPCOMING_30_DAYS"

          if (!isUpcoming) return false

          // Horizon filter
          if (horizonFilter === "7_days" && item.status !== "UPCOMING_7_DAYS") return false
          if (horizonFilter === "15_days" && item.status !== "UPCOMING_15_DAYS" && item.status !== "UPCOMING_7_DAYS") return false
          if (horizonFilter === "30_days" && !isUpcoming) return false
        } else if (activeTab === "overdue") {
          if (item.status !== "OVERDUE" && item.status !== "NO_SHOW") return false
        } else if (activeTab === "unscheduled") {
          if (item.status !== "UNSCHEDULED" && item.status !== "COMPLETED_RECENT") return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortOrder === "name") {
          return a.client.name.localeCompare(b.client.name)
        }
        if (sortOrder === "days_since") {
          return (b.daysSinceLastAppointment ?? 999) - (a.daysSinceLastAppointment ?? 999)
        }
        // Urgency default
        if (activeTab === "upcoming") {
          return (a.daysUntilNextAppointment ?? 999) - (b.daysUntilNextAppointment ?? 999)
        }
        if (activeTab === "overdue") {
          return (b.daysSinceLastAppointment ?? 999) - (a.daysSinceLastAppointment ?? 999)
        }
        return a.client.name.localeCompare(b.client.name)
      })
  }, [followUpSummaries, searchQuery, activeTab, horizonFilter, sortOrder])

  const handleOpenSchedule = (clientId?: string) => {
    setSchedulingClientId(clientId || null)
    setIsAppointmentDialogOpen(true)
  }

  const handleCreateAppointment = async (command: CreateAppointmentCommand) => {
    try {
      setIsSavingAppointment(true)
      await api.post<Appointment>("/appointments", command)
      toast.success("Consulta de retorno agendada com sucesso na Agenda!")
      setIsAppointmentDialogOpen(false)
      await refetch()
    } catch (err) {
      toast.error("Erro ao agendar consulta. Verifique os horários informados.")
      throw err
    } finally {
      setIsSavingAppointment(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AsyncState
          kind="error"
          title="Erro ao carregar retornos"
          description="Não foi possível consultar os agendamentos e atendimentos dos clientes. Tente novamente."
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
              <CalendarClock className="size-6" strokeWidth={1.8} />
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
                Gestão de Retornos
              </h1>
              <p className="mt-1 text-xs text-[var(--sm-muted)] sm:text-sm">
                Monitoramento proativo do ciclo de consultas de retorno e reavaliações, evitando evasão de clientes e mantendo a continuidade do tratamento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={loading}
              title="Atualizar dados de retornos"
              className="gap-2 border-[var(--sm-border)] text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              onClick={() => handleOpenSchedule()}
              className="gap-2 bg-[var(--sm-brand)] font-bold text-white hover:bg-[var(--sm-brand-hover)]"
            >
              <CalendarPlus className="size-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <FollowUpsKpiSummary summary={kpiSummary} loading={loading} />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sm-border)] pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`inline-flex items-center gap-2 rounded-[var(--sm-radius-sm)] px-3.5 py-2 text-sm font-bold transition ${
              activeTab === "upcoming"
                ? "bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]"
                : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            }`}
          >
            <CalendarClock className="size-4" />
            Próximos Retornos
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {kpiSummary.upcoming30Days}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`inline-flex items-center gap-2 rounded-[var(--sm-radius-sm)] px-3.5 py-2 text-sm font-bold transition ${
              activeTab === "overdue"
                ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200"
                : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            }`}
          >
            <AlertTriangle className="size-4 text-rose-600" />
            Em Atraso & Evasão
            {kpiSummary.overdueCount > 0 && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                {kpiSummary.overdueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("unscheduled")}
            className={`inline-flex items-center gap-2 rounded-[var(--sm-radius-sm)] px-3.5 py-2 text-sm font-bold transition ${
              activeTab === "unscheduled"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            }`}
          >
            <Clock className="size-4 text-amber-600" />
            Sem Agendamento
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {kpiSummary.unscheduledCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`inline-flex items-center gap-2 rounded-[var(--sm-radius-sm)] px-3.5 py-2 text-sm font-bold transition ${
              activeTab === "all"
                ? "bg-slate-100 text-[var(--sm-ink)] dark:bg-slate-800"
                : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
            }`}
          >
            <Users className="size-4" />
            Todos os Clientes ({followUpSummaries.length})
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" />
          <Input
            placeholder="Buscar cliente por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "upcoming" && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--sm-muted)]">Horizonte:</span>
              <select
                value={horizonFilter}
                onChange={(e) => setHorizonFilter(e.target.value as HorizonFilter)}
                className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs text-[var(--sm-ink)] focus:border-[var(--sm-brand)] focus:outline-none"
              >
                <option value="all">Próximos 30 dias</option>
                <option value="7_days">Próximos 7 dias (Urgente)</option>
                <option value="15_days">Próximos 15 dias</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--sm-muted)]">Ordenar:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs text-[var(--sm-ink)] focus:border-[var(--sm-brand)] focus:outline-none"
            >
              <option value="urgency">Mais Urgentes</option>
              <option value="days_since">Tempo sem Consulta</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <AsyncState
          kind="loading"
          title="Carregando ciclo de retornos"
          description="Cruzando agendamentos da Agenda e histórico dos prontuários..."
        />
      )}

      {/* Empty State */}
      {!loading && filteredSummaries.length === 0 && (
        <AsyncState
          kind="empty"
          title={
            activeTab === "overdue"
              ? "Nenhum cliente em atraso ou evasão"
              : activeTab === "upcoming"
              ? "Nenhum retorno agendado para os próximos dias"
              : "Nenhum cliente encontrado"
          }
          description={
            activeTab === "overdue"
              ? "Excelente trabalho! Todos os clientes da carteira possuem consultas recentes ou retornos futuros agendados."
              : activeTab === "upcoming"
              ? "Use a fila de clientes sem agendamento para disparar mensagens de retorno ou agende novas consultas."
              : "Nenhum cliente corresponde aos filtros selecionados."
          }
          action={
            <Button onClick={() => handleOpenSchedule()} className="gap-2">
              <CalendarPlus className="size-4" />
              Agendar Nova Consulta
            </Button>
          }
        />
      )}

      {/* Client List */}
      {!loading && filteredSummaries.length > 0 && (
        <div className="space-y-4">
          {filteredSummaries.map((item) => (
            <FollowUpClientCard
              key={item.client.id}
              item={item}
              onSchedule={(clientId) => handleOpenSchedule(clientId)}
              onQuickMessage={(selected) => setSelectedForMessage(selected)}
              onViewCadence={(selected) => setSelectedForCadence(selected)}
            />
          ))}
        </div>
      )}

      {/* Quick Message Modal */}
      <FollowUpQuickMessageModal
        item={selectedForMessage}
        isOpen={Boolean(selectedForMessage)}
        onClose={() => setSelectedForMessage(null)}
      />

      {/* Cadence Drawer */}
      <ClientCadenceDrawer
        item={selectedForCadence}
        isOpen={Boolean(selectedForCadence)}
        onClose={() => setSelectedForCadence(null)}
        onSchedule={(clientId) => handleOpenSchedule(clientId)}
      />

      {/* Appointment Dialog (Agenda Integration) */}
      <AppointmentDialog
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        appointment={null}
        defaultClientId={schedulingClientId ?? undefined}
        clients={activeClients}
        selectedDate={new Date().toISOString().split("T")[0]}
        timeZone={timeZone}
        clientSingular="Cliente"
        conflict={null}
        isSubmitting={isSavingAppointment}
        onSubmit={async (cmd) => {
          await handleCreateAppointment(cmd as CreateAppointmentCommand)
        }}
      />
    </div>
  )
}
