import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DirectionContract } from "./DirectionContract"

describe("DirectionContract", () => {
  it("emits the uniquely owned hidden template and exact approved comment", () => {
    const { container } = render(<DirectionContract />)
    const template = container.firstElementChild

    expect(template?.tagName).toBe("TEMPLATE")
    expect(template).toHaveAttribute("aria-hidden", "true")
    expect(template).toHaveAttribute("data-safemove-direction-contract", "49524f2c")
    expect(template?.innerHTML).toBe(`<!--
THESIS: SafeMove is a calm private workspace for one professional practice, refusing the crowded multidisciplinary control panel.
OWN-WORLD: Cold-white ground, deep navy type, teal action, hairline slate borders, restrained elevation, compact linear icons, small and medium radii.
STORY: The professional recognizes their area and private base, finds a client, understands honest workload, then takes one permitted action.
FIRST VIEWPORT: Light sidebar; workspace identity, search and account in the header; profession-safe actions; real client summary; recent clients with generous whitespace.
FORM: SaaS Clinico Contemporaneo, canonical direction, seed 49524f2c; approved comp dashboard-comp-01.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`)
  })
})
