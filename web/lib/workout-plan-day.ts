/** Próxima virada civil no fuso do plano; dias de DST podem ter 23 ou 25 horas. */
export function millisecondsUntilPlanDayChange(timeZone: string, now = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
  const today = formatter.format(now)
  let low = 0
  let high = 36 * 3600000
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2)
    if (formatter.format(new Date(now.getTime() + middle)) === today) low = middle
    else high = middle
  }
  return high + 25
}
