"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, LayoutGrid, BarChart2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useClientAssessments } from "@/hooks/features/useClientAssessments"
import { AsyncState } from "@/components/feedback/AsyncState"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface BodyCompositionChartProps {
  clientId: string
  onNewAssessment: () => void
}

export function BodyCompositionChart({ clientId, onNewAssessment }: BodyCompositionChartProps) {
  const { assessments, loading, error } = useClientAssessments(clientId)
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)]">
        <AsyncState kind="loading" title="Carregando avaliações" description="Buscando histórico de composição corporal..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center rounded-[var(--sm-radius-lg)] border border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)]">
        <AsyncState kind="error" title="Erro ao carregar" description="Não foi possível carregar as avaliações." />
      </div>
    )
  }

  // Format data for chart
  const chartData = assessments.map(a => ({
    ...a,
    formattedDate: new Date(a.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
  }))

  return (
    <div className="rounded-[var(--sm-radius-lg)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold">Composição Corporal</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "chart" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart2 className="w-4 h-4" /> Gráfico
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "table" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Tabela
            </button>
          </div>
          <Button 
            onClick={onNewAssessment}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-0"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Avaliar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-white min-h-[300px]">
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <TrendingUp className="w-12 h-12 mb-3 text-slate-200" />
            <p>Nenhuma avaliação registrada ainda.</p>
          </div>
        ) : viewMode === "chart" ? (
          <div className="h-[300px] w-full">
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
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  name="Peso (kg)"
                  dataKey="weight" 
                  stroke="#1e293b" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} 
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  name="Gordura (%)"
                  dataKey="bodyFat" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} 
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  name="Músculo (kg)"
                  dataKey="muscleMass" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} 
                  activeDot={{ r: 6 }} 
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Gordura (%)</TableHead>
                  <TableHead>Músculo (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-slate-700">
                      {new Date(a.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{a.weight ?? "-"}</TableCell>
                    <TableCell className="text-rose-600 font-medium">{a.bodyFat ? `${a.bodyFat}%` : "-"}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{a.muscleMass ?? "-"}</TableCell>
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
