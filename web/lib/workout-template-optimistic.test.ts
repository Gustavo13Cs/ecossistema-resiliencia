import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import type {
  WorkoutTemplateDetail,
  WorkoutTemplatePage,
  WorkoutTemplateSummary,
} from "@/types/workout-template"
import {
  applyOptimisticTemplateArchiveState,
  matchesWorkoutTemplateFilters,
  rollbackOptimisticTemplateArchiveState,
  workoutTemplateDetailKey,
} from "./workout-template-optimistic"

function makeSummary(
  overrides: Partial<WorkoutTemplateSummary> = {},
): WorkoutTemplateSummary {
  return {
    id: "tpl-priv-1",
    title: "Full Body Condomínio",
    description: "Treino enxuto com halteres e polia",
    goal: "CONDITIONING",
    level: "BEGINNER",
    targetAudience: "Iniciantes",
    environment: "CONDO_GYM",
    estimatedWeeks: 6,
    schemaVersion: 3,
    archivedAt: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    isGlobal: false,
    ...overrides,
  }
}

describe("workout-template-optimistic", () => {
  it("matches origin, status, goal, level, environment, and case-insensitive search filters", () => {
    const privActive = makeSummary()
    const privArchived = makeSummary({
      id: "tpl-priv-2",
      archivedAt: "2026-11-10T10:00:00.000Z",
    })
    const globalActive = makeSummary({ id: "tpl-glob-1", isGlobal: true })

    expect(
      matchesWorkoutTemplateFilters(privActive, {
        origin: "private",
        status: "active",
        goal: "CONDITIONING",
        level: "BEGINNER",
        environment: "CONDO_GYM",
        q: "HALTERES",
      }),
    ).toBe(true)

    expect(
      matchesWorkoutTemplateFilters(privActive, { origin: "global" }),
    ).toBe(false)
    expect(
      matchesWorkoutTemplateFilters(globalActive, { origin: "private" }),
    ).toBe(false)
    expect(
      matchesWorkoutTemplateFilters(privActive, { status: "archived" }),
    ).toBe(false)
    expect(
      matchesWorkoutTemplateFilters(privArchived, { status: "active" }),
    ).toBe(false)
    expect(matchesWorkoutTemplateFilters(privArchived, { status: "all" })).toBe(
      true,
    )
    expect(
      matchesWorkoutTemplateFilters(privActive, { environment: "FULL_GYM" }),
    ).toBe(false)
    expect(matchesWorkoutTemplateFilters(privActive, { q: "maratona" })).toBe(
      false,
    )
  })

  it("applies optimistic archive and restore across filtered lists, cursors, and detail without touching globals", () => {
    const cache = new QueryClient()
    const priv = makeSummary()
    const glob = makeSummary({
      id: "tpl-glob-1",
      title: "Base Global",
      isGlobal: true,
    })

    const activeFirstKey = [
      "workout-templates",
      "pro-1",
      "list",
      { origin: "all", status: "active" },
      "first",
    ] as const
    const activePage2Key = [
      "workout-templates",
      "pro-1",
      "list",
      { origin: "all", status: "active" },
      "cursor-2",
    ] as const
    const archivedFirstKey = [
      "workout-templates",
      "pro-1",
      "list",
      { origin: "private", status: "archived" },
      "first",
    ] as const
    const archivedMismatchGoalKey = [
      "workout-templates",
      "pro-1",
      "list",
      { origin: "private", status: "archived", goal: "STRENGTH" },
      "first",
    ] as const
    const allStatusKey = [
      "workout-templates",
      "pro-1",
      "list",
      { origin: "all", status: "all" },
      "first",
    ] as const
    const detailKey = workoutTemplateDetailKey("pro-1", priv.id)

    cache.setQueryData<WorkoutTemplatePage>(activeFirstKey, {
      items: [priv, glob],
      nextCursor: "cursor-2",
    })
    cache.setQueryData<WorkoutTemplatePage>(activePage2Key, {
      items: [priv],
      nextCursor: null,
    })
    cache.setQueryData<WorkoutTemplatePage>(archivedFirstKey, {
      items: [],
      nextCursor: null,
    })
    cache.setQueryData<WorkoutTemplatePage>(archivedMismatchGoalKey, {
      items: [],
      nextCursor: null,
    })
    cache.setQueryData<WorkoutTemplatePage>(allStatusKey, {
      items: [priv],
      nextCursor: null,
    })
    cache.setQueryData<WorkoutTemplateDetail>(detailKey, {
      ...priv,
      content: { title: priv.title, goal: "Condicionamento", durationWeeks: 6, notes: "", splits: [] },
    })

    // Global templates must never be mutated optimistically
    const globalBefore = cache.getQueryData<WorkoutTemplatePage>(activeFirstKey)
    applyOptimisticTemplateArchiveState(
      cache,
      "pro-1",
      glob.id,
      "archive",
      "2026-11-21T17:00:00.000Z",
    )
    expect(cache.getQueryData<WorkoutTemplatePage>(activeFirstKey)).toEqual(
      globalBefore,
    )

    const snapshot = applyOptimisticTemplateArchiveState(
      cache,
      "pro-1",
      priv.id,
      "archive",
      "2026-11-21T17:00:00.000Z",
    )

    expect(
      cache.getQueryData<WorkoutTemplatePage>(activeFirstKey)?.items.map(i => i.id),
    ).toEqual([glob.id])
    expect(
      cache.getQueryData<WorkoutTemplatePage>(activePage2Key)?.items,
    ).toEqual([])
    expect(
      cache.getQueryData<WorkoutTemplatePage>(archivedFirstKey)?.items[0],
    ).toMatchObject({
      id: priv.id,
      archivedAt: "2026-11-21T17:00:00.000Z",
    })
    expect(
      cache.getQueryData<WorkoutTemplatePage>(archivedMismatchGoalKey)?.items,
    ).toEqual([])
    expect(
      cache.getQueryData<WorkoutTemplatePage>(allStatusKey)?.items[0]
        .archivedAt,
    ).toBe("2026-11-21T17:00:00.000Z")
    expect(
      cache.getQueryData<WorkoutTemplateDetail>(detailKey)?.archivedAt,
    ).toBe("2026-11-21T17:00:00.000Z")

    rollbackOptimisticTemplateArchiveState(cache, snapshot)

    expect(
      cache.getQueryData<WorkoutTemplatePage>(activeFirstKey)?.items.map(i => i.id),
    ).toEqual([priv.id, glob.id])
    expect(
      cache.getQueryData<WorkoutTemplatePage>(archivedFirstKey)?.items,
    ).toEqual([])
    expect(
      cache.getQueryData<WorkoutTemplateDetail>(detailKey)?.archivedAt,
    ).toBeNull()
  })

  it("never resurrects denied or cleared caches during rollback", () => {
    const cache = new QueryClient()
    const priv = makeSummary()
    const activeKey = [
      "workout-templates",
      "pro-1",
      "list",
      { origin: "all", status: "active" },
      "first",
    ] as const
    const detailKey = workoutTemplateDetailKey("pro-1", priv.id)

    cache.setQueryData<WorkoutTemplatePage>(activeKey, {
      items: [priv],
      nextCursor: null,
    })
    cache.setQueryData<WorkoutTemplateDetail>(detailKey, {
      ...priv,
      content: { title: priv.title, goal: "Condicionamento", durationWeeks: 6, notes: "", splits: [] },
    })

    const snapshot = applyOptimisticTemplateArchiveState(
      cache,
      "pro-1",
      priv.id,
      "archive",
      "2026-11-21T17:00:00.000Z",
    )

    // 401/403 denial marker must block rollback from restoring private records
    cache.setQueryData(["workout-templates", "pro-1", "access"], true)
    cache.setQueryData(activeKey, null)
    cache.setQueryData(detailKey, null)

    rollbackOptimisticTemplateArchiveState(cache, snapshot)
    expect(cache.getQueryData(activeKey)).toBeNull()
    expect(cache.getQueryData(detailKey)).toBeNull()

    // Cleared QueryClient must also stay empty if queries were removed
    cache.clear()
    rollbackOptimisticTemplateArchiveState(cache, snapshot)
    expect(cache.getQueryData(activeKey)).toBeUndefined()
  })
})
