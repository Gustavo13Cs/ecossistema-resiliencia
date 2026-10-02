// @vitest-environment node
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

const script = fileURLToPath(new URL("./assert-standalone-runtime.mjs", import.meta.url))
const fixturePrefix = join(tmpdir(), "safemove-standalone-runtime-")
const fixtures = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    if (!fixture.startsWith(fixturePrefix)) throw new Error("Unexpected fixture path")
    rmSync(fixture, { recursive: true, force: true })
  }
})

function run({ vercel = "", explicitRoot = false, artifact = false, leakedFile } = {}) {
  const cwd = mkdtempSync(fixturePrefix)
  fixtures.push(cwd)
  const root = join(cwd, ".next", "standalone")
  if (artifact) {
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, "server.js"), "// runtime fixture")
  }
  if (leakedFile) {
    const path = join(root, leakedFile)
    mkdirSync(join(path, ".."), { recursive: true })
    writeFileSync(path, "fixture")
  }
  return spawnSync(process.execPath, [script, ...(explicitRoot ? [root] : [])], {
    cwd,
    env: { ...process.env, VERCEL: vercel },
    encoding: "utf8",
  })
}

describe("standalone runtime build gate", () => {
  it("accepts Vercel-managed output without a standalone server", () => {
    const result = run({ vercel: "1" })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Vercel-managed output")
  })

  it.each(["", "0", "true"])("requires the standalone server outside Vercel (VERCEL=%s)", (vercel) => {
    const result = run({ vercel })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Missing standalone server.js")
  })

  it("requires an explicitly requested standalone artifact even on Vercel", () => {
    const result = run({ vercel: "1", explicitRoot: true })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Missing standalone server.js")
  })

  it.each(["", "1"])("validates a clean standalone artifact (VERCEL=%s)", (vercel) => {
    const result = run({ vercel, artifact: true })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("Standalone runtime verified")
  })

  it.each(["", "1"])("rejects environment files in an emitted standalone artifact (VERCEL=%s)", (vercel) => {
    const result = run({ vercel, artifact: true, leakedFile: ".env.local" })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Environment file leaked into runtime")
  })

  it.each(["", "1"])("rejects development packages in an emitted standalone artifact (VERCEL=%s)", (vercel) => {
    const result = run({ vercel, artifact: true, leakedFile: "node_modules/vitest/package.json" })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Development package leaked into runtime")
  })
})
