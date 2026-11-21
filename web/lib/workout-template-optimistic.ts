import type { QueryClient, QueryKey } from "@tanstack/react-query"
import type {
  WorkoutTemplateDetail,
  WorkoutTemplateFilters,
  WorkoutTemplatePage,
  WorkoutTemplateSummary,
} from "@/types/workout-template"

export type TemplateArchiveAction = "archive" | "restore"

export type OptimisticTemplateSnapshot = {
  owner: string
  templateId: string
  action: TemplateArchiveAction
  previousLists: Array<[QueryKey, WorkoutTemplatePage | undefined]>
  previousDetail?: [QueryKey, WorkoutTemplateDetail | null | undefined]
}

export function workoutTemplatesRootKey(owner: string) {
  return ["workout-templates", owner] as const
}

export function workoutTemplateDetailKey(owner: string, templateId: string) {
  return ["workout-templates", owner, "detail", templateId] as const
}

function workoutTemplateAccessKey(owner: string) {
  return ["workout-templates", owner, "access"] as const
}

export function matchesWorkoutTemplateFilters(
  item: WorkoutTemplateSummary,
  filters?: WorkoutTemplateFilters,
): boolean {
  const origin = filters?.origin ?? "all"
  if (origin === "global" && !item.isGlobal) return false
  if (origin === "private" && item.isGlobal) return false

  const status = filters?.status ?? "active"
  if (status === "active" && item.archivedAt) return false
  if (status === "archived" && !item.archivedAt) return false

  if (filters?.goal && item.goal !== filters.goal) return false
  if (filters?.level && item.level !== filters.level) return false
  if (filters?.environment && item.environment !== filters.environment) {
    return false
  }

  const normalizedQuery = filters?.q?.trim().toLowerCase()
  if (normalizedQuery) {
    const titleMatches = item.title.toLowerCase().includes(normalizedQuery)
    const descriptionMatches = (item.description ?? "")
      .toLowerCase()
      .includes(normalizedQuery)
    if (!titleMatches && !descriptionMatches) return false
  }

  return true
}

function hasCachedQuery(cache: QueryClient, queryKey: QueryKey): boolean {
  return Boolean(cache.getQueryCache().find({ queryKey, exact: true }))
}

export function applyOptimisticTemplateArchiveState(
  cache: QueryClient,
  owner: string,
  templateId: string,
  action: TemplateArchiveAction,
  optimisticTimestamp: string,
): OptimisticTemplateSnapshot {
  const listEntries = cache.getQueriesData<WorkoutTemplatePage>({
    queryKey: [...workoutTemplatesRootKey(owner), "list"],
  })
  const detailKey = workoutTemplateDetailKey(owner, templateId)
  const detailExists = hasCachedQuery(cache, detailKey)
  const cachedDetail = detailExists
    ? cache.getQueryData<WorkoutTemplateDetail | null>(detailKey)
    : undefined

  const snapshot: OptimisticTemplateSnapshot = {
    owner,
    templateId,
    action,
    previousLists: listEntries.map(([queryKey, page]) => [
      queryKey,
      page ? { ...page, items: [...page.items] } : page,
    ]),
    ...(detailExists
      ? {
          previousDetail: [
            detailKey,
            cachedDetail ? { ...cachedDetail } : cachedDetail,
          ] as [QueryKey, WorkoutTemplateDetail | null | undefined],
        }
      : {}),
  }

  const foundSummary =
    listEntries
      .flatMap(([, page]) => page?.items ?? [])
      .find(item => item.id === templateId) ?? cachedDetail

  // Apenas modelos privados editáveis permitem alternar arquivamento.
  if (foundSummary?.isGlobal) {
    return snapshot
  }

  const nextArchivedAt = action === "archive" ? optimisticTimestamp : null

  for (const [queryKey, page] of listEntries) {
    if (!page) continue
    const queryFilters = (queryKey[3] ?? {}) as WorkoutTemplateFilters
    const queryCursor = queryKey[4]
    const effectiveStatus = queryFilters.status ?? "active"
    const effectiveOrigin = queryFilters.origin ?? "all"

    if (effectiveStatus === "all") {
      if (!page.items.some(item => item.id === templateId)) continue
      cache.setQueryData<WorkoutTemplatePage>(queryKey, {
        ...page,
        items: page.items.map(item =>
          item.id === templateId
            ? { ...item, archivedAt: nextArchivedAt, updatedAt: optimisticTimestamp }
            : item,
        ),
      })
      continue
    }

    const leavesCurrentStatus =
      (action === "archive" && effectiveStatus === "active") ||
      (action === "restore" && effectiveStatus === "archived")

    if (leavesCurrentStatus) {
      if (!page.items.some(item => item.id === templateId)) continue
      cache.setQueryData<WorkoutTemplatePage>(queryKey, {
        ...page,
        items: page.items.filter(item => item.id !== templateId),
      })
      continue
    }

    if (
      effectiveOrigin !== "global" &&
      queryCursor === "first" &&
      foundSummary &&
      !page.items.some(item => item.id === templateId)
    ) {
      const updatedItem: WorkoutTemplateSummary = {
        ...foundSummary,
        archivedAt: nextArchivedAt,
        updatedAt: optimisticTimestamp,
      }
      if (matchesWorkoutTemplateFilters(updatedItem, queryFilters)) {
        cache.setQueryData<WorkoutTemplatePage>(queryKey, {
          ...page,
          items: [updatedItem, ...page.items],
        })
      }
    }
  }

  if (detailExists && cachedDetail && !cachedDetail.isGlobal) {
    cache.setQueryData<WorkoutTemplateDetail>(detailKey, {
      ...cachedDetail,
      archivedAt: nextArchivedAt,
      updatedAt: optimisticTimestamp,
    })
  }

  return snapshot
}

export function rollbackOptimisticTemplateArchiveState(
  cache: QueryClient,
  snapshot: OptimisticTemplateSnapshot,
): void {
  // Nunca ressuscita modelos privados se a sessão perdeu acesso (401/403).
  if (cache.getQueryData(workoutTemplateAccessKey(snapshot.owner))) {
    return
  }

  for (const [queryKey, previousPage] of snapshot.previousLists) {
    if (!hasCachedQuery(cache, queryKey)) continue
    cache.setQueryData(queryKey, previousPage)
  }

  if (snapshot.previousDetail) {
    const [detailKey, previousDetail] = snapshot.previousDetail
    if (hasCachedQuery(cache, detailKey)) {
      cache.setQueryData(detailKey, previousDetail)
    }
  }
}

export function reconcileTemplateArchiveState(
  cache: QueryClient,
  owner: string,
  confirmed: WorkoutTemplateSummary,
): void {
  if (cache.getQueryData(workoutTemplateAccessKey(owner))) {
    return
  }

  const detailKey = workoutTemplateDetailKey(owner, confirmed.id)
  if (!hasCachedQuery(cache, detailKey)) return

  const currentDetail = cache.getQueryData<WorkoutTemplateDetail | null>(
    detailKey,
  )
  if (!currentDetail || currentDetail.isGlobal) return

  cache.setQueryData<WorkoutTemplateDetail>(detailKey, {
    ...currentDetail,
    archivedAt: confirmed.archivedAt ?? null,
    updatedAt: confirmed.updatedAt,
  })
}
