"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RecipeSummary, RecipeVersion } from "@/types/recipe"
import { useRecipes } from "@/hooks/features/useRecipes"

interface Props {
  recipes: RecipeSummary[]
  onSelect: (version: RecipeVersion, servings: number) => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

export function RecipePickerPanel({ recipes, onSelect, isLoading, isError, onRetry }: Props) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [restrictions, setRestrictions] = useState({ isGlutenFree: false, isLactoseFree: false, isVegan: false })
  const [servings, setServings] = useState<Record<string, string>>({})
  const filtered = recipes.filter((recipe) => recipe.status === "ACTIVE" &&
    recipe.currentVersion.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (!category || recipe.currentVersion.category === category) &&
    (!restrictions.isGlutenFree || recipe.currentVersion.isGlutenFree) &&
    (!restrictions.isLactoseFree || recipe.currentVersion.isLactoseFree) &&
    (!restrictions.isVegan || recipe.currentVersion.isVegan))

  return <div className="space-y-3 p-4">
    <div className="flex flex-wrap gap-2">
      <Input type="search" aria-label="Buscar receitas" placeholder="Buscar receitas" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-40 flex-1" />
      <select aria-label="Categoria de receitas" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-md border border-[var(--sm-border)] bg-[var(--sm-surface)] px-3 text-sm">
        <option value="">Todas as categorias</option>
        <option value="BREAKFAST">Café da manhã</option><option value="MAIN_MEAL">Refeição principal</option>
        <option value="SNACK">Lanche</option><option value="DESSERT">Sobremesa</option>
        <option value="DRINK">Bebida</option><option value="OTHER">Outras</option>
      </select>
    </div>
    <div className="flex flex-wrap gap-4 text-sm text-[var(--sm-ink)]">
      {([ ["isGlutenFree", "Sem glúten"], ["isLactoseFree", "Sem lactose"], ["isVegan", "Vegano"] ] as const).map(([key, label]) => <label key={key} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={restrictions[key]} onChange={(event) => setRestrictions((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}
    </div>
    {isLoading ? <p role="status">Carregando receitas...</p> : isError ? <div role="alert">Não foi possível carregar receitas. <Button onClick={onRetry}>Tentar novamente</Button></div> :
      filtered.length === 0 ? <p>Nenhuma receita ativa encontrada.</p> : filtered.map((recipe) => {
        const version = recipe.currentVersion
        const amount = Number(servings[recipe.id] ?? "1")
        return <div key={recipe.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--sm-border)] p-3">
          <div><p className="font-semibold text-[var(--sm-ink)]">{version.name}</p><p className="text-xs text-[var(--sm-muted)]">Versão {version.version} · {version.kcal} kcal por porção</p></div>
          <div className="flex items-center gap-2">
            <Input type="number" min="0.5" step="0.5" aria-label={`Porções de ${version.name}`} value={servings[recipe.id] ?? "1"} onChange={(event) => setServings((previous) => ({ ...previous, [recipe.id]: event.target.value }))} className="w-20" />
            <Button disabled={!Number.isFinite(amount) || amount < 0.5 || amount % 0.5 !== 0} onClick={() => onSelect(version, amount)} aria-label={`Adicionar ${version.name}`}>Adicionar</Button>
          </div>
        </div>
      })}
  </div>
}

export function RecipePicker({ onSelect }: Pick<Props, "onSelect">) {
  const query = useRecipes({ status: "ACTIVE" })
  return <RecipePickerPanel recipes={query.data ?? []} onSelect={onSelect} isLoading={query.isPending} isError={query.isError} onRetry={() => void query.refetch()} />
}
