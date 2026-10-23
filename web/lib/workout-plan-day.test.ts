import { expect, it } from "vitest"
import { millisecondsUntilPlanDayChange } from "./workout-plan-day"
it("atualiza na próxima meia-noite do plano inclusive em dia de 23 horas", () => {
  expect(millisecondsUntilPlanDayChange("America/Sao_Paulo",new Date("2026-10-23T12:00:00Z"))).toBe(15*3600000+25)
  expect(millisecondsUntilPlanDayChange("America/New_York",new Date("2026-03-08T05:00:00Z"))).toBe(23*3600000+25)
})
