import { resolve } from "node:path"
import { assertDirectionContractArtifacts } from "./direction-contract-artifacts.mjs"

const artifactsRoot = resolve(process.cwd(), ".next/server/app")
const result = assertDirectionContractArtifacts(artifactsRoot)
console.log(
  `Native-safe exact direction contract validated in ${result.checkedArtifacts}/${result.checkedArtifacts} root-layout production HTML artifacts; _global-error.html explicitly excluded.`,
)
