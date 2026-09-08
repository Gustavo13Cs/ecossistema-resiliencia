// @vitest-environment node

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertDirectionContractArtifacts,
  assertDirectionContractHtml,
} from "./direction-contract-artifacts.mjs"

const OWNED_TEMPLATE = `<template aria-hidden="true" data-safemove-direction-contract="49524f2c"><!--
THESIS: SafeMove is a calm private workspace for one professional practice, refusing the crowded multidisciplinary control panel.
OWN-WORLD: Cold-white ground, deep navy type, teal action, hairline slate borders, restrained elevation, compact linear icons, small and medium radii.
STORY: The professional recognizes their area and private base, finds a client, understands honest workload, then takes one permitted action.
FIRST VIEWPORT: Light sidebar; workspace identity, search and account in the header; profession-safe actions; real client summary; recent clients with generous whitespace.
FORM: SaaS Clinico Contemporaneo, canonical direction, seed 49524f2c; approved comp dashboard-comp-01.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
--></template>`

const NEXT_REACT_STATIC_BOUNDARY = '<div hidden=""><!--$--><!--/$--></div>'
const documentWith = (body) =>
  `<!doctype html><html><head><title>SafeMove</title></head><body>${body}</body></html>`

describe("direction contract artifact validation", () => {
  it("accepts the native Next order when one canonical hidden boundary shape precedes the contract", () => {
    const source = documentWith(
      `${NEXT_REACT_STATIC_BOUNDARY}${OWNED_TEMPLATE}<main>Área profissional</main>`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).not.toThrow()
  })

  it("rejects two canonical Next/React-shaped boundaries before the contract", () => {
    const source = documentWith(
      `${NEXT_REACT_STATIC_BOUNDARY}${NEXT_REACT_STATIC_BOUNDARY}${OWNED_TEMPLATE}<main>Área profissional</main>`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html has more than one canonical Next/React-shaped boundary before the owned direction contract",
    )
  })

  it("accepts the contract as the physical first body element", () => {
    const source = documentWith(`${OWNED_TEMPLATE}<main>Área profissional</main>`)

    expect(() => assertDirectionContractHtml(source, "clientes.html")).not.toThrow()
  })

  it("rejects visible application UI before the contract", () => {
    const source = documentWith(`<main>Área profissional</main>${OWNED_TEMPLATE}`)

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow()
  })

  it("rejects a generic hidden application element before the contract", () => {
    const source = documentWith(`<div hidden=""></div>${OWNED_TEMPLATE}<main>Home</main>`)

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow()
  })

  it("rejects a modified framework-looking boundary before the contract", () => {
    const modifiedBoundary = '<div hidden="" data-application-owned="true"><!--$--><!--/$--></div>'
    const source = documentWith(`${modifiedBoundary}${OWNED_TEMPLATE}<main>Home</main>`)

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow()
  })

  it("rejects a seed that exists only in Next serialization", () => {
    const source = documentWith(
      '<main>Área profissional</main><script>self.__next_f.push(["seed 49524f2c"])</script>',
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html is missing the owned direction contract",
    )
  })

  it("rejects duplicate owned templates", () => {
    const source = documentWith(
      `${OWNED_TEMPLATE}<main>Área profissional</main>${OWNED_TEMPLATE}`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html contains 2 owned direction contracts",
    )
  })

  it.each([
    [
      "single-quoted and reordered",
      "<template data-safemove-direction-contract='49524f2c' aria-hidden='true'>",
    ],
    [
      "unquoted",
      "<template data-safemove-direction-contract=49524f2c aria-hidden=true>",
    ],
    [
      "after a quoted greater-than sign",
      '<template title=">" data-safemove-direction-contract=49524f2c>',
    ],
    [
      "regardless of HTML tag and attribute case",
      '<TEMPLATE TITLE=">" DATA-SAFEMOVE-DIRECTION-CONTRACT=49524f2c>',
    ],
  ])("rejects an alternate semantic duplicate serialized %s", (_description, startTag) => {
    const semanticDuplicate = OWNED_TEMPLATE.replace(
      '<template aria-hidden="true" data-safemove-direction-contract="49524f2c">',
      startTag,
    )
    const source = documentWith(
      `${OWNED_TEMPLATE}<main>Área profissional</main>${semanticDuplicate}`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html contains 2 owned direction contracts",
    )
  })

  it("rejects an owned duplicate nested in template content", () => {
    const nestedDuplicate = OWNED_TEMPLATE.replace(
      '<template aria-hidden="true" data-safemove-direction-contract="49524f2c">',
      '<template title=">" data-safemove-direction-contract=49524f2c>',
    )
    const source = documentWith(
      `${OWNED_TEMPLATE}<template><template>${nestedDuplicate}</template></template>`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html contains 2 owned direction contracts",
    )
  })

  it("rejects a canonical contract nested instead of being a direct body child", () => {
    const source = documentWith(`<template>${OWNED_TEMPLATE}</template><main>Home</main>`)

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow()
  })

  it("does not treat partial identity values as owned", () => {
    const foreignTemplates = [
      OWNED_TEMPLATE.replace(
        'data-safemove-direction-contract="49524f2c"',
        'data-safemove-direction-contract="prefix-49524f2c"',
      ),
      OWNED_TEMPLATE.replace(
        'data-safemove-direction-contract="49524f2c"',
        "data-safemove-direction-contract=49524f2c-extra",
      ),
    ].join("")
    const source = documentWith(
      `${NEXT_REACT_STATIC_BOUNDARY}${OWNED_TEMPLATE}${foreignTemplates}`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).not.toThrow()
  })

  it("does not treat identity-looking text in another attribute as owned", () => {
    const foreignTemplate =
      "<template title='data-safemove-direction-contract=\"49524f2c\"'>Texto</template>"
    const source = documentWith(
      `${NEXT_REACT_STATIC_BOUNDARY}${OWNED_TEMPLATE}${foreignTemplate}`,
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).not.toThrow()
  })

  it("rejects duplicated canonical bytes outside the owned template", () => {
    const source = documentWith(`${OWNED_TEMPLATE}<script>/*${OWNED_TEMPLATE}*/</script>`)

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html contains 2 exact canonical direction contract byte sequences",
    )
  })

  it("rejects an owned template outside body", () => {
    const source =
      `<!doctype html><html><head>${OWNED_TEMPLATE}</head>` +
      "<body><main>Área profissional</main></body></html>"

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html has the owned direction contract outside body",
    )
  })

  it("rejects an unterminated owned template", () => {
    const source = documentWith(
      '<template aria-hidden="true" data-safemove-direction-contract="49524f2c"><!-- seed 49524f2c',
    )

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html has an unterminated owned direction contract",
    )
  })

  it("rejects a complete but altered owned contract", () => {
    const source = documentWith(OWNED_TEMPLATE.replace("Cold-white ground", "Gray ground"))

    expect(() => assertDirectionContractHtml(source, "home.html")).toThrow(
      "home.html does not contain the exact owned direction contract",
    )
  })
})

describe("direction contract artifact coverage", () => {
  it("fails closed when any nested root-layout HTML artifact is missing the contract", () => {
    const root = mkdtempSync(join(tmpdir(), "safemove-contract-"))
    mkdirSync(join(root, "auth"))
    writeFileSync(
      join(root, "home.html"),
      documentWith(`${NEXT_REACT_STATIC_BOUNDARY}${OWNED_TEMPLATE}<main>Home</main>`),
      "utf8",
    )
    writeFileSync(join(root, "auth", "login.html"), documentWith("<main>Login</main>"), "utf8")
    writeFileSync(
      join(root, "_global-error.html"),
      documentWith("<main>Erro global</main>"),
      "utf8",
    )

    expect(() => assertDirectionContractArtifacts(root)).toThrow(
      "auth\\login.html is missing the owned direction contract",
    )
  })

  it("validates every root-layout artifact read-only and explicitly excludes global error", () => {
    const root = mkdtempSync(join(tmpdir(), "safemove-contract-"))
    mkdirSync(join(root, "auth"))
    const homePath = join(root, "home.html")
    const loginPath = join(root, "auth", "login.html")
    const globalErrorPath = join(root, "_global-error.html")
    writeFileSync(
      homePath,
      documentWith(`${NEXT_REACT_STATIC_BOUNDARY}${OWNED_TEMPLATE}<main>Home</main>`),
      "utf8",
    )
    writeFileSync(loginPath, documentWith(`${OWNED_TEMPLATE}<main>Login</main>`), "utf8")
    writeFileSync(globalErrorPath, documentWith("<main>Erro global</main>"), "utf8")
    const originalBytes = new Map(
      [homePath, loginPath, globalErrorPath].map((path) => [path, readFileSync(path)]),
    )

    expect(assertDirectionContractArtifacts(root)).toEqual({ checkedArtifacts: 2 })
    for (const [path, bytes] of originalBytes) {
      expect(readFileSync(path)).toEqual(bytes)
    }
  })
})
