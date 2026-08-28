import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { JSDOM } from "jsdom"
import {
  DIRECTION_CONTRACT_HTML,
  DIRECTION_CONTRACT_ID,
} from "../lib/direction-contract.mjs"

const GLOBAL_ERROR_ARTIFACT = "_global-error.html"
const DIRECTION_CONTRACT_ATTRIBUTE = "data-safemove-direction-contract"

function findHtmlFiles(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const artifactPath = join(directory, entry)
      return statSync(artifactPath).isDirectory()
        ? findHtmlFiles(artifactPath)
        : artifactPath.endsWith(".html")
          ? [artifactPath]
          : []
    })
    .sort()
}

function toArtifactName(root, artifactPath) {
  return relative(root, artifactPath).replaceAll("/", "\\")
}

function getRootLayoutArtifacts(artifactsRoot) {
  const htmlFiles = findHtmlFiles(artifactsRoot)
  const rootLayoutArtifacts = htmlFiles.filter(
    (artifactPath) => toArtifactName(artifactsRoot, artifactPath) !== GLOBAL_ERROR_ARTIFACT,
  )

  assert.ok(
    rootLayoutArtifacts.length > 0,
    `No root-layout production HTML artifacts found beneath ${artifactsRoot}`,
  )
  return rootLayoutArtifacts
}

function countOccurrences(value, fragment) {
  let count = 0
  let index = value.indexOf(fragment)

  while (index !== -1) {
    count += 1
    index = value.indexOf(fragment, index + fragment.length)
  }

  return count
}

function locateOwnedContract(html, artifactName) {
  const dom = new JSDOM(html, { includeNodeLocations: true })
  const { document } = dom.window
  const body = document.body
  const bodyLocation = body && dom.nodeLocation(body)

  assert.ok(
    bodyLocation?.startTag,
    `${artifactName} does not contain a body element`,
  )
  const ownedTemplates = [...document.querySelectorAll("template")].filter(
    (template) => template.getAttribute(DIRECTION_CONTRACT_ATTRIBUTE) === DIRECTION_CONTRACT_ID,
  )
  const ownedContractCount = ownedTemplates.length
  assert.ok(
    ownedContractCount > 0,
    `${artifactName} is missing the owned direction contract`,
  )
  assert.equal(
    ownedContractCount,
    1,
    `${artifactName} contains ${ownedContractCount} owned direction contracts`,
  )

  const ownedTemplate = ownedTemplates[0]
  const templateLocation = dom.nodeLocation(ownedTemplate)
  assert.ok(
    templateLocation?.endTag,
    `${artifactName} has an unterminated owned direction contract`,
  )
  assert.ok(
    bodyLocation.endTag,
    `${artifactName} has an unterminated body element`,
  )

  assert.ok(
    body.contains(ownedTemplate),
    `${artifactName} has the owned direction contract outside body`,
  )

  const templateStart = templateLocation.startOffset
  const templateEnd = templateLocation.endOffset
  assert.equal(
    html.slice(templateStart, templateEnd),
    DIRECTION_CONTRACT_HTML,
    `${artifactName} does not contain the exact owned direction contract`,
  )

  const canonicalContractCount = countOccurrences(html, DIRECTION_CONTRACT_HTML)
  assert.equal(
    canonicalContractCount,
    1,
    `${artifactName} contains ${canonicalContractCount} exact canonical direction contract byte sequences`,
  )

  return {
    bodyContentStart: bodyLocation.startTag.endOffset,
    body,
    ownedTemplate,
    templateEnd,
    templateStart,
  }
}

export function assertDirectionContractHtml(html, artifactName) {
  const location = locateOwnedContract(html, artifactName)
  assert.equal(
    location.body.firstElementChild,
    location.ownedTemplate,
    `${artifactName} cannot place the exact direction contract first in body`,
  )
}

export function normalizeDirectionContractHtml(html, artifactName) {
  const location = locateOwnedContract(html, artifactName)
  if (location.templateStart === location.bodyContentStart) {
    return { html, changed: false }
  }

  const withoutContract =
    html.slice(0, location.templateStart) + html.slice(location.templateEnd)
  const normalized =
    withoutContract.slice(0, location.bodyContentStart) +
    DIRECTION_CONTRACT_HTML +
    withoutContract.slice(location.bodyContentStart)

  assertDirectionContractHtml(normalized, artifactName)
  return { html: normalized, changed: true }
}

export function normalizeDirectionContractArtifacts(artifactsRoot) {
  const artifacts = getRootLayoutArtifacts(artifactsRoot)
  const normalizationPlan = artifacts.map((artifactPath) => {
    const artifactName = toArtifactName(artifactsRoot, artifactPath)
    const source = readFileSync(artifactPath, "utf8")
    const result = normalizeDirectionContractHtml(source, artifactName)
    return { artifactPath, ...result }
  })

  const changedArtifacts = normalizationPlan.filter((artifact) => artifact.changed)
  for (const artifact of changedArtifacts) {
    writeFileSync(artifact.artifactPath, artifact.html, "utf8")
  }

  return {
    checkedArtifacts: artifacts.length,
    updatedArtifacts: changedArtifacts.length,
  }
}

export function assertDirectionContractArtifacts(artifactsRoot) {
  const artifacts = getRootLayoutArtifacts(artifactsRoot)
  for (const artifactPath of artifacts) {
    const artifactName = toArtifactName(artifactsRoot, artifactPath)
    assertDirectionContractHtml(readFileSync(artifactPath, "utf8"), artifactName)
  }
  return { checkedArtifacts: artifacts.length }
}
