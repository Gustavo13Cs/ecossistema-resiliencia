import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, expect, it, vi } from "vitest"

function createWebLocksMock() {
  let held = false
  let queue: Promise<unknown> = Promise.resolve()

  const hold = () => {
    let release!: () => void
    const heldPromise = new Promise<void>((resolve) => {
      release = () => {
        held = false
        resolve()
      }
    })
    held = true
    queue = queue.then(() => heldPromise)
    return release
  }

  const request = vi.fn(
    (
      _name: string,
      optionsOrCallback: LockOptions | ((lock: Lock | null) => Promise<unknown>),
      maybeCallback?: (lock: Lock | null) => Promise<unknown>,
    ) => {
      const options = typeof optionsOrCallback === "function" ? {} : optionsOrCallback
      const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback!
      const lock = { name: "safemove-auth-refresh", mode: "exclusive" } as Lock

      if (options.ifAvailable) {
        if (held) {
          return Promise.resolve(callback(null))
        }
        held = true
        const run = Promise.resolve()
          .then(() => callback(lock))
          .finally(() => {
            held = false
          })
        queue = run.catch(() => undefined)
        return run
      }

      const run = queue.then(async () => {
        held = true
        try {
          return await callback(lock)
        } finally {
          held = false
        }
      })
      queue = run.catch(() => undefined)
      return run
    },
  )

  return { request, hold }
}

afterEach(() => { vi.unstubAllGlobals() })

it("preserves the session and HTTP status when checking a session under a contended tab lock returns 500", async () => {
  const locks = createWebLocksMock()
  const releaseOtherTab = locks.hold()
  vi.stubGlobal("navigator", { locks: { request: locks.request } })
  vi.resetModules()
  const tab = await import("./api")
  const mock = new AxiosMockAdapter(tab.api)
  const signedOut = vi.fn()
  tab.setUnauthorizedHandler(signedOut)
  tab.setCsrfToken("valid-csrf")
  mock.onGet("/clients").reply(401)
  mock.onGet("/auth/me").reply(500)
  mock.onPost("/later").reply(config => {
    expect(config.headers?.["X-CSRF-Token"]).toBe("valid-csrf")
    return [200, {}]
  })
  try {
    const pending = tab.api.get("/clients")
    const rejection = expect(pending).rejects.toMatchObject({ response: { status: 500 } })
    await vi.waitFor(() => expect(locks.request).toHaveBeenCalledTimes(2))
    releaseOtherTab()
    await rejection
    expect(signedOut).not.toHaveBeenCalled()
    expect(mock.history.post).toHaveLength(0)
    expect(mock.history.get.filter(({ url }) => url === "/auth/me")).toHaveLength(1)
    await tab.api.post("/later")
  } finally {
    releaseOtherTab()
    mock.restore()
  }
})

it("coordinates independent tabs and reuses the access cookie rotated by the first tab", async () => {
  const locks = createWebLocksMock()
  vi.stubGlobal("navigator", { locks: { request: locks.request } })
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
    expect(mocks[0].history.get.filter(({ url }) => url === "/auth/me")).toHaveLength(0)
    expect(mocks[1].history.get.filter(({ url }) => url === "/auth/me")).toHaveLength(1)
    expect(locks.request.mock.calls.every(([name]) => name === "safemove-auth-refresh")).toBe(true)
    expect(signedOut).not.toHaveBeenCalled()
    await secondTab.api.post("/later")
  } finally { mocks.forEach(mock => mock.restore()) }
})

it("avoids duplicate /auth/me calls and reuses the user payload returned by /auth/refresh in an uncontended tab", async () => {
  const locks = createWebLocksMock()
  vi.stubGlobal("navigator", { locks: { request: locks.request } })
  vi.resetModules()
  const tab = await import("./api")
  const mock = new AxiosMockAdapter(tab.api)
  const sessionPayload = {
    user: { sub: "pro-1", role: "NUTRITIONIST", name: "Ana" },
    csrfToken: "rotated-csrf",
  }
  mock.onGet("/auth/me").reply(401)
  mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
  mock.onPost("/auth/refresh").reply(200, sessionPayload)

  try {
    const response = await tab.api.get("/auth/me")
    expect(response.status).toBe(200)
    expect(response.data).toEqual(sessionPayload)
    expect(mock.history.get.filter(({ url }) => url === "/auth/me")).toHaveLength(1)
    expect(mock.history.get.filter(({ url }) => url === "/auth/csrf")).toHaveLength(1)
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(1)
    expect(locks.request).toHaveBeenCalledOnce()
  } finally {
    mock.restore()
  }
})
