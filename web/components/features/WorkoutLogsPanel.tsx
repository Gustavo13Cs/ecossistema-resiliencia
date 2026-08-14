"use client"

import { useState } from "react"
import { useWorkoutLogs } from "@/hooks/features/useWorkoutLogs"
import { api } from "@/lib/api"
import { useEffect } from "react"
import {
  Dumbbell, Flame, TrendingUp, CalendarDays, ChevronDown, ChevronUp,
  BarChart2, Activity, AlertTriangle, Clock
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

type ExerciseProgressPoint = { date: Date; maxWeight: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function PseIndicator({ pse }: { pse: number | null }) {
  if (pse == null) return <span className="text-slate-400 text-xs">—</span>
  const color =
    pse >= 8 ? "text-rose-600 bg-rose-50 border-rose-200" :
    pse >= 5 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-emerald-600 bg-emerald-50 border-emerald-200"
  return (
    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${color}`}>
      PSE {pse}/10
    </span>
  )
}

// ─── Gráfico de Evolução ──────────────────────────────────────────────────────

function ExerciseProgressChart({ patientId, exerciseId, exerciseName }: {
  patientId: string
  exerciseId: string
  exerciseName: string
}) {
  const [data, setData] = useState<ExerciseProgressPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/workout-logs/exercise/${exerciseId}/progress/${patientId}`)
      .then(res => setData(res.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [exerciseId, patientId])

  if (loading) return (
    <div className="h-40 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  if (data.length < 2) return (
    <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
      <BarChart2 className="w-8 h-8 text-slate-200" />
      <p className="text-xs font-medium">Dados insuficientes para gráfico (mínimo 2 sessões)</p>
    </div>
  )

  const chartData = data.map(p => ({
    date: new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    peso: p.maxWeight,
  }))

  return (
    <div>
      <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
        {exerciseName} — evolução de carga (kg)
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="kg" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(v) => [`${v} kg`, "Peso máx."]}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Painel Principal ─────────────────────────────────────────────────────────

export function WorkoutLogsPanel({ patientId }: { patientId: string }) {
  const { logs, metrics, loading, error } = useWorkoutLogs(patientId)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null)

  // Coleta todos os exercícios únicos dos logs para o dropdown do gráfico
  const allExercises = Array.from(
    new Map(
      logs.flatMap(l => l.sets.map(s => ({ id: s.exercise.name, name: s.exercise.name })))
        .map(e => [e.name, e])
    ).values()
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      <p className="text-sm font-medium">Carregando histórico de treinos...</p>
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
      <Dumbbell className="w-12 h-12 mx-auto mb-3 text-slate-200" />
      <p className="font-bold text-slate-500">Nenhum treino registrado ainda.</p>
      <p className="text-sm mt-1">Quando o paciente registrar sessões, elas aparecerão aqui.</p>
    </div>
  )

  return (
    <div className="space-y-8">

      {/* ── Métricas Resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Dumbbell className="w-5 h-5 text-blue-600" />,
            bg: "bg-blue-50",
            label: "Total de Sessões",
            value: metrics?.totalSessions ?? 0,
            unit: "treinos"
          },
          {
            icon: <CalendarDays className="w-5 h-5 text-indigo-600" />,
            bg: "bg-indigo-50",
            label: "Esta Semana",
            value: metrics?.weekSessions ?? 0,
            unit: "sessões"
          },
          {
            icon: <Activity className="w-5 h-5 text-amber-600" />,
            bg: "bg-amber-50",
            label: "PSE Médio",
            value: metrics?.avgPse ?? "—",
            unit: metrics?.avgPse ? "/10" : ""
          },
          {
            icon: <Flame className="w-5 h-5 text-rose-600" />,
            bg: "bg-rose-50",
            label: "Sequência Atual",
            value: metrics?.streak ?? 0,
            unit: "dias"
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

      {/* ── Gráfico de Evolução de Carga ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h3 className="font-black text-slate-800">Evolução de Carga</h3>
          </div>
          <select
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedExercise?.name ?? ""}
            onChange={e => {
              const ex = allExercises.find(x => x.name === e.target.value)
              setSelectedExercise(ex ?? null)
            }}
          >
            <option value="">Selecione um exercício...</option>
            {allExercises.map(ex => (
              <option key={ex.id} value={ex.name}>{ex.name}</option>
            ))}
          </select>
        </div>
        {selectedExercise ? (
          <ExerciseProgressChart
            patientId={patientId}
            exerciseId={selectedExercise.id}
            exerciseName={selectedExercise.name}
          />
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
            <BarChart2 className="w-10 h-10 text-slate-200" />
            <p className="text-sm font-medium">Selecione um exercício para ver a evolução de carga</p>
          </div>
        )}
      </div>

      {/* ── Histórico de Sessões ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-black text-slate-700 text-sm">Histórico de Sessões</h3>
          <span className="text-xs text-slate-400">(últimas {logs.length})</span>
        </div>
        <div className="divide-y divide-slate-50">
          {logs.map(log => {
            const isOpen = expandedLog === log.id
            return (
              <div key={log.id}>
                <button
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setExpandedLog(isOpen ? null : log.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-xl">
                      <Dumbbell className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{log.split.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.workout.title}{log.split.focus ? ` · ${log.split.focus}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400 font-medium">{formatDate(log.executedAt)}</span>
                    <PseIndicator pse={log.pse} />
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 bg-slate-50/50">
                    {log.notes && (
                      <p className="text-xs text-slate-500 mb-3 p-3 bg-white rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-600">Obs:</span> {log.notes}
                      </p>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                            <th className="text-left pb-2">Exercício</th>
                            <th className="text-center pb-2">Série</th>
                            <th className="text-center pb-2">Reps</th>
                            <th className="text-right pb-2">Carga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {log.sets.map((s, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                              <td className="py-2 font-medium text-slate-700">{s.exercise.name}</td>
                              <td className="py-2 text-center text-slate-500">#{s.setNumber}</td>
                              <td className="py-2 text-center font-bold text-blue-600">{s.repsActual}</td>
                              <td className="py-2 text-right">
                                {s.weightKg != null
                                  ? <span className="font-black text-slate-800">{s.weightKg} kg</span>
                                  : <span className="text-slate-400 text-xs">Peso corporal</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
