"use client"

import { useEffect } from "react"
import { millisecondsUntilPlanDayChange } from "@/lib/workout-plan-day"

export function useWorkoutWeekRefresh(timeZone: string | undefined, refresh: () => Promise<unknown>) {
  useEffect(() => {
    if (!timeZone) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      if (active) timer = setTimeout(() => {
        void refresh().catch(() => undefined).finally(schedule)
      }, millisecondsUntilPlanDayChange(timeZone))
    }
    const visible = () => { if (document.visibilityState === "visible") void refresh().catch(() => undefined) }
    schedule()
    document.addEventListener("visibilitychange", visible)
    return () => { active = false; clearTimeout(timer); document.removeEventListener("visibilitychange", visible) }
  }, [timeZone, refresh])
}
