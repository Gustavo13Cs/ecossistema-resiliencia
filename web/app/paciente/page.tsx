"use client"

import { useAuth } from "@/contexts/auth-context"
import { usePacienteDashboard } from "@/hooks/core/usePacienteDashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Apple, Dumbbell, Activity, Droplets, Flame, Clock, ArrowRight, AlertTriangle,Plus,CheckCircle2 } from "lucide-react"
import { useCheckIn } from "@/hooks/features/useCheckIn"
import Link from "next/link"
import { useWaterTracker } from "@/hooks/features/useWaterTracker"
import { useWeather } from "@/hooks/features/useWeather"
import { Button } from "@/components/ui/button"

export default function PacienteDashboard() {
  const { user } = useAuth()
  
  const { dietPlan, nextMeal, waterGoal, loading, error } = usePacienteDashboard(user?.sub)
  const { currentWaterMl, addWater, progressPercentage } = useWaterTracker(waterGoal)
  const { weather, loadingWeather } = useWeather()
  const { handleCheckIn, loadingItems, completedItems } = useCheckIn(user?.sub)


  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* CABEÇALHO */}
      <div>
        <h2 className="text-slate-500 text-lg font-medium">{getGreeting()},</h2>
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
          {user?.name?.split(' ')[0] || "Paciente"}! 👋
        </h1>
        <p className="text-slate-600 mt-2">Aqui está o seu resumo de saúde para hoje.</p>
      </div>

      {/* 🌟 WIDGET DE INTELIGÊNCIA CLIMÁTICA */}
      {weather && !loadingWeather && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in slide-in-from-top-2">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-2xl shrink-0">
            {weather.icon}
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
              Assistente SafeMove <span className="text-xs bg-indigo-200/50 px-2 py-0.5 rounded text-indigo-700">IA</span>
            </h4>
            <p className="text-indigo-700/80 text-sm mt-0.5 leading-snug">
              {weather.healthTip}
            </p>
          </div>
        </div>
      )}


      {/* TRATAMENTO DE ERRO EXPLÍCITO */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-800">Ops, algo correu mal</h3>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-40 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* CARTÕES DE METAS */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden group">
              {/* 🌊 BARRA DE PROGRESSO ANIMADA (A água a subir!) */}
              <div 
                className="absolute bottom-0 left-0 w-full bg-blue-400/40 transition-all duration-1000 ease-out z-0"
                style={{ height: `${progressPercentage}%` }}
              />
              
              <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <Droplets className="w-6 h-6 text-blue-100" />
                  
                  {/* BOTÃO MÁGICO DE BEBER ÁGUA */}
                  <button 
                    onClick={() => addWater(250)}
                    disabled={waterGoal === null}
                    className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white rounded-full p-1.5 transition-all active:scale-90"
                    title="Beber 250ml"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <p className="text-blue-100 text-xs md:text-sm font-bold uppercase tracking-wider flex justify-between items-end">
                    <span>Meta de Água</span>
                    <span className="text-xs bg-blue-700/50 px-2 py-0.5 rounded-full">{progressPercentage.toFixed(0)}%</span>
                  </p>
                  
                  {waterGoal === null ? (
                    <h3 className="text-xl font-black mt-1">Não calculada</h3>
                  ) : (
                    <h3 className="text-2xl md:text-3xl font-black mt-1 flex items-baseline gap-1">
                      {(currentWaterMl / 1000).toFixed(1)}L
                      <span className="text-sm font-medium text-blue-200">/ {waterGoal}L</span>
                    </h3>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-rose-500 text-white">
              <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full">
                <Flame className="w-6 h-6 text-orange-200 mb-4" />
                <div>
                  <p className="text-orange-100 text-xs md:text-sm font-bold uppercase tracking-wider">Meta Diária</p>
                  <h3 className="text-2xl md:text-3xl font-black mt-1">
                    {dietPlan?.targetKcal ? `${Math.round(dietPlan.targetKcal)} kcal` : "--- kcal"}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CARTÃO DA PRÓXIMA REFEIÇÃO */}
          {nextMeal && (
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl relative shadow-sm">
              
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-emerald-800 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Clock className="w-4 h-4" /> Próxima Refeição
                </h3>
                <span className="bg-white text-emerald-700 font-bold px-3 py-1 rounded-full text-sm border border-emerald-100">
                  {nextMeal.time}
                </span>
              </div>

              <h2 className="text-2xl font-black text-slate-800 mb-4">{nextMeal.name}</h2>

              <div className="flex items-center justify-between mt-2">
                <Link href="/paciente/dieta" className="text-emerald-600 font-bold text-sm hover:underline flex items-center transition-all">
                  Ver o que comer <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
                <Button
                  onClick={() => handleCheckIn('MEAL', nextMeal.name)}
                  disabled={completedItems.includes(nextMeal.name) || loadingItems.includes(nextMeal.name)}
                  className={`h-9 px-4 shadow-sm transition-all ${
                    completedItems.includes(nextMeal.name) 
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white opacity-100" 
                      : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {loadingItems.includes(nextMeal.name) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : completedItems.includes(nextMeal.name) ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Feito!</>
                  ) : (
                    "Marcar como Feito"
                  )}
                </Button>
              </div>
            </div>
          )}
          
        </>
      )}

      {/* NAVEGAÇÃO PRINCIPAL */}
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