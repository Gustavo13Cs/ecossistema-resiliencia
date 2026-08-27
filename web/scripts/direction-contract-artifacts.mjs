import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import {
  DIRECTION_CONTRACT_HTML,
  DIRECTION_CONTRACT_ID,
} from "../lib/direction-contract.mjs"

const GLOBAL_ERROR_ARTIFACT = "_global-error.html"
const TEMPLATE_END = "</template>"

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

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function locateOwnedContract(html, artifactName) {
  const ownedTemplatePattern = new RegExp(
    `<template\\b[^>]*\\bdata-safemove-direction-contract\\s*=\\s*(["'])${escapeRegularExpression(DIRECTION_CONTRACT_ID)}\\1[^>]*>`,
    "gi",
  )
  const ownedTemplates = [...html.matchAll(ownedTemplatePattern)]
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

  const templateStart = ownedTemplates[0].index
  const startTagEnd = templateStart + ownedTemplates[0][0].length - 1

  const templateEndStart = html.indexOf(TEMPLATE_END, startTagEnd + 1)
  assert.ok(
    templateEndStart !== -1,
    `${artifactName} has an unterminated owned direction contract`,
  )
  const templateEnd = templateEndStart + TEMPLATE_END.length

  const bodyMatch = /<body\b[^>]*>/i.exec(html)
  assert.ok(bodyMatch, `${artifactName} does not contain a body element`)
  const bodyContentStart = bodyMatch.index + bodyMatch[0].length
  const bodyEndMatch = /<\/body\s*>/i.exec(html.slice(bodyContentStart))
  assert.ok(bodyEndMatch, `${artifactName} has an unterminated body element`)
  const bodyContentEnd = bodyContentStart + bodyEndMatch.index

  assert.ok(
    templateStart >= bodyContentStart && templateEnd <= bodyContentEnd,
    `${artifactName} has the owned direction contract outside body`,
  )
  assert.equal(
    html.slice(templateStart, templateEnd),
    DIRECTION_CONTRACT_HTML,
    `${artifactName} does not contain the exact owned direction contract`,
  )

  return { bodyContentStart, templateEnd, templateStart }
}

export function assertDirectionContractHtml(html, artifactName) {
  const location = locateOwnedContract(html, artifactName)
  assert.equal(
    location.templateStart,
    location.bodyContentStart,
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
