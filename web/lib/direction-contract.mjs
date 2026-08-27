export const DIRECTION_CONTRACT_ID = "49524f2c"

export const DIRECTION_CONTRACT_COMMENT = `<!--
THESIS: SafeMove is a calm private workspace for one professional practice, refusing the crowded multidisciplinary control panel.
OWN-WORLD: Cold-white ground, deep navy type, teal action, hairline slate borders, restrained elevation, compact linear icons, small and medium radii.
STORY: The professional recognizes their area and private base, finds a client, understands honest workload, then takes one permitted action.
FIRST VIEWPORT: Light sidebar; workspace identity, search and account in the header; profession-safe actions; real client summary; recent clients with generous whitespace.
FORM: SaaS Clinico Contemporaneo, canonical direction, seed 49524f2c; approved comp dashboard-comp-01.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`

export const DIRECTION_CONTRACT_IDENTITY_ATTRIBUTE =
  `data-safemove-direction-contract="${DIRECTION_CONTRACT_ID}"`

export const DIRECTION_CONTRACT_TEMPLATE_START =
  `<template aria-hidden="true" ${DIRECTION_CONTRACT_IDENTITY_ATTRIBUTE}>`

export const DIRECTION_CONTRACT_HTML =
  `${DIRECTION_CONTRACT_TEMPLATE_START}${DIRECTION_CONTRACT_COMMENT}</template>`
