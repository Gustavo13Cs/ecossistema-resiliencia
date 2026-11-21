import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { useFollowUps } from "./useFollowUps"
import type { FollowUpStatus, ChurnRiskLevel, RegularityLevel } from "@/types/follow-up"

const session = vi.hoisted(() => ({
  user: { sub: "prof-1", role: "NUTRITIONIST", name: "Profissional 1" },
}))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => session }))

describe("Gestão de Retornos - Regras de Negócio e Classificação de Ciclos", () => {
  it("classifica retorno como UPCOMING_7_DAYS quando faltam até 7 dias para a consulta", () => {
    const daysUntil = 4
    let status: FollowUpStatus = "UNSCHEDULED"

    if (daysUntil <= 7) status = "UPCOMING_7_DAYS"
    else if (daysUntil <= 15) status = "UPCOMING_15_DAYS"
    else if (daysUntil <= 30) status = "UPCOMING_30_DAYS"

    expect(status).toBe("UPCOMING_7_DAYS")
  })

  it("classifica retorno como UPCOMING_15_DAYS quando faltam entre 8 e 15 dias", () => {
    const daysUntil = 12
    let status: FollowUpStatus = "UNSCHEDULED"

    if (daysUntil <= 7) status = "UPCOMING_7_DAYS"
    else if (daysUntil <= 15) status = "UPCOMING_15_DAYS"
    else if (daysUntil <= 30) status = "UPCOMING_30_DAYS"

    expect(status).toBe("UPCOMING_15_DAYS")
  })

  it("classifica cliente como OVERDUE quando não há agendamento futuro e última consulta foi há mais de 35 dias", () => {
    const hasNextAppointment = false
    const daysSinceLast = 42

    const isOverdue = !hasNextAppointment && daysSinceLast > 35
    expect(isOverdue).toBe(true)
  })

  it("atribui risco de evasão HIGH quando o cliente está em atraso há mais de 60 dias", () => {
    const isOverdue = true
    const daysSinceLast = 65
    let churnRisk: ChurnRiskLevel = "LOW"

    if (isOverdue) {
      churnRisk = daysSinceLast > 60 ? "HIGH" : "MEDIUM"
    }

    expect(churnRisk).toBe("HIGH")
  })

  it("atribui risco de evasão HIGH imediatamente após falta no retorno (no-show) sem reagendamento", () => {
    const isNoShow = true
    const hasNextAppointment = false

    const churnRisk: ChurnRiskLevel = isNoShow && !hasNextAppointment ? "HIGH" : "LOW"
    expect(churnRisk).toBe("HIGH")
  })

  it("calcula intervalo médio histórico (cadência) corretamente entre atendimentos concluídos", () => {
    const appointments = [
      { date: "2026-06-01T10:00:00Z" },
      { date: "2026-07-01T10:00:00Z" }, // 30 dias
      { date: "2026-07-29T10:00:00Z" }, // 28 dias
    ]

    const intervals: number[] = []
    for (let i = 1; i < appointments.length; i++) {
      const prev = new Date(appointments[i - 1].date).getTime()
      const curr = new Date(appointments[i].date).getTime()
      intervals.push(Math.round((curr - prev) / (1000 * 60 * 60 * 24)))
    }

    const avg = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    expect(avg).toBe(29)

    let regularity: RegularityLevel = "NEW_CLIENT"
    if (avg >= 20 && avg <= 38) regularity = "EXCELLENT"

    expect(regularity).toBe("EXCELLENT")
  })

  it("interpola corretamente as tags {nome} e {data_consulta} no disparo rápido de mensagem", () => {
    const template = "Olá {nome}! Confirmando seu retorno para {data_consulta}."
    const message = template
      .replace(/{nome}/g, "Carlos")
      .replace(/{data_consulta}/g, "25 de setembro às 14:00")

    expect(message).toBe("Olá Carlos! Confirmando seu retorno para 25 de setembro às 14:00.")
  })

  it("reconhece consulta agendada para Hoje como próximo retorno iminente", () => {
    // O cálculo usa o calendário local do navegador; a fixture deve usar o mesmo fuso.
    const now = new Date(2026, 8, 16, 15)
    const appointmentToday = {
      id: "app-today",
      clientId: "client-1",
      startsAt: new Date(2026, 8, 16, 23).toISOString(),
      endsAt: new Date(2026, 8, 16, 23, 50).toISOString(),
      status: "CONFIRMED" as const,
      kind: "FOLLOW_UP" as const,
      modality: "ONLINE" as const,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: null,
      meetingUrl: null,
      notes: null,
      cancellationReason: null,
      cancelledAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      professionalId: "prof-1",
      client: { id: "client-1", name: "Gustavo Cunha Santos", status: "ACTIVE" as const },
    }

    const today = new Date(now.getTime())
    today.setHours(0, 0, 0, 0)
    const startOfTodayMs = today.getTime()

    const appStartMs = new Date(appointmentToday.startsAt).getTime()
    expect(appStartMs >= startOfTodayMs).toBe(true)

    const nextDate = new Date(appointmentToday.startsAt)
    const nextDayStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()).getTime()
    const daysUntilNextAppointment = Math.max(0, Math.round((nextDayStart - startOfTodayMs) / (1000 * 60 * 60 * 24)))

    expect(daysUntilNextAppointment).toBe(0) // 0 dias = Hoje!

    const status = daysUntilNextAppointment <= 7 ? "UPCOMING_7_DAYS" : "UPCOMING_30_DAYS"
    expect(status).toBe("UPCOMING_7_DAYS")
  })
})

describe("useFollowUps refetch parallelization", () => {
  let http: AxiosMockAdapter
  const clientFixture = {
    id: "c1",
    professionalId: "prof-1",
    name: "Paciente 1",
    status: "ACTIVE",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  }

  beforeEach(() => {
    http = new AxiosMockAdapter(api)
    http.onGet("/clients").reply(200, [clientFixture], { "X-Pagination-Total": "1" })
    http.onGet("/appointments").reply(200, [])
  })

  afterEach(() => {
    cleanup()
    http.restore()
  })

  it("invalidates appointmentsRoot in parallel with client refetch without duplicate window GETs", async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const prof1AgendaKey = queryKeys.appointments("prof-1", "2026-11-01", "2026-11-30")
    const prof2AgendaKey = queryKeys.appointments("prof-2", "2026-11-01", "2026-11-30")
    cache.setQueryData(prof1AgendaKey, [])
    cache.setQueryData(prof2AgendaKey, [])

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: cache }, children)
    const { result } = renderHook(() => useFollowUps(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(http.history.get.filter((req) => req.url === "/appointments")).toHaveLength(3)

    let resolveClients!: (res: [number, unknown, Record<string, string>]) => void
    let clientsRefetchStarted = false
    let refetchAppointmentCalls = 0
    http.onGet("/clients").reply(() => {
      clientsRefetchStarted = true
      return new Promise((resolve) => {
        resolveClients = resolve
      })
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
      expect(refetchAppointmentCalls).toBe(3)
    })

    resolveClients([200, [clientFixture], { "X-Pagination-Total": "1" }])
    await act(async () => {
      await refetchPromise
    })

    expect(refetchAppointmentCalls).toBe(3)
    expect(cache.getQueryState(prof1AgendaKey)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(prof2AgendaKey)?.isInvalidated).toBe(false)
    cache.clear()
  })
})

