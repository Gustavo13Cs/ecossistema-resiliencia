"use client"

import { useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { BarChart2, LayoutGrid, Plus, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ClientEvolution } from "@/hooks/features/useEvolution"

interface ClientEvolutionDetailProps {
  evolution: ClientEvolution
  onNewAssessment: (clientId: string) => void
  onViewRecord: (clientId: string) => void
  onClose: () => void
}

const CHART_COLORS = {
  weight: { stroke: "#0f172a", name: "Peso (kg)" },
  bodyFat: { stroke: "#ef4444", name: "Gordura (%)" },
  muscleMass: { stroke: "#10b981", name: "Músculo (kg)" },
} as const

export function ClientEvolutionDetail({
  evolution,
  onNewAssessment,
  onViewRecord,
  onClose,
}: ClientEvolutionDetailProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")

  const chartData = evolution.assessments.map((a) => ({
    ...a,
    formattedDate: new Date(a.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
  }))

  const hasMultiplePoints = evolution.assessmentCount > 1

  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-300 rounded-[var(--sm-radius-lg)] border border-[var(--sm-brand)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-elevated)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[var(--sm-border)] bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white">
            {evolution.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{evolution.clientName}</h3>
            <p className="text-xs text-slate-400">
              {evolution.assessmentCount} {evolution.assessmentCount === 1 ? "avaliação" : "avaliações"}
              {" · "}
              {new Date(evolution.firstDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              {hasMultiplePoints && (
                <>
                  {" → "}
                  {new Date(evolution.lastDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          {hasMultiplePoints && (
            <div className="flex items-center rounded-lg bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "chart"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BarChart2 className="size-3.5" /> Gráfico
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="size-3.5" /> Tabela
              </button>
            </div>
          )}

          <Button
            onClick={() => onNewAssessment(evolution.clientId)}
            size="sm"
            className="bg-emerald-500 text-white hover:bg-emerald-600 border-0"
          >
            <Plus className="size-3.5 mr-1.5" /> Avaliar
          </Button>
          <Button
            onClick={() => onViewRecord(evolution.clientId)}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Prontuário <ArrowRight className="size-3.5 ml-1.5" />
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

      {/* Content */}
      <div className="p-6">
        {!hasMultiplePoints ? (
          /* Single assessment — show summary instead of chart */
          <div className="text-center py-8">
            <p className="text-sm text-[var(--sm-muted)]">
              Apenas 1 avaliação registrada. Adicione mais avaliações para visualizar a evolução no gráfico.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-3">
                <p className="text-xs text-[var(--sm-muted)]">Peso</p>
                <p className="text-lg font-bold text-[var(--sm-ink)]">
                  {evolution.lastWeight != null ? `${evolution.lastWeight} kg` : "—"}
                </p>
              </div>
              <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-3">
                <p className="text-xs text-[var(--sm-muted)]">Gordura</p>
                <p className="text-lg font-bold text-rose-600">
                  {evolution.lastBodyFat != null ? `${evolution.lastBodyFat}%` : "—"}
                </p>
              </div>
              <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] p-3">
                <p className="text-xs text-[var(--sm-muted)]">Músculo</p>
                <p className="text-lg font-bold text-emerald-600">
                  {evolution.lastMuscleMass != null ? `${evolution.lastMuscleMass} kg` : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : viewMode === "chart" ? (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="formattedDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "16px", fontSize: "13px" }}
                />
                {Object.entries(CHART_COLORS).map(([key, config]) => (
                  <Line
                    key={key}
                    type="monotone"
                    name={config.name}
                    dataKey={key}
                    stroke={config.stroke}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-3">Data</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Gordura (%)</TableHead>
                  <TableHead>Músculo (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evolution.assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-[var(--sm-ink)]">
                      {new Date(a.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-bold">{a.weight ?? "—"}</TableCell>
                    <TableCell className="font-medium text-rose-600">
                      {a.bodyFat != null ? `${a.bodyFat}%` : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-emerald-600">
                      {a.muscleMass ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
