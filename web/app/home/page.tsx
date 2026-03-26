// web/app/home/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SportSelector } from "@/components/sport-selector"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"

export default function HomePage() {
  const router = useRouter()
  
  // Guardamos as métricas globais da empresa
  const [metrics, setMetrics] = useState({
    totalWorkouts: 0,
    averageSleep: 0,
    averageMood: 0
  })

  // Guardamos o histórico PESSOAL do utilizador
  const [workouts, setWorkouts] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth/login")
      return
    }

    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        
        // 1. Vai buscar as métricas gerais do RH
        const metricsRes = await api.get("/metrics/dashboard")
        setMetrics(metricsRes.data)

        // 2. Vai buscar o histórico PESSOAL do Carlos
        const historyRes = await api.get("/workouts")
        setWorkouts(historyRes.data)
        setWorkouts(historyRes.data)
        
      } catch (error) {
        handleSignOut()
      }
    }

    fetchDashboardData()
  }, [router])

  const handleSignOut = () => {
    localStorage.removeItem("token")
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 pb-12">
      <header className="bg-white/80 backdrop-blur border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              SafeMove B2B
            </h1>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
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
              Painel de Resiliência da Equipe
            </h2>
            <p className="text-lg text-slate-600">Confirme a saúde física e mental dos seus colaboradores hoje.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-blue-100">
              <div className="text-3xl font-bold text-blue-600">{metrics.totalWorkouts}</div>
              <div className="text-sm font-medium text-slate-600 mt-1">Treinos Registados</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-teal-100">
              <div className="text-3xl font-bold text-teal-600">{metrics.averageSleep}h</div>
              <div className="text-sm font-medium text-slate-600 mt-1">Média de Sono</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-emerald-100">
              <div className="text-3xl font-bold text-emerald-600">{metrics.averageMood} <span className="text-lg text-slate-400">/ 5</span></div>
              <div className="text-sm font-medium text-slate-600 mt-1">Humor Geral</div>
            </div>
          </div>

          <SportSelector />

          {/* NOVO: Secção do Histórico do Colaborador */}
          <div className="mt-12 bg-white/90 backdrop-blur rounded-xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">O Meu Histórico de Atividades</h3>
            
            {workouts.length === 0 ? (
              <p className="text-slate-600 text-center py-6">Ainda não há registos. Pique o seu ponto de saúde acima!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Intensidade</TableHead>
                      <TableHead className="text-right">Sono / Humor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts.map((workout) => (
                      <TableRow key={workout.id}>
                        <TableCell className="font-medium text-slate-700">
                          {new Date(workout.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-700">{workout.activityType}</TableCell>
                        <TableCell>{workout.durationMinutes} min</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border
                            ${workout.intensity === 'LEVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              workout.intensity === 'MODERADO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {workout.intensity}
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