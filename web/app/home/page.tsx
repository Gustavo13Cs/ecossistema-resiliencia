"use client"

import { useEffect, useState } from "react"
import { SportSelector } from "@/components/sport-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Filter, Search, ChevronDown, Utensils, Clock, CheckCircle2, Info } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { ResilienceChart } from "@/components/resilience-chart"
import { useAuth } from "@/contexts/auth-context"

export default function HomePage() {
  const { user, logout } = useAuth()
  
  const [metrics, setMetrics] = useState({ totalWorkouts: 0, averageSleep: 0, averageMood: 0 })
  const [workouts, setWorkouts] = useState<any[]>([])
  
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState("")

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // 🚀 NOVOS ESTADOS PARA A DIETA
  const [diet, setDiet] = useState<any>(null)
  const [consumedMeals, setConsumedMeals] = useState<string[]>([])

  const dashboardConfig: Record<string, any> = {
    PERSONAL_TRAINER: {
      theme: "blue", metric1: "Treinos Registados", tableTitleSelf: "O Meu Histórico", tableTitleTeam: "Histórico do Aluno",
      colMember: "Aluno", colActivity: "Atividade", colDuration: "Duração", colIntensity: "Intensidade",
      intensityLabels: { LEVE: "Leve", MODERADO: "Moderado", INTENSO: "Intenso" }
    },
    NUTRITIONIST: {
      theme: "teal", metric1: "Diários Registados", tableTitleSelf: "Meu Diário", tableTitleTeam: "Histórico do Paciente",
      colMember: "Paciente", colActivity: "Categoria", colDuration: "Copos de Água", colIntensity: "Adesão à Dieta",
      intensityLabels: { LEVE: "Saiu do Plano", MODERADO: "Deslizes", INTENSO: "100% no Foco" }
    },
    HR_CORPORATE: {
      theme: "indigo", metric1: "Check-ins de Saúde", tableTitleSelf: "Meu Histórico", tableTitleTeam: "Histórico do Colaborador",
      colMember: "Colaborador", colActivity: "Foco do Dia", colDuration: "Pausas (min)", colIntensity: "Nível de Estresse",
      intensityLabels: { LEVE: "Tranquilo", MODERADO: "Gerenciável", INTENSO: "Alto Estresse" }
    }
  }

  const config = dashboardConfig[user?.businessContext || "PERSONAL_TRAINER"] || dashboardConfig["PERSONAL_TRAINER"]

  const fetchDashboardData = async (memberId?: string) => {
    try {
      let historyRes;
      const targetUserId = user?.role === 'EMPLOYEE' ? user?.sub : memberId;

      // 1. Busca os Treinos / Diários
      if (user?.role === 'EMPLOYEE') {
        historyRes = await api.get("/workouts")
      } else if (memberId) {
        historyRes = await api.get(`/users/${memberId}/workouts`)
      } else {
        return; 
      }

      const userWorkouts = historyRes.data
      setWorkouts(userWorkouts)

      const total = userWorkouts.length
      const avgSleep = total > 0 ? (userWorkouts.reduce((acc: number, curr: any) => acc + (curr.sleepHours || 0), 0) / total).toFixed(1) : 0
      const avgMood = total > 0 ? (userWorkouts.reduce((acc: number, curr: any) => acc + (curr.moodLevel || 0), 0) / total).toFixed(1) : 0

      setMetrics({ totalWorkouts: total, averageSleep: Number(avgSleep), averageMood: Number(avgMood) })

      // 2. 🚀 Busca a Dieta Ativa do Aluno ou do Paciente Selecionado
      if (targetUserId) {
        try {
          const dietRes = await api.get(`/diet-plans/user/${targetUserId}/active`)
          setDiet(dietRes.data)
          const consumed = dietRes.data.meals
            .filter((m: any) => m.isConsumed)
            .map((m: any) => m.id);
          setConsumedMeals(consumed);
        } catch (error) {
          setDiet(null) 
        }
      }

    } catch (error) {
      console.error("Erro ao carregar dados", error)
    }
  }

  useEffect(() => {
    if (!user) return;

    const loadInitialSetup = async () => {
      if (user.role === 'HR_MANAGER' || user.role === 'ADMIN' || user.role === 'NUTRITIONIST') {
        try {
          const usersRes = await api.get("/users")
          if (usersRes.data && usersRes.data.length > 0) {
            setTeamMembers(usersRes.data)
            const firstMemberId = usersRes.data[0].id
            setSelectedMember(firstMemberId)
            fetchDashboardData(firstMemberId)
          }
        } catch (error) {
          console.error("Erro ao buscar membros", error)
        }
      } else {
        fetchDashboardData()
      }
    }

    loadInitialSetup()
  }, [user])

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

 const toggleMeal = async (mealId: string) => {
    setConsumedMeals(prev => 
      prev.includes(mealId) ? prev.filter(id => id !== mealId) : [...prev, mealId]
    )
    
    try {
      await api.patch(`/diet-plans/meal/${mealId}/toggle`);
    } catch (error) {
      console.error("Erro ao salvar status da refeição", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 pb-12">
      {/* HEADER FLUIDO */}
      <header className={`bg-white/80 backdrop-blur border-b border-${config.theme}-100 sticky top-0 z-50`}>
        <div className="w-full px-6 md:px-12 lg:px-20 py-4">
          <div className="flex items-center justify-between">
            <h1 className={`text-2xl font-bold bg-gradient-to-r from-${config.theme}-600 to-${config.theme}-400 bg-clip-text text-transparent`}>
              SafeMove B2B
            </h1>
            <div className="flex items-center gap-3">
              {(user?.role === 'HR_MANAGER' || user?.role === 'ADMIN' || user?.role === 'NUTRITIONIST') && (
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

      <main className="w-full px-6 md:px-12 lg:px-20 py-8">
        <div className="space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-slate-800">Painel de Acompanhamento</h2>
              <p className="text-slate-600">
                {user?.role === 'EMPLOYEE' ? "Visão geral do seu registo diário." : "Análise individual detalhada do paciente."}
              </p>
            </div>

            {(user?.role === 'HR_MANAGER' || user?.role === 'ADMIN' || user?.role === 'NUTRITIONIST') && teamMembers.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-64 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Filter className={`w-4 h-4 text-${config.theme}-500 shrink-0`} />
                    <span className="truncate">
                      {teamMembers.find(m => m.id === selectedMember)?.name || "Selecione um Paciente"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Pesquisar por nome..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-slate-300 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setSelectedMember(member.id);
                              fetchDashboardData(member.id);
                              setIsDropdownOpen(false);
                              setSearchTerm("");
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between
                              ${selectedMember === member.id ? `bg-${config.theme}-50 text-${config.theme}-700 font-semibold` : 'text-slate-600 hover:bg-slate-50'}
                            `}
                          >
                            <span className="truncate">{member.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`bg-white/90 backdrop-blur rounded-xl p-6 text-center shadow-sm border border-${config.theme}-100 transition-all`}>
              <div className={`text-4xl font-bold text-${config.theme}-600`}>{metrics.totalWorkouts}</div>
              <div className="text-sm font-medium text-slate-600 mt-2 uppercase tracking-wider">{config.metric1}</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-6 text-center shadow-sm border border-slate-200 transition-all">
              <div className="text-4xl font-bold text-slate-700">{metrics.averageSleep}h</div>
              <div className="text-sm font-medium text-slate-600 mt-2 uppercase tracking-wider">Média de Sono</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-6 text-center shadow-sm border border-slate-200 transition-all">
              <div className="text-4xl font-bold text-slate-700">{metrics.averageMood} <span className="text-xl text-slate-400">/ 5</span></div>
              <div className="text-sm font-medium text-slate-600 mt-2 uppercase tracking-wider">Humor Geral</div>
            </div>
          </div>

          {/* 🚀 NOVO: SESSÃO DO PLANO ALIMENTAR (Aparece se houver dieta ativa) */}
          {diet && (
            <div className={`mt-8 bg-white/90 backdrop-blur rounded-xl p-6 md:p-8 shadow-sm border border-${config.theme}-100`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Utensils className={`w-6 h-6 text-${config.theme}-600`} /> 
                    {user?.role === 'EMPLOYEE' ? "O Seu Plano Alimentar" : "Plano Alimentar do Paciente"}
                  </h3>
                  <p className="text-slate-500 mt-1 font-medium">{diet.title} • {diet.goal}</p>
                </div>
                <div className={`flex gap-4 mt-4 md:mt-0 bg-${config.theme}-50 px-4 py-2 rounded-lg border border-${config.theme}-100`}>
                   <div className="text-center"><span className={`text-xs font-bold text-${config.theme}-600 block`}>KCAL</span><span className="font-bold text-slate-700">{diet.targetKcal}</span></div>
                   <div className="text-center"><span className="text-xs font-bold text-rose-500 block">PTN</span><span className="font-bold text-slate-700">{diet.proteinG}g</span></div>
                   <div className="text-center"><span className="text-xs font-bold text-emerald-500 block">CARB</span><span className="font-bold text-slate-700">{diet.carbsG}g</span></div>
                   <div className="text-center"><span className="text-xs font-bold text-amber-500 block">GOR</span><span className="font-bold text-slate-700">{diet.fatG}g</span></div>
                </div>
              </div>

              {diet.notes && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 text-sm text-slate-700">
                  <Info className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="whitespace-pre-wrap">{diet.notes}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                 {diet.meals.map((meal: any) => (
                    <Card key={meal.id} className={`border border-slate-100 shadow-sm transition-all ${consumedMeals.includes(meal.id) ? 'opacity-50 bg-slate-50' : 'bg-white'}`}>
                      <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className={`bg-${config.theme}-50 text-${config.theme}-600 p-2 rounded-lg`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold text-${config.theme}-600 uppercase tracking-tight`}>{meal.time}</span>
                            <CardTitle className={`text-base ${consumedMeals.includes(meal.id) ? 'line-through text-slate-400' : 'text-slate-800'}`}>{meal.name}</CardTitle>
                          </div>
                        </div>
                        {user?.role === 'EMPLOYEE' ? (
                          <Button 
                            variant="ghost" 
                            onClick={() => toggleMeal(meal.id)}
                            className={`rounded-full w-10 h-10 p-0 transition-colors ${consumedMeals.includes(meal.id) ? `text-${config.theme}-600 bg-${config.theme}-100` : 'text-slate-300 border-2 border-slate-100 hover:text-teal-500 hover:border-teal-200'}`}
                          >
                            <CheckCircle2 className="w-6 h-6" />
                          </Button>
                        ) : (
                          <div className={`rounded-full w-10 h-10 flex items-center justify-center transition-all ${consumedMeals.includes(meal.id) ? `text-${config.theme}-600 bg-${config.theme}-100 shadow-inner` : 'text-slate-200'}`} title={consumedMeals.includes(meal.id) ? "Paciente já consumiu" : "Aguardando consumo"}>
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {meal.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="text-slate-700 font-medium">{item.food.name}</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">{item.quantity}g</span>
                          </div>
                        ))}
                        {meal.notes && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                            <strong>💡 Substituições:</strong> {meal.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                 ))}
              </div>
            </div>
          )}

          {user?.role === 'EMPLOYEE' && (
            <div className="mt-8">
              <SportSelector />
            </div>
          )}

          <div className="mt-8">
            <ResilienceChart workouts={workouts} />
          </div>

          <div className={`mt-12 bg-white/90 backdrop-blur rounded-xl p-8 shadow-sm border border-${config.theme}-100`}>
            <h3 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">
              {user?.role === 'EMPLOYEE' ? config.tableTitleSelf : config.tableTitleTeam}
            </h3>
            
            {workouts.length === 0 ? (
              <p className="text-slate-600 text-center py-6">Ainda não há registos para mostrar neste paciente.</p>
            ) : (
              <div className="overflow-x-auto">
                {/* O seu código da tabela continua aqui (mantive igual) */}
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 font-semibold text-slate-700">Data</TableHead>
                      <TableHead className="font-semibold text-slate-700">{config.colActivity}</TableHead>
                      <TableHead className="font-semibold text-slate-700">{config.colDuration}</TableHead>
                      <TableHead className="font-semibold text-slate-700">{config.colIntensity}</TableHead>
                      <TableHead className="font-semibold text-slate-700">Peso</TableHead>
                      <TableHead className="font-semibold text-slate-700">Observações</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">Sono / Humor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts.map((workout) => (
                      <TableRow key={workout.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-800 py-4">{new Date(workout.createdAt).toLocaleDateString('pt-PT')}</TableCell>
                        <TableCell className={`font-medium text-${config.theme}-600`}>{workout.activityType}</TableCell>
                        <TableCell className="text-slate-600">{workout.durationMinutes} {config.theme === 'teal' ? '' : 'min'}</TableCell>
                        <TableCell>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${workout.intensity === 'LEVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : workout.intensity === 'MODERADO' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {config.intensityLabels[workout.intensity] || workout.intensity}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">{workout.weight ? `${workout.weight} kg` : '-'}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-slate-500 text-sm cursor-help" title={workout.notes || "Sem observações"}>{workout.notes || '-'}</TableCell>
                        <TableCell className="text-right text-slate-600 font-medium">{workout.sleepHours ? `${workout.sleepHours}h` : '-'} <span className="mx-2 text-slate-300">|</span> {workout.moodLevel ? `Nível ${workout.moodLevel}` : '-'}</TableCell>
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