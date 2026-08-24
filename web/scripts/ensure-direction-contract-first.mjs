import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"

const seed = "seed 49524f2c"
const templateStartTag = '<template aria-hidden="true">'
const templateEndTag = "</template>"
const artifactsRoot = resolve(process.cwd(), ".next/server/app")

function findHtmlFiles(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry)
      return statSync(path).isDirectory()
        ? findHtmlFiles(path)
        : path.endsWith(".html")
          ? [path]
          : []
    })
    .sort()
}

const htmlFiles = findHtmlFiles(artifactsRoot)
let updatedArtifacts = 0
let contractArtifacts = 0

for (const artifactPath of htmlFiles) {
  const html = readFileSync(artifactPath, "utf8")
  const seedIndex = html.indexOf(seed)
  if (seedIndex === -1) continue

  contractArtifacts += 1

  const bodyMatch = /<body\b[^>]*>/i.exec(html)
  assert.ok(bodyMatch, `${artifactPath} does not contain a body element`)
  const bodyContentStart = bodyMatch.index + bodyMatch[0].length

  let templateStart = html.indexOf(templateStartTag, bodyContentStart)
  let templateEndStart = -1
  while (templateStart !== -1) {
    templateEndStart = html.indexOf(templateEndTag, templateStart)
    assert.ok(templateEndStart > templateStart, `${artifactPath} has an unterminated template`)
    if (html.slice(templateStart, templateEndStart).includes(seed)) break
    templateStart = html.indexOf(templateStartTag, templateEndStart + templateEndTag.length)
  }
  assert.ok(templateStart >= bodyContentStart, `${artifactPath} does not contain the owned direction template in body`)

  const templateEnd = templateEndStart + templateEndTag.length
  const template = html.slice(templateStart, templateEnd)
  assert.ok(template.includes(seed), `${artifactPath} direction template lost seed ${seed}`)

  if (templateStart === bodyContentStart) continue

  const withoutTemplate = html.slice(0, templateStart) + html.slice(templateEnd)
  const reordered =
    withoutTemplate.slice(0, bodyContentStart) +
    template +
    withoutTemplate.slice(bodyContentStart)
  writeFileSync(artifactPath, reordered, "utf8")
  updatedArtifacts += 1
}

assert.ok(contractArtifacts > 0, `No production HTML beneath ${artifactsRoot} contains ${seed}`)
console.log(
  `Direction contract normalized in ${updatedArtifacts}/${contractArtifacts} production HTML artifacts beneath ${relative(process.cwd(), artifactsRoot)}.`,
)
