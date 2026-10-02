import { resolve } from "node:path"
import { assertProductionDirectionContracts } from "./direction-contract-production.mjs"

const result = await assertProductionDirectionContracts(resolve(process.cwd()))
console.log(
  `Exact direction contract and CSP nonces validated in ${result.checkedRoutes}/${result.checkedRoutes} served production pages; internal error pages explicitly excluded.`,
)
