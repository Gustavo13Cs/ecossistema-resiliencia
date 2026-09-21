"use client"

import React, { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import {
  TrendingUp,
  Activity,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { CLINICAL_MARKERS_DICTIONARY, MarkerReference, ClientOption } from "@/types/lab-exam"

interface LongitudinalMarkerChartProps {
  clients: ClientOption[]
  allAvailableMarkers: string[]
  getMarkerLongitudinalSeries: (markerName: string, clientId?: string) => any[]
  selectedClientId?: string
  onClientSelect?: (clientId: string) => void
}

export const LongitudinalMarkerChart: React.FC<LongitudinalMarkerChartProps> = ({
  clients,
  allAvailableMarkers,
  getMarkerLongitudinalSeries,
  selectedClientId = "ALL",
  onClientSelect,
}) => {
  const [selectedMarker, setSelectedMarker] = useState<string>("Glicemia de Jejum")
  const [internalClientId, setInternalClientId] = useState<string>(selectedClientId)

  // Synchronize when outer prop changes
  React.useEffect(() => {
    setInternalClientId(selectedClientId)
  }, [selectedClientId])

  const markerRef: MarkerReference | undefined = CLINICAL_MARKERS_DICTIONARY[selectedMarker]

  const activeClientId = internalClientId === "ALL" ? undefined : internalClientId
  const dataSeries = useMemo(() => {
    return getMarkerLongitudinalSeries(selectedMarker, activeClientId)
  }, [getMarkerLongitudinalSeries, selectedMarker, activeClientId])

  const clientName = useMemo(() => {
    if (!activeClientId) return "Todos os clientes com registro"
    const found = clients.find((c) => c.id === activeClientId)
    return found ? found.name : "Cliente Selecionado"
  }, [clients, activeClientId])

  // Trend calculation
  const trend = useMemo(() => {
    if (dataSeries.length < 2) return null
    const first = dataSeries[0].value
    const last = dataSeries[dataSeries.length - 1].value
    const diff = last - first
    const percent = first !== 0 ? Math.round((diff / first) * 100) : 0
    return {
      diff: Number(diff.toFixed(1)),
      percent,
      isRising: diff > 0,
      isFalling: diff < 0,
    }
  }, [dataSeries])

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-6">
      {/* Top Filter bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Comparativo Longitudinal de Biomarcadores
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhamento temporal da evolução bioquímica frente às metas nutricionais
            </p>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Client selector */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1.5 border border-border/60 text-xs">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={internalClientId}
              onChange={(e) => {
                const val = e.target.value
                setInternalClientId(val)
                if (onClientSelect) onClientSelect(val)
              }}
              className="bg-transparent border-none text-foreground font-medium text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos os Pacientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Marker selector */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1.5 border border-border/60 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedMarker}
              onChange={(e) => setSelectedMarker(e.target.value)}
              className="bg-transparent border-none text-foreground font-semibold text-xs focus:outline-hidden cursor-pointer max-w-[200px]"
            >
              {allAvailableMarkers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reference Card / Legend banner */}
      <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 font-medium text-foreground">
              <span>{selectedMarker}</span>
              {markerRef && (
                <span className="text-muted-foreground font-normal">
                  ({markerRef.unit}) • Categoria: <span className="font-semibold text-foreground">{markerRef.category}</span>
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5">
              {markerRef?.interpretation || "Valores de referência clínicos padronizados."}
            </p>
          </div>
        </div>

        {/* Reference boundaries preview */}
        {markerRef && (
          <div className="flex items-center gap-3 shrink-0 text-muted-foreground font-medium">
            {markerRef.optimalMin !== undefined && markerRef.optimalMax !== undefined && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>
                  Ótimo: {markerRef.optimalMin} - {markerRef.optimalMax} {markerRef.unit}
                </span>
              </div>
            )}
            {markerRef.max !== undefined && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>
                  Limite Sup: {markerRef.max} {markerRef.unit}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80">
        {dataSeries.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-muted/20">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">
              Nenhum dado registrado para &quot;{selectedMarker}&quot;
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Cadastre um novo laudo de exame para {clientName} para visualizar a evolução temporal deste marcador.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dataSeries}
              margin={{ top: 15, right: 25, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                domain={["auto", "auto"]}
                unit={markerRef ? ` ${markerRef.unit}` : ""}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                        <div className="font-semibold text-popover-foreground flex items-center justify-between gap-3">
                          <span>{d.clientName}</span>
                          <span className="text-muted-foreground font-normal">{d.displayDate}</span>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {selectedMarker}: {d.value} {d.unit}
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          {d.status === "OPTIMAL" && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Nível Ótimo
                            </span>
                          )}
                          {d.status === "BORDERLINE" && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <AlertTriangle className="h-3 w-3" /> Limítrofe / Atenção
                            </span>
                          )}
                          {d.status === "ALERT" && (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                              <AlertTriangle className="h-3 w-3" /> Fora da Faixa / Alerta
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />

              {/* Threshold Lines */}
              {markerRef?.optimalMax && (
                <ReferenceLine
                  y={markerRef.optimalMax}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: `Ótimo (${markerRef.optimalMax})`,
                    fill: "#10b981",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              )}
              {markerRef?.max && (
                <ReferenceLine
                  y={markerRef.max}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Limite Sup (${markerRef.max})`,
                    fill: "#f59e0b",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="value"
                name={selectedMarker}
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  let fill = "#10b981"
                  if (payload.status === "BORDERLINE") fill = "#f59e0b"
                  if (payload.status === "ALERT") fill = "#ef4444"
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={fill}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )
                }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Historical summary points */}
      {dataSeries.length > 0 && (
        <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Total de registros analisados:</span>
            <span className="font-semibold text-foreground">{dataSeries.length} laudos</span>
            {trend && (
              <span
                className={`ml-2 inline-flex items-center gap-0.5 font-medium ${
                  trend.isFalling
                    ? "text-emerald-600 dark:text-emerald-400"
                    : trend.isRising
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {trend.isRising ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                Variação: {trend.diff > 0 ? `+${trend.diff}` : trend.diff} ({trend.percent}%)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ótimo
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Limítrofe
            </span>
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Alerta
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
