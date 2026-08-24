import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

const LEGACY_REACT_COMPATIBILITY_RULES = {
  "react-hooks/exhaustive-deps": "off",
  "react-hooks/immutability": "off",
  "react-hooks/purity": "off",
  "react-hooks/set-state-in-effect": "off",
  "react/no-unescaped-entities": "off",
}

const FOUNDATION_REACT_RULES = {
  "react-hooks/exhaustive-deps": "error",
  "react-hooks/immutability": "error",
  "react-hooks/purity": "error",
  "react-hooks/set-state-in-effect": "error",
  "react/no-unescaped-entities": "error",
}

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: LEGACY_REACT_COMPATIBILITY_RULES,
  },
  {
    files: ["types/**/*.ts", "lib/professional-workspace.ts", "lib/professional-workspace.test.ts", "test/**/*.ts"],
    rules: FOUNDATION_REACT_RULES,
  },
])
