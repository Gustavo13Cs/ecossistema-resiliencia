"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

interface MacroChartItem { name: string; value: number; color: string }

export default function MacroDistributionChart({ data }: { data: MacroChartItem[] }) {
  return <section className="h-48 w-full max-w-[250px]" aria-label="Distribuição de macronutrientes"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} stroke="none">{data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => `${value.toFixed(1)} Kcal`} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} /></PieChart></ResponsiveContainer></section>
}
