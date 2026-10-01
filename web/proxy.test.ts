// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { config, proxy } from "./proxy"

afterEach(() => vi.unstubAllEnvs())
function request() {
  return new NextRequest("http://localhost:3001/exames", {
    headers: { "x-nonce": "untrusted-nonce", "content-security-policy": "script-src * 'unsafe-inline'", "x-synthetic": "preserved" },
  })
}
describe("per-request CSP", () => {
  it("creates distinct 128-bit nonces and overwrites untrusted request policy headers", () => {
    vi.stubEnv("NODE_ENV", "production")
    const first = proxy(request()), second = proxy(request())
    const nonce = first.headers.get("x-middleware-request-x-nonce")!
    expect(Buffer.from(nonce, "base64")).toHaveLength(16)
    expect(nonce).not.toBe(second.headers.get("x-middleware-request-x-nonce"))
    expect(nonce).not.toBe("untrusted-nonce")
    const policy = first.headers.get("Content-Security-Policy")!
    expect(policy).toContain(`'nonce-${nonce}'`)
    expect(policy).toBe(first.headers.get("x-middleware-request-content-security-policy"))
    expect(first.headers.get("x-middleware-request-x-synthetic")).toBe("preserved")
    expect(policy).toContain("connect-src 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
    const scripts = policy.split("; ").find(directive => directive.startsWith("script-src"))!
    expect(scripts).toContain("'strict-dynamic'")
    expect(scripts).not.toContain("unsafe-inline")
    expect(scripts).not.toContain("unsafe-eval")
  })
  it("permits only documented eval tooling in development scripts", () => {
    vi.stubEnv("NODE_ENV", "development")
    const policy = proxy(request()).headers.get("Content-Security-Policy")!
    const scripts = policy.split("; ").find(directive => directive.startsWith("script-src"))!
    expect(scripts).toContain("'unsafe-eval'")
    expect(scripts).not.toContain("'unsafe-inline'")
    expect(policy).toContain("ws:")
    expect(policy).toContain("wss:")
  })
  it.each(["/api", "/api/auth/me", "/_next/static/chunk.js", "/_next/image", "/favicon.ico", "/robots.txt", "/icon.svg", "/manifest.webmanifest"])("excludes API/static asset %s", url => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
  })
  it.each(["/", "/exames", "/clientes/123", "/auth/login"])("protects HTML page %s", url => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
  })
})
