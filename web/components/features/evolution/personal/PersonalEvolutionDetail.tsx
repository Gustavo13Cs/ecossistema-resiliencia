"use client"

import { useId, useMemo, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowRight,
  Columns,
  Dumbbell,
  Plus,
  Printer,
  Ruler,
  Scale,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  comparePersonalAssessments,
  type PersonalClientEvolution,
} from "@/hooks/features/usePersonalEvolution"
import { printPersonalEvolutionDocument } from "@/lib/evolution-print-document"

export interface PersonalEvolutionDetailProps {
  evolution: PersonalClientEvolution
  professionalName?: string | null
  onNewAssessment: (clientId: string) => void
  onViewRecord: (clientId: string) => void
  onClose: () => void
}

type DetailTab = "strength" | "body" | "compare"
type CircumferenceGroup = "core" | "lower" | "upper"

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatDeltaBadge(delta: number | null, unit: string, invertGood = false) {
  if (delta === null) {
    return <span className="text-xs text-[var(--sm-muted)]">Sem comparativo</span>
  }
  if (delta === 0) {
    return <span className="text-xs font-semibold text-[var(--sm-muted)]">Estável (0 {unit})</span>
  }
  const isPositive = delta > 0
  const isGood = invertGood ? !isPositive : isPositive
  const sign = isPositive ? "+" : ""
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
        isGood
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {sign}
      {delta} {unit}
    </span>
  )
}

export function PersonalEvolutionDetail({
  evolution,
  professionalName,
  onNewAssessment,
  onViewRecord,
  onClose,
}: PersonalEvolutionDetailProps) {
  const baseId = useId()
  const [activeTab, setActiveTab] = useState<DetailTab>(
    evolution.has1RMData ? "strength" : "body",
  )
  const [circumferenceGroup, setCircumferenceGroup] =
    useState<CircumferenceGroup>("lower")

  const assessments = evolution.assessments
  const [firstId, setFirstId] = useState<string>(assessments[0]?.id ?? "")
  const [secondId, setSecondId] = useState<string>(
    assessments[assessments.length - 1]?.id ?? "",
  )

  const selectedFirst = useMemo(
    () => assessments.find((a) => a.id === firstId) ?? assessments[0],
    [assessments, firstId],
  )
  const selectedSecond = useMemo(
    () =>
      assessments.find((a) => a.id === secondId) ??
      assessments[assessments.length - 1],
    [assessments, secondId],
  )

  const comparisonRows = useMemo(() => {
    if (!selectedFirst || !selectedSecond) return []
    return comparePersonalAssessments(selectedFirst, selectedSecond)
  }, [selectedFirst, selectedSecond])

  const handlePrint = () => {
    const popup = printPersonalEvolutionDocument({
      evolution,
      firstAssessment: selectedFirst,
      secondAssessment: selectedSecond,
      professionalName,
    })
    if (!popup) {
      toast.error(
        "Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.",
      )
    }
  }

  const strengthTabId = `${baseId}-tab-strength`
  const bodyTabId = `${baseId}-tab-body`
  const compareTabId = `${baseId}-tab-compare`
  const captionId = `${baseId}-compare-caption`

  const hasMultiple = evolution.assessmentCount > 1

  return (
    <section
      aria-label={`Detalhes de evolução de ${evolution.clientName}`}
      className="overflow-hidden rounded-[var(--sm-radius-lg)] border border-[var(--sm-brand)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-elevated)]"
    >
      {/* Cabeçalho Escuro */}
      <div className="flex flex-col gap-3 border-b border-[var(--sm-border)] bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">
            {evolution.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{evolution.clientName}</h2>
            <p className="text-xs text-slate-300">
              {evolution.assessmentCount}{" "}
              {evolution.assessmentCount === 1 ? "avaliação registrada" : "avaliações registradas"}
              {" · "}
              {formatFullDate(evolution.firstDate)}
              {hasMultiple ? ` → ${formatFullDate(evolution.lastDate)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="border-slate-600 bg-slate-800/80 text-slate-100 hover:bg-slate-700 hover:text-white"
          >
            <Printer className="mr-1.5 size-3.5" />
            Exportar PDF A4
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onNewAssessment(evolution.clientId)}
            className="border-0 bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Plus className="mr-1.5 size-3.5" />
            Nova Avaliação
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onViewRecord(evolution.clientId)}
            className="border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            Prontuário
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar painel de evolução"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Tablist de linha única com sublinhado em pseudo-elemento */}
      <div
        role="tablist"
        aria-label="Visões de evolução do aluno"
        className="flex overflow-x-auto border-b border-[var(--sm-border)] bg-[var(--sm-surface-muted)] px-4"
      >
        <button
          type="button"
          role="tab"
          id={strengthTabId}
          aria-selected={activeTab === "strength"}
          onClick={() => setActiveTab("strength")}
          className="relative flex flex-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)] aria-selected:text-[var(--sm-brand)] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:border-b-[3px] aria-selected:after:border-[var(--sm-brand)]"
        >
          <Dumbbell className="size-4 shrink-0" />
          <span>Força &amp; 1RM</span>
        </button>

        <button
          type="button"
          role="tab"
          id={bodyTabId}
          aria-selected={activeTab === "body"}
          onClick={() => setActiveTab("body")}
          className="relative flex flex-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)] aria-selected:text-[var(--sm-brand)] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:border-b-[3px] aria-selected:after:border-[var(--sm-brand)]"
        >
          <Scale className="size-4 shrink-0" />
          <span>Composição &amp; Perímetros</span>
        </button>

        <button
          type="button"
          role="tab"
          id={compareTabId}
          aria-selected={activeTab === "compare"}
          onClick={() => setActiveTab("compare")}
          className="relative flex flex-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sm-muted)] transition-colors hover:text-[var(--sm-ink)] aria-selected:text-[var(--sm-brand)] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:bottom-0 aria-selected:after:border-b-[3px] aria-selected:after:border-[var(--sm-brand)]"
        >
          <Columns className="size-4 shrink-0" />
          <span>Comparativo Lado a Lado</span>
        </button>
      </div>

      {/* Painel 1: Força & 1RM */}
      <div
        role="tabpanel"
        aria-labelledby={strengthTabId}
        hidden={activeTab !== "strength"}
      >
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  Agachamento 1RM
                </p>
                {formatDeltaBadge(evolution.squat1RMDelta, "kg")}
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastSquat1RM !== null ? `${evolution.lastSquat1RM} kg` : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--sm-muted)]">
                {evolution.latestRelativeSquat !== null
                  ? `Força relativa: ${evolution.latestRelativeSquat}x peso corporal`
                  : "Sem peso corporal associado para força relativa"}
              </p>
            </div>

            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  Levantamento Terra 1RM
                </p>
                {formatDeltaBadge(evolution.deadlift1RMDelta, "kg")}
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastDeadlift1RM !== null
                  ? `${evolution.lastDeadlift1RM} kg`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--sm-muted)]">
                {evolution.latestRelativeDeadlift !== null
                  ? `Força relativa: ${evolution.latestRelativeDeadlift}x peso corporal`
                  : "Sem peso corporal associado para força relativa"}
              </p>
            </div>

            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  Supino 1RM
                </p>
                {formatDeltaBadge(evolution.bench1RMDelta, "kg")}
              </div>
              <p className="mt-2 text-2xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastBench1RM !== null ? `${evolution.lastBench1RM} kg` : "—"}
              </p>
              <p className="mt-1 text-xs text-[var(--sm-muted)]">
                {evolution.latestRelativeBench !== null
                  ? `Força relativa: ${evolution.latestRelativeBench}x peso corporal`
                  : "Sem peso corporal associado para força relativa"}
              </p>
            </div>
          </div>

          {!evolution.has1RMData ? (
            <div className="rounded-[var(--sm-radius-md)] border border-dashed border-[var(--sm-border)] p-8 text-center">
              <p className="text-sm font-semibold text-[var(--sm-ink)]">
                Nenhum registro de 1RM informado para este aluno
              </p>
              <p className="mt-1 text-xs text-[var(--sm-muted)]">
                Registre o 1RM de Supino, Agachamento ou Terra em uma avaliação física para acompanhar a progressão de força.
              </p>
            </div>
          ) : !hasMultiple ? (
            <p className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface-muted)] p-4 text-xs text-[var(--sm-muted)]">
              Há apenas 1 avaliação registrada. Registre uma nova avaliação para traçar a curva longitudinal de força.
            </p>
          ) : (
            <div className="h-[300px] w-full rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={assessments}
                  margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="formattedDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    name="Agachamento 1RM (kg)"
                    dataKey="squat1RM"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    name="Terra 1RM (kg)"
                    dataKey="deadlift1RM"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    name="Supino 1RM (kg)"
                    dataKey="benchPress1RM"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Painel 2: Composição & Perímetros */}
      <div
        role="tabpanel"
        aria-labelledby={bodyTabId}
        hidden={activeTab !== "body"}
      >
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  Peso Corporal
                </p>
                {formatDeltaBadge(evolution.weightDelta, "kg")}
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastWeight !== null ? `${evolution.lastWeight} kg` : "—"}
              </p>
            </div>

            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  % Gordura
                </p>
                {formatDeltaBadge(evolution.bodyFatDelta, "%", true)}
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastBodyFat !== null ? `${evolution.lastBodyFat}%` : "—"}
              </p>
            </div>

            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  Cintura / Quadril
                </p>
                {formatDeltaBadge(evolution.waistDelta, "cm", true)}
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastWaist !== null ? `${evolution.lastWaist} cm` : "—"}
                {" / "}
                {evolution.lastHips !== null ? `${evolution.lastHips} cm` : "—"}
              </p>
            </div>

            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                  Soma 7 Dobras
                </p>
                {formatDeltaBadge(evolution.skinfoldSumDelta, "mm", true)}
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-[var(--sm-ink)]">
                {evolution.lastSkinfoldSum !== null
                  ? `${evolution.lastSkinfoldSum} mm`
                  : "—"}
              </p>
            </div>
          </div>

          {hasMultiple && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-4">
                <h3 className="text-sm font-bold text-[var(--sm-ink)]">
                  Curva de Peso (kg) &amp; Gordura Corporal (%)
                </h3>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={assessments}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        name="Peso (kg)"
                        dataKey="weight"
                        stroke="#0f172a"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        name="Gordura (%)"
                        dataKey="bodyFat"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--sm-ink)]">
                    <Ruler className="size-4 text-[var(--sm-brand)]" />
                    Perímetros Corporais (cm)
                  </h3>
                  <div className="flex items-center gap-1 rounded-md bg-[var(--sm-surface-muted)] p-0.5">
                    {(
                      [
                        ["lower", "Quadril & Coxa"],
                        ["core", "Cintura & Abdômen"],
                        ["upper", "Tórax & Braço"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCircumferenceGroup(key)}
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                          circumferenceGroup === key
                            ? "bg-[var(--sm-surface)] text-[var(--sm-brand)] shadow-xs"
                            : "text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={assessments}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                      {circumferenceGroup === "lower" && (
                        <>
                          <Line
                            type="monotone"
                            name="Quadril (cm)"
                            dataKey="hips"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            name="Coxa Direita (cm)"
                            dataKey="thighRight"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            name="Panturrilha Direita (cm)"
                            dataKey="calfRight"
                            stroke="#7c3aed"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </>
                      )}
                      {circumferenceGroup === "core" && (
                        <>
                          <Line
                            type="monotone"
                            name="Cintura (cm)"
                            dataKey="waist"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            name="Abdômen (cm)"
                            dataKey="abdomen"
                            stroke="#e11d48"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                        </>
                      )}
                      {circumferenceGroup === "upper" && (
                        <>
                          <Line
                            type="monotone"
                            name="Tórax (cm)"
                            dataKey="thorax"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            name="Braço Direito (cm)"
                            dataKey="armRight"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            connectNulls
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Painel 3: Comparativo Lado a Lado */}
      <div
        role="tabpanel"
        aria-labelledby={compareTabId}
        hidden={activeTab !== "compare"}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[var(--sm-ink)]">
                <span>Avaliação A (Base):</span>
                <select
                  aria-label="Selecionar Avaliação A"
                  value={selectedFirst?.id ?? ""}
                  onChange={(e) => setFirstId(e.target.value)}
                  className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--sm-ink)]"
                >
                  {assessments.map((a, idx) => (
                    <option key={a.id} value={a.id}>
                      #{idx + 1} · {formatFullDate(a.date)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-[var(--sm-ink)]">
                <span>Avaliação B (Comparada):</span>
                <select
                  aria-label="Selecionar Avaliação B"
                  value={selectedSecond?.id ?? ""}
                  onChange={(e) => setSecondId(e.target.value)}
                  className="rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--sm-ink)]"
                >
                  {assessments.map((a, idx) => (
                    <option key={a.id} value={a.id}>
                      #{idx + 1} · {formatFullDate(a.date)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              Imprimir Comparativo Selecionado
            </Button>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby={captionId}
            className="max-h-[460px] max-w-full overflow-auto rounded-[var(--sm-radius-md)] border border-[var(--sm-border)]"
          >
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <caption id={captionId} className="sr-only">
                Comparativo de medidas de {evolution.clientName}
              </caption>
              <thead className="sticky top-0 z-10 bg-[var(--sm-surface-muted)] text-xs font-bold uppercase tracking-wider text-[var(--sm-muted)]">
                <tr>
                  <th scope="col" className="border-b border-[var(--sm-border)] px-4 py-3">
                    Medida
                  </th>
                  <th scope="col" className="border-b border-[var(--sm-border)] px-4 py-3">
                    Categoria
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--sm-border)] px-4 py-3 text-right"
                  >
                    {selectedFirst ? formatFullDate(selectedFirst.date) : "Avaliação A"}
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--sm-border)] px-4 py-3 text-right"
                  >
                    {selectedSecond ? formatFullDate(selectedSecond.date) : "Avaliação B"}
                  </th>
                  <th
                    scope="col"
                    className="border-b border-[var(--sm-border)] px-4 py-3 text-right"
                  >
                    Diferença (Δ)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sm-border)]">
                {comparisonRows.map((row) => (
                  <tr key={row.field} className="hover:bg-[var(--sm-canvas)]">
                    <th
                      scope="row"
                      className="sticky left-0 bg-[var(--sm-surface)] px-4 py-2.5 font-semibold text-[var(--sm-ink)]"
                    >
                      {row.label}
                    </th>
                    <td className="px-4 py-2.5 text-xs text-[var(--sm-muted)]">
                      {row.groupTitle}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-[var(--sm-ink)]">
                      {row.firstValue !== null ? `${row.firstValue} ${row.unit}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[var(--sm-ink)]">
                      {row.secondValue !== null ? `${row.secondValue} ${row.unit}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatDeltaBadge(
                        row.delta,
                        row.unit,
                        row.field === "bodyFat" ||
                          row.field === "waist" ||
                          row.field === "abdomen" ||
                          row.field.startsWith("skinfold"),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
