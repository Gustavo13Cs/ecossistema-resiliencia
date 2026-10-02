import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join } from "node:path"
import { JSDOM } from "jsdom"
import { assertDirectionContractHtml } from "./direction-contract-artifacts.mjs"

export function representativePageRoutes(manifest) {
  const routes = Object.keys(manifest)
    .filter(route => route.endsWith("/page") && !route.startsWith("/_"))
    .map(route => route
      .replace(/\/page$/, "")
      .replace(/\/\([^/]+\)/g, "")
      .replace(/\[[^\]]+\]/g, "41000000-0000-4000-8000-000000000001") || "/")
  assert.ok(routes.length, "No production pages found in the app manifest")
  return [...new Set(routes)].sort()
}

export async function assertProductionDirectionContracts(projectRoot) {
  const manifest = JSON.parse(readFileSync(join(projectRoot, ".next/server/app-paths-manifest.json"), "utf8"))
  const routes = representativePageRoutes(manifest)
  const { default: next } = await import("next")
  let handle
  const server = createServer((request, response) => handle(request, response))
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address !== "string")
  const app = next({ dir: projectRoot, dev: false, hostname: "127.0.0.1", port: address.port, httpServer: server })
  try {
    await app.prepare()
    handle = app.getRequestHandler()
    let previousNonce
    for (const route of routes) {
      const response = await fetch(`http://127.0.0.1:${address.port}${route}`, { signal: AbortSignal.timeout(30_000) })
      assert.equal(response.status, 200, `Production route ${route} did not render`)
      const html = await response.text()
      assertDirectionContractHtml(html, route)
      const policy = response.headers.get("Content-Security-Policy") ?? ""
      const scriptDirective = policy.split(";").find(directive => directive.trim().startsWith("script-src")) ?? ""
      const nonce = /'nonce-([^']+)'/.exec(scriptDirective)?.[1]
      assert.ok(nonce && Buffer.from(nonce, "base64").length === 16, `${route} is missing a 128-bit CSP nonce`)
      assert.notEqual(nonce, previousNonce, `${route} reused the previous request nonce`)
      previousNonce = nonce
      assert.ok(!/unsafe-inline|unsafe-eval/.test(scriptDirective), `${route} allows unsafe production scripts`)
      const dom = new JSDOM(html)
      const scripts = [...dom.window.document.querySelectorAll("script")]
      assert.ok(scripts.length, `${route} has no framework scripts to validate`)
      for (const script of scripts) assert.equal(script.getAttribute("nonce"), nonce, `${route} has a framework script without the request nonce`)
      dom.window.close()
    }
    return { checkedRoutes: routes.length }
  } finally {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await app.close()
  }
}
