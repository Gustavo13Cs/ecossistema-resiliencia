// @vitest-environment node

import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertDirectionContractArtifacts,
  normalizeDirectionContractArtifacts,
  normalizeDirectionContractHtml,
} from "./direction-contract-artifacts.mjs"

const OWNED_TEMPLATE = `<template aria-hidden="true" data-safemove-direction-contract="49524f2c"><!--
THESIS: SafeMove is a calm private workspace for one professional practice, refusing the crowded multidisciplinary control panel.
OWN-WORLD: Cold-white ground, deep navy type, teal action, hairline slate borders, restrained elevation, compact linear icons, small and medium radii.
STORY: The professional recognizes their area and private base, finds a client, understands honest workload, then takes one permitted action.
FIRST VIEWPORT: Light sidebar; workspace identity, search and account in the header; profession-safe actions; real client summary; recent clients with generous whitespace.
FORM: SaaS Clinico Contemporaneo, canonical direction, seed 49524f2c; approved comp dashboard-comp-01.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
--></template>`

const documentWith = (body) => `<!doctype html><html><head><title>SafeMove</title></head><body>${body}</body></html>`

describe("direction contract artifact normalization", () => {
  it("moves only the exact owned template ahead of the Next bootstrap element", () => {
    const bootstrap = '<div hidden=""><!--$--><!--/$--></div>'
    const page = '<main id="content">Conteúdo real</main><script>self.__next_f.push(["seed 49524f2c"])</script>'
    const source = documentWith(`${bootstrap}${OWNED_TEMPLATE}${page}`)

    const result = normalizeDirectionContractHtml(source, "home.html")

    expect(result.changed).toBe(true)
    expect(result.html).toBe(documentWith(`${OWNED_TEMPLATE}${bootstrap}${page}`))
  })

  it("is byte-stable when the exact contract is already first", () => {
    const source = documentWith(`${OWNED_TEMPLATE}<main>Área profissional</main>`)

    const result = normalizeDirectionContractHtml(source, "clientes.html")

    expect(result).toEqual({ html: source, changed: false })
  })

  it("rejects a seed that exists only in Next serialization", () => {
    const source = documentWith('<main>Área profissional</main><script>self.__next_f.push(["seed 49524f2c"])</script>')

    expect(() => normalizeDirectionContractHtml(source, "home.html")).toThrow(
      "home.html is missing the owned direction contract",
    )
  })

  it("rejects duplicate owned templates", () => {
    const source = documentWith(`${OWNED_TEMPLATE}<main>Área profissional</main>${OWNED_TEMPLATE}`)

    expect(() => normalizeDirectionContractHtml(source, "home.html")).toThrow(
      "home.html contains 2 owned direction contracts",
    )
  })

  it("rejects a duplicate identity even when its attributes use different serialization", () => {
    const alteredDuplicate = OWNED_TEMPLATE.replace(
      '<template aria-hidden="true" data-safemove-direction-contract="49524f2c">',
      "<template data-safemove-direction-contract='49524f2c' aria-hidden='true'>",
    )
    const source = documentWith(`${OWNED_TEMPLATE}<main>Área profissional</main>${alteredDuplicate}`)

    expect(() => normalizeDirectionContractHtml(source, "home.html")).toThrow(
      "home.html contains 2 owned direction contracts",
    )
  })

  it("rejects an owned template outside body", () => {
    const source = `<!doctype html><html><head>${OWNED_TEMPLATE}</head><body><main>Área profissional</main></body></html>`

    expect(() => normalizeDirectionContractHtml(source, "home.html")).toThrow(
      "home.html has the owned direction contract outside body",
    )
  })

  it("rejects an unterminated owned template", () => {
    const source = documentWith(
      '<template aria-hidden="true" data-safemove-direction-contract="49524f2c"><!-- seed 49524f2c',
    )

    expect(() => normalizeDirectionContractHtml(source, "home.html")).toThrow(
      "home.html has an unterminated owned direction contract",
    )
  })

  it("rejects a complete but altered owned contract", () => {
    const source = documentWith(OWNED_TEMPLATE.replace("Cold-white ground", "Gray ground"))

    expect(() => normalizeDirectionContractHtml(source, "home.html")).toThrow(
      "home.html does not contain the exact owned direction contract",
    )
  })
})

describe("direction contract artifact coverage", () => {
  it("fails closed when any nested root-layout HTML artifact is missing the contract", () => {
    const root = mkdtempSync(join(tmpdir(), "safemove-contract-"))
    const homeBeforeFailure = documentWith(
      `<div hidden=""><!--$--><!--/$--></div>${OWNED_TEMPLATE}<main>Home</main>`,
    )
    writeFileSync(join(root, "a-home.html"), homeBeforeFailure, "utf8")
    writeFileSync(join(root, "z-login.html"), documentWith("<main>Login</main>"), "utf8")
    writeFileSync(join(root, "_global-error.html"), documentWith("<main>Erro global</main>"), "utf8")

    expect(() => normalizeDirectionContractArtifacts(root)).toThrow(
      "z-login.html is missing the owned direction contract",
    )
    expect(readFileSync(join(root, "a-home.html"), "utf8")).toBe(homeBeforeFailure)
  })

  it("normalizes every root-layout artifact, explicitly excludes global error, and proves a zero-change second run", () => {
    const root = mkdtempSync(join(tmpdir(), "safemove-contract-"))
    mkdirSync(join(root, "auth"))
    const bootstrap = '<div hidden=""><!--$--><!--/$--></div>'
    writeFileSync(join(root, "home.html"), documentWith(`${bootstrap}${OWNED_TEMPLATE}<main>Home</main>`), "utf8")
    writeFileSync(join(root, "auth", "login.html"), documentWith(`${OWNED_TEMPLATE}<main>Login</main>`), "utf8")
    writeFileSync(join(root, "_global-error.html"), documentWith("<main>Erro global</main>"), "utf8")

    expect(normalizeDirectionContractArtifacts(root)).toEqual({
      checkedArtifacts: 2,
      updatedArtifacts: 1,
    })
    expect(normalizeDirectionContractArtifacts(root)).toEqual({
      checkedArtifacts: 2,
      updatedArtifacts: 0,
    })
    expect(assertDirectionContractArtifacts(root)).toEqual({ checkedArtifacts: 2 })
    expect(readFileSync(join(root, "_global-error.html"), "utf8")).toBe(
      documentWith("<main>Erro global</main>"),
    )
  })
})
