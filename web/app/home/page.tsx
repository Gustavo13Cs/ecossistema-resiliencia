"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { Users, AlertTriangle, Zap, UserX, ShieldAlert, Flame, ClipboardList, Activity, ActivitySquare, Pill, ChevronRight, CheckCircle2 } from "lucide-react"
import { useHomeDashboard } from "@/hooks/features/useHomeDashboard"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { user } = useAuth()
  const { patientsCount, loading } = useHomeDashboard()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-slate-500 font-medium animate-pulse">A carregar o seu painel...</p>
      </div>
    )
  }

  const isPersonal = user?.role === 'PERSONAL'
  const isFisio = user?.role === 'PHYSIO'
  
  // Theme colors
  const clientLabel = isPersonal ? 'Alunos' : 'Pacientes'
  const areaName = isPersonal ? 'Treinamento' : isFisio ? 'Reabilitação' : 'Nutrição Clínica'
  const bannerBg = isPersonal ? 'bg-blue-600' : isFisio ? 'bg-purple-600' : 'bg-[#10b981]' // Emerald-like from screenshot
  const textTheme = isPersonal ? 'text-blue-600' : isFisio ? 'text-purple-600' : 'text-[#10b981]'
  const bgThemeLight = isPersonal ? 'bg-blue-50' : isFisio ? 'bg-purple-50' : 'bg-emerald-50'

  // Current Date Formatting
  const today = new Date()
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
  const formattedDate = today.toLocaleDateString('pt-BR', dateOptions).replace('-feira', '-Feira')
  
  const firstName = (user as any)?.name?.split(' ')[0] || 'Profissional'

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        {/* BANNER PRINCIPAL */}
        <div className={`${bannerBg} rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md text-white relative overflow-hidden`}>
          {/* Subtle background pattern/gradient could go here */}
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
          <Card className="shadow-sm border-slate-100">
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

          <Card className="shadow-sm border-amber-100 bg-amber-50/30">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <UserX className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inativos (7 dias)</span>
              </div>
              <div>
                <div className="text-3xl font-black text-amber-600">3</div>
                <p className="text-xs font-medium text-amber-600/80 mt-1">sem registro de atividade</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CONTEÚDO INFERIOR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* RADAR DE ALERTAS */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Radar de Alertas
            </h2>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 flex items-start gap-4">
              <div className="mt-1 bg-emerald-100 p-2 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-emerald-800 font-bold text-lg mb-1">Tudo em ordem!</h3>
                <p className="text-emerald-600/90 font-medium">Nenhum alerta crítico detectado. Continue monitorando.</p>
              </div>
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
                <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 items-center justify-center border-slate-200 hover:border-${textTheme.split('-')[1]}-200 hover:${bgThemeLight}`}>
                  <ClipboardList className={`w-5 h-5 ${textTheme}`} />
                  <span className="text-xs font-bold text-slate-600">Prescrever Dieta</span>
                </Button>
                <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 items-center justify-center border-slate-200 hover:border-${textTheme.split('-')[1]}-200 hover:${bgThemeLight}`}>
                  <Activity className={`w-5 h-5 ${textTheme}`} />
                  <span className="text-xs font-bold text-slate-600">Cálculo Energético</span>
                </Button>
                <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 items-center justify-center border-slate-200 hover:border-${textTheme.split('-')[1]}-200 hover:${bgThemeLight}`}>
                  <ActivitySquare className={`w-5 h-5 ${textTheme}`} />
                  <span className="text-xs font-bold text-slate-600">Exames Lab</span>
                </Button>
                <Button variant="outline" className={`h-auto py-4 flex flex-col gap-2 items-center justify-center border-slate-200 hover:border-${textTheme.split('-')[1]}-200 hover:${bgThemeLight}`}>
                  <Pill className={`w-5 h-5 ${textTheme}`} />
                  <span className="text-xs font-bold text-slate-600">Suplementação</span>
                </Button>
              </div>
            </div>

            {/* INATIVOS ESTA SEMANA */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Inativos esta Semana
              </h2>
              <div className="space-y-3">
                {[
                  { name: "Ana Silva", letter: "A" },
                  { name: "Marina Oliveira", letter: "M" },
                  { name: "Roberto Ferreira", letter: "R" },
                ].map((patient, i) => (
                  <div key={i} className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex items-center justify-between hover:border-amber-200 hover:bg-amber-50/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs">
                        {patient.letter}
                      </div>
                      <span className="font-semibold text-slate-700 text-sm">{patient.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}