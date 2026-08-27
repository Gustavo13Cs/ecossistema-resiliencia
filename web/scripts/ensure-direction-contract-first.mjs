import { relative, resolve } from "node:path"
import { normalizeDirectionContractArtifacts } from "./direction-contract-artifacts.mjs"

const artifactsRoot = resolve(process.cwd(), ".next/server/app")
const result = normalizeDirectionContractArtifacts(artifactsRoot)
console.log(
  `Direction contract normalized in ${result.updatedArtifacts}/${result.checkedArtifacts} root-layout production HTML artifacts beneath ${relative(process.cwd(), artifactsRoot)}.`,
)
