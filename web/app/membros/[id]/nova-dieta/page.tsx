"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Search, Trash2, Edit2, CheckCircle2, FilePlus, Target, Printer, Save, Loader2, Database } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function NovaDietaPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isRestored, setIsRestored] = useState(false)

  const [dietInfo, setDietInfo] = useState({ title: "Fase 1 - Adaptação", goal: "Emagrecimento", notes: "" })
  const [targets, setTargets] = useState({ kcal: 2000, pro: 150, carb: 200, fat: 60 })

  const [meals, setMeals] = useState([
    { id: `m${Date.now()}`, name: "Café da Manhã", time: "08:00", notes: "", items: [] as any[] }
  ])

  const [activeMealId, setActiveMealId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [amountToAdd, setAmountToAdd] = useState(100)
  
  const [selectedSource, setSelectedSource] = useState("TODAS")
  const [availableFoods, setAvailableFoods] = useState<any[]>([])
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null)

  const [newFood, setNewFood] = useState({ 
    name: "", kcal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sodium: 0, calcium: 0, iron: 0 
  })

  useEffect(() => { if (searchTerm.length === 0) fetchFoods(selectedSource) }, [selectedSource])
  useEffect(() => { loadInitialData() }, [])

  const loadInitialData = async () => {
    const draftKey = `diet_draft_${params.id}`
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setDietInfo(parsed.dietInfo); setTargets(parsed.targets); setMeals(parsed.meals); setIsRestored(true)
        toast.info("Rascunho recuperado. Continue de onde parou! 📝")
        return
      } catch (error) { console.error("Erro ao ler rascunho", error) }
    }
    await fetchActiveDiet()
    setIsRestored(true)
  }

  useEffect(() => {
    if (!isRestored) return 
    localStorage.setItem(`diet_draft_${params.id}`, JSON.stringify({ dietInfo, targets, meals }))
  }, [dietInfo, targets, meals, isRestored, params.id])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true)
        try {
          const res = await api.get(`/foods/search?q=${searchTerm}&source=${selectedSource}`)
          setAvailableFoods(res.data)
        } catch (error) { console.error("Erro", error) } finally { setIsSearching(false) }
      } else if (searchTerm.length === 0) { fetchFoods(selectedSource) }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, selectedSource])

  const fetchFoods = async (source = "TODAS") => {
    try {
      const res = await api.get(`/foods?source=${source}`)
      setAvailableFoods(res.data)
    } catch (error) { console.error("Erro", error) }
  }

  const fetchActiveDiet = async () => {
    try {
      const res = await api.get(`/diet-plans/user/${params.id}/active`)
      if (res.data) {
        setDietInfo({ title: res.data.title, goal: res.data.goal, notes: res.data.notes || "" })
        setTargets({ kcal: res.data.targetKcal, pro: res.data.proteinG, carb: res.data.carbsG, fat: res.data.fatG })
        setMeals(res.data.meals.map((m: any) => ({
          id: m.id, name: m.name, time: m.time, notes: m.notes || "",
          items: m.items.map((i: any) => ({ id: i.id, quantity: i.quantity, food: i.food }))
        })))
      }
    } catch (error) { console.error("Erro", error) }
  }

  const calcMacro = (value: number, baseAmount: number = 100, targetAmount: number) => {
    return Number(((value / baseAmount) * targetAmount).toFixed(1))
  }

  const currentTotals = useMemo(() => {
    let kcal = 0, pro = 0, carb = 0, fat = 0
    meals.forEach(meal => {
      meal.items.forEach(item => {
        kcal += calcMacro(item.food.kcal, item.food.baseAmount, item.quantity)
        pro += calcMacro(item.food.protein, item.food.baseAmount, item.quantity)
        carb += calcMacro(item.food.carbs, item.food.baseAmount, item.quantity)
        fat += calcMacro(item.food.fat, item.food.baseAmount, item.quantity)
      })
    })
    return { kcal: Math.round(kcal), pro: Math.round(pro), carb: Math.round(carb), fat: Math.round(fat) }
  }, [meals])

  const addMeal = () => setMeals([...meals, { id: `m${Date.now()}`, name: "Nova Refeição", time: "12:00", notes: "", items: [] }])
  const removeMeal = (id: string) => setMeals(meals.filter(m => m.id !== id))
  
  const addFoodToMeal = async (food: any, quantity: number = amountToAdd) => {
    if (!activeMealId) return
    const newItem = { id: `i${Date.now()}`, quantity, food }
    setMeals(meals.map(m => m.id === activeMealId ? { ...m, items: [...m.items, newItem] } : m))
    closeModal()
  }

  const removeFoodFromMeal = (mealId: string, itemId: string) => {
    setMeals(meals.map(m => m.id === mealId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m))
  }

  const handleDeleteFood = async (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation() 
    if (!confirm("Tem a certeza que deseja apagar este alimento do seu banco de dados?")) return
    try {
      await api.delete(`/foods/${foodId}`)
      setAvailableFoods(availableFoods.filter(f => f.id !== foodId))
      toast.success("Alimento apagado!")
    } catch (error) { toast.error("Erro ao apagar alimento") }
  }

  const handleEditFood = (e: React.MouseEvent, food: any) => {
    e.stopPropagation()
    setEditingFoodId(food.id)
    setNewFood({
      name: food.name, kcal: food.kcal, pro: food.protein, carb: food.carbs, fat: food.fat,
      fiber: food.fiber || 0, sodium: food.sodium || 0, calcium: food.calcium || 0, iron: food.iron || 0
    })
    setIsCreatingManual(true)
  }

  const handleSaveManualFood = async () => {
    if (!newFood.name.trim()) return
    const payload = {
      name: newFood.name, baseUnit: "100g", baseAmount: 100,
      kcal: Number(newFood.kcal), protein: Number(newFood.pro), carbs: Number(newFood.carb), fat: Number(newFood.fat),
      fiber: Number(newFood.fiber), sodium: Number(newFood.sodium), calcium: Number(newFood.calcium), iron: Number(newFood.iron),
      source: "MANUAL" 
    }

    try {
      if (editingFoodId) {
        // Atualiza
        const res = await api.put(`/foods/${editingFoodId}`, payload)
        setAvailableFoods(availableFoods.map(f => f.id === editingFoodId ? res.data : f))
        toast.success("Alimento atualizado!")
      } else {
        // Cria novo
        const res = await api.post('/foods', payload)
        setAvailableFoods([res.data, ...availableFoods])
        addFoodToMeal(res.data, amountToAdd)
        toast.success("Alimento cadastrado e adicionado!")
      }
      setIsCreatingManual(false)
      setEditingFoodId(null)
    } catch (error) { toast.error("Erro ao guardar alimento.") }
  }

  const closeModal = () => {
    setActiveMealId(null); setSearchTerm(""); setAmountToAdd(100); setIsCreatingManual(false); setEditingFoodId(null)
    setNewFood({ name: "", kcal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sodium: 0, calcium: 0, iron: 0 })
  }

  const handleSaveDiet = async () => {
    setLoading(true)
    try {
      const payload = {
        title: dietInfo.title, goal: dietInfo.goal, targetKcal: targets.kcal, proteinG: targets.pro, carbsG: targets.carb, fatG: targets.fat, userId: params.id, notes: dietInfo.notes,
        meals: meals.map(m => ({ name: m.name, time: m.time, notes: m.notes, items: m.items.map(item => ({ quantity: item.quantity, measure: "g", foodId: item.food.id }))}))
      }
      await api.post('/diet-plans', payload)
      localStorage.removeItem(`diet_draft_${params.id}`)
      toast.success("Dieta salva com sucesso!")
      router.push(`/membros/${params.id}`) 
    } catch (error) { toast.error("Erro ao salvar a dieta.") } finally { setLoading(false) }
  }

  const discardDraft = () => { localStorage.removeItem(`diet_draft_${params.id}`); window.location.reload() }

  const getSourceBadgeColor = (source: string) => {
    if (source === 'TACO') return 'bg-emerald-100 text-emerald-700'
    if (source === 'IBGE') return 'bg-blue-100 text-blue-700'
    if (source === 'TBCA') return 'bg-amber-100 text-amber-700'
    if (source === 'MANUAL') return 'bg-purple-100 text-purple-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-4">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-6 print:px-0 print:max-w-4xl print:space-y-0">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}><Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200"><ArrowLeft className="w-5 h-5 text-slate-600" /></Button></Link>
            <div>
              <div className="flex items-center gap-3"><h1 className="text-3xl font-bold text-slate-800">Prescrição Dietética</h1>{localStorage.getItem(`diet_draft_${params.id}`) && (<span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Save className="w-3 h-3" /> Rascunho</span>)}</div>
              <p className="text-slate-500">Ajustes finais e orientações clínicas.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localStorage.getItem(`diet_draft_${params.id}`) && (<Button onClick={discardDraft} variant="ghost" className="text-rose-500">Descartar</Button>)}
            <Button onClick={() => window.print()} variant="outline" className="h-12 border-slate-300 text-slate-700"><Printer className="w-5 h-5 mr-2" /> Gerar PDF</Button>
            <Button onClick={handleSaveDiet} disabled={loading} className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-lg shadow-md"><CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "Salvando..." : "Finalizar Plano"}</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start print:block print:gap-0">
          
          {/* ESQUERDA: METAS */}
          <div className="lg:col-span-3 space-y-6 sticky top-8 print:hidden">
             <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-800 text-white border-b-4 border-teal-500 py-4"><CardTitle className="text-lg">Metas</CardTitle></CardHeader>
                <CardContent className="p-5 space-y-6">
                  <div className="space-y-2"><Label className="text-xs font-bold text-slate-500">Fase</Label><Input value={dietInfo.title} onChange={(e) => setDietInfo({...dietInfo, title: e.target.value})} className="font-semibold" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold text-slate-500">Objetivo</Label><Input value={dietInfo.goal} onChange={(e) => setDietInfo({...dietInfo, goal: e.target.value})} className="font-semibold" /></div>
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
                  {[
                    { label: 'PTN (g)', current: currentTotals.pro, target: targets.pro, set: (v: number) => setTargets({...targets, pro: v}) },
                    { label: 'CARB (g)', current: currentTotals.carb, target: targets.carb, set: (v: number) => setTargets({...targets, carb: v}) },
                    { label: 'GOR (g)', current: currentTotals.fat, target: targets.fat, set: (v: number) => setTargets({...targets, fat: v}) },
                  ].map(m => (
                    <div key={m.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-500">{m.label}</Label>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold transition-colors ${m.current > m.target ? 'text-rose-500 animate-pulse' : m.current >= m.target * 0.9 ? 'text-amber-500' : 'text-slate-700'}`}>{m.current}</span>
                          <span className="text-slate-300">/</span>
                          <Input type="number" value={m.target} onChange={(e) => m.set(Number(e.target.value))} className="w-16 h-7 text-xs text-center p-1 font-medium" />
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${m.current > m.target ? 'bg-rose-500' : m.current >= m.target * 0.9 ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${Math.min((m.current / (m.target || 1)) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DIREITA: REFEIÇÕES */}
          <div className="lg:col-span-9 space-y-6 print:w-full">
            {meals.map((meal, index) => (
              <Card key={meal.id} className="border border-slate-200 overflow-hidden print:border-slate-300">
                <CardHeader className="bg-slate-50 py-3 flex flex-row items-center justify-between">
                  <div className="flex gap-3 w-1/2">
                    <Input value={meal.time} onChange={(e) => { const n = [...meals]; n[index].time = e.target.value; setMeals(n) }} className="w-24 font-bold text-center" />
                    <Input value={meal.name} onChange={(e) => { const n = [...meals]; n[index].name = e.target.value; setMeals(n) }} className="font-bold border-none shadow-none text-lg" />
                  </div>
                  <Button variant="ghost" className="text-rose-500" onClick={() => removeMeal(meal.id)}><Trash2 className="w-4 h-4" /></Button>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {meal.items.map((item) => (
                      <div key={item.id} className="flex justify-between p-3 px-4 hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                           <div className="w-16 text-center font-bold text-slate-600 bg-slate-100 py-1 rounded">{item.quantity}g</div>
                           <div className="flex flex-col">
                              {/* 🌟 MATEMÁTICA NA LISTA DA DIETA */}
                              <span className="font-semibold text-slate-700">{item.food.name}</span>
                              <span className="text-xs text-slate-500 font-medium">
                                {calcMacro(item.food.kcal, item.food.baseAmount, item.quantity)} kcal | 
                                <span className="text-rose-600 ml-1">P: {calcMacro(item.food.protein, item.food.baseAmount, item.quantity)}g</span> | 
                                <span className="text-emerald-600 ml-1">C: {calcMacro(item.food.carbs, item.food.baseAmount, item.quantity)}g</span> | 
                                <span className="text-amber-600 ml-1">G: {calcMacro(item.food.fat, item.food.baseAmount, item.quantity)}g</span>
                              </span>
                           </div>
                        </div>
                        <Button variant="ghost" className="text-slate-400 hover:text-rose-500" onClick={() => removeFoodFromMeal(meal.id, item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 bg-slate-50/30 flex flex-col gap-4">
                    <Button variant="outline" className="w-full border-dashed text-teal-600" onClick={() => setActiveMealId(meal.id)}><Search className="w-4 h-4 mr-2" /> Buscar Alimento</Button>
                    <textarea value={meal.notes || ""} onChange={(e) => { const n = [...meals]; n[index].notes = e.target.value; setMeals(n) }} placeholder='Observações...' className="w-full min-h-[60px] p-3 text-sm border rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addMeal} className="w-full h-14 border-dashed"><Plus className="w-5 h-5 mr-2" /> Adicionar Refeição</Button>
            
            <Card className="bg-teal-900 text-white mt-12"><CardContent className="p-6"><textarea value={dietInfo.notes} onChange={(e) => setDietInfo({...dietInfo, notes: e.target.value})} placeholder="Orientações gerais..." className="w-full min-h-[100px] p-4 bg-teal-950/40 rounded-xl" /></CardContent></Card>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {activeMealId && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={closeModal}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b bg-slate-50">
              <div className="flex justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2"><Database className="w-5 h-5 text-teal-600" /> {isCreatingManual ? (editingFoodId ? "Editar Alimento" : "Criar Alimento") : "Banco de Alimentos"}</h3>
                <Button variant="outline" size="sm" onClick={() => { setIsCreatingManual(!isCreatingManual); setEditingFoodId(null); setNewFood({ name: "", kcal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sodium: 0, calcium: 0, iron: 0 })}} className="text-teal-600">
                  {isCreatingManual ? "Voltar para Busca" : "Cadastrar Manualmente"}
                </Button>
              </div>

              {!isCreatingManual && (
                <>
                  <div className="flex gap-2 mb-3">
                    {["TODAS", "TACO", "IBGE", "TBCA", "MANUAL"].map(s => (
                      <Button key={s} variant={selectedSource === s ? "default" : "outline"} size="sm" onClick={() => setSelectedSource(s)} className={`rounded-full px-4 ${selectedSource === s ? 'bg-teal-600' : ''}`}>{s}</Button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input placeholder="Pesquise..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                      {isSearching && <Loader2 className="w-4 h-4 text-teal-500 animate-spin absolute right-3 top-3" />}
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 border rounded-md w-32 shrink-0">
                      <Input type="number" value={amountToAdd} onChange={e => setAmountToAdd(Number(e.target.value) || 1)} className="border-0 p-0 text-center font-bold" />
                      <span className="text-sm font-semibold text-slate-400">g</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1">
              {isCreatingManual ? (
                <div className="p-6 space-y-6">
                  <Input placeholder="Nome..." value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} className="h-12 text-lg" />
                  
                  <div className="bg-slate-50 p-5 rounded-xl border">
                    <p className="text-xs font-bold mb-4">Macros Principais (Por 100g)</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div><Label>Kcal</Label><Input type="number" value={newFood.kcal} onChange={e => setNewFood({...newFood, kcal: Number(e.target.value)})} /></div>
                      <div><Label className="text-rose-600">PTN (g)</Label><Input type="number" value={newFood.pro} onChange={e => setNewFood({...newFood, pro: Number(e.target.value)})} /></div>
                      <div><Label className="text-emerald-600">CARB (g)</Label><Input type="number" value={newFood.carb} onChange={e => setNewFood({...newFood, carb: Number(e.target.value)})} /></div>
                      <div><Label className="text-amber-600">GOR (g)</Label><Input type="number" value={newFood.fat} onChange={e => setNewFood({...newFood, fat: Number(e.target.value)})} /></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-xl border">
                    <p className="text-xs font-bold mb-4">Micronutrientes</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div><Label>Fibras (g)</Label><Input type="number" value={newFood.fiber} onChange={e => setNewFood({...newFood, fiber: Number(e.target.value)})} /></div>
                      <div><Label>Sódio (mg)</Label><Input type="number" value={newFood.sodium} onChange={e => setNewFood({...newFood, sodium: Number(e.target.value)})} /></div>
                      <div><Label>Cálcio (mg)</Label><Input type="number" value={newFood.calcium} onChange={e => setNewFood({...newFood, calcium: Number(e.target.value)})} /></div>
                      <div><Label>Ferro (mg)</Label><Input type="number" value={newFood.iron} onChange={e => setNewFood({...newFood, iron: Number(e.target.value)})} /></div>
                    </div>
                  </div>

                  <Button onClick={handleSaveManualFood} className="w-full h-12 bg-teal-600 font-bold">
                    {editingFoodId ? "Salvar Alterações" : "Salvar na Base e Adicionar"}
                  </Button>
                </div>
              ) : (
                <div className="p-2">
                  {availableFoods.map(food => (
                    <div key={food.id} className="flex items-center justify-between p-4 hover:bg-slate-50 border-b last:border-0 cursor-pointer" onClick={() => addFoodToMeal(food)}>
                      <div>
                        <div className="flex gap-2 mb-1 items-center">
                          <p className="font-bold text-slate-800">{food.name}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-sm ${getSourceBadgeColor(food.source)}`}>{food.source || 'MANUAL'}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {calcMacro(food.kcal, food.baseAmount, amountToAdd)} kcal | 
                          <span className="text-rose-500 ml-1">P: {calcMacro(food.protein, food.baseAmount, amountToAdd)}g</span> | 
                          <span className="text-emerald-500 ml-1">C: {calcMacro(food.carbs, food.baseAmount, amountToAdd)}g</span> | 
                          <span className="text-amber-500 ml-1">G: {calcMacro(food.fat, food.baseAmount, amountToAdd)}g</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {food.source === 'MANUAL' && (
                          <div className="flex bg-slate-100 rounded-md p-1 mr-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-teal-600" onClick={(e) => handleEditFood(e, food)}><Edit2 className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-rose-600" onClick={(e) => handleDeleteFood(e, food.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                        <Button size="sm" className="bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold border"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}