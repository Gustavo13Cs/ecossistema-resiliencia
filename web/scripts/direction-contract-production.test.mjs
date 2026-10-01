// @vitest-environment node
import { describe, expect, it } from "vitest"
import { assertDirectionContractHtml } from "./direction-contract-artifacts.mjs"
import { representativePageRoutes } from "./direction-contract-production.mjs"
import { DIRECTION_CONTRACT_HTML } from "../lib/direction-contract.mjs"

describe("dynamic production direction contract", () => {
  it("covers every page with representative parameters and excludes internal pages/routes", () => {
    expect(representativePageRoutes({
      "/page": "app/page.js",
      "/auth/login/page": "app/auth/login/page.js",
      "/clientes/[id]/page": "app/clientes/[id]/page.js",
      "/clientes/[id]/nova-dieta/page": "app/clientes/[id]/nova-dieta/page.js",
      "/_not-found/page": "app/_not-found/page.js",
      "/_global-error/page": "app/_global-error/page.js",
      "/api/health/route": "app/api/health/route.js",
    })).toEqual(["/", "/auth/login", "/clientes/41000000-0000-4000-8000-000000000001", "/clientes/41000000-0000-4000-8000-000000000001/nova-dieta"])
  })
  it("rejects an empty manifest rather than passing without any production page", () => {
    expect(() => representativePageRoutes({})).toThrow("No production pages")
  })
  it("keeps exact byte and DOM-position checks for served HTML", () => {
    const canonical = `<!DOCTYPE html><html><head></head><body>${DIRECTION_CONTRACT_HTML}<main>Content</main></body></html>`
    expect(() => assertDirectionContractHtml(canonical, "/exames")).not.toThrow()
    expect(() => assertDirectionContractHtml(canonical.replace(DIRECTION_CONTRACT_HTML, ""), "/exames")).toThrow()
    expect(() => assertDirectionContractHtml(canonical.replace("<main>Content</main>", DIRECTION_CONTRACT_HTML), "/exames")).toThrow()
    expect(() => assertDirectionContractHtml(canonical.replace("<body>", "<body><div>Unexpected</div>"), "/exames")).toThrow()
  })
})
