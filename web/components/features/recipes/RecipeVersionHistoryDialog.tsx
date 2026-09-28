"use client"

import { History } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useRecipe } from "@/hooks/features/useRecipes"
import { RECIPE_CATEGORY_LABELS } from "./RecipeFilters"

interface RecipeVersionHistoryDialogProps {
  recipeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "Data indisponível"
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

export function RecipeVersionHistoryDialog({ recipeId, open, onOpenChange }: RecipeVersionHistoryDialogProps) {
  const recipeQuery = useRecipe(recipeId, open)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-elevated)] sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[var(--sm-brand)]"><History aria-hidden="true" className="size-5" strokeWidth={1.8} /><DialogTitle className="text-[var(--sm-ink)]">Histórico da receita</DialogTitle></div>
          <DialogDescription>Versões publicadas são somente leitura para preservar prescrições anteriores.</DialogDescription>
        </DialogHeader>
        {recipeQuery.isPending ? (
          <div className="space-y-3" aria-label="Carregando histórico"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : recipeQuery.isError ? (
          <p role="alert" className="rounded-[var(--sm-radius-sm)] bg-[var(--sm-danger-subtle)] p-4 text-sm text-[var(--sm-danger)]">Não foi possível carregar o histórico desta receita.</p>
        ) : (
          <div className="divide-y divide-[var(--sm-border)] border-y border-[var(--sm-border)]">
            {(recipeQuery.data?.versions ?? []).toReversed().map((version) => (
              <section key={version.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-bold text-[var(--sm-ink)]">Versão {version.version} · {version.name}</h3><time className="text-xs text-[var(--sm-muted)]" dateTime={version.createdAt}>{formatDate(version.createdAt)}</time></div>
                <p className="mt-1 text-sm text-[var(--sm-muted)]">{RECIPE_CATEGORY_LABELS[version.category]} · {version.servings} porções · {version.ingredients.length} ingredientes</p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-[var(--sm-ink)]">{version.kcal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kcal · {version.protein.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} g proteína por porção</p>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
