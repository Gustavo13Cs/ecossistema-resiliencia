import { Archive, ArchiveRestore, Copy, History, Pencil } from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RECIPE_CATEGORY_LABELS } from "./RecipeFilters"
import type { RecipeSummary } from "@/types/recipe"

interface RecipeCardProps {
  recipe: RecipeSummary
  pending?: boolean
  onEdit: (recipe: RecipeSummary) => void
  onHistory: (recipe: RecipeSummary) => void
  onDuplicate: (recipe: RecipeSummary) => Promise<void> | void
  onStatusChange: (recipe: RecipeSummary) => Promise<void> | void
}

const formatNutrition = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)

function RestrictionBadges({ recipe }: { recipe: RecipeSummary }) {
  const version = recipe.currentVersion
  const labels = [version.isGlutenFree ? "Sem glúten" : null, version.isLactoseFree ? "Sem lactose" : null, version.isVegan ? "Vegano" : null].filter((label): label is string => label !== null)
  if (labels.length === 0) return <span className="text-xs text-[var(--sm-muted)]">Sem marcadores</span>
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Restrições informadas">
      {labels.map((label) => <Badge key={label} variant="outline" className="border-[var(--sm-border)] bg-[var(--sm-canvas)] text-[var(--sm-ink)]">{label}</Badge>)}
    </div>
  )
}

export function RecipeCard({ recipe, pending = false, onEdit, onHistory, onDuplicate, onStatusChange }: RecipeCardProps) {
  const version = recipe.currentVersion
  const archived = recipe.status === "ARCHIVED"
  const action = archived ? "Restaurar" : "Arquivar"
  const ActionIcon = archived ? ArchiveRestore : Archive
  return (
    <article className="flex h-full flex-col rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5 shadow-[var(--sm-shadow-rest)] transition-colors hover:border-[color-mix(in_srgb,var(--sm-brand)_38%,var(--sm-border))]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--sm-brand)]">{RECIPE_CATEGORY_LABELS[version.category]} · Versão {version.version}</p>
          <h2 className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-[var(--sm-ink)]">{version.name}</h2>
          <p className="mt-1 text-sm text-[var(--sm-muted)]">Rende {formatNutrition(version.servings)} {version.servings === 1 ? "porção" : "porções"}</p>
        </div>
        {archived ? <Badge variant="outline" className="border-[var(--sm-border)] text-[var(--sm-muted)]">Arquivada</Badge> : null}
      </div>
      <dl className="mt-5 grid grid-cols-4 gap-x-3 border-y border-[var(--sm-border)] py-4">
        {[["kcal", "kcal", version.kcal], ["Proteínas", "g", version.protein], ["Carboidratos", "g", version.carbs], ["Gorduras", "g", version.fat]].map(([label, unit, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-[0.69rem] font-semibold text-[var(--sm-muted)]">{label}</dt>
            <dd className="mt-1 text-sm font-bold tabular-nums text-[var(--sm-ink)]">{formatNutrition(value as number)} {unit}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 min-h-6"><RestrictionBadges recipe={recipe} /></div>
      <div className="mt-auto flex flex-wrap gap-1 border-t border-[var(--sm-border)] pt-4">
        {!archived ? <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onEdit(recipe)}><Pencil aria-hidden="true" className="size-4" strokeWidth={1.8} />Editar</Button> : null}
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onHistory(recipe)}><History aria-hidden="true" className="size-4" strokeWidth={1.8} />Histórico</Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void onDuplicate(recipe)}><Copy aria-hidden="true" className="size-4" strokeWidth={1.8} />Duplicar</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" disabled={pending} className="ml-auto text-[var(--sm-muted)] hover:text-[var(--sm-ink)]"><ActionIcon aria-hidden="true" className="size-4" strokeWidth={1.8} />{action}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-elevated)]">
            <AlertDialogHeader><AlertDialogTitle>{action} receita?</AlertDialogTitle><AlertDialogDescription>{archived ? `${version.name} voltará a aparecer entre as receitas ativas.` : `${version.name} será preservada no histórico e poderá continuar em planos existentes.`}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={() => void onStatusChange(recipe)} className={archived ? "" : "bg-[var(--sm-danger)] text-white hover:bg-[var(--sm-danger)]/90"}>Confirmar {action.toLocaleLowerCase("pt-BR")}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  )
}
