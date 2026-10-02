import { afterEach, describe, expect, it, vi } from "vitest"
import { discardLegacyClinicalStorage } from "./discard-legacy-clinical-storage"

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear() })
describe("legacy clinical storage cleanup", () => {
  it("discards all previous goal/lab keys in both storages without reading clinical values or removing preferences", () => {
    for (const storage of [localStorage, sessionStorage]) {
      storage.setItem("safemove_client_goals_v1_professional-a", "synthetic")
      storage.setItem("safemove_client_goals_v1_professional-b", "synthetic")
      storage.setItem("safemove_central_lab_exams_v1", "synthetic")
      storage.setItem("safemove_issued_lab_orders_v1", "synthetic")
      storage.setItem("theme", "dark")
    }
    const read = vi.spyOn(Storage.prototype, "getItem")
    discardLegacyClinicalStorage()
    expect(read).not.toHaveBeenCalled()
    for (const storage of [localStorage, sessionStorage]) {
      expect(storage.length).toBe(1)
      expect(storage.key(0)).toBe("theme")
    }
  })
  it("still cleans the other storage if browser access to one storage is blocked", () => {
    sessionStorage.setItem("safemove_issued_lab_orders_v1", "synthetic")
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Unavailable", "SecurityError") })
    expect(() => discardLegacyClinicalStorage()).not.toThrow()
    expect(sessionStorage.length).toBe(0)
  })
})
