"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Search, Trash2, Utensils, CheckCircle2, FilePlus, Target, Printer, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function NovaDietaPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isRestored, setIsRestored] = useState(false)

  const [dietInfo, setDietInfo] = useState({ 
    title: "Fase 1 - Adaptação", 
    goal: "Emagrecimento",
    notes: "" 
  })

  const [targets, setTargets] = useState({ kcal: 2000, pro: 150, carb: 200, fat: 60 })

  const [meals, setMeals] = useState([
    { id: `m${Date.now()}`, name: "Café da Manhã", time: "08:00", notes: "", items: [] as any[] }
  ])

  const [activeMealId, setActiveMealId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false) // Novo estado para o loading da pesquisa
  const [amountToAdd, setAmountToAdd] = useState(100)
  
  const [availableFoods, setAvailableFoods] = useState<any[]>([])
  
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  const [newFood, setNewFood] = useState({ name: "", kcal: 0, pro: 0, carb: 0, fat: 0 })

  useEffect(() => {
    fetchFoods()
    loadInitialData() 
  }, [])

  const loadInitialData = async () => {
    const draftKey = `diet_draft_${params.id}`
    const savedDraft = localStorage.getItem(draftKey)

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setDietInfo(parsed.dietInfo)
        setTargets(parsed.targets)
        setMeals(parsed.meals)
        setIsRestored(true)
        toast.info("Rascunho recuperado. Continue de onde parou! 📝")
        return
      } catch (error) {
        console.error("Erro ao ler rascunho", error)
      }
    }
    
    await fetchActiveDiet()
    setIsRestored(true)
  }

  useEffect(() => {
    if (!isRestored) return 
    const draftKey = `diet_draft_${params.id}`
    const draftData = { dietInfo, targets, meals }
    localStorage.setItem(draftKey, JSON.stringify(draftData))
  }, [dietInfo, targets, meals, isRestored, params.id])

  // 🚀 O DEBOUNCE: Escuta a digitação e pesquisa na API híbrida
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true)
        try {
          // Bate na nossa nova rota que busca no Local + FatSecret
          const response = await api.get(`/foods/search?q=${searchTerm}`)
          setAvailableFoods(response.data)
        } catch (error) {
          console.error("Erro na busca de alimentos", error)
        } finally {
          setIsSearching(false)
        }
      } else if (searchTerm.length === 0) {
        fetchFoods() // Volta para a lista padrão se apagar tudo
      }
    }, 500) // Espera meio segundo após parar de digitar

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  const fetchFoods = async () => {
    try {
      const response = await api.get('/foods')
      setAvailableFoods(response.data)
    } catch (error) {
      console.error("Erro ao buscar alimentos", error)
    }
  }

  const fetchActiveDiet = async () => {
    try {
      const response = await api.get(`/diet-plans/user/${params.id}/active`)
      const diet = response.data

      if (diet) {
        setDietInfo({ title: diet.title, goal: diet.goal, notes: diet.notes || "" })
        setTargets({ kcal: diet.targetKcal, pro: diet.proteinG, carb: diet.carbsG, fat: diet.fatG })
        
        const formattedMeals = diet.meals.map((m: any) => ({
          id: m.id,
          name: m.name,
          time: m.time,
          notes: m.notes || "",
          items: m.items.map((i: any) => ({
            id: i.id,
            quantity: i.quantity,
            food: i.food 
          }))
        }))
        
        setMeals(formattedMeals)
      }
    } catch (error) {
      console.error("Erro ao buscar dieta ativa", error)
    }
  }

  const currentTotals = useMemo(() => {
    let kcal = 0, pro = 0, carb = 0, fat = 0
    meals.forEach(meal => {
      meal.items.forEach(item => {
        const ratio = item.quantity / 100
        kcal += item.food.kcal * ratio
        pro += item.food.protein * ratio
        carb += item.food.carbs * ratio
        fat += item.food.fat * ratio
      })
    })
    return { kcal: Math.round(kcal), pro: Math.round(pro), carb: Math.round(carb), fat: Math.round(fat) }
  }, [meals])

  const addMeal = () => {
    const newMeal = { id: `m${Date.now()}`, name: "Nova Refeição", time: "12:00", notes: "", items: [] }
    setMeals([...meals, newMeal])
  }

  const removeMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId))
  }

  // 🪄 O ASSIMILADOR: Adiciona à refeição, salvando no banco local se for do FatSecret
  const addFoodToMeal = async (food: any, quantity: number = amountToAdd) => {
    if (!activeMealId) return

    let finalFood = food

    // Se veio do FatSecret, salvamos silenciosamente no nosso banco primeiro
    if (food.isExternal) {
      toast.loading("A importar dados do alimento...", { id: "import-food" })
      try {
        const payload = {
          name: food.name,
          baseUnit: food.baseUnit,
          baseAmount: food.baseAmount,
          kcal: food.kcal,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat
        }
        const res = await api.post('/foods', payload)
        finalFood = res.data // Pega a ID oficial gerada pelo nosso PostgreSQL
        toast.success("Alimento importado com sucesso!", { id: "import-food" })
      } catch (error) {
        toast.error("Erro ao importar alimento global.", { id: "import-food" })
        return // Aborta se falhar
      }
    }

    const newItem = { id: `i${Date.now()}`, quantity: quantity, food: finalFood }
    
    setMeals(meals.map(m => {
      if (m.id === activeMealId) return { ...m, items: [...m.items, newItem] }
      return m
    }))
    closeModal()
  }

  const handleCreateManualFood = async () => {
    if (!newFood.name.trim()) return

    try {
      const customFoodPayload = {
        name: newFood.name,
        baseUnit: "100g",
        baseAmount: 100,
        kcal: Number(newFood.kcal),
        protein: Number(newFood.pro),
        carbs: Number(newFood.carb),
        fat: Number(newFood.fat)
      }

      const response = await api.post('/foods', customFoodPayload)
      const createdFood = response.data

      setAvailableFoods([createdFood, ...availableFoods])
      addFoodToMeal(createdFood, amountToAdd)
      toast.success("Alimento manual cadastrado com sucesso!")
    } catch (error) {
      toast.error("Erro ao cadastrar alimento manual.")
    }
  }

  const removeFoodFromMeal = (mealId: string, itemId: string) => {
    setMeals(meals.map(m => {
      if (m.id === mealId) return { ...m, items: m.items.filter(i => i.id !== itemId) }
      return m
    }))
  }

  const closeModal = () => {
    setActiveMealId(null)
    setSearchTerm("")
    setAmountToAdd(100)
    setIsCreatingManual(false)
    setNewFood({ name: "", kcal: 0, pro: 0, carb: 0, fat: 0 })
  }

  const handleSaveDiet = async () => {
    setLoading(true)
    try {
      const payload = {
        title: dietInfo.title,
        goal: dietInfo.goal,
        targetKcal: targets.kcal,
        proteinG: targets.pro,
        carbsG: targets.carb,
        fatG: targets.fat,
        userId: params.id, 
        notes: dietInfo.notes,
        meals: meals.map(m => ({
          name: m.name,
          time: m.time,
          notes: m.notes,
          items: m.items.map(item => ({
            quantity: item.quantity,
            measure: "g",
            foodId: item.food.id // Aqui usamos a ID oficial com segurança
          }))
        }))
      }

      await api.post('/diet-plans', payload)
      localStorage.removeItem(`diet_draft_${params.id}`)
      
      toast.success("Dieta salva com sucesso!")
      router.push(`/membros/${params.id}`) 
    } catch (error) {
      toast.error("Erro ao salvar a dieta.")
    } finally {
      setLoading(false)
    }
  }

  const discardDraft = () => {
    localStorage.removeItem(`diet_draft_${params.id}`)
    window.location.reload() 
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-4">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-6 print:px-0 print:max-w-4xl print:space-y-0">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-800">Prescrição Dietética</h1>
                {localStorage.getItem(`diet_draft_${params.id}`) && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Save className="w-3 h-3" /> Rascunho Salvo
                  </span>
                )}
              </div>
              <p className="text-slate-500">Ajustes finais e orientações clínicas.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localStorage.getItem(`diet_draft_${params.id}`) && (
              <Button onClick={discardDraft} variant="ghost" className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 mr-2">
                Descartar Rascunho
              </Button>
            )}
            <Button onClick={() => window.print()} variant="outline" className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-100">
              <Printer className="w-5 h-5 mr-2" /> Gerar PDF
            </Button>
            <Button onClick={handleSaveDiet} disabled={loading} className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-lg shadow-md">
              <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "Salvando..." : "Finalizar e Ativar Plano"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start print:block print:gap-0">
          
          {/* LADO ESQUERDO: METAS E MACROS */}
          <div className="lg:col-span-3 space-y-6 sticky top-8 print:hidden">
             
             <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-800 text-white border-b-4 border-teal-500 py-4">
                  <CardTitle className="text-lg">Metas do Plano</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Nome da Fase</Label>
                    <Input value={dietInfo.title} onChange={(e) => setDietInfo({...dietInfo, title: e.target.value})} className="font-semibold text-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Objetivo Principal</Label>
                    <Input value={dietInfo.goal} onChange={(e) => setDietInfo({...dietInfo, goal: e.target.value})} className="font-semibold text-slate-800" />
                  </div>
                </CardContent>
             </Card>

             <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-teal-600" /> Controle de Macros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-slate-500 uppercase">Meta de Kcal</Label>
                   <Input type="number" value={targets.kcal} onChange={(e) => setTargets({...targets, kcal: Number(e.target.value)})} className="font-bold text-slate-800" />
                </div>

                <div className="space-y-2">
                  <div className={`flex justify-between items-center p-3 rounded-lg border transition-all duration-500 ${currentTotals.kcal > targets.kcal ? 'bg-rose-50 border-rose-200' : currentTotals.kcal >= targets.kcal * 0.9 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="font-bold text-slate-600 text-sm">Calculado</span>
                    <div className="flex items-center gap-1">
                      <span className={`font-black text-xl transition-colors ${currentTotals.kcal > targets.kcal ? 'text-rose-600 animate-pulse' : currentTotals.kcal >= targets.kcal * 0.9 ? 'text-amber-600' : 'text-teal-600'}`}>
                        {currentTotals.kcal}
                      </span>
                      <span className="text-slate-400 text-sm">kcal</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ease-out ${currentTotals.kcal > targets.kcal ? 'bg-rose-500' : currentTotals.kcal >= targets.kcal * 0.9 ? 'bg-amber-500' : 'bg-teal-500'}`}
                      style={{ width: `${Math.min((currentTotals.kcal / (targets.kcal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-500">PTN (g)</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold transition-colors ${currentTotals.pro > targets.pro ? 'text-rose-500 animate-pulse' : currentTotals.pro >= targets.pro * 0.9 ? 'text-amber-500' : 'text-slate-700'}`}>{currentTotals.pro}</span>
                        <span className="text-slate-300">/</span>
                        <Input type="number" value={targets.pro} onChange={(e) => setTargets({...targets, pro: Number(e.target.value)})} className="w-16 h-7 text-xs text-center p-1 font-medium" />
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${currentTotals.pro > targets.pro ? 'bg-rose-500' : currentTotals.pro >= targets.pro * 0.9 ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${Math.min((currentTotals.pro / (targets.pro || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-500">CARB (g)</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold transition-colors ${currentTotals.carb > targets.carb ? 'text-rose-500 animate-pulse' : currentTotals.carb >= targets.carb * 0.9 ? 'text-amber-500' : 'text-slate-700'}`}>{currentTotals.carb}</span>
                        <span className="text-slate-300">/</span>
                        <Input type="number" value={targets.carb} onChange={(e) => setTargets({...targets, carb: Number(e.target.value)})} className="w-16 h-7 text-xs text-center p-1 font-medium" />
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${currentTotals.carb > targets.carb ? 'bg-rose-500' : currentTotals.carb >= targets.carb * 0.9 ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${Math.min((currentTotals.carb / (targets.carb || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-500">GOR (g)</Label>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold transition-colors ${currentTotals.fat > targets.fat ? 'text-rose-500 animate-pulse' : currentTotals.fat >= targets.fat * 0.9 ? 'text-amber-500' : 'text-slate-700'}`}>{currentTotals.fat}</span>
                        <span className="text-slate-300">/</span>
                        <Input type="number" value={targets.fat} onChange={(e) => setTargets({...targets, fat: Number(e.target.value)})} className="w-16 h-7 text-xs text-center p-1 font-medium" />
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${currentTotals.fat > targets.fat ? 'bg-rose-500' : currentTotals.fat >= targets.fat * 0.9 ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${Math.min((currentTotals.fat / (targets.fat || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>

          {/* LADO DIREITO: CANVAS DE REFEIÇÕES E PDF */}
          <div className="lg:col-span-9 space-y-6 print:w-full print:space-y-4">
            
            <div className="hidden print:block mb-8 border-b-2 border-teal-600 pb-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Plano Alimentar Prescrito</h1>
                  <h2 className="text-xl text-slate-600 mt-2 font-medium">{dietInfo.title} • Foco: {dietInfo.goal}</h2>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Gerado em: {new Date().toLocaleDateString('pt-PT')}</p>
                  <p className="font-semibold text-teal-600 mt-1">SafeMove B2B</p>
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <span className="bg-slate-100 px-4 py-1.5 rounded-md text-sm font-bold text-slate-700">Kcal: {targets.kcal}</span>
                <span className="bg-slate-100 px-4 py-1.5 rounded-md text-sm font-bold text-rose-600">PTN: {targets.pro}g</span>
                <span className="bg-slate-100 px-4 py-1.5 rounded-md text-sm font-bold text-emerald-600">CARB: {targets.carb}g</span>
                <span className="bg-slate-100 px-4 py-1.5 rounded-md text-sm font-bold text-amber-600">GOR: {targets.fat}g</span>
              </div>
            </div>

            {meals.map((meal, index) => (
              <Card key={meal.id} className="border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-slate-300 print:break-inside-avoid">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between print:bg-slate-100 print:py-2">
                  <div className="flex items-center gap-3 w-1/2 print:w-full">
                    <Input value={meal.time} onChange={(e) => { const newMeals = [...meals]; newMeals[index].time = e.target.value; setMeals(newMeals); }} className="w-24 font-bold bg-white text-center print:hidden" />
                    <Input value={meal.name} onChange={(e) => { const newMeals = [...meals]; newMeals[index].name = e.target.value; setMeals(newMeals); }} className="font-bold bg-white border-none shadow-none text-lg print:hidden" />
                    
                    <span className="hidden print:inline font-black text-teal-700 px-2">{meal.time}</span>
                    <span className="hidden print:inline font-bold text-slate-800 text-lg uppercase">{meal.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-rose-500 print:hidden" onClick={() => removeMeal(meal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {meal.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 px-4 hover:bg-slate-50 transition-colors print:py-2">
                        <div className="flex items-center gap-4">
                           <div className="w-16 text-center font-bold text-slate-600 bg-slate-100 py-1 rounded text-sm print:bg-transparent print:border print:border-slate-200">{item.quantity}g</div>
                           <div className="font-semibold text-slate-700">{item.food.name}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-500 print:hidden" onClick={() => removeFoodFromMeal(meal.id, item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 bg-slate-50/30 flex flex-col gap-4 print:p-3 print:bg-transparent">
                    <Button variant="outline" className="w-full border-dashed text-teal-600 print:hidden" onClick={() => setActiveMealId(meal.id)}>
                      <Search className="w-4 h-4 mr-2" /> Buscar e Adicionar Alimento
                    </Button>

                    <div className="mt-2 print:hidden">
                      <Label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                        <Plus className="w-3 h-3 text-teal-500"/> Substituições e Observações
                      </Label>
                      <textarea value={meal.notes || ""} onChange={(e) => { const newMeals = [...meals]; newMeals[index].notes = e.target.value; setMeals(newMeals); }} placeholder='Ex: "Substituir Frango por 4 Ovos cozidos ou 120g de Tilápia. Evitar sucos nesta refeição."' className="w-full min-h-[80px] p-3 text-sm bg-white border border-slate-200 rounded-lg outline-none" />
                    </div>

                    {meal.notes && (
                      <div className="hidden print:block mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 italic border-l-4 border-teal-500">
                        <strong className="text-teal-700 not-italic mr-1">Substituições:</strong> {meal.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addMeal} className="w-full h-14 border-2 border-dashed border-slate-300 bg-transparent hover:bg-slate-50 text-slate-600 font-semibold text-lg print:hidden">
              <Plus className="w-5 h-5 mr-2" /> Adicionar Novo Horário / Refeição
            </Button>

            <Card className="border-0 shadow-lg bg-teal-900 text-white mt-12 overflow-hidden print:hidden">
              <CardHeader className="border-b border-teal-800 bg-teal-950/30">
                <CardTitle className="text-lg flex items-center gap-2"><FilePlus className="w-5 h-5 text-teal-400" /> Orientações Gerais e Conduta do Plano</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <textarea value={dietInfo.notes} onChange={(e) => setDietInfo({...dietInfo, notes: e.target.value})} placeholder="Escreva as diretrizes do plano: hidratação, sono, suplementação geral..." className="w-full min-h-[150px] p-4 bg-teal-950/40 border border-teal-700/50 rounded-xl text-teal-50 outline-none" />
              </CardContent>
            </Card>

            {dietInfo.notes && (
              <div className="hidden print:block mt-8 p-6 border-2 border-teal-600 bg-teal-50/50 rounded-xl break-inside-avoid">
                <h3 className="text-lg font-bold text-teal-800 mb-3 flex items-center gap-2">
                  <FilePlus className="w-5 h-5" /> Orientações Gerais e Conduta
                </h3>
                <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">{dietInfo.notes}</p>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* MODAL DE PESQUISA / CADASTRO */}
      {activeMealId && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={closeModal}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-teal-600" /> 
                  {isCreatingManual ? "Cadastrar Alimento Manual" : "Adicionar Alimento (Global)"}
                </h3>
                <Button variant="outline" size="sm" onClick={() => setIsCreatingManual(!isCreatingManual)} className="text-teal-600 border-teal-200 hover:bg-teal-50">
                  {isCreatingManual ? <><Search className="w-4 h-4 mr-2"/> Voltar para Busca</> : <><FilePlus className="w-4 h-4 mr-2"/> Cadastrar Manualmente</>}
                </Button>
              </div>

              {!isCreatingManual && (
                <div className="flex gap-3 relative">
                  <Input 
                    placeholder="Pesquise no FatSecret ou banco local..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    autoFocus 
                    className="bg-white pr-10" 
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-teal-500 animate-spin absolute right-40 top-3" />
                  )}
                  <div className="flex items-center gap-2 bg-white px-3 rounded-md border border-slate-200 w-32 shrink-0">
                    <Input type="number" value={amountToAdd} onChange={e => setAmountToAdd(Number(e.target.value))} className="border-0 p-0 h-8 text-center font-bold" />
                    <span className="text-sm font-semibold text-slate-400">g</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="overflow-y-auto p-2 flex-1">
              {isCreatingManual ? (
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Nome do Alimento / Receita</Label>
                    <Input placeholder="Ex: Bolo da Avó, Mistura X..." value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} />
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-4 text-center">Referência Nutricional (Por 100g do alimento)</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-600">Kcal</Label>
                        <Input type="number" value={newFood.kcal} onChange={e => setNewFood({...newFood, kcal: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-rose-600">Proteína (g)</Label>
                        <Input type="number" value={newFood.pro} onChange={e => setNewFood({...newFood, pro: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-emerald-600">Carbo (g)</Label>
                        <Input type="number" value={newFood.carb} onChange={e => setNewFood({...newFood, carb: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-amber-600">Gordura (g)</Label>
                        <Input type="number" value={newFood.fat} onChange={e => setNewFood({...newFood, fat: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 rounded-md border border-slate-200 w-48">
                      <Label className="text-xs whitespace-nowrap text-slate-500">Adicionar à dieta:</Label>
                      <Input type="number" value={amountToAdd} onChange={e => setAmountToAdd(Number(e.target.value))} className="border-0 p-0 h-10 text-center font-bold bg-transparent" />
                      <span className="text-sm font-semibold text-slate-400">g</span>
                    </div>
                    <Button onClick={handleCreateManualFood} className="flex-1 h-10 bg-teal-600 hover:bg-teal-700">
                      Salvar Alimento e Adicionar
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {availableFoods.map(food => (
                    <div key={food.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer border-b border-slate-50" onClick={() => addFoodToMeal(food)}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{food.name}</p>
                          {food.isExternal && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Global</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Por 100g: {food.kcal} kcal | PTN {food.protein}g</p>
                      </div>
                      <Button size="sm" variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200">
                        Adicionar
                      </Button>
                    </div>
                  ))}
                  {availableFoods.length === 0 && !isSearching && searchTerm.length > 0 && (
                    <div className="p-8 text-center">
                      <p className="text-slate-500 mb-4">Nenhum alimento encontrado na base global.</p>
                      <Button variant="outline" onClick={() => setIsCreatingManual(true)}>
                        <FilePlus className="w-4 h-4 mr-2" /> Cadastrar Manualmente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}