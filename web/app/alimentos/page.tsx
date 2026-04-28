"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { Apple, Plus, Search, Database, Edit2, Trash2, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AlimentosHubPage() {
  const [foods, setFoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSource, setSelectedSource] = useState("TODAS")

  // Modal de Criação / Edição
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const initialFoodState = { name: "", kcal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, sodium: 0 }
  const [newFood, setNewFood] = useState(initialFoodState)

  useEffect(() => {
    // Se a pesquisa estiver vazia, carrega a lista padrão
    if (searchTerm.length === 0) {
      fetchFoods(selectedSource)
    }
  }, [selectedSource, searchTerm])

  useEffect(() => {
    // Debounce para a pesquisa (só pesquisa depois do utilizador parar de digitar por 500ms)
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true)
        try {
          const res = await api.get(`/foods/search?q=${searchTerm}&source=${selectedSource}`)
          setFoods(res.data || [])
        } catch (error) {
          console.error("Erro na busca", error)
        } finally {
          setIsSearching(false)
        }
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, selectedSource])

  const fetchFoods = async (source = "TODAS") => {
    setLoading(true)
    try {
      const res = await api.get(`/foods?source=${source}`)
      setFoods(res.data || [])
    } catch (error) {
      console.error("Erro ao carregar alimentos", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setNewFood(initialFoodState)
    setShowModal(true)
  }

  const handleOpenEdit = (food: any) => {
    setEditingId(food.id)
    setNewFood({
      name: food.name,
      kcal: food.kcal,
      pro: food.protein,
      carb: food.carbs,
      fat: food.fat,
      fiber: food.fiber || 0,
      sodium: food.sodium || 0
    })
    setShowModal(true)
  }

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    // Todos os alimentos manuais são inseridos com base em 100g para facilitar os cálculos
    const payload = {
      name: newFood.name,
      kcal: Number(newFood.kcal),
      protein: Number(newFood.pro),
      carbs: Number(newFood.carb),
      fat: Number(newFood.fat),
      fiber: Number(newFood.fiber),
      sodium: Number(newFood.sodium),
      baseUnit: "100g",
      baseAmount: 100,
      source: "MANUAL"
    }

    try {
      if (editingId) {
        await api.put(`/foods/${editingId}`, payload)
        toast.success("Alimento atualizado com sucesso!")
      } else {
        await api.post('/foods', payload)
        toast.success("Alimento cadastrado com sucesso!")
      }
      setShowModal(false)
      fetchFoods(selectedSource) // Recarrega a tabela
    } catch (error) {
      toast.error("Erro ao salvar o alimento.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFood = async (id: string, name: string) => {
    if (window.confirm(`Tem a certeza que deseja apagar permanentemente o alimento "${name}"?`)) {
      try {
        await api.delete(`/foods/${id}`)
        toast.success("Alimento removido com sucesso!")
        fetchFoods(selectedSource)
      } catch (error) {
        toast.error("Erro ao apagar. Ele pode estar em uso numa dieta.")
      }
    }
  }

  const getSourceBadgeColor = (source: string) => {
    if (source === 'TACO') return 'bg-emerald-100 text-emerald-800'
    if (source === 'IBGE') return 'bg-blue-100 text-blue-800'
    if (source === 'TBCA') return 'bg-amber-100 text-amber-800'
    if (source === 'MANUAL') return 'bg-purple-100 text-purple-800'
    return 'bg-slate-100 text-slate-800'
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Database className="w-8 h-8 text-emerald-500" /> Banco de Alimentos
            </h1>
            <p className="text-slate-500 mt-1">
              Pesquise na tabela nutricional ou adicione os seus próprios alimentos e receitas.
            </p>
          </div>

          <Button 
            onClick={handleOpenCreate}
            className="h-12 px-6 shadow-md text-base text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Cadastrar Alimento
          </Button>
        </div>

        {/* BARRA DE PESQUISA E FILTROS */}
        <Card className="shadow-sm border-0 border-t-4 border-t-emerald-500">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
                {["TODAS", "TACO", "IBGE", "TBCA", "MANUAL"].map(s => (
                  <Button 
                    key={s} 
                    variant={selectedSource === s ? "default" : "outline"} 
                    onClick={() => setSelectedSource(s)} 
                    className={`rounded-full px-5 ${selectedSource === s ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm' : 'text-slate-600'}`}
                  >
                    {s === "TODAS" ? "Tudo" : s === "MANUAL" ? "Meus Alimentos" : s}
                  </Button>
                ))}
              </div>

              <div className="relative w-full md:w-96">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Pesquisar alimento..." 
                  className="pl-10 h-12 bg-slate-50 focus-visible:ring-emerald-500 text-base"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {isSearching && <Loader2 className="w-5 h-5 text-emerald-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABELA DE ALIMENTOS */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="py-4 px-6 font-bold text-slate-700">Nome do Alimento</TableHead>
                    <TableHead className="px-6 font-bold text-slate-700">Fonte</TableHead>
                    <TableHead className="px-6 font-bold text-slate-700">Kcal <span className="text-xs font-normal text-slate-400">(100g)</span></TableHead>
                    <TableHead className="px-6 font-bold text-slate-700">Macros <span className="text-xs font-normal text-slate-400">(P / C / G)</span></TableHead>
                    <TableHead className="text-right px-6 font-bold text-slate-700">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500 animate-pulse">
                        A carregar tabela nutricional...
                      </TableCell>
                    </TableRow>
                  ) : foods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                        <Apple className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        Nenhum alimento encontrado com esses filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    foods.map((food) => (
                      <TableRow key={food.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-semibold text-slate-800 py-4 px-6">
                          {food.name}
                        </TableCell>
                        <TableCell className="px-6">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${getSourceBadgeColor(food.source)}`}>
                            {food.source || 'MANUAL'}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-slate-600 px-6">
                          {food.kcal}
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex gap-2 text-xs font-bold">
                            <span className="text-rose-500 bg-rose-50 px-1.5 rounded">{food.protein}g</span>
                            <span className="text-emerald-500 bg-emerald-50 px-1.5 rounded">{food.carbs}g</span>
                            <span className="text-amber-500 bg-amber-50 px-1.5 rounded">{food.fat}g</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          {/* Só permite editar ou apagar se for um alimento criado pelo utilizador (MANUAL) */}
                          {food.source === 'MANUAL' ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="icon" onClick={() => handleOpenEdit(food)} className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleDeleteFood(food.id, food.name)} className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Protegido (Base Oficial)</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO MANUAL */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  {editingId ? "Editar Alimento Personalizado" : "Novo Alimento Personalizado"}
                </h2>
                <p className="text-sm text-slate-500">Insira as informações nutricionais por cada 100g do produto.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSaveFood} className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-700">Nome do Alimento / Receita <span className="text-rose-500">*</span></Label>
                <Input required placeholder="Ex: Panqueca de Aveia do Nutri" value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} className="h-12 font-medium" autoFocus />
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Macronutrientes Principais (em 100g)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-bold">Kcal</Label>
                    <Input required type="number" step="0.1" min="0" value={newFood.kcal === 0 ? "" : newFood.kcal} onChange={e => setNewFood({...newFood, kcal: Number(e.target.value)})} className="h-11 bg-white font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-rose-600 font-bold">PTN (g)</Label>
                    <Input required type="number" step="0.1" min="0" value={newFood.pro === 0 ? "" : newFood.pro} onChange={e => setNewFood({...newFood, pro: Number(e.target.value)})} className="h-11 bg-white border-rose-200 focus-visible:ring-rose-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-emerald-600 font-bold">CARB (g)</Label>
                    <Input required type="number" step="0.1" min="0" value={newFood.carb === 0 ? "" : newFood.carb} onChange={e => setNewFood({...newFood, carb: Number(e.target.value)})} className="h-11 bg-white border-emerald-200 focus-visible:ring-emerald-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-amber-600 font-bold">GOR (g)</Label>
                    <Input required type="number" step="0.1" min="0" value={newFood.fat === 0 ? "" : newFood.fat} onChange={e => setNewFood({...newFood, fat: Number(e.target.value)})} className="h-11 bg-white border-amber-200 focus-visible:ring-amber-500" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-12 text-slate-600" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1 h-12 text-white font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
                  {isSaving ? "A Salvar..." : editingId ? "Salvar Alterações" : "Cadastrar no Banco"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  )
}