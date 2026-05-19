"use client"

import { useEffect, useState } from "react"
import { Apple, Clock, Info } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

export default function DietaPacientePage() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.sub) {
      api.get(`/diet-plans/user/${user.sub}/active`)
        .then(res => setPlan(res.data))
        .catch(() => setPlan(null))
        .finally(() => setLoading(false))
    }
  }, [user])

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-teal-100 text-teal-600 rounded-xl">
          <Apple className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Plano Alimentar</h1>
          <p className="text-slate-500">Acompanhe as suas refeições diárias.</p>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">A buscar o seu plano alimentar...</p>
        </div>
      ) : !plan ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
           <Apple className="w-12 h-12 text-slate-200 mx-auto mb-3" />
           <p className="text-slate-500 font-medium">Você ainda não tem um plano alimentar ativo.</p>
           <p className="text-sm text-slate-400 mt-1">Fale com o seu Nutricionista.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CABEÇALHO DA DIETA */}
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white shadow-md">
            <h2 className="text-2xl font-bold">{plan.title}</h2>
            <p className="opacity-90 mt-1">{plan.goal}</p>
            {plan.notes && (
              <div className="mt-4 p-3 bg-black/10 rounded-lg flex gap-3 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>{plan.notes}</p>
              </div>
            )}
          </div>

          {/* LISTA DE REFEIÇÕES */}
          <div className="space-y-4">
            {plan.meals?.map((meal: any) => (
              <div key={meal.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <Clock className="w-5 h-5 text-teal-500" />
                  <h3 className="font-bold text-slate-800 text-lg">{meal.name}</h3>
                  <span className="ml-auto text-sm font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full">{meal.time}</span>
                </div>
                
                {/* NOTAS DA REFEIÇÃO GERAL (ex: tomar 30min antes do treino) */}
                {meal.notes && (
                  <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-600">Observação:</span> {meal.notes}
                  </p>
                )}

                {/* ALIMENTOS DESTA REFEIÇÃO */}
                <ul className="space-y-3">
                  {meal.items?.map((item: any) => (
                    <li key={item.id} className="flex justify-between items-center text-slate-600 border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                      <div>
                        {/* 🌟 NOME DO ALIMENTO PUXADO DA TABELA FOOD */}
                        <span className="font-medium text-slate-800">{item.food?.name || 'Alimento não encontrado'}</span>
                        
                        {/* 🌟 NOTAS DO ALIMENTO (ex: "Ou trocar por mandioca") */}
                        {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                      </div>
                      
                      {/* 🌟 QUANTIDADE E MEDIDA JUNTOS (ex: 100 g) */}
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