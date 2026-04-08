"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function ResilienceChart({ workouts }: { workouts: any[] }) {
  if (!workouts || workouts.length === 0) return null;

  // Processamos os dados agora incluindo o PESO (weight)
  const chartData = [...workouts]
    .slice(0, 7)
    .reverse()
    .map((w) => ({
      date: new Date(w.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      sleep: w.sleepHours || 0,
      mood: w.moodLevel || 0,
      weight: w.weight || null, // Pegamos o peso, se existir
    }));

  const sonoConfig = { sleep: { label: "Horas de Sono", color: "#0d9488" } }
  const humorConfig = { mood: { label: "Nível de Humor", color: "#2563eb" } }
  const pesoConfig = { weight: { label: "Peso (kg)", color: "#f59e0b" } } // Âmbar para o Peso

  // Mudamos para grid-cols-3 para caberem os três gráficos lado a lado!
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      
      {/* 📊 GRÁFICO 1: TENDÊNCIA DE SONO */}
      <Card className="border-0 bg-white/90 backdrop-blur shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-slate-800">Sono</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={sonoConfig} className="min-h-[180px] w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="fillSleep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sleep)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-sleep)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="sleep" stroke="var(--color-sleep)" fill="url(#fillSleep)" fillOpacity={1} strokeWidth={2} connectNulls />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 😫 GRÁFICO 2: EVOLUÇÃO DO HUMOR */}
      <Card className="border-0 bg-white/90 backdrop-blur shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-slate-800">Humor</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={humorConfig} className="min-h-[180px] w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="fillMood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-mood)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-mood)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="mood" stroke="var(--color-mood)" fill="url(#fillMood)" fillOpacity={1} strokeWidth={2} connectNulls />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ⚖️ GRÁFICO 3: EVOLUÇÃO DE PESO (NOVO!) */}
      <Card className="border-0 bg-white/90 backdrop-blur shadow-sm border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-slate-800">Peso (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={pesoConfig} className="min-h-[180px] w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-weight)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-weight)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              {/* Domain 'dataMin - 2' faz o gráfico focar só na variação do peso, e não começar do zero! */}
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 2', 'dataMax + 2']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="weight" stroke="var(--color-weight)" fill="url(#fillWeight)" fillOpacity={1} strokeWidth={2} connectNulls />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  )
}