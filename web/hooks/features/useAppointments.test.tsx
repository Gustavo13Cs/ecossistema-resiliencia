import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { Appointment, AppointmentPeriod } from "@/types/appointment"
import type { AuthUser } from "@/types/auth"
import { isAppointmentConflict, useAppointments } from "./useAppointments"

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const http = new AxiosMockAdapter(api)
const period: AppointmentPeriod = {
  from: "2026-09-14T03:00:00.000Z",
  to: "2026-09-21T03:00:00.000Z",
}
const appointment: Appointment = {
  id: "appointment-one",
  professionalId: "professional-one",
  clientId: "client-one",
  kind: "FIRST_VISIT",
  status: "SCHEDULED",
  modality: "IN_PERSON",
  startsAt: "2026-09-15T13:00:00.000Z",
  endsAt: "2026-09-15T14:00:00.000Z",
  timeZone: "America/Sao_Paulo",
  location: "Consultório 2",
  meetingUrl: null,
  notes: null,
  cancellationReason: null,
  cancelledAt: null,
  createdAt: "2026-09-14T12:00:00.000Z",
  updatedAt: "2026-09-14T12:00:00.000Z",
  client: { id: "client-one", name: "Marina Lopes", status: "ACTIVE" },
}

function renderAppointmentsHook() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return {
    queryClient,
    ...renderHook(() => useAppointments(period), { wrapper }),
  }
}

beforeEach(() => {
  authState.user = {
    sub: "professional-one",
    role: "NUTRITIONIST",
    name: "Dra. Ana",
  }
  http.reset()
})

afterEach(() => {
  cleanup()
  authState.user = null
})

describe("useAppointments", () => {
  it("identifies a 409 response before React publishes the conflict state", async () => {
    http.onPost("/appointments/conflict-probe").reply(409, {
      message: "A agenda mudou",
    })

    const error = await api.post("/appointments/conflict-probe").catch(
      (requestError: unknown) => requestError,
    )

    expect(isAppointmentConflict(error)).toBe(true)
    expect(isAppointmentConflict(new Error("Falha inesperada"))).toBe(false)
  })

  it("requests the period and isolates the cache by professional and filters", async () => {
    http.onGet("/appointments").reply(200, [appointment])
    const { queryClient, result } = renderAppointmentsHook()

    await waitFor(() => expect(result.current.state).toBe("ready"))

    expect(result.current.appointments).toEqual([appointment])
    expect(http.history.get[0]?.params).toEqual({
      from: period.from,
      to: period.to,
      clientId: undefined,
      status: undefined,
    })
    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([
      [
        "appointments",
        "professional-one",
        period.from,
        period.to,
        "all",
        "all",
      ],
    ])
  })

  it("preserves a network failure instead of showing an empty agenda", async () => {
    http.onGet("/appointments").networkError()
    const { result } = renderAppointmentsHook()

    await waitFor(() => expect(result.current.state).toBe("network-error"))
    expect(result.current.appointments).toEqual([])
  })

  it("does not request clinical data without a session", () => {
    authState.user = null
    const { result } = renderAppointmentsHook()

    expect(result.current.state).toBe("unauthorized")
    expect(http.history.get).toHaveLength(0)
  })

  it("creates an appointment and invalidates only appointment and affected client data", async () => {
    http.onGet("/appointments").reply(200, [])
    http.onPost("/appointments").reply(201, appointment)
    const { queryClient, result } = renderAppointmentsHook()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await waitFor(() => expect(result.current.state).toBe("empty"))

    await expect(
      result.current.createAppointment({
        clientId: appointment.clientId,
        kind: appointment.kind,
        modality: appointment.modality,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        timeZone: appointment.timeZone,
        location: appointment.location,
      }),
    ).resolves.toEqual(appointment)

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["appointments", "professional-one"],
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["client", "professional-one", "client-one"],
    })
  })

  it("surfaces a safe conflict without discarding the current calendar", async () => {
    http.onGet("/appointments").reply(200, [appointment])
    http.onPost("/appointments").reply(409, {
      message: "Já existe um atendimento nesse intervalo de horário",
    })
    const { result } = renderAppointmentsHook()
    await waitFor(() => expect(result.current.state).toBe("ready"))

    await expect(
      result.current.createAppointment({
        clientId: appointment.clientId,
        kind: appointment.kind,
        modality: appointment.modality,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        timeZone: appointment.timeZone,
      }),
    ).rejects.toBeDefined()

    await waitFor(() =>
      expect(result.current.conflict).toBe(
        "Já existe um atendimento nesse intervalo de horário",
      ),
    )
    expect(result.current.appointments).toEqual([appointment])
  })
})
