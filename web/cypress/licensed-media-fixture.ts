import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const database = "postgresql://postgres:postgres@localhost:5434/ecossistema_resiliencia_test"
const digest = "8d2e44a4623545d6de7318bd7e9e61ca6c70b79847ef0360973a8ad6ec4a7d27"

// Test harness only: no network, arbitrary path or runtime media policy override.
export function licensedMediaFixture(env: NodeJS.ProcessEnv): string {
  if (env.NODE_ENV !== "test" || env.SAFEMOVE_LICENSED_MEDIA_FIXTURE !== "1" ||
      env.DATABASE_URL !== database || env.DIRECT_URL !== database) {
    throw new Error("Licensed media fixture requires explicit runner flag and literal local test database in NODE_ENV=test")
  }
  const bytes = readFileSync(resolve(__dirname, "fixtures/exercise-demonstration/bench-press.svg"))
  if (createHash("sha256").update(bytes).digest("hex") !== digest) {
    throw new Error("Licensed media fixture SHA-256 mismatch")
  }
  return bytes.toString("utf8")
}
