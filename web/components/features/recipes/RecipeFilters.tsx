import { RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RecipeCategory, RecipeFilters as RecipeFilterValues } from "@/types/recipe"

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  BREAKFAST: "Café da manhã",
  MAIN_MEAL: "Refeição principal",
  SNACK: "Lanche",
  DESSERT: "Sobremesa",
  DRINK: "Bebida",
  OTHER: "Outros",
}

interface RecipeFiltersProps {
  filters: RecipeFilterValues
  onChange: (filters: RecipeFilterValues) => void
  onClear: () => void
}

const restrictions = [
  ["isGlutenFree", "Sem glúten"],
  ["isLactoseFree", "Sem lactose"],
  ["isVegan", "Vegano"],
] as const

export function hasActiveRecipeFilters(filters: RecipeFilterValues) {
  return Boolean(
    filters.q?.trim() ||
      filters.category ||
      filters.isGlutenFree ||
      filters.isLactoseFree ||
      filters.isVegan ||
      filters.status === "ARCHIVED",
  )
}

export function RecipeFilters({ filters, onChange, onClear }: RecipeFiltersProps) {
  return (
    <section aria-label="Filtros de receitas" className="border-b border-[var(--sm-border)] bg-[var(--sm-surface)] p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_14rem_auto] lg:items-center">
        <label className="relative block min-w-0">
          <span className="sr-only">Buscar receitas</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sm-muted)]" strokeWidth={1.8} />
          <Input type="search" value={filters.q ?? ""} onChange={(event) => onChange({ ...filters, q: event.target.value })} placeholder="Buscar por nome" aria-label="Buscar receitas" className="min-h-11 bg-[var(--sm-surface)] pl-10 text-base md:text-sm" />
        </label>

        <Select value={filters.category ?? "ALL"} onValueChange={(value) => onChange({ ...filters, category: value === "ALL" ? undefined : (value as RecipeCategory) })}>
          <SelectTrigger aria-label="Categoria" className="min-h-11 w-full bg-[var(--sm-surface)]">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as categorias</SelectItem>
            {Object.entries(RECIPE_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div role="group" aria-label="Status das receitas" className="grid grid-cols-2 gap-1 rounded-[var(--sm-radius-sm)] bg-[var(--sm-canvas)] p-1">
          {(["ACTIVE", "ARCHIVED"] as const).map((status) => (
            <Button key={status} type="button" variant="ghost" aria-pressed={filters.status === status} onClick={() => onChange({ ...filters, status })} className={filters.status === status ? "min-h-10 bg-[var(--sm-surface)] font-bold text-[var(--sm-ink)] shadow-[var(--sm-shadow-rest)] hover:bg-[var(--sm-surface)]" : "min-h-10 text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"}>
              {status === "ACTIVE" ? "Ativas" : "Arquivadas"}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        {restrictions.map(([key, label]) => (
          <div key={key} className="flex min-h-8 items-center gap-2">
            <Checkbox id={`recipe-filter-${key}`} checked={Boolean(filters[key])} onCheckedChange={(checked) => onChange({ ...filters, [key]: checked === true })} />
            <Label htmlFor={`recipe-filter-${key}`} className="cursor-pointer text-sm text-[var(--sm-ink)]">{label}</Label>
          </div>
        ))}
        {hasActiveRecipeFilters(filters) ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="ml-auto min-h-9 text-[var(--sm-brand)] hover:bg-[var(--sm-brand-subtle)] hover:text-[var(--sm-brand-hover)]">
            <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </section>
  )
}
