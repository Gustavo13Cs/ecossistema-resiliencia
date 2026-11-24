"use client"

import { useEffect, useMemo, useState } from "react"
import { isAxiosError } from "axios"
import { BarChart2, ClipboardCheck, LayoutGrid, Trash2 } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useDeletePhysioScale,
  usePhysioScales,
} from "@/hooks/features/usePhysioScales"
import { PHYSIO_SCALE_DEFINITIONS } from "@/lib/physio-scales"
import type { PhysioScaleType } from "@/types/physio"

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--sm-radius-sm)] px-4 py-2.5 text-sm font-bold text-[var(--sm-brand)] hover:bg-[var(--sm-subtle-hover)]"

function formatShortDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
      }).format(date)
}

function formatFullDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date)
}

export function PhysioFunctionalScalesSection({
  clientId,
  blocked,
  onOpenDialog,
  onAccessDenied,
}: {
  clientId: string
  blocked: boolean
  onOpenDialog: () => void
  onAccessDenied?: () => void
}) {
  const scalesQuery = usePhysioScales(clientId)
  const deleteScale = useDeletePhysioScale(clientId)

  const [filterType, setFilterType] = useState<PhysioScaleType | "ALL">("ALL")
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const denied =
    isAxiosError(scalesQuery.error) &&
    [401, 403].includes(scalesQuery.error.response?.status ?? 0)
  useEffect(() => {
    if (denied) {
      onAccessDenied?.()
    }
  }, [denied, onAccessDenied])

  const filtered = useMemo(() => {
    const items = scalesQuery.scales
    if (filterType === "ALL") return items
    return items.filter((item) => item.scaleType === filterType)
  }, [scalesQuery.scales, filterType])

  const chartData = useMemo(() => {
    return [...filtered]
      .sort(
        (a, b) =>
          Date.parse(a.evaluatedAt) - Date.parse(b.evaluatedAt),
      )
      .map((item) => ({
        id: item.id,
        dateLabel: formatShortDate(item.evaluatedAt),
        score: item.normalizedScore,
        rawLabel: `${item.rawScore}${item.scoreUnit}`,
        scale: PHYSIO_SCALE_DEFINITIONS[item.scaleType].shortName,
      }))
  }, [filtered])

  const handleDelete = async (id: string) => {
    try {
      await deleteScale.mutateAsync(id)
      setConfirmDeleteId(null)
      toast.success("Registro de escala removido.")
    } catch (error) {
      if (
        isAxiosError(error) &&
        [401, 403].includes(error.response?.status ?? 0)
      ) {
        onAccessDenied?.()
        return
      }
      toast.error("Não foi possível excluir a escala.")
    }
  }

  return (
    <section
      aria-labelledby="physio-scales-heading"
      className="min-w-0 space-y-4 border-t border-[var(--sm-border)] pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            aria-hidden="true"
            className="size-5 text-[var(--sm-brand)]"
          />
          <h3 id="physio-scales-heading" className="text-lg font-bold">
            Escalas funcionais padronizadas
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="physio-scales-filter" className="sr-only">
            Filtrar por escala funcional
          </label>
          <select
            id="physio-scales-filter"
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as PhysioScaleType | "ALL")
            }
            className="min-h-11 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm font-semibold text-[var(--sm-ink)]"
          >
            <option value="ALL">Todas as escalas</option>
            {(Object.keys(PHYSIO_SCALE_DEFINITIONS) as PhysioScaleType[]).map(
              (type) => (
                <option key={type} value={type}>
                  {PHYSIO_SCALE_DEFINITIONS[type].shortName}
                </option>
              ),
            )}
          </select>

          {filtered.length > 0 ? (
            <div
              role="group"
              aria-label="Modo de visualização das escalas"
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

          {!blocked ? (
            <button type="button" className={actionClass} onClick={onOpenDialog}>
              Nova escala
            </button>
          ) : null}
        </div>
      </div>

      {scalesQuery.isPending ? (
        <div
          role="status"
          aria-label="Carregando escalas funcionais"
          aria-busy="true"
          className="space-y-3 py-4"
        >
          <Skeleton aria-hidden="true" className="h-6 w-48" />
          <Skeleton aria-hidden="true" className="h-24 w-full" />
        </div>
      ) : scalesQuery.error ? (
        <AsyncState
          kind="error"
          title="Escalas indisponíveis"
          description="Não foi possível carregar as escalas funcionais deste paciente."
          action={
            <button
              type="button"
              className={actionClass}
              onClick={() => void scalesQuery.refetch()}
            >
              Tentar novamente as escalas
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--sm-muted)]">
          Nenhuma escala funcional aplicada para este filtro.
        </p>
      ) : (
        <div className="space-y-4">
          {viewMode === "chart" ? (
            <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4">
              <div className="h-[220px] w-full">
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
                      dataKey="dateLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#475569", fontSize: 12 }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      name="Índice normalizado / tempo"
                      dataKey="score"
                      stroke="#6d28d9"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Escala</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Classificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatFullDate(item.evaluatedAt)}</TableCell>
                      <TableCell className="font-semibold">
                        {PHYSIO_SCALE_DEFINITIONS[item.scaleType].shortName}
                      </TableCell>
                      <TableCell className="font-bold tabular-nums">
                        {item.rawScore}
                        {item.scoreUnit}
                      </TableCell>
                      <TableCell>{item.classification}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <ul
            aria-label="Lista de escalas funcionais aplicadas"
            className="space-y-3"
          >
            {filtered.map((item) => {
              const def = PHYSIO_SCALE_DEFINITIONS[item.scaleType]
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[var(--sm-ink)]">
                        {def.shortName}
                      </span>
                      <span className="rounded-full bg-[var(--sm-brand-subtle)] px-2.5 py-0.5 text-xs font-extrabold tabular-nums text-[var(--sm-brand)]">
                        {item.rawScore}
                        {item.scoreUnit}
                      </span>
                      <span className="text-xs font-semibold text-[var(--sm-ink)]">
                        {item.classification}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--sm-muted)]">
                      Aplicada em {formatFullDate(item.evaluatedAt)}
                    </p>
                    {item.notes ? (
                      <p className="text-sm text-[var(--sm-ink)]">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>

                  {!blocked ? (
                    confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="min-h-11"
                          disabled={deleteScale.isPending}
                          onClick={() => void handleDelete(item.id)}
                        >
                          Confirmar exclusão
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="min-h-11"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Excluir escala ${def.shortName} de ${formatFullDate(item.evaluatedAt)}`}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-[var(--sm-radius-sm)] px-3 text-xs font-bold text-[var(--sm-danger)] hover:bg-[var(--sm-danger-subtle)]"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                        Excluir
                      </button>
                    )
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
