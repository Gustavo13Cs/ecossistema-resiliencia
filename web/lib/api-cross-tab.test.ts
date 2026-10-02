import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, expect, it, vi } from "vitest"

afterEach(() => { vi.unstubAllGlobals() })

it("coordinates independent tabs and reuses the access cookie rotated by the first tab", async () => {
  let queue: Promise<unknown> = Promise.resolve()
  const request = vi.fn((_name: string, work: (lock: Lock) => Promise<void>) => {
    const pending = queue.then(() => work({ name: "safemove-auth-refresh", mode: "exclusive" } as Lock))
    queue = pending.catch(() => undefined)
    return pending
  })
  vi.stubGlobal("navigator", { locks: { request } })
  vi.resetModules()
  const firstTab = await import("./api")
  vi.resetModules()
  const secondTab = await import("./api")
  const mocks = [new AxiosMockAdapter(firstTab.api), new AxiosMockAdapter(secondTab.api)]
  const signedOut = vi.fn()
  firstTab.setUnauthorizedHandler(signedOut)
  secondTab.setUnauthorizedHandler(signedOut)
  let rotatedCookie = false
  let refreshes = 0
  for (const mock of mocks) {
    mock.onGet("/clients").reply(() => rotatedCookie ? [200, []] : [401, {}])
    mock.onGet("/auth/me").reply(() => rotatedCookie ? [200, { csrfToken: "rotated-csrf" }] : [401, {}])
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(() => {
      refreshes += 1
      if (rotatedCookie) return [401, {}] // Reutilização revoga a sessão no servidor real.
      rotatedCookie = true
      return [200, { csrfToken: "rotated-csrf" }]
    })
    mock.onPost("/later").reply(config => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("rotated-csrf")
      return [200, {}]
    })
  }
  try {
    const responses = await Promise.all([firstTab.api.get("/clients"), secondTab.api.get("/clients")])
    expect(responses.map(response => response.status)).toEqual([200, 200])
    expect(refreshes).toBe(1)
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls.map(([name]) => name)).toEqual(["safemove-auth-refresh", "safemove-auth-refresh"])
    expect(signedOut).not.toHaveBeenCalled()
    await secondTab.api.post("/later")
  } finally { mocks.forEach(mock => mock.restore()) }
})
