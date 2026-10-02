import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import type { Client } from "@/types/client"
import type { ClientGoalCommitment } from "@/types/goal"
import { useClientGoals } from "./useClientGoals"

const session = vi.hoisted(() => ({ user: null as AuthUser | null }))
const clientState = vi.hoisted(() => ({ data: [] as Client[] }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => session }))
vi.mock("@/hooks/features/useClients", () => ({ useClients: () => ({ data: clientState.data, isLoading: false, error: null }) }))
vi.mock("sonner", () => ({ toast: notices }))
const http = new AxiosMockAdapter(api)
const client: Client = {
  id: "client-a", professionalId: "professional-a", name: "Synthetic Client", status: "ACTIVE",
  email: null, phone: null, birthDate: null, gender: null, goal: null, height: null, initialWeight: null,
  allergies: null, pathologies: null, typicalSleep: null, stressLevel: null, foodRelationship: null,
  psychologyHistory: null, exerciseType: null, exerciseFrequency: null, exerciseDuration: null,
  hasPersonal: null, workActivityLevel: null, professionalNotes: null, privacyNotes: null,
  createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z",
}
const goal: ClientGoalCommitment = {
  id: "server-goal", clientId: client.id, category: "WEIGHT_LOSS", status: "PENDING",
  startDate: "2026-10-01T12:00:00.000Z", targetDate: "2026-12-01T12:00:00.000Z",
  startWeightKg: 90, targetWeightKg: 80, startBodyFatPercent: null, targetBodyFatPercent: null,
  targetMuscleMassKg: null, habits: { waterTargetMl: 2500, sleepTargetHours: 8, mealsAdherencePercent: 90, dailyStepsTarget: 8000 },
  createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z",
}
function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: cache }, children)
  return { cache, ...renderHook(() => useClientGoals(), { wrapper }) }
}
beforeEach(() => {
  vi.clearAllMocks()
  session.user = { sub: "professional-a", role: "NUTRITIONIST", name: "Synthetic professional" }
  clientState.data = [client]
  http.reset()
  http.onGet("/assessments").reply(200, [])
  http.onGet("/client-goals").reply(200, [])
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("server-only Client goals", () => {
  it("keeps an empty API empty and never reads or writes browser storage", async () => {
    const reads = vi.spyOn(Storage.prototype, "getItem")
    const writes = vi.spyOn(Storage.prototype, "setItem")
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clientsWithGoals[0].goal).toBeNull()
    expect(result.current.kpiSummary.activeGoalsCount).toBe(0)
    expect(http.history.get.some(request => request.url === "/client-goals")).toBe(true)
    expect(reads).not.toHaveBeenCalled()
    expect(writes).not.toHaveBeenCalled()
  })
  it("does not invent current weight or adherence measurements", async () => {
    http.onGet("/client-goals").reply(200, [goal])
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clientsWithGoals[0].progress).toMatchObject({ currentWeightKg: null, actualWeeklyRateKg: null, habitsAdherence: null })
    expect(result.current.kpiSummary.averageHabitsAdherence).toBeNull()
    expect(result.current.allAlerts).toEqual([])
  })
  it("computes progress from a real owned assessment", async () => {
    http.onGet("/client-goals").reply(200, [goal])
    http.onGet("/assessments").reply(200, [{ id: "assessment", clientId: client.id, date: "2026-10-10T12:00:00Z", weight: 85, bodyFat: null, muscleMass: null }])
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clientsWithGoals[0].progress).toMatchObject({ currentWeightKg: 85, weightDeltaKg: -5, percentAchieved: 50, habitsAdherence: null })
  })
  it("does not report initial Client weight as a new measurement", async () => {
    clientState.data = [{ ...client, initialWeight: 90 }]
    http.onGet("/client-goals").reply(200, [goal])
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clientsWithGoals[0].progress?.currentWeightKg).toBeNull()
    expect(result.current.kpiSummary.onTrackCount).toBe(0)
  })
  it("does not infer a plateau when no baseline weight was recorded", async () => {
    http.onGet("/client-goals").reply(200, [{ ...goal, startWeightKg: null, startDate: "2026-09-01T12:00:00.000Z" }])
    http.onGet("/assessments").reply(200, [{ id: "assessment", clientId: client.id, date: "2026-09-15T12:00:00Z", weight: 85, bodyFat: null, muscleMass: null }])
    const { result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.allAlerts).toEqual([])
  })
  it("preserves cached goals and emits no success on failed save or delete", async () => {
    http.onGet("/client-goals").reply(200, [goal])
    http.onPut(`/client-goals/${client.id}`).reply(500)
    http.onDelete(`/client-goals/${client.id}`).reply(500)
    const { cache, result } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await expect(result.current.saveGoal(goal)).rejects.toThrow() })
    await act(async () => { await expect(result.current.deleteGoal(client.id)).rejects.toThrow() })
    expect(cache.getQueryData(["client-goals", "professional-a"])).toEqual([goal])
    expect(result.current.clientsWithGoals[0].goal).toEqual(goal)
    expect(notices.error).toHaveBeenCalledTimes(2)
    expect(notices.success).not.toHaveBeenCalled()
  })
  it("uses the server ID, excludes internal body fields and invalidates only the current session", async () => {
    let persisted: ClientGoalCommitment[] = []
    http.onGet("/client-goals").reply(() => [200, persisted])
    http.onPut(`/client-goals/${client.id}`).reply(() => { persisted = [goal]; return [200, goal] })
    const { cache, result } = setup()
    const invalidate = vi.spyOn(cache, "invalidateQueries")
    await waitFor(() => expect(result.current.loading).toBe(false))
    let saved: unknown
    const untrustedInput = { ...goal, professionalId: "untrusted" }
    await act(async () => { saved = await result.current.saveGoal(untrustedInput) })
    expect(saved).toMatchObject({ id: "server-goal" })
    const body: Record<string, unknown> = JSON.parse(http.history.put[0].data as string)
    for (const field of ["id", "clientId", "professionalId", "creatorId", "userId", "patientId", "createdAt", "updatedAt"]) expect(body).not.toHaveProperty(field)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["client-goals", "professional-a"] })
    await waitFor(() => expect(result.current.clientsWithGoals[0].goal?.id).toBe("server-goal"))
  })
  it("surfaces failed loading instead of treating it as an empty goal list", async () => {
    http.onGet("/client-goals").reply(500)
    const { result } = setup()
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.kpiSummary.activeGoalsCount).toBe(0)
  })
  it("does not expose previous-session goals while the new query is pending", async () => {
    http.onGet("/client-goals").replyOnce(200, [goal])
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.loading).toBe(false))
    session.user = { sub: "professional-b", role: "NUTRITIONIST", name: "Other professional" }
    clientState.data = [{ ...client, professionalId: "professional-b" }]
    rerender()
    expect(result.current.clientsWithGoals[0].goal).toBeNull()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.clientsWithGoals[0].goal).toBeNull()
  })
})
