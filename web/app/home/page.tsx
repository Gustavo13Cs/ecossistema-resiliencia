"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { Users, Activity, Calendar, ArrowRight } from "lucide-react"
import { useHomeDashboard } from "@/hooks/features/useHomeDashboard"
import { PainelUTI } from "@/components/dashboard/PainelUTI"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { user } = useAuth()
  
  // 🌟 O Cérebro está agora isolado no Hook
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
  const clientLabel = isPersonal ? 'Alunos' : 'Pacientes'
  const themeColor = isPersonal ? 'text-blue-600' : isFisio ? 'text-purple-600' : 'text-teal-600'
  const bgThemeColor = isPersonal ? 'bg-blue-600 hover:bg-blue-700' : isFisio ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        {/* SAUDAÇÃO E CALL TO ACTION */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Olá, <span className={themeColor}>{(user as any)?.name?.split(' ')[0]}</span>! 👋
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Bem-vindo ao seu painel de {isPersonal ? 'Treinamento' : isFisio ? 'Reabilitação' : 'Nutrição Clínica'}. O que vamos fazer hoje?
            </p>
          </div>
          <Link href="/membros">
            <Button className={`${bgThemeColor} text-white font-bold h-12 px-6 shadow-md`}>
              Acessar Meus {clientLabel} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* 🌟 O CORAÇÃO DA RETENÇÃO B2B: PAINEL UTI */}
        <PainelUTI />

        {/* CARTÕES DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Card className="shadow-sm border-0 border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                {clientLabel} Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-800">{patientsCount}</div>
              <p className="text-sm text-emerald-600 font-medium mt-1">Registados na sua base</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 border-t-4 border-t-amber-500 opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Acessos Recentes <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Em Breve</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-800">--</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 border-t-4 border-t-indigo-500 opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Novas Avaliações <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Em Breve</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-800">--</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}