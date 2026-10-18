import { afterEach, expect, it, vi } from "vitest"
import { canUseEditorDocument, navigateToWorkoutPage } from "./workout-editor-navigation"

afterEach(() => vi.unstubAllGlobals())
it("fallback_uses_full_documents_for_enter_exit_and_initial_save_replacement", () => {
  const assign = vi.fn(), replace = vi.fn()
  vi.stubGlobal("window", { location: { assign, replace } })
  const router = { push: vi.fn(), replace: vi.fn() }
  navigateToWorkoutPage(router, "/clientes/c1/novo-treino")
  navigateToWorkoutPage(router, "/clientes/c1/rascunhos/d1", "replace")
  navigateToWorkoutPage(router, "/clientes/c1/treinos/w1")
  expect(assign.mock.calls).toEqual([["/clientes/c1/novo-treino"], ["/clientes/c1/treinos/w1"]])
  expect(replace).toHaveBeenCalledWith("/clientes/c1/rascunhos/d1")
  expect(router.push).not.toHaveBeenCalled()
  expect(router.replace).not.toHaveBeenCalled()
})
it("fallback_rejects_spa_arrival_until_document_url_matches_editor", () => {
  expect(canUseEditorDocument("https://safe.test/treinos", "https://safe.test/clientes/c1/novo-treino")).toBe(false)
  expect(canUseEditorDocument("https://safe.test/clientes/c1/rascunhos/d1", "https://safe.test/clientes/c1/rascunhos/d1")).toBe(true)
  expect(canUseEditorDocument(undefined, "https://safe.test/clientes/c1/novo-treino")).toBe(false)
})
it("navigation_api_preserves_spa_push_and_replace", () => {
  vi.stubGlobal("window", { navigation: {} })
  const router = { push: vi.fn(), replace: vi.fn() }
  navigateToWorkoutPage(router, "/clientes/c1/rascunhos/d1", "replace")
  navigateToWorkoutPage(router, "/clientes/c1/treinos/w1")
  expect(router.replace).toHaveBeenCalledWith("/clientes/c1/rascunhos/d1")
  expect(router.push).toHaveBeenCalledWith("/clientes/c1/treinos/w1")
})
