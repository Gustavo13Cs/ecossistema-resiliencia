"use client"

import React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Calendar, TrendingUp, CheckCircle2, Clock, UserCheck } from "lucide-react"
import { AppointmentsVolumeMetrics } from "@/types/management-reports"

interface AppointmentsVolumeChartProps {
  appointments: AppointmentsVolumeMetrics
}

export const AppointmentsVolumeChart: React.FC<AppointmentsVolumeChartProps> = ({
  appointments,
}) => {
  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Volume de Atendimentos & Produtividade
            </h3>
            <p className="text-xs text-muted-foreground">
              Evolução temporal de consultas realizadas, agendamentos futuros e cancelamentos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground block uppercase font-medium">
              Taxa de Ocupação
            </span>
            <span className="text-base font-bold text-foreground">
              {appointments.capacityOccupancyPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Sub KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Primeiras Consultas
          </span>
          <div className="text-xl font-bold text-foreground mt-0.5">
            {appointments.initialConsultationsCount} consultas
          </div>
          <span className="text-[11px] text-muted-foreground">
            Entrada de novos pacientes
          </span>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Consultas de Retorno
          </span>
          <div className="text-xl font-bold text-foreground mt-0.5">
            {appointments.followUpsCount} retornos
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Acompanhamento contínuo
          </span>
        </div>

        <div className="rounded-lg bg-muted/40 p-3 border border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Média Semanal
          </span>
          <div className="text-xl font-bold text-foreground mt-0.5">
            ~{appointments.weeklyAverage} atendimentos
          </div>
          <span className="text-[11px] text-muted-foreground">
            Ritmo de atendimento do consultório
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={appointments.timeSeries}
            margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="periodLabel"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs space-y-1">
                      <div className="font-bold text-popover-foreground">{label}</div>
                      {payload.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                          <span style={{ color: entry.color }}>{entry.name}:</span>
                          <span className="font-bold">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(value) => {
                if (value === "completed") return "Consultas Concluídas"
                if (value === "scheduled") return "Agendadas"
                if (value === "canceled") return "Desmarcações"
                return value
              }}
            />
            <Bar dataKey="completed" name="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="scheduled" name="scheduled" fill="#0284c7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="canceled" name="canceled" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
