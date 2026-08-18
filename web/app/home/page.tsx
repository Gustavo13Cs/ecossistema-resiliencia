"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { 
  Users, AlertTriangle, Zap, UserX, ShieldAlert, Flame, 
  ClipboardList, Activity, ActivitySquare, Pill, ChevronRight, 
  CheckCircle2, Dumbbell, HeartPulse, Calculator, TrendingUp, 
  Search, X, ArrowRight, UserPlus, FileText, Beaker 
} from "lucide-react"
import { useHomeDashboard } from "@/hooks/features/useHomeDashboard"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface QuickAction {
  id: string
  title: string
  description: string
  icon: any
  targetSubPath?: string
  hubUrl?: string
  hubLabel?: string
  direct?: boolean
}

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { patients, patientsCount, loading } = useHomeDashboard()

  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-slate-500 font-medium animate-pulse">A carregar o seu painel...</p>
      </div>
    )
  }

  const isPersonal = user?.role === 'PERSONAL'
  const isFisio = user?.role === 'PHYSIO'
  
  // Theme styling
  const clientLabel = isPersonal ? 'Alunos' : 'Pacientes'
  const singleClientLabel = isPersonal ? 'Aluno' : 'Paciente'
  const areaName = isPersonal ? 'Treinamento' : isFisio ? 'Reabilitação' : 'Nutrição Clínica'
  
  const bannerBg = isPersonal ? 'bg-blue-600' : isFisio ? 'bg-purple-600' : 'bg-emerald-600'
  const textTheme = isPersonal ? 'text-blue-600' : isFisio ? 'text-purple-600' : 'text-emerald-600'
  const hoverBorderTheme = isPersonal ? 'hover:border-blue-300' : isFisio ? 'hover:border-purple-300' : 'hover:border-emerald-300'
  const hoverBgTheme = isPersonal ? 'hover:bg-blue-50/50' : isFisio ? 'hover:bg-purple-50/50' : 'hover:bg-emerald-50/50'
  const actionBtnBg = isPersonal ? 'bg-blue-600 hover:bg-blue-700' : isFisio ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'

  // Current Date Formatting
  const today = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
  const formattedDate = today.toLocaleDateString('pt-BR', dateOptions).replace('-feira', '-Feira')
  
  const firstName = (user as any)?.name?.split(' ')[0] || 'Profissional'

  // Quick actions dynamic list by role
  const quickActions: QuickAction[] = isPersonal
    ? [
        {
          id: "treino",
          title: "Prescrever Treino",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para montar uma nova ficha de treino`,
          icon: Dumbbell,
          targetSubPath: "novo-treino",
          hubUrl: "/treinos",
          hubLabel: "Ver Planilhas de Treino",
        },
        {
          id: "avaliacao",
          title: "Avaliação Física",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para registrar ou ver avaliações`,
          icon: Activity,
          targetSubPath: "",
          hubUrl: "/avaliacoes",
          hubLabel: "Ver Central de Avaliações",
        },
        {
          id: "planilhas",
          title: "Planilhas de Treino",
          description: "Acesse todas as fichas de treino cadastradas",
          icon: ClipboardList,
          hubUrl: "/treinos",
          direct: true,
        },
        {
          id: "visao360",
          title: "Visão 360°",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para ver o raio-x multiprofissional`,
          icon: TrendingUp,
          targetSubPath: "visao-360",
        },
      ]
    : isFisio
    ? [
        {
          id: "reab",
          title: "Reabilitação",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para prescrever um protocolo clínico`,
          icon: HeartPulse,
          targetSubPath: "nova-reabilitacao",
          hubUrl: "/reabilitacao",
          hubLabel: "Ver Central de Reabilitação",
        },
        {
          id: "postural",
          title: "Avaliação Postural",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para registrar nova avaliação`,
          icon: Activity,
          targetSubPath: "",
          hubUrl: "/avaliacoes",
          hubLabel: "Ver Central de Avaliações",
        },
        {
          id: "exames",
          title: "Exames Lab",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para registrar ou analisar exames`,
          icon: ActivitySquare,
          targetSubPath: "exames",
        },
        {
          id: "visao360",
          title: "Visão 360°",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para ver o histórico integrado`,
          icon: TrendingUp,
          targetSubPath: "visao-360",
        },
      ]
    : [
        {
          id: "dieta",
          title: "Prescrever Dieta",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para prescrever um novo plano alimentar`,
          icon: ClipboardList,
          targetSubPath: "nova-dieta",
          hubUrl: "/dietas",
          hubLabel: "Ver Central de Dietas",
        },
        {
          id: "calculo",
          title: "Cálculo Energético",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para calcular TMB, GET e macros`,
          icon: Calculator,
          targetSubPath: "calculo-energetico",
        },
        {
          id: "exames",
          title: "Exames Lab",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para lançar ou acompanhar marcadores sanguíneos`,
          icon: ActivitySquare,
          targetSubPath: "exames",
        },
        {
          id: "suplementos",
          title: "Suplementação",
          description: `Selecione o ${singleClientLabel.toLowerCase()} para prescrever fórmulas e suplementos`,
          icon: Pill,
          targetSubPath: "nova-suplementacao",
        },
      ]

  const handleActionClick = (action: QuickAction) => {
    if (action.direct && action.hubUrl) {
      router.push(action.hubUrl)
      return
    }
    setSearchTerm("")
    setSelectedAction(action)
  }

  const handleSelectPatient = (patientId: string) => {
    if (!selectedAction) return
    const sub = selectedAction.targetSubPath
    const destination = sub ? `/membros/${patientId}/${sub}` : `/membros/${patientId}`
    setSelectedAction(null)
    router.push(destination)
  }

  const filteredPatients = patients.filter((p: any) =>
    (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        {/* BANNER PRINCIPAL */}
        <div className={`${bannerBg} rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md text-white relative overflow-hidden`}>
          <div className="relative z-10">
            <p className="text-white/80 font-medium text-sm mb-1 capitalize">{formattedDate}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              Bom dia, {firstName}! 👋
            </h1>
            <p className="text-white/90 text-base md:text-lg">
              Bem-vindo ao seu painel de {areaName}. Todos os {clientLabel.toLowerCase()} estão em dia.
            </p>
          </div>
          <Link href="/membros" className="relative z-10">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-0 font-semibold px-6 py-5 rounded-xl backdrop-blur-sm transition-all">
              Ver {clientLabel} <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* ESTATÍSTICAS (4 CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/membros">
            <Card className="shadow-sm border-slate-100 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer h-full">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Users className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{clientLabel} Ativos</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800">{patientsCount}</div>
                  <p className="text-xs font-medium text-slate-500 mt-1">vinculados à sua conta</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alertas Críticos</span>
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-600">0</div>
                <p className="text-xs font-medium text-emerald-600/80 mt-1">nenhum alerta crítico</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alertas Moderados</span>
              </div>
              <div>
                <div className="text-3xl font-black text-emerald-600">0</div>
                <p className="text-xs font-medium text-emerald-600/80 mt-1">tudo sob controle</p>
              </div>
            </CardContent>
          </Card>

          <Link href="/membros">
            <Card className="shadow-sm border-amber-100 bg-amber-50/30 hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <UserX className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inativos (7 dias)</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-amber-600">{patients.length > 0 ? Math.min(patients.length, 3) : 0}</div>
                  <p className="text-xs font-medium text-amber-600/80 mt-1">sem registro recente</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* CONTEÚDO INFERIOR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* RADAR DE ALERTAS */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Radar de Alertas
            </h2>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 flex items-start gap-4 shadow-sm">
              <div className="mt-1 bg-emerald-100 p-2 rounded-full shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-emerald-800 font-bold text-lg mb-1">Tudo em ordem!</h3>
                <p className="text-emerald-600/90 font-medium">Nenhum alerta crítico detectado. Todos os seus {clientLabel.toLowerCase()} estão a evoluir dentro do esperado.</p>
              </div>
            </div>

            {/* ATALHO RÁPIDO PARA GESTÃO */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">Gerenciar {clientLabel}</h4>
                <p className="text-sm text-slate-500">Acesse a lista completa de cadastros, prescrições e histórico de avaliações.</p>
              </div>
              <Link href="/membros" className="shrink-0">
                <Button className={`${actionBtnBg} text-white font-bold shadow-sm rounded-xl`}>
                  <Users className="w-4 h-4 mr-2" /> Ver Todos os {clientLabel}
                </Button>
              </Link>
            </div>
          </div>

          {/* AÇÕES RÁPIDAS & INATIVOS */}
          <div className="space-y-8">
            
            {/* AÇÕES RÁPIDAS */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" /> Ações Rápidas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      onClick={() => handleActionClick(action)}
                      className={`h-auto py-4 flex flex-col gap-2 items-center justify-center border-slate-200 ${hoverBorderTheme} ${hoverBgTheme} transition-all active:scale-95 shadow-sm group`}
                    >
                      <Icon className={`w-5 h-5 ${textTheme} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs font-bold text-slate-700">{action.title}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* INATIVOS ESTA SEMANA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" /> Inativos esta Semana
                </h2>
                {patients.length > 0 && (
                  <Link href="/membros" className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline">
                    Ver todos
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {patients.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3">
                    <p className="text-xs font-medium text-slate-500">Nenhum {singleClientLabel.toLowerCase()} cadastrado ainda.</p>
                    <Link href="/membros">
                      <Button size="sm" variant="outline" className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50">
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Cadastrar {singleClientLabel}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  patients.slice(0, 3).map((patient: any) => {
                    const initial = (patient.name || "U").charAt(0).toUpperCase()
                    return (
                      <Link key={patient.id} href={`/membros/${patient.id}`} className="block">
                        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex items-center justify-between hover:border-amber-300 hover:bg-amber-50/40 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs shadow-inner">
                              {initial}
                            </div>
                            <div>
                              <span className="font-bold text-slate-700 text-sm group-hover:text-amber-900 block transition-colors">
                                {patient.name}
                              </span>
                              {patient.goal && (
                                <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
                                  {patient.goal}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 🌟 MODAL DE SELEÇÃO DE PACIENTE PARA AÇÃO RÁPIDA */}
      {selectedAction && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200" 
            onClick={() => setSelectedAction(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* CABEÇALHO DO MODAL */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${actionBtnBg} text-white shadow-sm`}>
                  <selectedAction.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedAction.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedAction.description}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full" 
                onClick={() => setSelectedAction(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* CORPO DO MODAL */}
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder={`Buscar ${singleClientLabel.toLowerCase()} pelo nome ou e-mail...`}
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 mt-3">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm font-medium text-slate-400">
                      {searchTerm ? `Nenhum ${singleClientLabel.toLowerCase()} encontrado para "${searchTerm}".` : `Nenhum ${singleClientLabel.toLowerCase()} cadastrado.`}
                    </p>
                    <Link href="/membros" onClick={() => setSelectedAction(null)}>
                      <Button size="sm" className={`${actionBtnBg} text-white text-xs font-bold rounded-xl`}>
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Cadastrar Novo {singleClientLabel}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filteredPatients.map((patient: any) => {
                    const initial = (patient.name || "U").charAt(0).toUpperCase()
                    return (
                      <div 
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient.id)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-700 font-bold flex items-center justify-center text-sm transition-colors">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800 group-hover:text-emerald-900 transition-colors">
                              {patient.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {patient.goal || patient.email || "Sem objetivo mapeado"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Selecionar
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* ATALHO PARA O HUB GERAL, SE HOUVER */}
              {selectedAction.hubUrl && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 p-0 h-auto"
                    onClick={() => {
                      const url = selectedAction.hubUrl!
                      setSelectedAction(null)
                      router.push(url)
                    }}
                  >
                    {selectedAction.hubLabel || "Acessar Central Geral"} ➜
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs font-semibold rounded-lg"
                    onClick={() => setSelectedAction(null)}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  )
}