"use client"

import { useMemo } from "react"
import { summarizeWeeklyVolume } from "@/lib/workout-volume"
import type { VolumeSplit } from "@/types/workout-p3"

export function useWeeklyVolumeSummary(splits: readonly VolumeSplit[]) {
  return useMemo(() => summarizeWeeklyVolume(splits), [splits])
}
