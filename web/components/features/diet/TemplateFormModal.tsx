"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useDietTemplateMutations,
  type DietTemplate,
  type CreateTemplatePayload,
} from "@/hooks/features/useDietTemplates"
import { api } from "@/lib/api"
import { Plus, Trash2, Search, Loader2, Sparkles, Utensils } from "lucide-react"
import { toast } from "sonner"

interface TemplateFormModalProps {
  templateToEdit?: DietTemplate | null
  isOpen: boolean
  onClose: () => void
}

interface FormFoodSearchResult {
  id: string
  name: string
  baseUnit: string
  baseAmount: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export function TemplateFormModal({
  templateToEdit,
  isOpen,
  onClose,
}: TemplateFormModalProps) {
  const { createTemplate, updateTemplate } = useDietTemplateMutations()

  const [title, setTitle] = useState("")
  const [goal, setGoal] = useState("")
  const [targetKcal, setTargetKcal] = useState(2000)
  const [proteinG, setProteinG] = useState(140)
  const [carbsG, setCarbsG] = useState(200)
  const [fatG, setFatG] = useState(60)
  const [fiberG, setFiberG] = useState(28)
  const [notes, setNotes] = useState("")

  const [meals, setMeals] = useState<
    Array<{
      name: string
      time: string
      notes: string
      items: Array<{
        foodId: string
        name: string
        quantity: number
        measure: string
        notes: string
      }>
    }>
  >([
    {
      name: "Café da Manhã",
      time: "07:30",
      notes: "",
      items: [],
    },
    {
      name: "Almoço",
      time: "12:30",
      notes: "",
      items: [],
    },
    {
      name: "Lanche da Tarde",
      time: "16:00",
      notes: "",
      items: [],
    },
    {
      name: "Jantar",
      time: "19:30",
      notes: "",
      items: [],
    },
  ])

  // Busca de alimentos
  const [activeMealIndexForSearch, setActiveMealIndexForSearch] = useState<number | null>(null)
  const [foodSearchQuery, setFoodSearchQuery] = useState("")
  const [foodSearchResults, setFoodSearchResults] = useState<FormFoodSearchResult[]>([])
  const [isSearchingFood, setIsSearchingFood] = useState(false)

  useEffect(() => {
    if (templateToEdit) {
      setTitle(templateToEdit.title)
      setGoal(templateToEdit.goal)
      setTargetKcal(templateToEdit.targetKcal)
      setProteinG(templateToEdit.proteinG)
      setCarbsG(templateToEdit.carbsG)
      setFatG(templateToEdit.fatG)
      setFiberG(templateToEdit.fiberG || 25)
      setNotes(templateToEdit.notes || "")
      setMeals(
        templateToEdit.meals.map((m) => ({
          name: m.name,
          time: m.time || "",
          notes: m.notes || "",
          items: m.items.map((it) => ({
            foodId: it.foodId || it.food?.id || "",
            name: it.name || it.food?.name || "Alimento",
            quantity: it.quantity,
            measure: it.measure,
            notes: it.notes || "",
          })),
        }))
      )
    } else {
      setTitle("")
      setGoal("")
      setTargetKcal(2000)
      setProteinG(140)
      setCarbsG(200)
      setFatG(60)
      setFiberG(28)
      setNotes("")
      setMeals([
        { name: "Café da Manhã", time: "07:30", notes: "", items: [] },
        { name: "Almoço", time: "12:30", notes: "", items: [] },
        { name: "Lanche da Tarde", time: "16:00", notes: "", items: [] },
        { name: "Jantar", time: "19:30", notes: "", items: [] },
      ])
    }
  }, [templateToEdit, isOpen])

  const handleSearchFood = async (term: string) => {
    setFoodSearchQuery(term)
    if (term.length < 2) {
      setFoodSearchResults([])
      return
    }

    setIsSearchingFood(true)
    try {
      const res = await api.get<FormFoodSearchResult[]>(`/foods/search?q=${encodeURIComponent(term)}`)
      setFoodSearchResults(res.data || [])
    } catch {
      setFoodSearchResults([])
    } finally {
      setIsSearchingFood(false)
    }
  }

  const handleAddFoodToMeal = (mealIndex: number, food: FormFoodSearchResult) => {
    setMeals((prev) => {
      const next = [...prev]
      next[mealIndex].items.push({
        foodId: food.id,
        name: food.name,
        quantity: food.baseAmount || 100,
        measure: food.baseUnit || "g",
        notes: "",
      })
      return next
    })
    setFoodSearchQuery("")
    setFoodSearchResults([])
    setActiveMealIndexForSearch(null)
  }

  const handleRemoveItem = (mealIndex: number, itemIndex: number) => {
    setMeals((prev) => {
      const next = [...prev]
      next[mealIndex].items.splice(itemIndex, 1)
      return next
    })
  }

  const handleAddMeal = () => {
    setMeals((prev) => [
      ...prev,
      {
        name: `Refeição ${prev.length + 1}`,
        time: "12:00",
        notes: "",
        items: [],
      },
    ])
  }

  const handleRemoveMeal = (mealIndex: number) => {
    if (meals.length <= 1) {
      toast.error("O modelo deve conter ao menos 1 refeição.")
      return
    }
    setMeals((prev) => prev.filter((_, idx) => idx !== mealIndex))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Informe o título do modelo.")
      return
    }
    if (!goal.trim()) {
      toast.error("Informe o objetivo do modelo.")
      return
    }

    const payload: CreateTemplatePayload = {
      title: title.trim(),
      goal: goal.trim(),
      targetKcal: Number(targetKcal) || 2000,
      proteinG: Number(proteinG) || 0,
      carbsG: Number(carbsG) || 0,
      fatG: Number(fatG) || 0,
      fiberG: Number(fiberG) || 0,
      notes: notes.trim() || undefined,
      durationDays: 30,
      meals: meals.map((m) => ({
        name: m.name,
        time: m.time || undefined,
        notes: m.notes || undefined,
        items: m.items.map((it) => ({
          foodId: it.foodId,
          quantity: Number(it.quantity) || 100,
          measure: it.measure || "g",
          notes: it.notes || undefined,
        })),
      })),
    }

    if (templateToEdit) {
      await updateTemplate.mutateAsync({ id: templateToEdit.id, data: payload })
    } else {
      await createTemplate.mutateAsync(payload)
    }

    onClose()
  }

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-slate-900 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            {templateToEdit ? "Editar Modelo Clínico" : "Novo Modelo de Plano Alimentar"}
          </div>
          <DialogTitle className="text-2xl font-bold text-white mt-1">
            {templateToEdit ? templateToEdit.title : "Criar Modelo Reutilizável"}
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs mt-1">
            Configure as metas de macronutrientes e a composição das refeições para reutilizar
            com qualquer paciente.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* Dados Gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Título do Modelo *</Label>
              <Input
                placeholder="Ex: Hipertrofia Moderada V1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Objetivo Clínico *</Label>
              <Input
                placeholder="Ex: Ganho de Massa com Déficit Suave"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* Metas Nutricionais */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Metas de Macronutrientes e Calorias
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <Label className="text-[11px] text-slate-500 font-medium">Calorias (kcal)</Label>
                <Input
                  type="number"
                  value={targetKcal}
                  onChange={(e) => setTargetKcal(Number(e.target.value))}
                  className="h-9 font-bold text-slate-800"
                />
              </div>
              <div>
                <Label className="text-[11px] text-sky-600 font-semibold">Proteína (g)</Label>
                <Input
                  type="number"
                  value={proteinG}
                  onChange={(e) => setProteinG(Number(e.target.value))}
                  className="h-9 font-bold text-sky-900"
                />
              </div>
              <div>
                <Label className="text-[11px] text-amber-600 font-semibold">Carboidratos (g)</Label>
                <Input
                  type="number"
                  value={carbsG}
                  onChange={(e) => setCarbsG(Number(e.target.value))}
                  className="h-9 font-bold text-amber-900"
                />
              </div>
              <div>
                <Label className="text-[11px] text-rose-600 font-semibold">Gorduras (g)</Label>
                <Input
                  type="number"
                  value={fatG}
                  onChange={(e) => setFatG(Number(e.target.value))}
                  className="h-9 font-bold text-rose-900"
                />
              </div>
              <div>
                <Label className="text-[11px] text-emerald-600 font-semibold">Fibras (g)</Label>
                <Input
                  type="number"
                  value={fiberG}
                  onChange={(e) => setFiberG(Number(e.target.value))}
                  className="h-9 font-bold text-emerald-900"
                />
              </div>
            </div>
          </div>

          {/* Orientações Clínicas / Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Orientações Clínicas e Condutas (Opcional)
            </Label>
            <Textarea
              placeholder="Recomendações de hidratação, substituições, suplementação de apoio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[70px]"
            />
          </div>

          {/* Refeições e Alimentos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Utensils className="w-4 h-4 text-teal-600" />
                Refeições do Modelo ({meals.length})
              </h4>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMeal}
                className="text-xs text-teal-700 border-teal-300 hover:bg-teal-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Refeição
              </Button>
            </div>

            <div className="space-y-4">
              {meals.map((meal, mealIdx) => (
                <div
                  key={mealIdx}
                  className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Input
                        value={meal.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setMeals((prev) => {
                            const next = [...prev]
                            next[mealIdx].name = val
                            return next
                          })
                        }}
                        placeholder="Nome da refeição (ex: Almoço)"
                        className="h-8 text-xs font-semibold max-w-xs"
                      />
                      <Input
                        type="time"
                        value={meal.time}
                        onChange={(e) => {
                          const val = e.target.value
                          setMeals((prev) => {
                            const next = [...prev]
                            next[mealIdx].time = val
                            return next
                          })
                        }}
                        className="h-8 text-xs w-28"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMeal(mealIdx)}
                      className="text-slate-400 hover:text-red-600 h-8 px-2 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remover
                    </Button>
                  </div>

                  {/* Alimentos da Refeição */}
                  <div className="space-y-2">
                    {meal.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs"
                      >
                        <span className="font-medium text-slate-700 flex-1 truncate">
                          {item.name}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setMeals((prev) => {
                                const next = [...prev]
                                next[mealIdx].items[itemIdx].quantity = val
                                return next
                              })
                            }}
                            className="h-7 w-20 text-xs font-mono"
                          />
                          <Input
                            value={item.measure}
                            onChange={(e) => {
                              const val = e.target.value
                              setMeals((prev) => {
                                const next = [...prev]
                                next[mealIdx].items[itemIdx].measure = val
                                return next
                              })
                            }}
                            className="h-7 w-16 text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(mealIdx, itemIdx)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Botão para buscar e adicionar alimento à refeição */}
                    {activeMealIndexForSearch === mealIdx ? (
                      <div className="border border-teal-200 bg-teal-50/50 p-3 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                              placeholder="Digite o nome do alimento (ex: frango, arroz, aveia)..."
                              value={foodSearchQuery}
                              onChange={(e) => handleSearchFood(e.target.value)}
                              className="h-8 pl-8 text-xs bg-white"
                              autoFocus
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveMealIndexForSearch(null)}
                            className="h-8 text-xs text-slate-500"
                          >
                            Cancelar
                          </Button>
                        </div>

                        {/* Resultados da busca */}
                        {isSearchingFood ? (
                          <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando alimentos...
                          </div>
                        ) : foodSearchResults.length > 0 ? (
                          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded border border-slate-200">
                            {foodSearchResults.map((food) => (
                              <button
                                key={food.id}
                                type="button"
                                onClick={() => handleAddFoodToMeal(mealIdx, food)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 flex items-center justify-between"
                              >
                                <span className="font-medium text-slate-700">{food.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {food.kcal} kcal | P:{food.protein}g C:{food.carbs}g G:{food.fat}g
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : foodSearchQuery.length >= 2 ? (
                          <div className="py-2 text-center text-xs text-slate-400">
                            Nenhum alimento encontrado.
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveMealIndexForSearch(mealIdx)
                          setFoodSearchQuery("")
                          setFoodSearchResults([])
                        }}
                        className="text-xs text-teal-700 hover:bg-teal-50 h-8 gap-1.5 w-full justify-start border border-dashed border-teal-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Alimento a esta refeição
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex sm:justify-between items-center gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar Modelo Clínico"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
