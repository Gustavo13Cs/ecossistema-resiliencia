import { describe, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { licensedMediaFixture } from "../cypress/licensed-media-fixture"

const database = "postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test"
const context: NodeJS.ProcessEnv = { NODE_ENV: "test", SAFEMOVE_LICENSED_MEDIA_FIXTURE: "1", DATABASE_URL: database, DIRECT_URL: database }

describe("licensed media harness isolation", () => {
  it.each([
    { NODE_ENV: "production" as const }, { SAFEMOVE_LICENSED_MEDIA_FIXTURE: undefined },
    { DATABASE_URL: undefined }, { DIRECT_URL: undefined },
    { DATABASE_URL: database.replace("localhost", "127.0.0.1") },
    { DIRECT_URL: database.replace("5434", "5435") },
  ])("fails closed for an unattested context %j", override => {
    expect(() => licensedMediaFixture({ ...context, ...override })).toThrow("explicit runner flag")
  })
  it("returns exactly the licensed immutable SVG bytes after isolation is attested", () => {
    expect(createHash("sha256").update(licensedMediaFixture(context)).digest("hex"))
      .toBe("8d2e44a4623545d6de7318bd7e9e61ca6c70b79847ef0360973a8ad6ec4a7d27")
  })
})
