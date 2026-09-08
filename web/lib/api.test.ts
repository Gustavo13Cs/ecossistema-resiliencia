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

  it("calls the centralized handler once for a 401 outside auth endpoints", async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    mock.onGet("/clients").reply(401)

    await expect(api.get("/clients")).rejects.toBeDefined()

    expect(handler).toHaveBeenCalledTimes(1)
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
})
