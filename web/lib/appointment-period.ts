import type { AgendaView, AppointmentPeriod } from "@/types/appointment"

type CalendarDate = {
  year: number
  month: number
  day: number
}

const SELECTED_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseCalendarDate(value: string): CalendarDate {
  const match = SELECTED_DATE_PATTERN.exec(value)
  if (!match) throw new Error("Data selecionada inválida")

  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
  const normalized = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  )
  if (
    normalized.getUTCFullYear() !== date.year ||
    normalized.getUTCMonth() !== date.month - 1 ||
    normalized.getUTCDate() !== date.day
  ) {
    throw new Error("Data selecionada inválida")
  }
  return date
}

function addCalendarDays(date: CalendarDate, amount: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + amount))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

function weekday(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

function createTimeZoneFormatter(timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
  } catch {
    throw new Error("Fuso horário inválido")
  }
}

function localPartsAsUtc(formatter: Intl.DateTimeFormat, instant: Date): number {
  const values = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )

  return Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  )
}

function zonedMidnightToUtc(
  date: CalendarDate,
  formatter: Intl.DateTimeFormat,
): Date {
  const localMidnightAsUtc = Date.UTC(date.year, date.month - 1, date.day)
  let instant = localMidnightAsUtc

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offset = localPartsAsUtc(formatter, new Date(instant)) - instant
    const corrected = localMidnightAsUtc - offset
    if (corrected === instant) break
    instant = corrected
  }

  return new Date(instant)
}

export function getAppointmentPeriod(
  view: AgendaView,
  selectedDate: string,
  timeZone: string,
): AppointmentPeriod {
  const selected = parseCalendarDate(selectedDate)
  const formatter = createTimeZoneFormatter(timeZone)
  let start = selected
  let lengthInDays = 1

  if (view === "week") {
    const daysSinceMonday = (weekday(selected) + 6) % 7
    start = addCalendarDays(selected, -daysSinceMonday)
    lengthInDays = 7
  } else if (view === "month") {
    const firstOfMonth = { ...selected, day: 1 }
    const daysSinceMonday = (weekday(firstOfMonth) + 6) % 7
    start = addCalendarDays(firstOfMonth, -daysSinceMonday)
    lengthInDays = 42
  }

  const end = addCalendarDays(start, lengthInDays)
  return {
    from: zonedMidnightToUtc(start, formatter).toISOString(),
    to: zonedMidnightToUtc(end, formatter).toISOString(),
  }
}
