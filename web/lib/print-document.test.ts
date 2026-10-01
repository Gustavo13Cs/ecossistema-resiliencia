import { afterEach, describe, expect, it, vi } from "vitest"
import { buildPrintDocument, escapeHtml, multiline, openPrintWindow } from "./print-document"

const attacks = ['<script>alert(1)</script>', '<svg onload="alert(2)">', '</style><img src=x onerror=alert(3)>', 'quotes " & \' plus\nsecond line']
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html")
afterEach(() => vi.restoreAllMocks())
describe("shared print documents", () => {
  it.each(attacks)("escapes title, body text and multiline text: %s", attack => {
    const document = parse(buildPrintDocument({ title: attack, css: "body { color: black }", body: `<p>${escapeHtml(attack)}</p><section>${multiline(attack)}</section>` }))
    expect(document.querySelector("title")?.textContent).toBe(attack)
    expect(document.querySelector("p")?.textContent).toBe(attack)
    expect(document.querySelector("section")?.textContent).toBe(attack.replace(/\r?\n/g, ""))
    expect(document.querySelector("script, svg, img, [onload], [onerror]")).toBeNull()
    expect(document.querySelectorAll("style")).toHaveLength(1)
  })
  it("handles missing and numeric values without trusting object HTML", () => {
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
    expect(escapeHtml(12)).toBe("12")
    expect(escapeHtml({ toString: () => '<img onerror="attack">' })).toBe("&lt;img onerror=&quot;attack&quot;&gt;")
  })
  it("registers printing from the opener after loading, and never generates an inline script", () => {
    const order: string[] = []
    const events = new EventTarget()
    const print = vi.fn(() => order.push("print")), focus = vi.fn()
    const popup = { document: { open: vi.fn(() => order.push("open")), write: vi.fn(() => order.push("write")), close: vi.fn(() => order.push("close")) }, addEventListener: events.addEventListener.bind(events), print, focus, closed: false, opener: window }
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window)
    const html = buildPrintDocument({ title: "Synthetic", css: "", body: "<p>Safe</p>" })
    expect(openPrintWindow(html, "width=900,height=700")).toBe(popup)
    expect(popup.document.write).toHaveBeenCalledWith(html)
    expect(print).not.toHaveBeenCalled()
    events.dispatchEvent(new Event("load"))
    events.dispatchEvent(new Event("load"))
    expect(print).toHaveBeenCalledOnce()
    expect(order).toEqual(["open", "write", "close", "print"])
    expect(popup.opener).toBeNull()
    expect(html).not.toContain("<script")
  })
  it("returns null for a blocked popup without attempting to write", () => {
    vi.spyOn(window, "open").mockReturnValue(null)
    expect(openPrintWindow("")).toBeNull()
  })
})
