import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DayAgenda } from "./DayAgenda"
import { MonthAgenda } from "./MonthAgenda"
import { AgendaToolbar } from "./AgendaToolbar"
import type { Appointment } from "@/types/appointment"

const appointment: Appointment = {
  id: "appointment-one",
  professionalId: "professional-one",
  clientId: "client-one",
  kind: "FOLLOW_UP",
  status: "CONFIRMED",
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

describe("appointment calendar views", () => {
  it("does not publish an incomplete native date value", () => {
    const onDateChange = vi.fn()
    render(
      <AgendaToolbar
        view="day"
        selectedDate="2026-09-15"
        periodLabel="15 de setembro de 2026"
        clients={[]}
        filters={{}}
        clientPlural="Clientes"
        onViewChange={vi.fn()}
        onDateChange={onDateChange}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        onFiltersChange={vi.fn()}
      />,
    )

    const input = screen.getByLabelText("Selecionar data")
    fireEvent.change(input, { target: { value: "" } })
    expect(onDateChange).not.toHaveBeenCalled()
  })

  it("renders an honest empty daily state", () => {
    render(
      <DayAgenda
        appointments={[]}
        selectedDate="2026-09-15"
        timeZone="America/Sao_Paulo"
        onSelectAppointment={vi.fn()}
      />,
    )

    expect(screen.getByText("Dia livre")).toBeInTheDocument()
    expect(screen.getByText("Nenhum atendimento neste dia")).toBeInTheDocument()
  })

  it("opens a real appointment from the daily view", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <DayAgenda
        appointments={[appointment]}
        selectedDate="2026-09-15"
        timeZone="America/Sao_Paulo"
        onSelectAppointment={onSelect}
      />,
    )

    await user.click(
      screen.getByRole("button", {
        name: /10:00, Marina Lopes, Retorno/i,
      }),
    )
    expect(onSelect).toHaveBeenCalledWith(appointment)
  })

  it("shows monthly overflow and drills into the selected day", async () => {
    const user = userEvent.setup()
    const onSelectDate = vi.fn()
    const appointments = Array.from({ length: 4 }, (_, index) => ({
      ...appointment,
      id: `appointment-${index}`,
      startsAt: `2026-09-15T${13 + index}:00:00.000Z`,
    }))
    render(
      <MonthAgenda
        appointments={appointments}
        selectedDate="2026-09-15"
        today="2026-09-14"
        timeZone="America/Sao_Paulo"
        onSelectDate={onSelectDate}
        onSelectAppointment={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "+1 atendimentos" }))
    expect(onSelectDate).toHaveBeenCalledWith("2026-09-15")
  })
})
