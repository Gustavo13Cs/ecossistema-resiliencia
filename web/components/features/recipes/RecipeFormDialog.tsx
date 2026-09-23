"use client"

import axios from "axios"
import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRecipeFoodSearch } from "@/hooks/features/useRecipes"
import {
  calculateRecipePreview,
  getRecipeFoodUnitPresentation,
} from "@/lib/recipe-nutrition"
import type {
  RecipeCategory,
  RecipeFood,
  RecipeFormValues,
  RecipeNutrition,
  RecipeSummary,
} from "@/types/recipe"
import { RECIPE_CATEGORY_LABELS } from "./RecipeFilters"

interface RecipeFormDialogProps {
  open: boolean
  recipe?: RecipeSummary | null
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RecipeFormValues) => Promise<void>
}

interface IngredientDraft {
  food: RecipeFood
  quantity: number
  measure: string
}

interface FormDraft {
  name: string
  description: string
  category: RecipeCategory
  servings: number
  instructions: string
  isGlutenFree: boolean
  isLactoseFree: boolean
  isVegan: boolean
}

const EMPTY_FORM: FormDraft = {
  name: "",
  description: "",
  category: "MAIN_MEAL",
  servings: 1,
  instructions: "",
  isGlutenFree: false,
  isLactoseFree: false,
  isVegan: false,
}

function initialDraft(recipe?: RecipeSummary | null) {
  if (!recipe) return { form: EMPTY_FORM, ingredients: [] as IngredientDraft[] }
  const version = recipe.currentVersion
  return {
    form: {
      name: version.name,
      description: version.description ?? "",
      category: version.category,
      servings: version.servings,
      instructions: version.instructions ?? "",
      isGlutenFree: version.isGlutenFree,
      isLactoseFree: version.isLactoseFree,
      isVegan: version.isVegan,
    },
    ingredients: version.ingredients.map((ingredient) => ({
      food: ingredient.food,
      quantity: ingredient.quantity,
      measure: ingredient.measure,
    })),
  }
}

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeoutId)
  }, [delay, value])
  return debounced
}

function safeErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message
    if (typeof message === "string" && message.trim().length > 0 && message.length <= 240) {
      return message
    }
  }
  return "Não foi possível salvar a receita. Revise os dados e tente novamente."
}

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

const PREVIEW_FIELDS = [
  { key: "kcal", label: "Calorias", unit: "kcal" },
  { key: "protein", label: "Proteínas", unit: "g" },
  { key: "carbs", label: "Carboidratos", unit: "g" },
  { key: "fat", label: "Gorduras", unit: "g" },
  { key: "fiber", label: "Fibras", unit: "g" },
  { key: "sodium", label: "Sódio", unit: "mg" },
  { key: "calcium", label: "Cálcio", unit: "mg" },
  { key: "iron", label: "Ferro", unit: "mg" },
] as const satisfies readonly {
  key: keyof RecipeNutrition
  label: string
  unit: string
}[]

export function RecipeFormDialog({
  open,
  recipe,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: RecipeFormDialogProps) {
  const initial = initialDraft(recipe)
  const [form, setForm] = useState<FormDraft>(initial.form)
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(initial.ingredients)
  const [foodSearch, setFoodSearch] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const debouncedFoodSearch = useDebouncedValue(foodSearch, 300)
  const foodQuery = useRecipeFoodSearch(debouncedFoodSearch, open)

  useEffect(() => {
    if (!open) return
    const next = initialDraft(recipe)
    setForm(next.form)
    setIngredients(next.ingredients)
    setFoodSearch("")
    setFormError(null)
  }, [open, recipe])

  const selectedFoodIds = useMemo(
    () => new Set(ingredients.map((ingredient) => ingredient.food.id)),
    [ingredients],
  )

  const preview = useMemo(() => {
    if (ingredients.length === 0) return null
    try {
      return calculateRecipePreview(
        ingredients.map((ingredient) => ({
          foodId: ingredient.food.id,
          quantity: ingredient.quantity,
          food: ingredient.food,
        })),
        form.servings,
      )
    } catch {
      return null
    }
  }, [form.servings, ingredients])

  const addFood = (food: RecipeFood) => {
    if (selectedFoodIds.has(food.id)) return
    const { measure } = getRecipeFoodUnitPresentation(
      food.baseAmount,
      food.baseUnit,
    )
    setIngredients((current) => [
      ...current,
      { food, quantity: food.baseAmount, measure },
    ])
    setFoodSearch("")
  }

  const updateIngredient = (
    foodId: string,
    update: Partial<Pick<IngredientDraft, "quantity" | "measure">>,
  ) => {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.food.id === foodId ? { ...ingredient, ...update } : ingredient,
      ),
    )
  }

  const submit = async () => {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError("Informe o nome da receita.")
      return
    }
    if (ingredients.length === 0) {
      setFormError("Adicione ao menos um ingrediente.")
      return
    }
    if (!preview) {
      setFormError("Confira o rendimento e as quantidades dos ingredientes.")
      return
    }

    const values: RecipeFormValues = {
      name: form.name.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      category: form.category,
      servings: form.servings,
      ...(form.instructions.trim() ? { instructions: form.instructions.trim() } : {}),
      isGlutenFree: form.isGlutenFree,
      isLactoseFree: form.isLactoseFree,
      isVegan: form.isVegan,
      ingredients: ingredients.map((ingredient) => ({
        foodId: ingredient.food.id,
        quantity: ingredient.quantity,
        measure: ingredient.measure.trim(),
      })),
    }

    if (values.ingredients.some((ingredient) => !ingredient.measure)) {
      setFormError("Informe a medida de todos os ingredientes.")
      return
    }

    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      setFormError(safeErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-[var(--sm-border)] bg-[var(--sm-surface)] p-0 shadow-[var(--sm-shadow-elevated)] sm:max-w-3xl">
        <DialogHeader className="border-b border-[var(--sm-border)] px-5 py-5 sm:px-6">
          <DialogTitle className="text-xl tracking-[-0.02em] text-[var(--sm-ink)]">
            {recipe ? "Editar receita" : "Nova receita"}
          </DialogTitle>
          <DialogDescription>
            {recipe
              ? `A edição cria a versão ${recipe.currentVersion.version + 1} sem alterar prescrições anteriores.`
              : "Monte a preparação com alimentos do seu banco. A API recalcula os nutrientes ao salvar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 px-5 py-5 sm:px-6">
          <section aria-labelledby="recipe-basic-data" className="space-y-4">
            <h3 id="recipe-basic-data" className="text-sm font-bold text-[var(--sm-ink)]">Informações da receita</h3>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
              <div className="space-y-2">
                <Label htmlFor="recipe-name">Nome</Label>
                <Input id="recipe-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Sopa de lentilha" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(category) => setForm((current) => ({ ...current, category: category as RecipeCategory }))}>
                  <SelectTrigger aria-label="Categoria" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RECIPE_CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="recipe-servings">Porções</Label>
                <Input id="recipe-servings" aria-label="Porções" type="number" min="0.000001" step="0.5" value={form.servings} onChange={(event) => setForm((current) => ({ ...current, servings: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipe-description">Descrição</Label>
                <Input id="recipe-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Contexto opcional para encontrar a receita" />
              </div>
            </div>
          </section>

          <section aria-labelledby="recipe-ingredients" className="space-y-4 border-t border-[var(--sm-border)] pt-6">
            <div>
              <h3 id="recipe-ingredients" className="text-sm font-bold text-[var(--sm-ink)]">Ingredientes</h3>
              <p className="mt-1 text-sm text-[var(--sm-muted)]">A quantidade usa a mesma base nutricional exibida no alimento, sem conversão implícita.</p>
            </div>
            <label className="relative block">
              <span className="sr-only">Buscar alimento</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" strokeWidth={1.8} />
              <Input type="search" aria-label="Buscar alimento" value={foodSearch} onChange={(event) => setFoodSearch(event.target.value)} placeholder="Digite ao menos 2 letras" className="pl-10" />
            </label>

            {debouncedFoodSearch.length >= 2 ? (
              <div className="divide-y divide-[var(--sm-border)] rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)]" aria-live="polite">
                {foodQuery.isPending ? <p className="p-3 text-sm text-[var(--sm-muted)]">Buscando alimentos...</p> : null}
                {foodQuery.isError ? <p role="alert" className="p-3 text-sm text-[var(--sm-danger)]">Não foi possível buscar alimentos.</p> : null}
                {foodQuery.data?.length === 0 ? <p className="p-3 text-sm text-[var(--sm-muted)]">Nenhum alimento encontrado.</p> : null}
                {foodQuery.data?.map((food) => {
                  const alreadyAdded = selectedFoodIds.has(food.id)
                  const { baseLabel } = getRecipeFoodUnitPresentation(
                    food.baseAmount,
                    food.baseUnit,
                  )
                  return (
                    <button key={food.id} type="button" disabled={alreadyAdded} onClick={() => addFood(food)} aria-label={alreadyAdded ? `${food.name} já adicionado` : `Adicionar ${food.name}`} className="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition hover:bg-[var(--sm-subtle-hover)] disabled:cursor-not-allowed disabled:opacity-50">
                      <span className="font-semibold text-[var(--sm-ink)]">{food.name}</span>
                      <span className="shrink-0 text-xs text-[var(--sm-muted)]">Base: {baseLabel}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}

            <div className="space-y-3">
              {ingredients.map((ingredient) => (
                <div key={ingredient.food.id} role="group" aria-label={ingredient.food.name} className="grid gap-3 rounded-[var(--sm-radius-sm)] border border-[var(--sm-border)] p-3 sm:grid-cols-[minmax(10rem,1fr)_8rem_9rem_auto] sm:items-end">
                  <div>
                    <p className="font-semibold text-[var(--sm-ink)]">{ingredient.food.name}</p>
                    <p className="mt-1 text-xs text-[var(--sm-muted)]">Base nutricional: {getRecipeFoodUnitPresentation(ingredient.food.baseAmount, ingredient.food.baseUnit).baseLabel}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`ingredient-quantity-${ingredient.food.id}`}>Quantidade</Label>
                    <Input id={`ingredient-quantity-${ingredient.food.id}`} aria-label="Quantidade" type="number" min="0.000001" step="0.1" value={ingredient.quantity} onChange={(event) => updateIngredient(ingredient.food.id, { quantity: Number(event.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`ingredient-measure-${ingredient.food.id}`}>Medida</Label>
                    <Input id={`ingredient-measure-${ingredient.food.id}`} aria-label="Medida" value={ingredient.measure} onChange={(event) => updateIngredient(ingredient.food.id, { measure: event.target.value })} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${ingredient.food.name}`} onClick={() => setIngredients((current) => current.filter((item) => item.food.id !== ingredient.food.id))} className="min-h-10 min-w-10 text-[var(--sm-danger)] hover:bg-[var(--sm-danger-subtle)] hover:text-[var(--sm-danger)]">
                    <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="recipe-restrictions" className="space-y-3 border-t border-[var(--sm-border)] pt-6">
            <h3 id="recipe-restrictions" className="text-sm font-bold text-[var(--sm-ink)]">Marcadores de restrição</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {([ ["isGlutenFree", "Sem glúten"], ["isLactoseFree", "Sem lactose"], ["isVegan", "Vegano"] ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2"><Checkbox id={`recipe-form-${key}`} checked={form[key]} onCheckedChange={(checked) => setForm((current) => ({ ...current, [key]: checked === true }))} /><Label htmlFor={`recipe-form-${key}`} className="cursor-pointer">{label}</Label></div>
              ))}
            </div>
            <p className="flex items-start gap-2 text-sm text-[var(--sm-muted)]"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--sm-brand)]" strokeWidth={1.8} />Marcadores informados manualmente. Confira ingredientes e rótulos.</p>
          </section>

          <section aria-labelledby="recipe-instructions" className="space-y-2 border-t border-[var(--sm-border)] pt-6">
            <Label id="recipe-instructions" htmlFor="recipe-instructions-field" className="font-bold">Modo de preparo</Label>
            <Textarea id="recipe-instructions-field" value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Descreva as etapas de preparo" rows={4} />
          </section>

          <section aria-labelledby="recipe-preview" className="border-t border-[var(--sm-border)] pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id="recipe-preview" className="text-sm font-bold text-[var(--sm-ink)]">Prévia por porção</h3><p className="text-xs text-[var(--sm-muted)]">Feedback visual. A API é a autoridade ao salvar.</p></div>
            {preview ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
                {PREVIEW_FIELDS.map(({ key, label, unit }) => <div key={key} className="border-b border-[var(--sm-border)] pb-2"><dt className="text-xs text-[var(--sm-muted)]">{label}</dt><dd className="mt-1 font-bold tabular-nums text-[var(--sm-ink)]">{numberFormat.format(preview[key])} {unit}</dd></div>)}
              </dl>
            ) : <p className="mt-3 text-sm text-[var(--sm-muted)]">Adicione ingredientes e informe quantidades válidas para calcular a prévia.</p>}
          </section>

          {formError ? <p role="alert" className="rounded-[var(--sm-radius-sm)] bg-[var(--sm-danger-subtle)] p-3 text-sm text-[var(--sm-danger)]">{formError}</p> : null}
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-[var(--sm-border)] bg-[var(--sm-surface)] px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={isSubmitting} onClick={() => void submit()} className="bg-[var(--sm-brand)] text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)]">
            {isSubmitting ? "Salvando..." : <><Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />Salvar receita</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
