"use client"

import { useState } from "react"
import { useMealLogs } from "@/hooks/features/useMealLogs"
import { MEAL_LOG_CONFIG } from "@/hooks/features/useMealLog"
import { Apple, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Clock, TrendingUp } from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from "recharts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  })
}

function StatusIcon({ status }: { status: string }) {
  if (status === "FOLLOWED") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (status === "SUBSTITUTED") return <RefreshCw className="w-4 h-4 text-amber-500" />
  return <XCircle className="w-4 h-4 text-rose-500" />
}

// ─── Painel Principal ─────────────────────────────────────────────────────────

export function MealLogsPanel({ patientId }: { patientId: string }) {
  const { logs, stats, loading, error } = useMealLogs(patientId)
  const [showAll, setShowAll] = useState(false)

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
      <p className="text-sm font-medium">Carregando histórico de refeições...</p>
    </div>
  )

  if (error) return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-center gap-4">
      <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
      <p className="text-sm text-rose-700 font-medium">{error}</p>
    </div>
  )

  if (logs.length === 0) return (
    <div className="text-center py-20 text-slate-400">
      <Apple className="w-12 h-12 mx-auto mb-3 text-slate-200" />
      <p className="font-bold text-slate-500">Nenhuma refeição registrada ainda.</p>
      <p className="text-sm mt-1">Quando o paciente registrar as refeições, elas aparecerão aqui.</p>
    </div>
  )

  const pieData = [
    { name: "Seguiu o plano", value: stats?.followedPct ?? 0, color: "#10b981" },
    { name: "Substituiu", value: stats?.substitutedPct ?? 0, color: "#f59e0b" },
    { name: "Pulou", value: stats?.skippedPct ?? 0, color: "#f43f5e" },
  ].filter(d => d.value > 0)

  const visibleLogs = showAll ? logs : logs.slice(0, 10)

  return (
    <div className="space-y-8">

      {/* ── Cards de Métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Apple className="w-5 h-5 text-teal-600" />,
            bg: "bg-teal-50",
            label: "Total Registrado",
            value: stats?.total ?? 0,
            unit: "logs"
          },
          {
            icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
            bg: "bg-emerald-50",
            label: "Adesão esta Semana",
            value: `${stats?.weekAdherencePct ?? 0}%`,
            unit: ""
          },
          {
            icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
            bg: "bg-blue-50",
            label: "Seguiu o Plano",
            value: `${stats?.followedPct ?? 0}%`,
            unit: ""
          },
          {
            icon: <XCircle className="w-5 h-5 text-rose-600" />,
            bg: "bg-rose-50",
            label: "Refeições Puladas",
            value: `${stats?.skippedPct ?? 0}%`,
            unit: ""
          },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-black text-slate-800">
              {card.value}<span className="text-sm font-bold text-slate-400 ml-1">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ── Gráfico + Breakdown por refeição ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Donut de adesão */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            Distribuição de Adesão
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`${v}%`]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela por refeição */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Apple className="w-4 h-4 text-teal-500" />
            Adesão por Refeição
          </h3>
          <div className="space-y-3">
            {Object.entries(stats?.byMeal ?? {}).map(([mealName, data]) => {
              const adherencePct = data.total > 0
                ? Math.round(((data.followed + data.substituted) / data.total) * 100)
                : 0
              return (
                <div key={mealName}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-700">{mealName}</span>
                    <span className={`text-xs font-black ${adherencePct >= 80 ? "text-emerald-600" : adherencePct >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {adherencePct}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${adherencePct >= 80 ? "bg-emerald-500" : adherencePct >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                      style={{ width: `${adherencePct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {data.total} registros · {data.skipped} pulados
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Histórico Cronológico ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-black text-slate-700 text-sm">Histórico Cronológico</h3>
          <span className="text-xs text-slate-400">({logs.length} registros)</span>
        </div>
        <div className="divide-y divide-slate-50">
          {visibleLogs.map(log => {
            const cfg = MEAL_LOG_CONFIG[log.status]
            return (
              <div key={log.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className={`p-1.5 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                  <StatusIcon status={log.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{log.meal.name}</p>
                  {log.notes && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{log.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-black ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(log.loggedAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
        {logs.length > 10 && (
          <div className="px-6 py-4 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowAll(prev => !prev)}
              className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              {showAll ? "Mostrar menos" : `Ver todos os ${logs.length} registros`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
