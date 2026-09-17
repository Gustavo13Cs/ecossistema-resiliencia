"use client"

import React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, UserPlus, Target, PieChart, Users } from "lucide-react"
import { ClientGrowthMetrics } from "@/types/management-reports"

interface ClientGrowthChartProps {
  growth: ClientGrowthMetrics
}

export const ClientGrowthChart: React.FC<ClientGrowthChartProps> = ({ growth }) => {
  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Crescimento da Base Privada de Clientes
            </h3>
            <p className="text-xs text-muted-foreground">
              Evolução da captação de pacientes e segmentação por objetivos clínicos
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-muted-foreground block uppercase font-medium">
            Novos no Período
          </span>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            +{growth.netNewClients} pacientes ({growth.growthRatePercent}%)
          </span>
        </div>
      </div>

      {/* Two sub sections: Growth trend curve + Goals distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-7 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Evolução Acumulada da Base Privada
          </h4>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growth.growthHistory}
                margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
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
                          <div className="text-foreground">
                            Total de Pacientes: <strong>{payload[0].value}</strong>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalClients"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#growthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goals breakdown */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Distribuição por Objetivo Clínico
          </h4>

          <div className="space-y-2.5">
            {growth.goalDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{item.label}</span>
                  <span className="font-bold text-foreground">
                    {item.percent}%{" "}
                    <span className="text-muted-foreground font-normal">
                      ({item.count})
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
