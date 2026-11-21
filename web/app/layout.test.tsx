import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import RootLayout from "./layout"

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-safemove" }),
}))

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-nonce": "fixture-request-nonce" })),
}))

vi.mock("@/components/providers/QueryProvider", () => ({
  QueryProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/contexts/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/LayoutWrapper", () => ({
  LayoutWrapper: ({ children }: { children: ReactNode }) => (
    <main data-root-layout-ui="">{children}</main>
  ),
}))

vi.mock("sonner", () => ({
  Toaster: () => <aside data-root-layout-ui="" />,
}))

const webVitalsReporterSpy = vi.fn()

vi.mock("@/components/observability/WebVitalsReporter", () => ({
  WebVitalsReporter: () => {
    webVitalsReporterSpy()
    return null
  },
}))

describe("RootLayout direction contract order", () => {
  it("renders DirectionContract before all application-authored body UI", async () => {
    webVitalsReporterSpy.mockClear()
    const markup = renderToStaticMarkup(await RootLayout({ children: <p>Área profissional</p> }))
    const document = new DOMParser().parseFromString(markup, "text/html")
    const contract = document.querySelector(
      'body > template[data-safemove-direction-contract="49524f2c"]',
    )

    expect(webVitalsReporterSpy).toHaveBeenCalledTimes(1)
    expect(document.body.firstElementChild).toBe(contract)
    expect(document.documentElement.getAttribute("nonce")).toBe("fixture-request-nonce")
    expect(contract?.nextElementSibling?.getAttribute("data-root-layout-ui")).toBe("")
    expect(
      contract?.nextElementSibling?.nextElementSibling?.tagName,
    ).toBe("ASIDE")
    expect(
      contract?.nextElementSibling?.nextElementSibling?.getAttribute("data-root-layout-ui"),
    ).toBe("")
  })
})
