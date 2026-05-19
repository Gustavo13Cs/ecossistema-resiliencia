"use client"

import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Apple, Dumbbell, Activity, Droplets, Flame } from "lucide-react"
import Link from "next/link"

export default function PacienteDashboard() {
  const { user } = useAuth()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-slate-500 text-lg font-medium">{getGreeting()},</h2>
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
          {user?.name?.split(' ')[0] || "Paciente"}! 👋
        </h1>
        <p className="text-slate-600 mt-2">Aqui está o seu resumo de saúde para hoje.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full">
            <Droplets className="w-6 h-6 text-blue-200 mb-4" />
            <div>
              <p className="text-blue-100 text-xs md:text-sm font-bold uppercase tracking-wider">Meta de Água</p>
              <h3 className="text-2xl md:text-3xl font-black mt-1">2.5L</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-rose-500 text-white">
          <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full">
            <Flame className="w-6 h-6 text-orange-200 mb-4" />
            <div>
              <p className="text-orange-100 text-xs md:text-sm font-bold uppercase tracking-wider">Meta Diária</p>
              <h3 className="text-2xl md:text-3xl font-black mt-1">2100 kcal</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">O seu acompanhamento</h3>
        <div className="space-y-4">
          
          <Link href="/paciente/dieta" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group block">
            <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <Apple className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">Plano Alimentar</h4>
              <p className="text-sm text-slate-500">Veja o que comer na próxima refeição.</p>
            </div>
          </Link>

          <Link href="/paciente/treino" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group block">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Dumbbell className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">Treino do Dia</h4>
              <p className="text-sm text-slate-500">Acesse a sua ficha de hipertrofia.</p>
            </div>
          </Link>

          <Link href="/paciente/reabilitacao" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group block">
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">Reabilitação</h4>
              <p className="text-sm text-slate-500">Protocolo de fisioterapia ativo.</p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  )
}