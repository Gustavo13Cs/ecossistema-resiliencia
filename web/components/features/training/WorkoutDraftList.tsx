"use client"

import { Button } from "@/components/ui/button"
import type { DraftPage, DraftSummary } from "@/types/workout-draft"

export function WorkoutDraftList({ page, onContinue, onDiscard, onNextPage }: {
  page: DraftPage
  onContinue: (draft: DraftSummary) => void
  onDiscard: (draft: DraftSummary) => void
  onNextPage: (cursor: string) => void
}) {
  return <div className="space-y-3">
    {page.items.length === 0 ? <p className="text-sm text-[var(--sm-muted)]">Nenhum rascunho aberto.</p> : <ul className="divide-y divide-[var(--sm-border)]">
      {page.items.map(draft => <li key={draft.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0"><h3 className="break-words font-bold">{draft.title || "Rascunho sem título"}</h3><p className="text-sm">Aluno: {draft.client.name}</p><p className="text-sm text-[var(--sm-muted)]">Atualizado em {new Date(draft.updatedAt).toLocaleString("pt-BR")}</p>{draft.client.status === "ARCHIVED" ? <p>Aluno arquivado · Somente leitura</p> : null}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onContinue(draft)}>{draft.client.status === "ARCHIVED" ? "Consultar rascunho" : "Continuar rascunho"}</Button><Button variant="outline" disabled={draft.client.status === "ARCHIVED"} onClick={() => onDiscard(draft)}>Descartar rascunho</Button></div>
      </li>)}
    </ul>}
    {page.nextCursor ? <Button variant="outline" onClick={() => onNextPage(page.nextCursor!)}>Próxima página de rascunhos</Button> : null}
  </div>
}
