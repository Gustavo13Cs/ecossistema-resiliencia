"use client"

import { useEffect, useState } from "react"
import { SportSelector } from "@/components/sport-selector"
import { Button } from "@/components/ui/button"
import { LogOut, Filter, Search, ChevronDown } from "lucide-react" 
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

  // NOVOS ESTADOS PARA O DROPDOWN DE PESQUISA
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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

  // Função atualizada: Sem o "ALL". Busca dados exatos.
  const fetchDashboardData = async (memberId?: string) => {
    try {
      let historyRes;

      if (user?.role === 'EMPLOYEE') {
        // Se for aluno, busca o próprio diário
        historyRes = await api.get("/workouts")
      } else if (memberId) {
        // Se for Gestor, busca o diário do aluno selecionado
        historyRes = await api.get(`/users/${memberId}/workouts`)
      } else {
        return; // Gestor sem aluno selecionado não faz nada
      }

      const userWorkouts = historyRes.data
      setWorkouts(userWorkouts)

      const total = userWorkouts.length
      const avgSleep = total > 0 ? (userWorkouts.reduce((acc: number, curr: any) => acc + (curr.sleepHours || 0), 0) / total).toFixed(1) : 0
      const avgMood = total > 0 ? (userWorkouts.reduce((acc: number, curr: any) => acc + (curr.moodLevel || 0), 0) / total).toFixed(1) : 0

      setMetrics({
        totalWorkouts: total,
        averageSleep: Number(avgSleep),
        averageMood: Number(avgMood)
      })
    } catch (error) {
      console.error("Erro ao carregar dados", error)
    }
  }

  useEffect(() => {
    if (!user) return;

    const loadInitialSetup = async () => {
      if (user.role === 'HR_MANAGER' || user.role === 'ADMIN') {
        try {
          const usersRes = await api.get("/users")
          if (usersRes.data && usersRes.data.length > 0) {
            setTeamMembers(usersRes.data)
            // MAGIA: Auto-seleciona o PRIMEIRO paciente da lista logo ao entrar!
            const firstMemberId = usersRes.data[0].id
            setSelectedMember(firstMemberId)
            fetchDashboardData(firstMemberId)
          }
        } catch (error) {
          console.error("Erro ao buscar membros", error)
        }
      } else {
        // Aluno carrega direto os seus dados
        fetchDashboardData()
      }
    }

    loadInitialSetup()
  }, [user])

  // Filtra a lista de membros baseada no que foi digitado
  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-slate-800">Painel de Acompanhamento</h2>
              <p className="text-slate-600">
                {user?.role === 'EMPLOYEE' ? "Visão geral do seu registo." : "Análise individual detalhada do paciente."}
              </p>
            </div>

            {/* O NOVO DROPDOWN PESQUISÁVEL PREMIUM */}
            {(user?.role === 'HR_MANAGER' || user?.role === 'ADMIN') && teamMembers.length > 0 && (
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
                    {/* Overlay invisível para fechar ao clicar fora */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>

                    {/* O Menu em si */}
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
                        {filteredMembers.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-slate-500">
                            Nenhum paciente encontrado.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className={`bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-${config.theme}-100 transition-all`}>
              <div className={`text-3xl font-bold text-${config.theme}-600`}>{metrics.totalWorkouts}</div>
              <div className="text-sm font-medium text-slate-600 mt-1">{config.metric1}</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-slate-200 transition-all">
              <div className="text-3xl font-bold text-slate-700">{metrics.averageSleep}h</div>
              <div className="text-sm font-medium text-slate-600 mt-1">Média de Sono</div>
            </div>
            <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-slate-200 transition-all">
              <div className="text-3xl font-bold text-slate-700">{metrics.averageMood} <span className="text-lg text-slate-400">/ 5</span></div>
              <div className="text-sm font-medium text-slate-600 mt-1">Humor Geral</div>
            </div>
          </div>

          {user?.role === 'EMPLOYEE' && (
            <div className="mt-8">
              <SportSelector />
            </div>
          )}

          <div className="mt-8">
            <ResilienceChart workouts={workouts} />
          </div>

          <div className={`mt-12 bg-white/90 backdrop-blur rounded-xl p-6 shadow-sm border border-${config.theme}-100`}>
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">
              {user?.role === 'EMPLOYEE' ? config.tableTitleSelf : config.tableTitleTeam}
            </h3>
            
            {workouts.length === 0 ? (
              <p className="text-slate-600 text-center py-6">Ainda não há registos para mostrar neste paciente.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>{config.colActivity}</TableHead>
                      <TableHead>{config.colDuration}</TableHead>
                      <TableHead>{config.colIntensity}</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Sono / Humor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workouts.map((workout) => (
                      <TableRow key={workout.id}>
                        <TableCell className="font-medium text-slate-700">
                          {new Date(workout.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                        
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

                        <TableCell className="font-medium text-slate-600">
                          {workout.weight ? `${workout.weight} kg` : '-'}
                        </TableCell>

                        <TableCell 
                          className="max-w-[200px] truncate text-slate-500 text-sm cursor-help" 
                          title={workout.notes || "Sem observações"}
                        >
                          {workout.notes || '-'}
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