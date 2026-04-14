"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, Info, CheckCircle2, Flame, Droplets, Target, Apple } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"

export default function VisaoAlunoPage() {
  const params = useParams()
  const [diet, setDiet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [consumedMeals, setConsumedMeals] = useState<string[]>([])

  useEffect(() => {
    const fetchDiet = async () => {
      try {
        const response = await api.get(`/diet-plans/user/${params.id}/active`)
        setDiet(response.data)
      } catch (error) {
        console.error("Erro ao buscar dieta", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDiet()
  }, [params.id])

  const toggleMeal = (mealId: string) => {
    if (consumedMeals.includes(mealId)) {
      setConsumedMeals(consumedMeals.filter(id => id !== mealId))
    } else {
      setConsumedMeals([...consumedMeals, mealId])
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">A carregar o seu plano...</div>
  }

  if (!diet) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Apple className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700 mb-2">Nenhum plano ativo</h2>
        <p className="text-slate-500 mb-6">O seu nutricionista ainda não disponibilizou a sua dieta. Por favor, aguarde ou entre em contacto.</p>
        <Link href={`/membros/${params.id}`}>
          <Button variant="outline">Voltar para o Perfil</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* HEADER ESTILO MOBILE */}
      <div className="bg-teal-600 text-white pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-md">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/membros/${params.id}`}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-teal-500 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold tracking-wide">O Meu Plano Alimentar</h1>
          </div>
          
          <div>
            <p className="text-teal-100 text-sm font-medium uppercase tracking-wider mb-1">{diet.goal}</p>
            <h2 className="text-3xl font-bold mb-4">{diet.title}</h2>
          </div>

          {/* RESUMO RÁPIDO DOS MACROS (Mais amigável para leigos) */}
          <div className="flex justify-between bg-teal-700/50 rounded-2xl p-4 backdrop-blur-sm border border-teal-500/30">
            <div className="text-center">
              <p className="text-teal-200 text-xs font-bold uppercase flex justify-center items-center gap-1 mb-1"><Flame className="w-3 h-3"/> Kcal</p>
              <p className="font-bold text-lg">{diet.targetKcal}</p>
            </div>
            <div className="w-px bg-teal-500/50 mx-2"></div>
            <div className="text-center">
              <p className="text-rose-300 text-xs font-bold uppercase mb-1">PTN</p>
              <p className="font-bold text-lg">{diet.proteinG}g</p>
            </div>
            <div className="w-px bg-teal-500/50 mx-2"></div>
            <div className="text-center">
              <p className="text-emerald-300 text-xs font-bold uppercase mb-1">CARB</p>
              <p className="font-bold text-lg">{diet.carbsG}g</p>
            </div>
            <div className="w-px bg-teal-500/50 mx-2"></div>
            <div className="text-center">
              <p className="text-amber-300 text-xs font-bold uppercase mb-1">GOR</p>
              <p className="font-bold text-lg">{diet.fatG}g</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 space-y-6">
        
        {/* ORIENTAÇÕES GERAIS DO NUTRICIONISTA */}
        {diet.notes && (
          <Card className="border-0 shadow-lg shadow-teal-900/5 bg-white overflow-hidden">
            <CardHeader className="bg-amber-50 border-b border-amber-100 py-3">
              <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600" /> Orientações do Nutricionista
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                {diet.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* LISTA DE REFEIÇÕES DO DIA */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 ml-2 mt-8 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" /> Suas Refeições
          </h3>

          {diet.meals.map((meal: any) => {
            const isConsumed = consumedMeals.includes(meal.id)

            return (
              <Card key={meal.id} className={`border-0 shadow-md transition-all duration-300 ${isConsumed ? 'opacity-60 bg-slate-50 scale-[0.98]' : 'bg-white'}`}>
                <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-teal-600 mb-1 bg-teal-50 w-fit px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> {meal.time}
                    </span>
                    <CardTitle className={`text-lg ${isConsumed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                      {meal.name}
                    </CardTitle>
                  </div>
                  
                  {/* BOTÃO DE CHECK (Gamificação) */}
                  <Button 
                    variant={isConsumed ? "secondary" : "outline"} 
                    size="icon" 
                    className={`rounded-full w-10 h-10 ${isConsumed ? 'bg-teal-100 text-teal-600 border-none' : 'text-slate-300 hover:text-teal-500 border-2'}`}
                    onClick={() => toggleMeal(meal.id)}
                  >
                    <CheckCircle2 className={`w-6 h-6 ${isConsumed ? 'fill-teal-600 text-white' : ''}`} />
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="divide-y divide-slate-50">
                    {meal.items.map((item: any) => (
                      <div key={item.id} className="p-4 flex items-center gap-4">
                        <div className={`w-14 shrink-0 bg-slate-100 rounded text-center py-1.5 font-bold text-sm ${isConsumed ? 'text-slate-400' : 'text-slate-700'}`}>
                          {item.quantity}g
                        </div>
                        <div className={isConsumed ? 'text-slate-500' : 'text-slate-800'}>
                          <p className="font-semibold">{item.food.name}</p>
                          {/* Opcional: mostrar macros por item de forma sutil */}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {Math.round(item.food.kcal * (item.quantity/100))} kcal
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* OBSERVAÇÕES ESPECÍFICAS DA REFEIÇÃO (Substituições) */}
                  {meal.notes && (
                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-sm text-slate-600 flex gap-3 items-start">
                      <div className="bg-white p-1 rounded shadow-sm shrink-0">
                        <Info className="w-4 h-4 text-sky-500" />
                      </div>
                      <p className="leading-relaxed"><span className="font-semibold text-slate-700">Substituições: </span>{meal.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

      </div>
    </div>
  )
}