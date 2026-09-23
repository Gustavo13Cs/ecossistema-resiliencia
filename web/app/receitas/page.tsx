"use client"

import { useState } from "react"
import { AlertCircle, BookOpen, Plus, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import {
  useArchiveRecipe,
  useCreateRecipe,
  useDuplicateRecipe,
  useRecipes,
  useRestoreRecipe,
  useUpdateRecipe,
} from "@/hooks/features/useRecipes"
import { RecipeCard } from "@/components/features/recipes/RecipeCard"
import { hasActiveRecipeFilters, RecipeFilters } from "@/components/features/recipes/RecipeFilters"
import { RecipeFormDialog } from "@/components/features/recipes/RecipeFormDialog"
import { RecipeVersionHistoryDialog } from "@/components/features/recipes/RecipeVersionHistoryDialog"
import type { RecipeFilters as RecipeFilterValues, RecipeFormValues, RecipeSummary } from "@/types/recipe"

const DEFAULT_FILTERS: RecipeFilterValues = { status: "ACTIVE" }

function LoadingRecipes() {
  return (
    <div aria-label="Carregando receitas" className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-3/5" />
          <Skeleton className="mt-5 h-16 w-full" />
          <Skeleton className="mt-5 h-9 w-2/3" />
        </div>
      ))}
    </div>
  )
}

interface RecipeEmptyStateProps {
  filtered: boolean
  onCreate: () => void
  onClear: () => void
}

function RecipeEmptyState({ filtered, onCreate, onClear }: RecipeEmptyStateProps) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-[var(--sm-radius-sm)] bg-[var(--sm-brand-subtle)] text-[var(--sm-brand)]">
        {filtered ? <BookOpen aria-hidden="true" className="size-5" strokeWidth={1.8} /> : <UtensilsCrossed aria-hidden="true" className="size-5" strokeWidth={1.8} />}
      </div>
      <h2 className="mt-4 text-lg font-bold text-[var(--sm-ink)]">{filtered ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--sm-muted)]">
        {filtered ? "Ajuste a busca ou remova filtros para ampliar os resultados." : "Cadastre uma preparação para reutilizar ingredientes e nutrientes nos seus planos alimentares."}
      </p>
      {filtered ? (
        <Button type="button" variant="outline" onClick={onClear} className="mt-5 min-h-11">Ver todas as receitas</Button>
      ) : (
        <Button type="button" variant="outline" onClick={onCreate} className="mt-5 min-h-11">Cadastrar primeira receita</Button>
      )}
    </section>
  )
}

export default function ReceitasPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<RecipeFilterValues>(DEFAULT_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeSummary | null>(null)
  const [historyRecipeId, setHistoryRecipeId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const recipesQuery = useRecipes(filters)
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const duplicateRecipe = useDuplicateRecipe()
  const archiveRecipe = useArchiveRecipe()
  const restoreRecipe = useRestoreRecipe()

  const isMutating = createRecipe.isPending || updateRecipe.isPending || duplicateRecipe.isPending || archiveRecipe.isPending || restoreRecipe.isPending

  const openCreate = () => {
    setEditingRecipe(null)
    setFormOpen(true)
  }

  const submitRecipe = async (values: RecipeFormValues) => {
    if (editingRecipe) {
      await updateRecipe.mutateAsync({ recipeId: editingRecipe.id, values, expectedVersion: editingRecipe.currentVersion.version })
    } else {
      await createRecipe.mutateAsync(values)
    }
  }

  const runCardAction = async (action: () => Promise<RecipeSummary>) => {
    setActionError(null)
    try {
      await action()
    } catch {
      setActionError("Não foi possível concluir a ação. Tente novamente.")
    }
  }

  if (user?.role !== "NUTRITIONIST") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] p-6">
          <h1 className="text-xl font-bold text-[var(--sm-ink)]">Banco de receitas</h1>
          <p className="mt-2 text-sm text-[var(--sm-muted)]">Esta área é exclusiva do workspace de Nutrição.</p>
        </section>
      </main>
    )
  }

  const recipes = recipesQuery.data ?? []
  const filtered = hasActiveRecipeFilters(filters)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[var(--sm-ink)] sm:text-3xl">Banco de receitas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sm-muted)]">Organize preparações privadas, consulte nutrientes por porção e preserve cada versão usada nas prescrições.</p>
        </div>
        <Button type="button" onClick={openCreate} className="min-h-11 self-start bg-[var(--sm-brand)] px-5 text-[var(--sm-on-brand)] hover:bg-[var(--sm-brand-hover)] sm:self-auto">
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />Nova receita
        </Button>
      </header>

      <div className="mt-7 overflow-hidden rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[var(--sm-surface)] shadow-[var(--sm-shadow-rest)]">
        <RecipeFilters filters={filters} onChange={setFilters} onClear={() => setFilters(DEFAULT_FILTERS)} />
        <div className="bg-[var(--sm-canvas)] p-4 sm:p-5">
          {actionError ? (
            <div role="alert" className="mb-4 flex items-start justify-between gap-4 rounded-[var(--sm-radius-sm)] border border-[var(--sm-danger-border)] bg-[var(--sm-danger-subtle)] p-3 text-sm text-[var(--sm-danger)]">
              <span className="flex items-start gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{actionError}</span>
              <button type="button" onClick={() => setActionError(null)} className="font-bold underline">Fechar</button>
            </div>
          ) : null}

          {recipesQuery.isPending ? (
            <LoadingRecipes />
          ) : recipesQuery.isError ? (
            <section className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <AlertCircle aria-hidden="true" className="size-7 text-[var(--sm-danger)]" strokeWidth={1.8} />
              <h2 className="mt-4 text-lg font-bold text-[var(--sm-ink)]">Não foi possível carregar suas receitas</h2>
              <p className="mt-2 max-w-md text-sm text-[var(--sm-muted)]">A biblioteca continua segura. Verifique sua conexão e tente novamente.</p>
              <Button type="button" variant="outline" onClick={() => void recipesQuery.refetch()} className="mt-5 min-h-11">Tentar novamente</Button>
            </section>
          ) : recipes.length === 0 ? (
            <RecipeEmptyState filtered={filtered} onCreate={openCreate} onClear={() => setFilters(DEFAULT_FILTERS)} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  pending={isMutating}
                  onEdit={(selected) => { setEditingRecipe(selected); setFormOpen(true) }}
                  onHistory={(selected) => setHistoryRecipeId(selected.id)}
                  onDuplicate={(selected) => runCardAction(() => duplicateRecipe.mutateAsync(selected.id))}
                  onStatusChange={(selected) => runCardAction(() => selected.status === "ACTIVE" ? archiveRecipe.mutateAsync(selected.id) : restoreRecipe.mutateAsync(selected.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <RecipeFormDialog open={formOpen} recipe={editingRecipe} isSubmitting={createRecipe.isPending || updateRecipe.isPending} onOpenChange={setFormOpen} onSubmit={submitRecipe} />
      <RecipeVersionHistoryDialog recipeId={historyRecipeId} open={historyRecipeId !== null} onOpenChange={(open) => { if (!open) setHistoryRecipeId(null) }} />
    </main>
  )
}
