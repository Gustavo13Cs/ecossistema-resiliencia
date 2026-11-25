import { Button } from "@/components/ui/button"
import type { PaginationMeta } from "@/lib/pagination"
export function PaginationControls({
  pagination,
  onPageChange,
  busy = false,
  label,
}: {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  busy?: boolean
  label: string
}) {
  const { page, pageSize, total, pageCount } = pagination
  return (
    <nav
      aria-label={`Paginação de ${label}`}
      aria-busy={busy}
      className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
    >
      <span aria-live="polite">
        {total ? (page - 1) * pageSize + 1 : 0}–
        {Math.min(page * pageSize, total)} de {total} · Página {page} de{" "}
        {pageCount}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={busy || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={busy || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  )
}
