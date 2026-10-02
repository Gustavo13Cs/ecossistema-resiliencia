import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  api,
  setCsrfToken,
  setUnauthorizedHandler,
} from "./api"

describe("API session interceptors", () => {
  let mock: AxiosMockAdapter

  beforeEach(() => {
    mock = new AxiosMockAdapter(api)
    setCsrfToken(null)
    setUnauthorizedHandler(null)
  })

  afterEach(() => {
    mock.restore()
    setCsrfToken(null)
    setUnauthorizedHandler(null)
  })

  it("adds the in-memory CSRF token to unsafe methods", async () => {
    setCsrfToken("csrf-memory")
    mock.onPost("/clients").reply((config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("csrf-memory")
      return [201, { id: "c1" }]
    })

    await api.post("/clients", { name: "Ana" })
  })

  it("does not add the CSRF token to safe methods", async () => {
    setCsrfToken("csrf-memory")
    mock.onGet("/clients").reply((config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBeUndefined()
      return [200, []]
    })

    await api.get("/clients")
  })

  it("calls the centralized handler once when refresh definitively denies the session with 401", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(401)

    await expect(api.get("/clients")).rejects.toBeDefined()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("preserves the session and CSRF after refresh returns 500, then recovers on a later request", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setCsrfToken("old-csrf")
    mock.onGet("/clients").replyOnce(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").replyOnce(500)
    mock.onPost("/later").reply(config => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("bootstrap-csrf")
      return [200, {}]
    })

    await expect(api.get("/clients")).rejects.toMatchObject({ response: { status: 500 } })
    expect(handler).not.toHaveBeenCalled()
    expect(mock.history.get.filter(({ url }) => url === "/clients")).toHaveLength(1)
    await api.post("/later")

    mock.onGet("/clients").replyOnce(401)
    mock.onGet("/clients").reply(200, [])
    mock.onPost("/auth/refresh").reply(200, { csrfToken: "recovered-csrf" })
    await expect(api.get("/clients")).resolves.toMatchObject({ status: 200 })
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(2)
    expect(handler).not.toHaveBeenCalled()
  })

  it("does not sign out when the CSRF bootstrap is temporarily unavailable", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setCsrfToken("valid-csrf")
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(500)
    mock.onPost("/later").reply(config => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("valid-csrf")
      return [200, {}]
    })
    await expect(api.get("/clients")).rejects.toMatchObject({ response: { status: 500 } })
    expect(handler).not.toHaveBeenCalled()
    expect(mock.history.post).toHaveLength(0)
    await api.post("/later")
  })

  it("preserves the session on a network failure during refresh", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").networkError()
    await expect(api.get("/clients")).rejects.toMatchObject({ message: "Network Error" })
    expect(handler).not.toHaveBeenCalled()
  })

  it.each(["/auth/me", "/auth/login", "/auth/logout"])(
    "does not call the centralized handler for a 401 from %s",
    async (path) => {
      const handler = vi.fn()
      setUnauthorizedHandler(handler)
      mock.onAny(path).reply(401)

      await expect(api.get(path)).rejects.toBeDefined()

      expect(handler).not.toHaveBeenCalled()
    },
  )

  it("refreshes a stale CSRF token and retries the unsafe request once", async () => {
    setCsrfToken("stale-csrf")
    let clientAttempts = 0

    mock.onPost("/clients").reply((config) => {
      clientAttempts += 1
      if (clientAttempts === 1) {
        expect(config.headers?.["X-CSRF-Token"]).toBe("stale-csrf")
        return [403, { message: "Token CSRF inválido." }]
      }

      expect(config.headers?.["X-CSRF-Token"]).toBe("fresh-csrf")
      return [201, { id: "c1" }]
    })
    mock.onGet("/auth/csrf").reply(200, {
      user: { sub: "pro-1", role: "NUTRITIONIST" },
      csrfToken: "fresh-csrf",
    })

    await expect(api.post("/clients", { name: "Ana" })).resolves.toMatchObject({
      status: 201,
    })
    expect(clientAttempts).toBe(2)
    expect(mock.history.get.filter(({ url }) => url === "/auth/csrf")).toHaveLength(1)
  })

  it("does not retry an authorization 403 that is unrelated to CSRF", async () => {
    mock.onPost("/clients").reply(403, { message: "Acesso negado" })

    await expect(api.post("/clients", { name: "Ana" })).rejects.toBeDefined()

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.get).toHaveLength(0)
  })

  it("coalesces concurrent 401 recovery, then retries each request once", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    let refreshComplete = false
    mock.onGet("/clients").reply(() => refreshComplete ? [200, []] : [401, {}])
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(async (config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("bootstrap-csrf")
      await Promise.resolve()
      refreshComplete = true
      return [200, { csrfToken: "rotated-csrf" }]
    })
    const results = await Promise.all([api.get("/clients"), api.get("/clients")])
    expect(results.every(({ status }) => status === 200)).toBe(true)
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(1)
    expect(mock.history.get.filter(({ url }) => url === "/clients")).toHaveLength(4)
    expect(handler).not.toHaveBeenCalled()
  })

  it("stops after one refresh when the retried request still returns 401", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(200, { csrfToken: "rotated-csrf" })
    await expect(api.get("/clients")).rejects.toBeDefined()
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(1)
    expect(mock.history.get.filter(({ url }) => url === "/clients")).toHaveLength(2)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it.each(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/csrf"])("never recursively refreshes a failure from %s", async (path) => {
    mock.onAny(path).reply(401)
    await expect(api.post(path)).rejects.toBeDefined()
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(path === "/auth/refresh" ? 1 : 0)
    expect(mock.history.get).toHaveLength(0)
  })

  it("clears in-memory CSRF when refresh fails", async () => {
    setCsrfToken("old-csrf")
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(401)
    mock.onPost("/later").reply((config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBeUndefined()
      return [200, {}]
    })
    await expect(api.get("/clients")).rejects.toBeDefined()
    await api.post("/later")
  })
})
