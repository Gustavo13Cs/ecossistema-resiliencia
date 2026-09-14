import { describe, expect, it } from "vitest"
import { getAppointmentPeriod } from "@/lib/appointment-period"

describe("getAppointmentPeriod", () => {
  it("returns an exclusive local day converted to UTC", () => {
    expect(
      getAppointmentPeriod("day", "2026-09-14", "America/Sao_Paulo"),
    ).toEqual({
      from: "2026-09-14T03:00:00.000Z",
      to: "2026-09-15T03:00:00.000Z",
    })
  })

  it("starts the weekly view on Monday", () => {
    expect(
      getAppointmentPeriod("week", "2026-09-17", "America/Sao_Paulo"),
    ).toEqual({
      from: "2026-09-14T03:00:00.000Z",
      to: "2026-09-21T03:00:00.000Z",
    })
  })

  it("returns a fixed 42-day monthly grid beginning on Monday", () => {
    expect(
      getAppointmentPeriod("month", "2026-09-14", "America/Sao_Paulo"),
    ).toEqual({
      from: "2026-08-31T03:00:00.000Z",
      to: "2026-10-12T03:00:00.000Z",
    })
  })

  it("honors a daylight-saving transition in an IANA timezone", () => {
    expect(
      getAppointmentPeriod("day", "2026-03-08", "America/New_York"),
    ).toEqual({
      from: "2026-03-08T05:00:00.000Z",
      to: "2026-03-09T04:00:00.000Z",
    })
  })

  it("rejects malformed dates and unknown timezones", () => {
    expect(() =>
      getAppointmentPeriod("day", "14/09/2026", "America/Sao_Paulo"),
    ).toThrow("Data selecionada inválida")
    expect(() =>
      getAppointmentPeriod("day", "2026-09-14", "Invalid/Zone"),
    ).toThrow("Fuso horário inválido")
  })
})
