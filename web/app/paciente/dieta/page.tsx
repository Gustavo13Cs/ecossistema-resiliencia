"use client"

import { Apple, Clock, Info, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useDiet } from "@/hooks/features/useDiet"
import { useCheckIn } from "@/hooks/features/useCheckIn"
import { Button } from "@/components/ui/button"


export default function DietaPacientePage() {
  const { user } = useAuth()
  
  const { dietPlan, loading, error } = useDiet(user?.sub)
  
  const { handleCheckIn, loadingItems, completedItems,consistency } = useCheckIn(user?.sub)

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-teal-100 text-teal-600 rounded-xl">
          <Apple className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Plano Alimentar</h1>
          <p className="text-slate-500">Acompanhe as suas refeições diárias.</p>
        </div>
      </div>

      {/* FEEDBACK DE ERRO */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-800">Ops, algo correu mal</h3>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
          </div>
        </div>
      )}
      
      {/* LOADING */}
      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">A buscar o seu plano alimentar...</p>
        </div>
      ) : !dietPlan && !error ? (
        
        /* ESTADO VAZIO (Sem dieta) */
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
           <Apple className="w-12 h-12 text-slate-200 mx-auto mb-3" />
           <p className="text-slate-500 font-medium">Você ainda não tem um plano alimentar ativo.</p>
           <p className="text-sm text-slate-400 mt-1">Fale com o seu Nutricionista.</p>
        </div>
      ) : dietPlan && (
        
        /* DADOS REAIS */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white shadow-md">
            <h2 className="text-2xl font-bold">{dietPlan.title}</h2>
            <p className="opacity-90 mt-1">{dietPlan.goal}</p>
            {dietPlan.notes && (
              <div className="mt-4 p-3 bg-black/10 rounded-lg flex gap-3 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>{dietPlan.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {dietPlan.meals?.map((meal) => (
              <div key={meal.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                
                {/* CABEÇALHO DA REFEIÇÃO + BOTÃO FEITO */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-500" />
                    <h3 className="font-bold text-slate-800 text-lg">{meal.name}</h3>
                    <span className="ml-2 text-sm font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full">{meal.time}</span>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          🔥 Consistência da Semana
                        </h3>
                        <p className="text-xs text-slate-500">Mantenha o foco para atingir a sua meta diária.</p>
                      </div>
                      <span className="text-xl font-black text-emerald-500">{consistency}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${consistency}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* 🌟 O BOTÃO DA DOPAMINA AQUI! */}
                  <Button
                    onClick={() => handleCheckIn('MEAL', meal.name)}
                    disabled={completedItems.includes(meal.name) || loadingItems.includes(meal.name)}
                    className={`h-9 px-4 shadow-sm transition-all ${
                      completedItems.includes(meal.name) 
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white opacity-100" 
                        : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {loadingItems.includes(meal.name) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : completedItems.includes(meal.name) ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Feito!</>
                    ) : (
                      "Marcar como Feito"
                    )}
                  </Button>
                </div>
                
                {/* NOTAS DA REFEIÇÃO GERAL */}
                {meal.notes && (
                  <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-600">Observação:</span> {meal.notes}
                  </p>
                )}

                {/* ALIMENTOS */}
                <ul className="space-y-3">
                  {meal.items?.map((item) => (
                    <li key={item.id} className="flex justify-between items-center text-slate-600 border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                      <div>
                        <span className="font-medium text-slate-800">{item.food?.name || 'Alimento não encontrado'}</span>
                        {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                      </div>
                      
                      <span className="font-bold text-slate-700 bg-teal-50 px-3 py-1 rounded-md text-sm border border-teal-100 shrink-0 ml-4">
                        {item.quantity} {item.measure}
                      </span>
                    </li>
                  ))}
                </ul>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}