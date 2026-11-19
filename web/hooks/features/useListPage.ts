"use client"
import { useCallback, useEffect, useState } from "react"
import type { PaginationMeta } from "@/lib/pagination"

export function useListPage(scope: string) {
  const [state, setState] = useState({ scope, page: 1 })
  // Reinicia também quando o usuário volta a um filtro visitado anteriormente.
  if (state.scope !== scope) setState({ scope, page: 1 })
  const page = state.scope === scope ? state.page : 1
  const setPage = useCallback(
    (next: number) => setState({ scope, page: Math.max(1, next) }),
    [scope]
  )
  return { page, setPage }
}
export function useClampPage(
  page: number,
  setPage: (page: number) => void,
  meta?: PaginationMeta
) {
  useEffect(() => {
    if (meta && page > meta.pageCount) setPage(meta.pageCount)
  }, [page, meta, setPage])
}
