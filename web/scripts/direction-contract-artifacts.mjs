import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
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

function collectOwnedTemplates(root, visitedTemplates = new Set()) {
  const ownedTemplates = []

  for (const template of root.querySelectorAll("template")) {
    if (visitedTemplates.has(template)) {
      continue
    }
    visitedTemplates.add(template)

    if (template.getAttribute(DIRECTION_CONTRACT_ATTRIBUTE) === DIRECTION_CONTRACT_ID) {
      ownedTemplates.push(template)
    }

    ownedTemplates.push(...collectOwnedTemplates(template.content, visitedTemplates))
  }

  return ownedTemplates
}

function isWhitespaceTextNode(node) {
  return node.nodeType === 3 && node.textContent.trim() === ""
}

function hasCanonicalNextReactBoundaryShape(node) {
  if (
    node.nodeType !== 1 ||
    node.tagName !== "DIV" ||
    node.attributes.length !== 1 ||
    node.getAttribute("hidden") !== ""
  ) {
    return false
  }

  const children = [...node.childNodes]
  return (
    children.length === 2 &&
    children[0].nodeType === 8 &&
    children[0].data === "$" &&
    children[1].nodeType === 8 &&
    children[1].data === "/$"
  )
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
  const ownedTemplates = collectOwnedTemplates(document)
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
  assert.equal(
    ownedTemplate.parentElement,
    body,
    `${artifactName} does not place the owned direction contract directly in body`,
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

  let canonicalBoundaryShapeCount = 0
  for (const node of body.childNodes) {
    if (node === ownedTemplate) {
      break
    }

    if (isWhitespaceTextNode(node)) {
      continue
    }

    assert.ok(
      hasCanonicalNextReactBoundaryShape(node),
      `${artifactName} has unsupported content before the owned direction contract`,
    )
    canonicalBoundaryShapeCount += 1
    assert.ok(
      canonicalBoundaryShapeCount <= 1,
      `${artifactName} has more than one canonical Next/React-shaped boundary before the owned direction contract`,
    )
  }
}

export function assertDirectionContractHtml(html, artifactName) {
  locateOwnedContract(html, artifactName)
}

export function assertDirectionContractArtifacts(artifactsRoot) {
  const artifacts = getRootLayoutArtifacts(artifactsRoot)
  for (const artifactPath of artifacts) {
    const artifactName = toArtifactName(artifactsRoot, artifactPath)
    assertDirectionContractHtml(readFileSync(artifactPath, "utf8"), artifactName)
  }
  return { checkedArtifacts: artifacts.length }
}
