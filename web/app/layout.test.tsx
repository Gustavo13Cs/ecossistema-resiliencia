import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import RootLayout from "./layout"

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-safemove" }),
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

describe("RootLayout direction contract order", () => {
  it("renders DirectionContract before all application-authored body UI", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>Área profissional</p>
      </RootLayout>,
    )
    const document = new DOMParser().parseFromString(markup, "text/html")
    const contract = document.querySelector(
      'body > template[data-safemove-direction-contract="49524f2c"]',
    )

    expect(document.body.firstElementChild).toBe(contract)
    expect(contract?.nextElementSibling?.getAttribute("data-root-layout-ui")).toBe("")
  })
})
