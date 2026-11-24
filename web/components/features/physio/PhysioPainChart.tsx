"use client"

import { useState } from "react"
import { BarChart2, LayoutGrid, TrendingDown } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PhysioPainPoint } from "@/types/physio"

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date)
}

function formatFullDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function PhysioPainChart({
  painSeries,
}: {
  painSeries: readonly PhysioPainPoint[]
}) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")

  const chartData = painSeries.map((point) => ({
    ...point,
    formattedDate: formatShortDate(point.date),
  }))

  return (
    <section
      aria-labelledby="physio-pain-chart-heading"
      className="min-w-0 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingDown aria-hidden="true" className="size-5 text-[var(--sm-brand)]" />
          <h3
            id="physio-pain-chart-heading"
            className="text-lg font-bold text-[var(--sm-ink)]"
          >
            Evolução da dor (EVA)
          </h3>
        </div>

        {painSeries.length > 0 ? (
          <div
            role="group"
            aria-label="Modo de visualização da dor"
            className="inline-flex rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-canvas)] p-1"
          >
            <button
              type="button"
              aria-pressed={viewMode === "chart"}
              onClick={() => setViewMode("chart")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-[var(--sm-radius-sm)] px-3 text-sm font-semibold ${
                viewMode === "chart"
                  ? "bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                  : "text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
              }`}
            >
              <BarChart2 aria-hidden="true" className="size-4" />
              Gráfico
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              onClick={() => setViewMode("table")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-[var(--sm-radius-sm)] px-3 text-sm font-semibold ${
                viewMode === "table"
                  ? "bg-[var(--sm-brand)] text-[var(--sm-on-brand)]"
                  : "text-[var(--sm-ink)] hover:bg-[var(--sm-subtle-hover)]"
              }`}
            >
              <LayoutGrid aria-hidden="true" className="size-4" />
              Tabela
            </button>
          </div>
        ) : null}
      </div>

      {painSeries.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--sm-muted)]">
          Nenhum registro de dor (EVA) informado em avaliações ou evoluções.
        </p>
      ) : viewMode === "chart" ? (
        <div className="mt-4 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
                dy={8}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ paddingTop: "12px" }} />
              <Line
                type="monotone"
                name="Dor na avaliação"
                dataKey="painLevel"
                stroke="#6d28d9"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                name="Dor pré-sessão"
                dataKey="painBefore"
                stroke="#d97706"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
              <Line
                type="monotone"
                name="Dor pós-sessão"
                dataKey="painAfter"
                stroke="#0f766e"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>EVA Avaliação</TableHead>
                <TableHead>EVA Pré-sessão</TableHead>
                <TableHead>EVA Pós-sessão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {painSeries.map((point) => (
                <TableRow key={`${point.source}:${point.id}`}>
                  <TableCell className="font-medium text-[var(--sm-ink)]">
                    {formatFullDate(point.date)}
                  </TableCell>
                  <TableCell>
                    {point.source === "ASSESSMENT" ? "Avaliação" : "Sessão"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {point.painLevel != null ? `${point.painLevel}/10` : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {point.painBefore != null ? `${point.painBefore}/10` : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {point.painAfter != null ? `${point.painAfter}/10` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
