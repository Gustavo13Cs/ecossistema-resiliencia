import { afterEach, describe, expect, it, vi } from "vitest"

import nextConfig from "./next.config.mjs"

describe("Next.js response security headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("protects every route and permits connections only to the configured API origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.safemove.example/v1")

    expect(nextConfig.headers).toBeTypeOf("function")

    const routes = await nextConfig.headers!()
    const catchAll = routes.find((route) => route.source === "/(.*)")

    expect(catchAll?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ]),
    )

    const contentSecurityPolicy = catchAll?.headers.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value

    expect(contentSecurityPolicy).toContain("default-src 'self'")
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'")
    expect(contentSecurityPolicy).toContain(
      "connect-src 'self' https://api.safemove.example",
    )
    expect(contentSecurityPolicy).not.toContain("https://api.safemove.example/v1")
  })

  it("rejects an invalid public API URL instead of weakening connect-src", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "not a URL")

    expect(nextConfig.headers).toBeTypeOf("function")
    await expect(nextConfig.headers!()).rejects.toThrow(
      "NEXT_PUBLIC_API_URL must be a valid absolute URL",
    )
  })

  it("rejects a production build without an explicit public API URL", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_API_URL", "")

    expect(nextConfig.headers).toBeTypeOf("function")
    await expect(nextConfig.headers!()).rejects.toThrow(
      "NEXT_PUBLIC_API_URL is required",
    )
  })
})
