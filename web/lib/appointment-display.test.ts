import { describe, expect, it } from "vitest"
import {
  allowedAppointmentActions,
  appointmentsForDate,
  getDateKeyInTimeZone,
} from "@/lib/appointment-display"
import type { Appointment } from "@/types/appointment"

const baseAppointment: Appointment = {
  id: "appointment-one",
  professionalId: "professional-one",
  clientId: "client-one",
  kind: "FOLLOW_UP",
  status: "SCHEDULED",
  modality: "ONLINE",
  startsAt: "2026-09-15T02:30:00.000Z",
  endsAt: "2026-09-15T03:30:00.000Z",
  timeZone: "America/Sao_Paulo",
  location: null,
  meetingUrl: "https://meet.example.com/retorno",
  notes: null,
  cancellationReason: null,
  cancelledAt: null,
  createdAt: "2026-09-14T12:00:00.000Z",
  updatedAt: "2026-09-14T12:00:00.000Z",
  client: { id: "client-one", name: "Marina Lopes", status: "ACTIVE" },
}

describe("appointment display rules", () => {
  it("groups an instant by the appointment timezone calendar date", () => {
    expect(
      getDateKeyInTimeZone(baseAppointment.startsAt, "America/Sao_Paulo"),
    ).toBe("2026-09-14")
  })

  it("filters and sorts appointments for a local date", () => {
    const later = {
      ...baseAppointment,
      id: "appointment-two",
      startsAt: "2026-09-15T12:00:00.000Z",
    }

    expect(
      appointmentsForDate(
        [later, baseAppointment],
        "2026-09-14",
        "America/Sao_Paulo",
      ).map((appointment) => appointment.id),
    ).toEqual(["appointment-one"])
  })

  it("exposes only valid actions for each lifecycle stage", () => {
    const beforeStart = new Date("2026-09-14T12:00:00.000Z")
    const afterStart = new Date("2026-09-15T13:30:00.000Z")

    expect(
      allowedAppointmentActions("SCHEDULED", baseAppointment.startsAt, beforeStart),
    ).toEqual(["edit", "confirm", "cancel"])
    expect(
      allowedAppointmentActions("CONFIRMED", baseAppointment.startsAt, afterStart),
    ).toEqual(["edit", "complete", "no-show", "cancel"])
    expect(
      allowedAppointmentActions("COMPLETED", baseAppointment.startsAt, afterStart),
    ).toEqual([])
  })
})
