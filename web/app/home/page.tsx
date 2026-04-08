// web/app/home/page.tsx
"use client"

import { useEffect, useState } from "react"
import { SportSelector } from "@/components/sport-selector"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { ResilienceChart } from "@/components/resilience-chart"
import { useAuth } from "@/contexts/auth-context"

export default function HomePage() {
  const { user, logout } = useAuth()
  
  const [metrics, setMetrics] = useState({ totalWorkouts: 0, averageSleep: 0, averageMood: 0 })
  const [workouts, setWorkouts] = useState<any[]>([])

  const dashboardConfig: Record<string, any> = {
    PERSONAL_TRAINER: {
      theme: "blue",
      metric1: "Treinos Registados",
      tableTitleSelf: "O Meu Histórico de Treinos",
      tableTitleTeam: "Treinos Recentes dos Alunos",
      colMember: "Aluno",
      colActivity: "Atividade",
      colDuration: "Duração",
      colIntensity: "Intensidade",
      intensityLabels: { LEVE: "Leve", MODERADO: "Moderado", INTENSO: "Intenso" }
    },
    NUTRITIONIST: {
      theme: "teal",
      metric1: "Diários Registados",
      tableTitleSelf: "O Meu Diário Alimentar",
      tableTitleTeam: "Acompanhamento de Pacientes",
      colMember: "Paciente",
      colActivity: "Categoria",
      colDuration: "Copos de Água",
      colIntensity: "Adesão à Dieta",
      intensityLabels: { LEVE: "Saiu do Plano", MODERADO: "Deslizes", INTENSO: "100% no Foco" }
    },
    HR_CORPORATE: {
      theme: "indigo",
      metric1: "Check-ins de Saúde",
      tableTitleSelf: "Meu Histórico de Bem-estar",
      tableTitleTeam: "Termômetro da Equipa",
      colMember: "Colaborador",
      colActivity: "Foco do Dia",
      colDuration: "Pausas (min)",
      colIntensity: "Nível de Estresse",
      intensityLabels: { LEVE: "Tranquilo", MODERADO: "Gerenciável", INTENSO: "Alto Estresse" }
    }
  }

  const config = dashboardConfig[user?.businessContext || "PERSONAL_TRAINER"] || dashboardConfig["PERSONAL_TRAINER"]

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const metricsRes = await api.get("/metrics/dashboard")
        setMetrics(metricsRes.data)

        const historyRes = await api.get("/workouts")
        setWorkouts(historyRes.data)
      } catch (error) {
        console.error("Erro ao carregar dados", error)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 pb-12">
      <header className={`bg-white/80 backdrop-blur border-b border-${config.theme}-100 sticky top-0 z-50`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-2xl font-bold bg-gradient-to-r from-${config.theme}-600 to-${config.theme}-400 bg-clip-text text-transparent`}>
              SafeMove B2B
            </h1>
            <div className="flex items-center gap-3">
              {(user?.role === 'HR_MANAGER' || user?.role === 'ADMIN') && (
                <Button variant="outline" className={`text-${config.theme}-600 border-${config.theme}-200 hover:bg-${config.theme}-50`} asChild>
                  <a href="/membros">Gestão de Membros</a>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={logout} title="Sair">
                <LogOut className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-slate-800">
              Painel de Acompanhamento
            </h2>
            <p className="text-lg text-slate-600">Acompanhe as métricas diárias e a evolução dos registos.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className={`bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-${config.theme}-100`}>
              <div className={`text-3xl font-bold text-${config.theme}-600`}>{metrics.totalWorkouts}</div>
              <div className="text-sm font-medium text-slate-600 mt-1">{config.metric1}</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-slate-200">
              <div className="text-3xl font-bold text-slate-700">{metrics.averageSleep}h</div>
              <div className="text-sm font-medium text-slate-600 mt-1">Média de Sono</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-slate-200">
              <div className="text-3xl font-bold text-slate-700">{metrics.averageMood} <span className="text-lg text-slate-400">/ 5</span></div>
              <div className="text-sm font-medium text-slate-600 mt-1">Humor Geral</div>
            </div>
          </div>

          <SportSelector />

          <div className="mt-8">
            <ResilienceChart workouts={workouts} />
          </div>

          <div className={`mt-12 bg-white/90 backdrop-blur rounded-xl p-6 shadow-sm border border-${config.theme}-100`}>
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">
              {user?.role === 'EMPLOYEE' ? config.tableTitleSelf : config.tableTitleTeam}
            </h3>
            
            {workouts.length === 0 ? (
              <p className="text-slate-600 text-center py-6">Ainda não há registos. Faça o seu check-in acima!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {(user?.role === 'HR_MANAGER' || user?.role === 'ADMIN') && (
                        <TableHead className={`font-semibold text-${config.theme}-700`}>{config.colMember}</TableHead>
                      )}
                      <TableHead>{config.colActivity}</TableHead>
                      <TableHead>{config.colDuration}</TableHead>
                      <TableHead>{config.colIntensity}</TableHead>
                      <TableHead className="text-right">Sono / Humor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts.map((workout) => (
                      <TableRow key={workout.id}>
                        <TableCell className="font-medium text-slate-700">
                          {new Date(workout.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                        
                        {(user?.role === 'HR_MANAGER' || user?.role === 'ADMIN') && (
                          <TableCell className="font-semibold text-slate-800">
                            {workout.user?.name || "Desconhecido"}
                          </TableCell>
                        )}
                        
                        <TableCell className={`font-medium text-${config.theme}-600`}>{workout.activityType}</TableCell>
                        <TableCell className="text-slate-600">
                          {workout.durationMinutes} {config.theme === 'teal' ? '' : 'min'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border
                            ${workout.intensity === 'LEVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              workout.intensity === 'MODERADO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {config.intensityLabels[workout.intensity] || workout.intensity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {workout.sleepHours ? `${workout.sleepHours}h` : '-'} / {workout.moodLevel ? `Nível ${workout.moodLevel}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  )
}