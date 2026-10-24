/** Intervalo civil de exibição, independente do fuso do navegador e de DST. */
export function getWorkoutWeekDates(startsOn: string, week: number): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !Number.isInteger(week) || week < 1 || week > 12) return null
  const start = new Date(`${startsOn}T00:00:00.000Z`)
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startsOn) return null
  start.setUTCDate(start.getUTCDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}
