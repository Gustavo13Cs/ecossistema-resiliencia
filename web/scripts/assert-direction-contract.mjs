import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { JSDOM } from "jsdom"

const seed = "seed 49524f2c"
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

const contractArtifacts = findHtmlFiles(artifactsRoot).filter((artifactPath) =>
  readFileSync(artifactPath, "utf8").includes(seed),
)

assert.ok(contractArtifacts.length > 0, `No production HTML beneath ${artifactsRoot} contains ${seed}`)

for (const artifactPath of contractArtifacts) {
  const dom = new JSDOM(readFileSync(artifactPath, "utf8"))
  const firstBodyElement = dom.window.document.body.firstElementChild

  assert.ok(firstBodyElement, `No first element was emitted in ${artifactPath}`)
  assert.equal(
    firstBodyElement.tagName,
    "TEMPLATE",
    `Expected the direction contract to be the first body element in ${artifactPath}, received <${firstBodyElement.tagName.toLowerCase()}>`,
  )
  assert.equal(firstBodyElement.getAttribute("aria-hidden"), "true", `${artifactPath} direction template must be hidden`)
  assert.match(firstBodyElement.innerHTML, /seed 49524f2c/, `${artifactPath} first template lost the direction seed`)
  dom.window.close()
}

console.log(
  `Direction contract is the first body element and retains ${seed} in ${contractArtifacts.length} production HTML artifacts.`,
)
