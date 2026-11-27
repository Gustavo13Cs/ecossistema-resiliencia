import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { subscribeToSessionResume } from "./session-resume"

describe("session resume events", () => {
  let visibility: "visible" | "hidden"
  let unsubscribe: (() => void) | undefined
  const resume = vi.fn()
  const windowEvent = (type: "focus" | "blur") => window.dispatchEvent(new FocusEvent(type))
  const setVisibility = (state: "visible" | "hidden") => {
    visibility = state
    document.dispatchEvent(new Event("visibilitychange"))
  }
  const pageEvent = (type: "pagehide" | "pageshow", persisted = true) => {
    window.dispatchEvent(new PageTransitionEvent(type, { persisted }))
  }

  beforeEach(() => {
    visibility = "visible"
    resume.mockReset()
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility)
    vi.spyOn(document, "hasFocus").mockReturnValue(true)
  })
  afterEach(() => {
    unsubscribe?.()
    unsubscribe = undefined
    vi.restoreAllMocks()
  })

  it("ignores initial focus and visibility signals while the page is already active", () => {
    unsubscribe = subscribeToSessionResume(resume)
    windowEvent("focus")
    setVisibility("visible")
    pageEvent("pageshow", false)
    expect(resume).not.toHaveBeenCalled()
  })

  it("ignores internal focus and blur events, including bubbling events", () => {
    unsubscribe = subscribeToSessionResume(resume)
    const input = document.createElement("input")
    document.body.append(input)
    input.focus()
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true }))
    input.dispatchEvent(new FocusEvent("focus", { bubbles: true }))
    windowEvent("focus")
    input.remove()
    expect(resume).not.toHaveBeenCalled()
  })

  it("checks each actual window return without a time-based cooldown", () => {
    unsubscribe = subscribeToSessionResume(resume)
    windowEvent("blur")
    windowEvent("focus")
    windowEvent("focus")
    expect(resume).toHaveBeenCalledTimes(1)
    windowEvent("blur")
    windowEvent("focus")
    expect(resume).toHaveBeenCalledTimes(2)
  })

  it("checks an initially unfocused window when it becomes focused", () => {
    vi.mocked(document.hasFocus).mockReturnValue(false)
    unsubscribe = subscribeToSessionResume(resume)
    windowEvent("focus")
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("checks a visibility return even without a window blur event", () => {
    unsubscribe = subscribeToSessionResume(resume)
    setVisibility("hidden")
    expect(resume).not.toHaveBeenCalled()
    setVisibility("visible")
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("checks an initially hidden page when it becomes visible", () => {
    visibility = "hidden"
    unsubscribe = subscribeToSessionResume(resume)
    windowEvent("focus")
    expect(resume).not.toHaveBeenCalled()
    setVisibility("visible")
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it.each(["focus-first", "visibility-first"])("coalesces one return in either event order: %s", order => {
    unsubscribe = subscribeToSessionResume(resume)
    setVisibility("hidden")
    windowEvent("blur")
    visibility = "visible"
    const focus = () => windowEvent("focus")
    const visible = () => setVisibility("visible")
    ;(order === "focus-first" ? focus : visible)()
    // O callback já terminou: a deduplicação independe de uma consulta em andamento.
    ;(order === "focus-first" ? visible : focus)()
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("checks a BFCache restore even without a recorded departure", () => {
    unsubscribe = subscribeToSessionResume(resume)
    pageEvent("pageshow")
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["pageshow", "visibility", "focus"],
    ["visibility", "focus", "pageshow"],
    ["focus", "pageshow", "visibility"],
  ])("checks a BFCache return once across %s, %s and %s", (...order) => {
    unsubscribe = subscribeToSessionResume(resume)
    pageEvent("pagehide")
    setVisibility("hidden")
    windowEvent("blur")
    visibility = "visible"
    for (const event of order) {
      if (event === "pageshow") pageEvent("pageshow")
      else if (event === "visibility") setVisibility("visible")
      else windowEvent("focus")
    }
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it("removes listeners when unsubscribed", () => {
    unsubscribe = subscribeToSessionResume(resume)
    unsubscribe()
    windowEvent("blur")
    windowEvent("focus")
    setVisibility("hidden")
    setVisibility("visible")
    pageEvent("pageshow")
    expect(resume).not.toHaveBeenCalled()
  })
})
