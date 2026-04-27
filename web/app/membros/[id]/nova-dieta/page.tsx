"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Search, Trash2, Edit2, CheckCircle2, Target, Printer, Share2, ShoppingCart, Smartphone, Database, Info, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context" 

export default function NovaDietaPage() {
  const params = useParams()
  const router = useRouter()
  const { user: loggedInUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isRestored, setIsRestored] = useState(false)

  const [dietInfo, setDietInfo] = useState({ title: "Fase 1 - Adaptação", goal: "Emagrecimento", notes: "", durationDays: 30, patientWeight: 80 })
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

  const [showShareModal, setShowShareModal] = useState(false)
  const [shoppingDays, setShoppingDays] = useState(30)
  const [printMode, setPrintMode] = useState<'diet' | 'list'>('diet')

  const [newFood, setNewFood] = useState({ name: "", kcal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sodium: 0, calcium: 0, iron: 0 })

  useEffect(() => { if (searchTerm.length === 0) fetchFoods(selectedSource) }, [selectedSource])
  useEffect(() => { loadInitialData() }, [])

  const loadInitialData = async () => {
    const draftKey = `diet_draft_${params.id}`
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setDietInfo(parsed.dietInfo); setTargets(parsed.targets); setMeals(parsed.meals); setIsRestored(true)
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
        } catch (error) {} finally { setIsSearching(false) }
      } else if (searchTerm.length === 0) { fetchFoods(selectedSource) }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, selectedSource])

  const fetchFoods = async (source = "TODAS") => {
    try {
      const res = await api.get(`/foods?source=${source}`)
      setAvailableFoods(res.data)
    } catch (error) { }
  }

  const fetchActiveDiet = async () => {
    try {
      const res = await api.get(`/diet-plans/user/${params.id}/active`)
      if (res.data) {
        setDietInfo({ title: res.data.title, goal: res.data.goal, notes: res.data.notes || "", durationDays: res.data.durationDays || 30, patientWeight: 80 })
        setTargets({ kcal: res.data.targetKcal, pro: res.data.proteinG, carb: res.data.carbsG, fat: res.data.fatG })
        setMeals(res.data.meals.map((m: any) => ({
          id: m.id, name: m.name, time: m.time, notes: m.notes || "",
          items: m.items.map((i: any) => ({ id: i.id, quantity: i.quantity, measure: i.measure || "", food: i.food }))
        })))
      }
    } catch (error) { }
  }

  const calcMacro = (value: number, baseAmount: number = 100, targetAmount: number) => Number(((value / baseAmount) * targetAmount).toFixed(1))

  const currentTotals = useMemo(() => {
    let kcal = 0, pro = 0, carb = 0, fat = 0
    meals.forEach(meal => meal.items.forEach(item => {
      kcal += calcMacro(item.food.kcal, item.food.baseAmount, item.quantity)
      pro += calcMacro(item.food.protein, item.food.baseAmount, item.quantity)
      carb += calcMacro(item.food.carbs, item.food.baseAmount, item.quantity)
      fat += calcMacro(item.food.fat, item.food.baseAmount, item.quantity)
    }))
    return { kcal: Math.round(kcal), pro: Math.round(pro), carb: Math.round(carb), fat: Math.round(fat) }
  }, [meals])

  const getMealTotals = (items: any[]) => {
    let kcal = 0, pro = 0, carb = 0, fat = 0
    items.forEach(item => {
      kcal += calcMacro(item.food.kcal, item.food.baseAmount, item.quantity)
      pro += calcMacro(item.food.protein, item.food.baseAmount, item.quantity)
      carb += calcMacro(item.food.carbs, item.food.baseAmount, item.quantity)
      fat += calcMacro(item.food.fat, item.food.baseAmount, item.quantity)
    })
    return { kcal: Math.round(kcal), pro: Math.round(pro), carb: Math.round(carb), fat: Math.round(fat) }
  }

  const shoppingList = useMemo(() => {
    const list: Record<string, number> = {}
    meals.forEach(meal => meal.items.forEach(item => {
      const name = item.food.name
      if(!list[name]) list[name] = 0
      list[name] += (item.quantity * shoppingDays)
    }))
    return Object.entries(list).map(([name, qty]) => ({ name, qty })).sort((a,b) => b.qty - a.qty)
  }, [meals, shoppingDays])

  const addMeal = () => setMeals([...meals, { id: `m${Date.now()}`, name: "Nova Refeição", time: "12:00", notes: "", items: [] }])
  const removeMeal = (id: string) => setMeals(meals.filter(m => m.id !== id))
  
  const addFoodToMeal = async (food: any, quantity: number | string = amountToAdd) => {
    if (!activeMealId) return
    
    const safeQty = Number(quantity) || 0
    let savedMeasure = ""
    
    const itemJaNaTela = meals
      .flatMap(m => m.items)
      .find(i => i.food.id === food.id && Number(i.quantity) === safeQty && i.measure && i.measure.trim() !== "" && i.measure !== "g")
      
    if (itemJaNaTela) {
      savedMeasure = itemJaNaTela.measure
    } 
    else if ((loggedInUser as any)?.id) {
      try {
        const prefRes = await api.get(`/foods/${food.id}/preference?nutritionistId=${(loggedInUser as any).id}&quantity=${safeQty}`)
        if (prefRes.data && prefRes.data.measure) {
          savedMeasure = prefRes.data.measure
        }
      } catch (e) {
      }
    }

    const newItem = { id: `i${Date.now()}`, quantity: safeQty, measure: savedMeasure, food }
    setMeals(meals.map(m => m.id === activeMealId ? { ...m, items: [...m.items, newItem] } : m))
    closeModal()
  }

  const updateItemValue = (mealId: string, itemId: string, field: 'quantity' | 'measure', value: any) => {
    setMeals(meals.map(m => {
      if (m.id !== mealId) return m;
      return {
        ...m,
        items: m.items.map(i => {
          if (i.id !== itemId) return i;
          if (field === 'quantity') {
            const newQty = Number(value) || 0;
            if (newQty !== Number(i.quantity)) {
              return { ...i, quantity: newQty, measure: "" }; 
            }
          }
          
          return { ...i, [field]: value };
        })
      };
    }));
  }

  const removeFoodFromMeal = (mealId: string, itemId: string) => setMeals(meals.map(m => m.id === mealId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m))

  const handleDeleteFood = async (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation()
    if (!confirm("Apagar este alimento da base de dados?")) return
    try { await api.delete(`/foods/${foodId}`); setAvailableFoods(availableFoods.filter(f => f.id !== foodId)); toast.success("Apagado!") } catch (error) {}
  }

  const handleEditFood = (e: React.MouseEvent, food: any) => {
    e.stopPropagation()
    setEditingFoodId(food.id)
    setNewFood({ name: food.name, kcal: food.kcal, pro: food.protein, carb: food.carbs, fat: food.fat, fiber: food.fiber || 0, sodium: food.sodium || 0, calcium: food.calcium || 0, iron: food.iron || 0 })
    setIsCreatingManual(true)
  }

  const handleSaveManualFood = async () => {
    if (!newFood.name.trim()) return
    const payload = { ...newFood, baseUnit: "100g", baseAmount: 100, source: "MANUAL" }
    try {
      if (editingFoodId) {
        const res = await api.put(`/foods/${editingFoodId}`, payload)
        setAvailableFoods(availableFoods.map(f => f.id === editingFoodId ? res.data : f)); toast.success("Atualizado!")
      } else {
        const res = await api.post('/foods', payload)
        setAvailableFoods([res.data, ...availableFoods]); addFoodToMeal(res.data, amountToAdd); toast.success("Cadastrado!")
      }
      setIsCreatingManual(false); setEditingFoodId(null)
    } catch (error) {}
  }

  const closeModal = () => { setActiveMealId(null); setSearchTerm(""); setAmountToAdd(100); setIsCreatingManual(false); setEditingFoodId(null) }
  const formatQty = (qty: number) => qty >= 1000 ? `${(qty/1000).toFixed(1)} kg` : `${qty} g`

  const handleOpenShareModal = () => {
    setShoppingDays(dietInfo.durationDays) 
    setShowShareModal(true)
  }

  const handleWhatsAppShare = () => {
    let text = "Olá! A sua nova prescrição dietética está pronta. 🍎\n\n"
    text += `*📋 Fase:* ${dietInfo.title}\n`
    text += `*🎯 Objetivo:* ${dietInfo.goal}\n\n`
    text += `🛒 *Lista de Compras (${shoppingDays} dias):*\n`
    shoppingList.forEach(item => { text += `• ${item.name}: ${formatQty(item.qty)}\n` })
    text += "\nLembre-se de verificar o PDF da dieta que enviarei logo abaixo! 💪"
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handlePrintDiet = () => { setPrintMode('diet'); setShowShareModal(false); setTimeout(() => window.print(), 300) }
  const handlePrintList = () => { setPrintMode('list'); setShowShareModal(false); setTimeout(() => window.print(), 300) }

  const handleSaveDiet = async () => {
    setLoading(true)
    try {
      const payload = {
        title: dietInfo.title, 
        goal: dietInfo.goal, 
        durationDays: dietInfo.durationDays, 
        targetKcal: targets.kcal, 
        proteinG: targets.pro, 
        carbsG: targets.carb, 
        fatG: targets.fat, 
        userId: params.id, 
        notes: dietInfo.notes,
        meals: meals.map(m => ({ 
          name: m.name, time: m.time, notes: m.notes, 
          items: m.items.map(item => ({ 
            quantity: Number(item.quantity) || 0, 
            measure: item.measure || "", 
            foodId: item.food.id 
          }))
        }))
      }
      await api.post('/diet-plans', payload)
      localStorage.removeItem(`diet_draft_${params.id}`)
      toast.success("Dieta salva com sucesso!")
      router.push(`/membros/${params.id}`) 
    } catch (error) { toast.error("Erro ao salvar a dieta.") } finally { setLoading(false) }
  }

  const getSourceBadgeColor = (source: string) => {
    if (source === 'TACO') return 'bg-emerald-100 text-emerald-700'
    if (source === 'IBGE') return 'bg-blue-100 text-blue-700'
    if (source === 'TBCA') return 'bg-amber-100 text-amber-700'
    if (source === 'MANUAL') return 'bg-purple-100 text-purple-700'
    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      
      <div className={`w-full px-6 md:px-12 lg:px-20 mx-auto space-y-6 print:px-0 print:max-w-4xl print:space-y-0 ${printMode === 'list' ? 'print:hidden' : 'print:block'}`}>
        
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}><Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200"><ArrowLeft className="w-5 h-5 text-slate-600" /></Button></Link>
            <div>
              <div className="flex items-center gap-3"><h1 className="text-3xl font-bold text-slate-800">Prescrição Dietética</h1></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleOpenShareModal} variant="outline" className="h-12 border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100">
              <Share2 className="w-5 h-5 mr-2" /> Compartilhar & Lista
            </Button>
            <Button onClick={handlePrintDiet} variant="outline" className="h-12 border-slate-300 text-slate-700"><Printer className="w-5 h-5 mr-2" /> PDF Dieta</Button>
            <Button onClick={handleSaveDiet} disabled={loading} className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-lg shadow-md"><CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "A Salvar..." : "Finalizar"}</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start print:block print:gap-0">
          
          <div className="lg:col-span-3 space-y-6 sticky top-8 print:hidden">
             <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-800 text-white border-b-4 border-teal-500 py-4"><CardTitle className="text-lg">Metas</CardTitle></CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5"><Label>Fase</Label><Input value={dietInfo.title || ""} onChange={(e) => setDietInfo({...dietInfo, title: e.target.value})} className="font-semibold" /></div>
                  <div className="space-y-1.5"><Label>Objetivo</Label><Input value={dietInfo.goal || ""} onChange={(e) => setDietInfo({...dietInfo, goal: e.target.value})} className="font-semibold" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Dias</Label><Input type="number" value={dietInfo.durationDays || ""} onChange={(e) => setDietInfo({...dietInfo, durationDays: Number(e.target.value)})} className="font-semibold text-teal-700 bg-teal-50 text-center" /></div>
                    <div className="space-y-1.5"><Label>Peso (kg)</Label><Input type="number" value={dietInfo.patientWeight || ""} onChange={(e) => setDietInfo({...dietInfo, patientWeight: Number(e.target.value)})} className="font-semibold text-indigo-700 bg-indigo-50 text-center" /></div>
                  </div>
                </CardContent>
             </Card>

             <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <CardTitle className="text-base flex items-center gap-2"><Target className="w-5 h-5 text-teal-600" /> Controle de Macros</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="space-y-2">
                   <Label className="text-xs font-bold text-slate-500 uppercase">Meta de Kcal</Label>
                   <Input type="number" value={targets.kcal || ""} onChange={(e) => setTargets({...targets, kcal: Number(e.target.value)})} className="font-bold text-slate-800" />
                </div>
                <div className="space-y-2">
                  <div className={`flex justify-between items-center p-3 rounded-lg border transition-all duration-500 ${currentTotals.kcal > targets.kcal ? 'bg-rose-50 border-rose-200' : currentTotals.kcal >= targets.kcal * 0.9 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="font-bold text-slate-600 text-sm">Calculado</span>
                    <div className="flex items-center gap-1">
                      <span className={`font-black text-xl transition-colors ${currentTotals.kcal > targets.kcal ? 'text-rose-600 animate-pulse' : currentTotals.kcal >= targets.kcal * 0.9 ? 'text-amber-600' : 'text-teal-600'}`}>{currentTotals.kcal}</span>
                      <span className="text-slate-400 text-sm">kcal</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ease-out ${currentTotals.kcal > targets.kcal ? 'bg-rose-500' : currentTotals.kcal >= targets.kcal * 0.9 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${Math.min((currentTotals.kcal / (targets.kcal || 1)) * 100, 100)}%` }}></div>
                  </div>
                </div>

                <div className="space-y-5 pt-4 border-t border-slate-100">
                  {[
                    { label: 'PTN', current: currentTotals.pro, target: targets.pro, set: (v: number) => setTargets({...targets, pro: v}), color: 'text-rose-500', bg: 'bg-rose-500', multiplier: 4 },
                    { label: 'CARB', current: currentTotals.carb, target: targets.carb, set: (v: number) => setTargets({...targets, carb: v}), color: 'text-emerald-500', bg: 'bg-emerald-500', multiplier: 4 },
                    { label: 'GOR', current: currentTotals.fat, target: targets.fat, set: (v: number) => setTargets({...targets, fat: v}), color: 'text-amber-500', bg: 'bg-amber-500', multiplier: 9 },
                  ].map(m => {
                    const percent = currentTotals.kcal > 0 ? ((m.current * m.multiplier) / currentTotals.kcal) * 100 : 0
                    const gPerKg = dietInfo.patientWeight > 0 ? (m.current / dietInfo.patientWeight) : 0

                    return (
                      <div key={m.label} className="space-y-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs font-bold text-slate-500">{m.label} (g)</Label>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${m.current > m.target ? 'text-rose-500 animate-pulse' : m.color}`}>{m.current}</span>
                            <span className="text-slate-300">/</span>
                            <Input type="number" value={m.target || ""} onChange={(e) => m.set(Number(e.target.value))} className="w-16 h-7 text-xs text-center p-1 font-medium" />
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${m.current > m.target ? 'bg-rose-500' : m.bg}`} style={{ width: `${Math.min((m.current / (m.target || 1)) * 100, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                          <span>{percent.toFixed(1)}% das Kcal</span>
                          <span className="text-slate-500">{gPerKg.toFixed(2)} g/kg</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-9 space-y-6 print:w-full">
            <div className="hidden print:block mb-8 border-b-2 border-teal-600 pb-6">
              <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Plano Alimentar Prescrito</h1>
              <h2 className="text-xl text-slate-600 mt-2 font-medium">{dietInfo.title} • Foco: {dietInfo.goal} ({dietInfo.durationDays} dias)</h2>
            </div>

            {meals.map((meal, index) => {
              const mealTotals = getMealTotals(meal.items) 
              
              return (
                <Card key={meal.id} className="border border-slate-200 print:border-slate-300 print:break-inside-avoid">
                  
                  <CardHeader className="bg-slate-50 py-3 print:bg-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex gap-3 w-full md:w-1/2 print:w-full">
                        <Input value={meal.time || ""} onChange={(e) => { const n = [...meals]; n[index].time = e.target.value; setMeals(n) }} className="w-24 font-bold text-center print:hidden bg-white" />
                        <Input value={meal.name || ""} onChange={(e) => { const n = [...meals]; n[index].name = e.target.value; setMeals(n) }} className="font-bold border-none shadow-none text-lg print:hidden bg-transparent" />
                        <span className="hidden print:inline font-black text-teal-700 px-2">{meal.time}</span>
                        <span className="hidden print:inline font-bold text-slate-800 text-lg uppercase">{meal.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm print:border-0 print:bg-transparent">
                        <div className="text-xs font-bold text-slate-700"><span className="text-teal-600 text-sm">{mealTotals.kcal}</span> kcal</div>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <div className="flex gap-3 text-[11px] font-bold">
                          <span className="text-rose-500">P: {mealTotals.pro}g</span>
                          <span className="text-emerald-500">C: {mealTotals.carb}g</span>
                          <span className="text-amber-500">G: {mealTotals.fat}g</span>
                        </div>
                        <Button variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-6 w-6 p-0 ml-2 print:hidden" onClick={() => removeMeal(meal.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {meal.items.map((item) => (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 px-4 hover:bg-slate-50 print:py-2 gap-4">
                          
                          <div className="flex items-start gap-4 flex-1">
                             <div className="flex flex-col gap-1 w-28 print:w-auto shrink-0">
                                <div className="flex items-center gap-1 print:hidden">
                                  {/* 🌟 BLINDAGEM PERFEITA: O Input só usa "" no value, mas converte sempre para Number no onChange */}
                                  <Input type="number" value={item.quantity || ""} onChange={(e) => updateItemValue(meal.id, item.id, 'quantity', Number(e.target.value))} className="h-8 text-center px-1 font-bold text-slate-700" />
                                  <span className="text-xs font-bold text-slate-400">g</span>
                                </div>
                                <Input placeholder="Medida Caseira" value={item.measure || ""} onChange={(e) => updateItemValue(meal.id, item.id, 'measure', e.target.value)} className="h-7 text-[10px] px-2 bg-slate-50 border-dashed print:hidden" />
                              
                                <div className="hidden print:block font-bold text-slate-700 text-sm">{item.quantity}g</div>
                                {item.measure && <div className="hidden print:block text-xs text-slate-500 italic">{item.measure}</div>}
                             </div>

                             <div className="flex flex-col flex-1 pt-1">
                                <span className="font-semibold text-slate-700 leading-tight">{item.food.name}</span>
                                <span className="text-xs text-slate-400 font-medium mt-1 print:hidden flex items-center gap-2">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded">{calcMacro(item.food.kcal, item.food.baseAmount, item.quantity)} kcal</span>
                                  <span className="text-rose-500">P: {calcMacro(item.food.protein, item.food.baseAmount, item.quantity)}g</span>
                                  <span className="text-emerald-500">C: {calcMacro(item.food.carbs, item.food.baseAmount, item.quantity)}g</span>
                                  <span className="text-amber-500">G: {calcMacro(item.food.fat, item.food.baseAmount, item.quantity)}g</span>
                                </span>
                             </div>
                          </div>
                          
                          <Button variant="ghost" className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 h-8 w-8 p-0 shrink-0 print:hidden self-end md:self-center" onClick={() => removeFoodFromMeal(meal.id, item.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-slate-50/30 flex flex-col gap-3 print:hidden border-t border-slate-100">
                      <Button variant="outline" className="w-full border-dashed text-teal-600 bg-white" onClick={() => setActiveMealId(meal.id)}><Search className="w-4 h-4 mr-2" /> Buscar e Adicionar Alimento</Button>
                      <textarea value={meal.notes || ""} onChange={(e) => { const n = [...meals]; n[index].notes = e.target.value; setMeals(n) }} placeholder='Observações ou modo de preparo desta refeição...' className="w-full min-h-[60px] p-3 text-sm border rounded-lg resize-none focus:ring-1 focus:ring-teal-500 outline-none" />
                    </div>
                    {meal.notes && <div className="hidden print:block p-3 mx-4 mb-4 mt-2 bg-slate-50 text-slate-600 text-sm rounded border border-slate-200 italic">📌 {meal.notes}</div>}
                  </CardContent>
                </Card>
              )
            })}
            
            <Button onClick={addMeal} className="w-full h-14 border-dashed bg-white text-slate-600 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50 print:hidden transition-all"><Plus className="w-5 h-5 mr-2" /> Adicionar Nova Refeição</Button>
            
            <Card className="bg-teal-900 text-white mt-12 print:hidden">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Info className="w-5 h-5 text-teal-300" /> Orientações Gerais da Dieta</CardTitle></CardHeader>
              <CardContent>
                <textarea value={dietInfo.notes || ""} onChange={(e) => setDietInfo({...dietInfo, notes: e.target.value})} placeholder="Orientações sobre hidratação, sono, chás, etc..." className="w-full min-h-[100px] p-4 bg-teal-950/40 rounded-xl text-sm placeholder:text-teal-500/50 border-0 focus:ring-1 focus:ring-teal-400 outline-none" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className={`hidden ${printMode === 'list' ? 'print:block' : ''} w-full max-w-4xl mx-auto bg-white`}>
        <div className="border-b-4 border-teal-600 pb-6 mb-8 mt-10">
          <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Lista de Compras</h1>
          <h2 className="text-xl text-slate-600 mt-2 font-medium">Plano: {dietInfo.title} • Quantidade para {shoppingDays} dias</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {shoppingList.map((item, index) => (
            <div key={index} className="flex items-center justify-between border-b-2 border-slate-100 pb-3 break-inside-avoid">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-md border-2 border-slate-400"></div>
                <span className="font-bold text-slate-800 text-lg">{item.name}</span>
              </div>
              <span className="font-black text-teal-700 text-lg bg-teal-50 px-3 py-1 rounded-lg border border-teal-100">
                {formatQty(item.qty)}
              </span>
            </div>
          ))}
        </div>

        {shoppingList.length === 0 && (
          <p className="text-slate-500 italic text-center py-10">Nenhum item adicionado à dieta ainda.</p>
        )}
        
        <div className="mt-16 pt-6 border-t border-slate-200 text-center text-sm text-slate-400 font-medium">
          Documento gerado digitalmente • Foco no Objetivo: {dietInfo.goal}
        </div>
      </div>

      {showShareModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 print:hidden" onClick={() => setShowShareModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden print:hidden">
            <div className="bg-teal-600 p-6 text-white text-center">
              <Share2 className="w-10 h-10 mx-auto mb-2 text-teal-200" />
              <h2 className="text-2xl font-bold">Compartilhar com Paciente</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <Label className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-teal-600"/> Lista de Compras para (dias):</Label>
                  <Input type="number" value={shoppingDays || ""} onChange={(e) => setShoppingDays(Number(e.target.value))} className="w-20 text-center font-bold border-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handlePrintList} variant="outline" className="h-14 font-bold"><Printer className="w-5 h-5 mr-2" /> PDF da Lista</Button>
                <Button onClick={handlePrintDiet} variant="outline" className="h-14 font-bold"><Printer className="w-5 h-5 mr-2" /> PDF da Dieta</Button>
              </div>
              <Button onClick={handleWhatsAppShare} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg"><Smartphone className="w-5 h-5 mr-2" /> Enviar Mensagem via WhatsApp</Button>
            </div>
          </div>
        </>
      )}

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
                      <Input placeholder="Pesquise..." value={searchTerm || ""} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                      {isSearching && <Loader2 className="w-4 h-4 text-teal-500 animate-spin absolute right-3 top-3" />}
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 border rounded-md w-32 shrink-0">
                      <Input type="number" value={amountToAdd || ""} onChange={e => setAmountToAdd(Number(e.target.value))} className="border-0 p-0 text-center font-bold" />
                      <span className="text-sm font-semibold text-slate-400">g</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {isCreatingManual ? (
                <div className="p-6 space-y-6">
                  <Input placeholder="Nome..." value={newFood.name || ""} onChange={e => setNewFood({...newFood, name: e.target.value})} className="h-12 text-lg" />
                  <div className="bg-slate-50 p-5 rounded-xl border">
                    <p className="text-xs font-bold mb-4">Macros Principais (Por 100g)</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div><Label>Kcal</Label><Input type="number" value={newFood.kcal || ""} onChange={e => setNewFood({...newFood, kcal: Number(e.target.value)})} /></div>
                      <div><Label className="text-rose-600">PTN (g)</Label><Input type="number" value={newFood.pro || ""} onChange={e => setNewFood({...newFood, pro: Number(e.target.value)})} /></div>
                      <div><Label className="text-emerald-600">CARB (g)</Label><Input type="number" value={newFood.carb || ""} onChange={e => setNewFood({...newFood, carb: Number(e.target.value)})} /></div>
                      <div><Label className="text-amber-600">GOR (g)</Label><Input type="number" value={newFood.fat || ""} onChange={e => setNewFood({...newFood, fat: Number(e.target.value)})} /></div>
                    </div>
                  </div>
                  <Button onClick={handleSaveManualFood} className="w-full h-12 bg-teal-600 font-bold">{editingFoodId ? "Salvar Alterações" : "Salvar na Base e Adicionar"}</Button>
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