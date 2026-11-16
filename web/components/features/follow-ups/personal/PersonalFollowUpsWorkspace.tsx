"use client"

import { useEffect, useId, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Dumbbell,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { AppointmentDialog } from "@/components/features/appointments/AppointmentDialog"
import { PersonalAssessmentDialog } from "@/components/features/training/PersonalAssessmentDialog"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  usePersonalFollowUps,
  type PersonalFollowUpItem,
} from "@/hooks/features/usePersonalFollowUps"
import { api } from "@/lib/api"
import type { Appointment, CreateAppointmentCommand } from "@/types/appointment"
import { PersonalFollowUpCard } from "./PersonalFollowUpCard"
import { PersonalFollowUpQuickMessageModal } from "./PersonalFollowUpQuickMessageModal"

type PersonalFollowUpTab =
  | "workout_cycle"
  | "reassessments"
  | "agenda"
  | "all"

type SortMode = "urgency" | "name" | "assessment_age"

export function PersonalFollowUpsWorkspace() {
  const baseId = useId()
  const { items, kpi, activeClients, loading, error, refetch } =
    usePersonalFollowUps()

  const [activeTab, setActiveTab] =
    useState<PersonalFollowUpTab>("workout_cycle")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("urgency")

  const [assessmentClientId, setAssessmentClientId] = useState<string | null>(
    null,
  )
  const [schedulingClientId, setSchedulingClientId] = useState<string | null>(
    null,
  )
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isSavingAppointment, setIsSavingAppointment] = useState(false)
  const [messageTarget, setMessageTarget] =
    useState<PersonalFollowUpItem | null>(null)
  const [timeZone, setTimeZone] = useState("America/Sao_Paulo")

  useEffect(() => {
    setTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
    )
  }, [])

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase()
          const matchName = item.client.name.toLowerCase().includes(q)
          const matchGoal = item.client.goal?.toLowerCase().includes(q)
          const matchWorkout = item.activeWorkout?.title
            .toLowerCase()
            .includes(q)
          if (!matchName && !matchGoal && !matchWorkout) return false
        }

        if (activeTab === "workout_cycle") {
          return (
            item.workoutCycleStatus !== "ACTIVE_ON_TRACK" ||
            item.openDraft !== null
          )
        }
        if (activeTab === "reassessments") {
          return item.assessmentStatus !== "ASSESSMENT_UP_TO_DATE"
        }
        if (activeTab === "agenda") {
          return item.nextAppointment === null || item.hasRecentNoShow
        }
        return true
      })
      .sort((a, b) => {
        if (sortMode === "name") {
          return a.client.name.localeCompare(b.client.name)
        }
        if (sortMode === "assessment_age") {
          return (
            (b.daysSinceLastAssessment ?? 999) -
            (a.daysSinceLastAssessment ?? 999)
          )
        }
        if (b.urgencyScore !== a.urgencyScore) {
          return b.urgencyScore - a.urgencyScore
        }
        return a.client.name.localeCompare(b.client.name)
      })
  }, [items, searchQuery, activeTab, sortMode])

  const handleOpenSchedule = (clientId?: string) => {
    setSchedulingClientId(clientId ?? null)
    setIsAppointmentDialogOpen(true)
  }

  const handleCreateAppointment = async (command: CreateAppointmentCommand) => {
    try {
      setIsSavingAppointment(true)
      await api.post<Appointment>("/appointments", command)
      toast.success("Sessão / avaliação agendada com sucesso!")
      setIsAppointmentDialogOpen(false)
      await refetch()
    } catch (err) {
      toast.error(
        "Erro ao agendar atendimento. Verifique conflitos de horário.",
      )
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
          title="Erro ao carregar central de retornos e ciclos"
          description="Não foi possível consultar os ciclos de treino, avaliações e agenda dos alunos. Tente novamente."
          action={
            <Button onClick={() => void refetch()} variant="outline">
              Tentar novamente
            </Button>
          }
        />
      </div>
    )
  }

  const workoutTabCount = items.filter(
    (i) => i.workoutCycleStatus !== "ACTIVE_ON_TRACK" || i.openDraft !== null,
  ).length
  const reassessmentTabCount = items.filter(
    (i) => i.assessmentStatus !== "ASSESSMENT_UP_TO_DATE",
  ).length
  const agendaTabCount = items.filter(
    (i) => i.nextAppointment === null || i.hasRecentNoShow,
  ).length

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
                  Acompanhamento de Treinamento
                </p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Radar de Ciclos Ativo
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--sm-ink)] sm:text-3xl">
                Retornos, Ciclos de Treino &amp; Reavaliações
              </h1>
              <p className="mt-1 text-xs text-[var(--sm-muted)] sm:text-sm">
                Monitore vencimento de mesociclos, alunos em Semana de Deload, reavaliações físicas de 1RM e agendamentos pendentes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              type="button"
              onClick={() => handleOpenSchedule()}
              className="gap-2 bg-[var(--sm-brand)] font-bold text-white hover:bg-[var(--sm-brand-hover)]"
            >
              <CalendarPlus className="size-4" />
              Agendar Sessão
            </Button>
          </div>
        </div>
      </header>

      {/* KPIs Operacionais do Personal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Sem Ficha / Bloco Vencido
            </span>
            <AlertTriangle className="size-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-rose-600">
            {loading ? "—" : kpi.workoutActionNeededCount}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Alunos que precisam de prescrição imediata
          </p>
        </div>

        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Em Deload / Reta Final
            </span>
            <Sparkles className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-purple-700 dark:text-purple-400">
            {loading ? "—" : kpi.deloadOrEndingSoonCount}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Preparar próximo mesociclo (≤ 14 dias)
          </p>
        </div>

        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Reavaliações Pendentes
            </span>
            <ClipboardCheck className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-amber-700 dark:text-amber-400">
            {loading ? "—" : kpi.assessmentPendingCount}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Sem avaliação ou &gt; 45 dias desde a última
          </p>
        </div>

        <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
              Com Sessão Agendada
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">
            {loading
              ? "—"
              : `${kpi.scheduledNextSessionCount}/${kpi.totalActiveStudents}`}
          </p>
          <p className="mt-1 text-xs text-[var(--sm-muted)]">
            Alunos ativos com retorno futuro na Agenda
          </p>
        </div>
      </div>

      {/* Tablist de linha única com rolagem horizontal e sublinhado acessível */}
      <div
        role="tablist"
        aria-label="Filas de acompanhamento do Personal"
        className="flex overflow-x-auto border-b border-[var(--sm-border)] bg-[var(--sm-surface)] px-2 rounded-t-[var(--sm-radius-md)]"
      >
        {(
          [
            {
              key: "workout_cycle",
              label: "Troca de Treino & Deload",
              count: workoutTabCount,
              icon: Dumbbell,
            },
            {
              key: "reassessments",
              label: "Reavaliações Físicas",
              count: reassessmentTabCount,
              icon: ClipboardCheck,
            },
            {
              key: "agenda",
              label: "Agenda & Ausências",
              count: agendaTabCount,
              icon: Clock,
            },
            {
              key: "all",
              label: "Todos os Alunos",
              count: items.length,
              icon: Users,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon
          const tabId = `${baseId}-tab-${tab.key}`
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex flex-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)] aria-selected:text-[var(--sm-brand)] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:border-b-[3px] aria-selected:after:border-[var(--sm-brand)]"
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              <span className="rounded-full bg-[var(--sm-surface-muted)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--sm-ink)]">
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Barra de Busca e Ordenação */}
      <div className="flex flex-col gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" />
          <Input
            placeholder="Buscar por aluno, objetivo ou treino..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--sm-muted)]">
            <span>Ordenar por:</span>
            <select
              aria-label="Ordenar fila de acompanhamento"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--sm-ink)]"
            >
              <option value="urgency">Prioridade / Urgência do Ciclo</option>
              <option value="assessment_age">Mais Tempo sem Avaliação</option>
              <option value="name">Nome do Aluno (A-Z)</option>
            </select>
          </label>
        </div>
      </div>

      {loading && (
        <AsyncState
          kind="loading"
          title="Analisando ciclos de treino e reavaliações"
          description="Cruzando fichas ativas, fases da periodização, rascunhos abertos, avaliações e agenda..."
        />
      )}

      {!loading && filteredItems.length === 0 && (
        <AsyncState
          kind="empty"
          title="Nenhum aluno pendente nesta fila"
          description="Todos os alunos correspondentes estão com prescrições, reavaliações e sessões em dia."
          action={
            <Button type="button" variant="outline" onClick={() => setActiveTab("all")}>
              Ver todos os alunos
            </Button>
          }
        />
      )}

      {!loading && filteredItems.length > 0 && (
        <div
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeTab}`}
        >
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <PersonalFollowUpCard
                key={item.client.id}
                item={item}
                onEvaluate={(clientId) => setAssessmentClientId(clientId)}
                onSchedule={(clientId) => handleOpenSchedule(clientId)}
                onQuickMessage={(target) => setMessageTarget(target)}
              />
            ))}
          </div>
        </div>
      )}

      <PersonalAssessmentDialog
        isOpen={Boolean(assessmentClientId)}
        clientId={assessmentClientId ?? ""}
        onClose={() => setAssessmentClientId(null)}
        onSuccess={() => void refetch()}
      />

      <PersonalFollowUpQuickMessageModal
        item={messageTarget}
        isOpen={Boolean(messageTarget)}
        onClose={() => setMessageTarget(null)}
      />

      <AppointmentDialog
        open={isAppointmentDialogOpen}
        onOpenChange={setIsAppointmentDialogOpen}
        appointment={null}
        defaultClientId={schedulingClientId ?? undefined}
        clients={activeClients}
        selectedDate={new Date().toISOString().split("T")[0]}
        timeZone={timeZone}
        clientSingular="Aluno"
        conflict={null}
        isSubmitting={isSavingAppointment}
        onSubmit={async (cmd) => {
          await handleCreateAppointment(cmd as CreateAppointmentCommand)
        }}
      />
    </div>
  )
}
