import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { WorkoutDraftList } from "@/components/features/training/WorkoutDraftList"
import { api } from "@/lib/api"
import { createQueryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import {
  calculatePersonalFollowUpItem,
  summarizePersonalFollowUpsKpi,
  usePersonalFollowUps,
} from "./usePersonalFollowUps"
import { useWorkoutDrafts } from "./useWorkoutDrafts"
import type { Client } from "@/types/client"
import type { Periodization } from "@/types/workout-p3"
import type { DraftSummary } from "@/types/workout-draft"

const session = vi.hoisted(() => ({
  user: { sub: "prof-1", role: "PERSONAL", name: "Personal 1" },
}))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => session }))

const mockClient = (id: string, name: string): Client => ({
  id,
  professionalId: "prof-1",
  name,
  email: null,
  phone: null,
  birthDate: null,
  gender: null,
  goal: null,
  height: null,
  initialWeight: null,
  allergies: null,
  pathologies: null,
  typicalSleep: null,
  stressLevel: null,
  foodRelationship: null,
  psychologyHistory: null,
  exerciseType: null,
  exerciseFrequency: null,
  exerciseDuration: null,
  hasPersonal: null,
  workActivityLevel: null,
  professionalNotes: null,
  privacyNotes: null,
  status: "ACTIVE",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
})

const periodization8Weeks = (startsOn: string): Periodization => ({
  version: 1,
  startsOn,
  timeZone: "America/Sao_Paulo",
  phases: [
    {
      name: "Adaptação",
      type: "ADAPTATION",
      startWeek: 1,
      endWeek: 2,
      effortType: "RIR",
      effortTarget: "3",
    },
    {
      name: "Sobrecarga",
      type: "OVERLOAD",
      startWeek: 3,
      endWeek: 7,
      effortType: "RIR",
      effortTarget: "2",
    },
    {
      name: "Deload",
      type: "DELOAD",
      startWeek: 8,
      endWeek: 8,
      effortType: "RIR",
      effortTarget: "4-5",
    },
  ],
  progression: null,
})

describe("usePersonalFollowUps domain logic", () => {
  const nowMs = Date.parse("2026-11-16T15:00:00.000Z")

  it("identifies student without active workout and never assessed", () => {
    const item = calculatePersonalFollowUpItem({
      client: mockClient("c1", "Fernanda Lima"),
      workouts: [],
      openDrafts: [],
      assessments: [],
      appointments: [],
      nowMs,
    })

    expect(item.workoutCycleStatus).toBe("NO_ACTIVE_WORKOUT")
    expect(item.assessmentStatus).toBe("NEVER_ASSESSED")
    expect(item.urgencyScore).toBeGreaterThanOrEqual(140)
  })

  it("identifies student in DELOAD_WEEK and links open draft", () => {
    const item = calculatePersonalFollowUpItem({
      client: mockClient("c2", "Thiago Nascimento"),
      workouts: [
        {
          id: "w1",
          clientId: "c2",
          title: "Força Corrida 21km",
          durationWeeks: 8,
          isActive: true,
          createdAt: "2026-09-25T10:00:00.000Z",
          periodization: periodization8Weeks("2026-09-25"),
        },
      ],
      openDrafts: [
        {
          id: "d1",
          clientId: "c2",
          status: "OPEN",
          version: 1,
          title: "Pós-Meia Maratona",
          createdAt: "2026-11-15T10:00:00.000Z",
          updatedAt: "2026-11-15T10:00:00.000Z",
          client: { id: "c2", name: "Thiago Nascimento", status: "ACTIVE" },
        },
      ],
      assessments: [
        {
          id: "a1",
          clientId: "c2",
          date: "2026-09-20T10:00:00.000Z",
          weight: 70,
          client: { id: "c2", name: "Thiago Nascimento" },
        },
      ],
      appointments: [],
      nowMs,
    })

    expect(item.workoutCycleStatus).toBe("DELOAD_WEEK")
    expect(item.currentWeek).toBe(8)
    expect(item.currentPhaseType).toBe("DELOAD")
    expect(item.openDraft?.id).toBe("d1")
    expect(item.assessmentStatus).toBe("ASSESSMENT_OVERDUE")

    const kpi = summarizePersonalFollowUpsKpi([item])
    expect(kpi.deloadOrEndingSoonCount).toBe(1)
    expect(kpi.assessmentPendingCount).toBe(1)
  })
})

describe("usePersonalFollowUps refetch parallelization", () => {
  let http: AxiosMockAdapter

  beforeEach(() => {
    http = new AxiosMockAdapter(api)
    http.onGet("/clients").reply(200, [mockClient("c1", "Fernanda Lima")], {
      "X-Pagination-Total": "1",
    })
    http.onGet("/workouts").reply(200, [])
    http.onGet("/workouts/drafts").reply(200, { items: [] })
    http.onGet("/assessments").reply(200, [])
    http.onGet("/appointments").reply(200, [])
  })

  afterEach(() => {
    cleanup()
    http.restore()
  })

  it("invalidates appointmentsRoot in parallel with all follow-up refetches without duplicate window GETs", async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const prof1AgendaKey = queryKeys.appointments("prof-1", "2026-11-01", "2026-11-30")
    const prof2AgendaKey = queryKeys.appointments("prof-2", "2026-11-01", "2026-11-30")
    cache.setQueryData(prof1AgendaKey, [])
    cache.setQueryData(prof2AgendaKey, [])

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: cache }, children)
    const { result } = renderHook(() => usePersonalFollowUps(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(http.history.get.filter((req) => req.url === "/appointments")).toHaveLength(3)

    let resolveClients!: (res: [number, unknown, Record<string, string>]) => void
    let clientsRefetchStarted = false
    let refetchWorkoutCalls = 0
    let refetchDraftCalls = 0
    let refetchAssessmentCalls = 0
    let refetchAppointmentCalls = 0

    http.onGet("/clients").reply(() => {
      clientsRefetchStarted = true
      return new Promise((resolve) => {
        resolveClients = resolve
      })
    })
    http.onGet("/workouts").reply(() => {
      refetchWorkoutCalls += 1
      return [200, []]
    })
    http.onGet("/workouts/drafts").reply(() => {
      refetchDraftCalls += 1
      return [200, { items: [] }]
    })
    http.onGet("/assessments").reply(() => {
      refetchAssessmentCalls += 1
      return [200, []]
    })
    http.onGet("/appointments").reply(() => {
      refetchAppointmentCalls += 1
      return [200, []]
    })

    let refetchPromise!: Promise<void>
    act(() => {
      refetchPromise = result.current.refetch()
    })

    await waitFor(() => {
      expect(clientsRefetchStarted).toBe(true)
      expect(refetchWorkoutCalls).toBe(1)
      expect(refetchDraftCalls).toBe(1)
      expect(refetchAssessmentCalls).toBe(1)
      expect(refetchAppointmentCalls).toBe(3)
    })

    resolveClients([
      200,
      [mockClient("c1", "Fernanda Lima")],
      { "X-Pagination-Total": "1" },
    ])
    await act(async () => {
      await refetchPromise
    })

    expect(refetchAppointmentCalls).toBe(3)
    expect(cache.getQueryState(prof1AgendaKey)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(prof2AgendaKey)?.isInvalidated).toBe(false)
    cache.clear()
  })
})

describe("shared workout-drafts cache contract between /retornos and /treinos", () => {
  let http: AxiosMockAdapter

  const sampleDraft: DraftSummary = {
    id: "d1",
    clientId: "c1",
    status: "OPEN",
    version: 1,
    title: "Bloco B",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    client: { id: "c1", name: "Fernanda Lima", status: "ACTIVE" },
  }

  beforeEach(() => {
    http = new AxiosMockAdapter(api)
    http.onGet("/clients").reply(200, [mockClient("c1", "Fernanda Lima")], {
      "X-Pagination-Total": "1",
    })
    http.onGet("/workouts").reply(200, [])
    http.onGet("/workouts/drafts").reply(200, { items: [sampleDraft], nextCursor: null })
    http.onGet("/assessments").reply(200, [])
    http.onGet("/appointments").reply(200, [])
  })

  afterEach(() => {
    cleanup()
    http.restore()
  })

  function TreinosDraftProbe() {
    const { listQuery } = useWorkoutDrafts()
    if (!listQuery.data) return createElement("div", null, "loading")
    return createElement(WorkoutDraftList, {
      page: listQuery.data,
      onContinue: vi.fn(),
      onDiscard: vi.fn(),
      onNextPage: vi.fn(),
    })
  }

  it("navigating from /retornos to /treinos renders WorkoutDraftList without crashing or refetching", async () => {
    const cache = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: cache }, children)

    try {
      const followUps = renderHook(() => usePersonalFollowUps(), { wrapper })
      await waitFor(() => expect(followUps.result.current.loading).toBe(false))
      expect(followUps.result.current.items[0]?.openDraft?.id).toBe("d1")
      followUps.unmount()

      render(createElement(TreinosDraftProbe), { wrapper })
      expect(await screen.findByText("Bloco B")).toBeInTheDocument()
      expect(cache.getQueryData(queryKeys.workoutDrafts("prof-1"))).toEqual({
        items: [sampleDraft],
        nextCursor: null,
      })
      expect(
        http.history.get.filter((req) => req.url === "/workouts/drafts"),
      ).toHaveLength(1)
    } finally {
      cache.clear()
    }
  })

  it("navigating from /treinos to /retornos reads DraftPage cleanly without crashing or refetching", async () => {
    const cache = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: cache }, children)

    try {
      const drafts = renderHook(() => useWorkoutDrafts(), { wrapper })
      await waitFor(() => expect(drafts.result.current.listQuery.isSuccess).toBe(true))
      expect(drafts.result.current.listQuery.data).toEqual({
        items: [sampleDraft],
        nextCursor: null,
      })
      drafts.unmount()

      const followUps = renderHook(() => usePersonalFollowUps(), { wrapper })
      await waitFor(() => expect(followUps.result.current.loading).toBe(false))
      expect(followUps.result.current.items[0]?.openDraft?.id).toBe("d1")
      expect(
        http.history.get.filter((req) => req.url === "/workouts/drafts"),
      ).toHaveLength(1)
    } finally {
      cache.clear()
    }
  })

  it("handles null cached workout and draft entries safely after access denial", async () => {
    const cache = createQueryClient()
    cache.setQueryData(queryKeys.clients("prof-1", "ACTIVE"), [
      mockClient("c1", "Fernanda Lima"),
    ])
    cache.setQueryData(queryKeys.workoutDrafts("prof-1"), null)
    cache.setQueryData(queryKeys.workouts("prof-1"), null)
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: cache }, children)

    try {
      const followUps = renderHook(() => usePersonalFollowUps(), { wrapper })
      expect(followUps.result.current.items[0]?.openDraft).toBeNull()
      await waitFor(() => expect(followUps.result.current.loading).toBe(false))
    } finally {
      cache.clear()
    }
  })
})
