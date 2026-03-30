"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function ResilienceChart({ workouts }: { workouts: any[] }) {
  const validWorkouts = workouts.filter(w => w.sleepHours || w.moodLevel);
  if (!validWorkouts || validWorkouts.length === 0) return null;

  const chartData = [...validWorkouts]
    .slice(0, 7)
    .reverse()
    .map((w) => ({
      date: new Date(w.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      sleep: w.sleepHours || 0,
      mood: w.moodLevel || 0,
    }));

  const chartConfig = {
    sleep: {
      label: "Horas de Sono",
      color: "#0d9488", // Teal-600
    },
    mood: {
      label: "Nível de Humor",
      color: "#2563eb", // Blue-600
    },
  }

  return (
    <Card className="border-0 bg-white/90 backdrop-blur shadow-sm border-blue-100">
      <CardHeader>
        <CardTitle className="text-xl text-slate-800">Evolução de Bem-Estar</CardTitle>
        <CardDescription>O seu sono e humor nos últimos 7 treinos registrados.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillSleep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sleep)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-sleep)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillMood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mood)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-mood)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b' }} />
            <YAxis tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: '#64748b' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="sleep" stroke="var(--color-sleep)" fillOpacity={1} fill="url(#fillSleep)" />
            <Area type="monotone" dataKey="mood" stroke="var(--color-mood)" fillOpacity={1} fill="url(#fillMood)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}