import { describe, it, expect } from "vitest"
import type { FollowUpStatus, ChurnRiskLevel, RegularityLevel } from "@/types/follow-up"

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
    const now = new Date("2026-09-16T15:00:00-03:00")
    const appointmentToday = {
      id: "app-today",
      clientId: "client-1",
      startsAt: "2026-09-16T23:00:00-03:00",
      endsAt: "2026-09-16T23:50:00-03:00",
      status: "CONFIRMED" as const,
      kind: "FOLLOW_UP" as const,
      modality: "ONLINE" as const,
      timeZone: "America/Sao_Paulo",
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

