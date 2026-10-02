import assert from "node:assert/strict"
import { existsSync, readdirSync } from "node:fs"
import { basename, join, resolve } from "node:path"

const root = resolve(process.argv[2] ?? ".next/standalone")
// O Vercel empacota seu próprio runtime; um artefato standalone explícito continua obrigatório.
if (process.env.VERCEL === "1" && process.argv[2] === undefined && !existsSync(join(root, "server.js"))) {
  console.log("Standalone runtime check not applicable to Vercel-managed output.")
  process.exit(0)
}
assert.ok(existsSync(join(root, "server.js")), "Missing standalone server.js")
const forbidden = /^(?:cypress|vitest|eslint|typescript|prisma|eslint-.+|@vitest|@eslint)$/
let directories = 0
function inspect(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    assert.ok(!/^\.env(?:\.|$)/.test(entry.name), `Environment file leaked into runtime: ${join(path, entry.name)}`)
    if (!entry.isDirectory()) continue
    directories += 1
    if (basename(path) === "node_modules") {
      assert.ok(!forbidden.test(entry.name), `Development package leaked into runtime: ${entry.name}`)
      assert.ok(entry.name !== "@nestjs" || !existsSync(join(path, entry.name, "cli")), "Nest CLI leaked into runtime")
    }
    inspect(join(path, entry.name))
  }
}
inspect(root)
console.log(`Standalone runtime verified: ${directories} directories, no development package trees or environment files.`)
