import {
  DIRECTION_CONTRACT_COMMENT,
  DIRECTION_CONTRACT_ID,
} from "@/lib/direction-contract.mjs"

export function DirectionContract() {
  return (
    <template
      aria-hidden="true"
      data-safemove-direction-contract={DIRECTION_CONTRACT_ID}
      dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT_COMMENT }}
    />
  )
}
