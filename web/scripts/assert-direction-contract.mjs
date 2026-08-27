import { resolve } from "node:path"
import { assertDirectionContractArtifacts } from "./direction-contract-artifacts.mjs"

const artifactsRoot = resolve(process.cwd(), ".next/server/app")
const result = assertDirectionContractArtifacts(artifactsRoot)
console.log(
  `Exact direction contract is first in ${result.checkedArtifacts} root-layout production HTML artifacts.`,
)
