"use client"

import { useEffect, useState } from "react"
import { getDateKeyInTimeZone } from "@/lib/appointment-display"
import { getAppointmentPeriod } from "@/lib/appointment-period"
import type { AppointmentPeriod } from "@/types/appointment"
import { useAppointments } from "./useAppointments"

type DayCalendar = { period: AppointmentPeriod; timeZone: string }
const UNRESOLVED_PERIOD = { from: "", to: "" }

export function usePersonalDayAgenda() {
  const [calendar, setCalendar] = useState<DayCalendar | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refreshCalendar = () => {
      clearTimeout(timer)
      const now = new Date()
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const dateKey = getDateKeyInTimeZone(now, timeZone)
      const period = getAppointmentPeriod("day", dateKey, timeZone)
      setCalendar(current => current?.period.from === period.from && current.timeZone === timeZone
        ? current : { period, timeZone })
      timer = setTimeout(refreshCalendar, Math.max(1, new Date(period.to).getTime() - now.getTime()))
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshCalendar()
    }
    // A primeira consulta só é habilitada depois de resolver o calendário no navegador.
    timer = setTimeout(refreshCalendar, 0)
    window.addEventListener("focus", refreshCalendar)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("focus", refreshCalendar)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const agenda = useAppointments(calendar?.period ?? UNRESOLVED_PERIOD, {}, { enabled: calendar !== null })
  const refetch = async () => {
    if (!calendar) throw new Error("Aguarde a resolução do período da agenda.")
    return agenda.refetch()
  }
  return { ...agenda, period: calendar?.period ?? null, timeZone: calendar?.timeZone ?? "", refetch }
}
