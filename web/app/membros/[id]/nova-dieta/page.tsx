"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Search, Trash2, Utensils, CheckCircle2, FilePlus } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function NovaDietaPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [dietInfo, setDietInfo] = useState({ title: "Fase 1 - Adaptação", goal: "Emagrecimento" })
  const [targets] = useState({ kcal: 1800, pro: 140, carb: 180, fat: 55 })

  const [meals, setMeals] = useState([
    { id: `m${Date.now()}`, name: "Café da Manhã", time: "08:00", items: [] as any[] }
  ])


  const [activeMealId, setActiveMealId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [amountToAdd, setAmountToAdd] = useState(100)
  
  const [availableFoods, setAvailableFoods] = useState<any[]>([])
  
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  const [newFood, setNewFood] = useState({ name: "", kcal: 0, pro: 0, carb: 0, fat: 0 })

  useEffect(() => {
    fetchFoods()
  }, [])

  const fetchFoods = async () => {
    try {
      const response = await api.get('/foods')
      setAvailableFoods(response.data)
    } catch (error) {
      console.error("Erro ao buscar alimentos da base TACO", error)
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
    const newMeal = { id: `m${Date.now()}`, name: "Nova Refeição", time: "12:00", items: [] }
    setMeals([...meals, newMeal])
  }

  const removeMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId))
  }

  const addFoodToMeal = (food: any, quantity: number = amountToAdd) => {
    if (!activeMealId) return
    const newItem = { id: `i${Date.now()}`, quantity: quantity, food: food }
    
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
      toast.success("Alimento cadastrado com sucesso!")
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
        meals: meals.map(m => ({
          name: m.name,
          time: m.time,
          items: m.items.map(item => ({
            quantity: item.quantity,
            measure: "g",
            foodId: item.food.id 
          }))
        }))
      }

      await api.post('/diet-plans', payload)
      toast.success("Dieta salva com sucesso!")
      router.push(`/membros/${params.id}`) 
    } catch (error) {
      toast.error("Erro ao salvar a dieta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Prescrição Dietética</h1>
              <p className="text-slate-500">Montagem de cardápio em tempo real.</p>
            </div>
          </div>
          <Button onClick={handleSaveDiet} disabled={loading} className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-lg shadow-md">
            <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "Salvando..." : "Salvar Dieta"}
          </Button>
        </div>

        {/* ... LADO ESQUERDO: TOTALIZADOR (Sem alterações visuais, apenas usando a lógica real) */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-3 space-y-6 sticky top-8">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-slate-800 p-6 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Status da Dieta</h3>
                <Input value={dietInfo.title} onChange={e => setDietInfo({...dietInfo, title: e.target.value})} className="bg-slate-700 border-none text-white font-bold text-lg mb-3" />
                
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Calorias (Kcal)</span>
                    <span className="font-bold">{currentTotals.kcal} / {targets.kcal}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400" style={{ width: `${Math.min((currentTotals.kcal / targets.kcal) * 100, 100)}%` }}></div>
                  </div>
                  {currentTotals.kcal > targets.kcal && <span className="text-xs text-rose-400 font-bold mt-1 block">Aviso: Ultrapassou a meta!</span>}
                </div>
              </div>

              <CardContent className="p-6 space-y-5 bg-white">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">Distribuição de Macros</h4>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-rose-600">Proteína</span>
                    <span className="font-bold text-slate-700">{currentTotals.pro}g <span className="text-slate-400 text-xs">/ {targets.pro}g</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${Math.min((currentTotals.pro / targets.pro) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-emerald-600">Carboidrato</span>
                    <span className="font-bold text-slate-700">{currentTotals.carb}g <span className="text-slate-400 text-xs">/ {targets.carb}g</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min((currentTotals.carb / targets.carb) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-amber-600">Gordura</span>
                    <span className="font-bold text-slate-700">{currentTotals.fat}g <span className="text-slate-400 text-xs">/ {targets.fat}g</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.min((currentTotals.fat / targets.fat) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LADO DIREITO: O CANVAS */}
          <div className="lg:col-span-9 space-y-6">
            {meals.map((meal, index) => (
              <Card key={meal.id} className="border border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3 w-1/2">
                    <Input value={meal.time} onChange={(e) => {
                      const newMeals = [...meals]; newMeals[index].time = e.target.value; setMeals(newMeals);
                    }} className="w-24 font-bold bg-white text-center" />
                    <Input value={meal.name} onChange={(e) => {
                      const newMeals = [...meals]; newMeals[index].name = e.target.value; setMeals(newMeals);
                    }} className="font-bold bg-white border-none shadow-none text-lg" />
                  </div>
                  <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => removeMeal(meal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                
                <CardContent className="p-0">
                  {meal.items.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Nenhum alimento nesta refeição.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {meal.items.map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-16 bg-white border border-slate-200 rounded text-center py-1 font-bold text-slate-700 text-sm">
                              {item.quantity}g
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{item.food.name}</p>
                              <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                <span>Kcal: {Math.round(item.food.kcal * (item.quantity/100))}</span>
                                <span className="text-rose-500">PTN: {Math.round(item.food.protein * (item.quantity/100))}g</span>
                                <span className="text-emerald-500">CHO: {Math.round(item.food.carbs * (item.quantity/100))}g</span>
                                <span className="text-amber-500">GOR: {Math.round(item.food.fat * (item.quantity/100))}g</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeFoodFromMeal(meal.id, item.id)} className="text-slate-400 hover:text-rose-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <Button variant="outline" className="w-full border-dashed text-teal-600 hover:bg-teal-50" onClick={() => setActiveMealId(meal.id)}>
                      <Search className="w-4 h-4 mr-2" /> Buscar e Adicionar Alimento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addMeal} className="w-full h-14 border-2 border-dashed border-slate-300 bg-transparent hover:bg-slate-50 text-slate-600 font-semibold text-lg">
              <Plus className="w-5 h-5 mr-2" /> Adicionar Novo Horário / Refeição
            </Button>
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
                  {isCreatingManual ? "Cadastrar Alimento Manual" : "Adicionar Alimento (Base TACO)"}
                </h3>
                <Button variant="outline" size="sm" onClick={() => setIsCreatingManual(!isCreatingManual)} className="text-teal-600 border-teal-200 hover:bg-teal-50">
                  {isCreatingManual ? <><Search className="w-4 h-4 mr-2"/> Voltar para Busca</> : <><FilePlus className="w-4 h-4 mr-2"/> Cadastrar Manualmente</>}
                </Button>
              </div>

              {!isCreatingManual && (
                <div className="flex gap-3">
                  <Input placeholder="Pesquisar ex: Frango, Ovo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus className="bg-white" />
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
                    <Input placeholder="Ex: Bolo da Avó, Whey Concentrado Marca X..." value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} />
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
                  {availableFoods.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(food => (
                    <div key={food.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer border-b border-slate-50" onClick={() => addFoodToMeal(food)}>
                      <div>
                        <p className="font-semibold text-slate-800">{food.name}</p>
                        <p className="text-xs text-slate-500">Por 100g: {food.kcal} kcal | PTN {food.protein}g</p>
                      </div>
                      <Button size="sm" variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200">
                        Adicionar
                      </Button>
                    </div>
                  ))}
                  {availableFoods.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-slate-500 mb-4">Nenhum alimento encontrado.</p>
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