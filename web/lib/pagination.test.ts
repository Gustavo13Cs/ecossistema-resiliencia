import { describe, expect, it, afterEach, vi } from "vitest"
import AxiosMockAdapter from "axios-mock-adapter"
import { api } from "./api"
import { collectPages, getArrayPage } from "./pagination"
const http = new AxiosMockAdapter(api)
afterEach(() => http.reset())
describe("bounded list transport", () => {
  it("collects all bounded batches including rows after 1000", async () => {
    http.onGet("/rows").reply((config) => {
      const page = Number(config.params.page),
        size = Number(config.params.pageSize)
      return [
        200,
        Array.from(
          { length: Math.min(size, 1005 - (page - 1) * size) },
          (_, i) => ({ id: (page - 1) * size + i })
        ),
        { "X-Pagination-Total": "1005" },
      ]
    })
    const result = await collectPages((page) =>
      getArrayPage<{ id: number }>("/rows", { page, pageSize: 100 })
    )
    expect(result).toHaveLength(1005)
    expect(new Set(result.map((row) => row.id)).size).toBe(1005)
    expect(http.history.get).toHaveLength(11)
  })
  it("fails instead of returning a partial collection", async () => {
    http
      .onGet("/rows")
      .reply((config) =>
        config.params.page === 2
          ? [500]
          : [200, [1, 2], { "X-Pagination-Total": "3" }]
      )
    await expect(
      collectPages((page) =>
        getArrayPage<number>("/rows", { page, pageSize: 2 })
      )
    ).rejects.toThrow()
  })
  it("slices a legacy array and retries only unsupported pagination validation", async () => {
    http
      .onGet("/clients")
      .reply((config) =>
        config.params.page
          ? [
              400,
              {
                message: [
                  "property page should not exist",
                  "property pageSize should not exist",
                ],
              },
            ]
          : [200, [1, 2, 3]]
      )
    const result = await getArrayPage<number>(
      "/clients",
      { page: 2, pageSize: 2 },
      { status: "ACTIVE" }
    )
    expect(result.items).toEqual([3])
    expect(result.pagination.total).toBe(3)
    expect(http.history.get).toHaveLength(2)
    http.reset()
    http.onGet("/clients").reply(403)
    await expect(
      getArrayPage("/clients", { page: 1, pageSize: 25 })
    ).rejects.toThrow()
    expect(http.history.get).toHaveLength(1)
  })
})

it("resumes the same batch after Retry-After and can cancel backoff", async () => {
  vi.useFakeTimers()
  try {
    let second = 0
    http
      .onGet("/rows")
      .reply((config) =>
        config.params.page === 1
          ? [200, [1], { "X-Pagination-Total": "2" }]
          : ++second === 1
            ? [429, {}, { "Retry-After": "1" }]
            : [200, [2], { "X-Pagination-Total": "2" }]
      )
    const pending = collectPages((page) =>
      getArrayPage<number>("/rows", { page, pageSize: 1 })
    )
    await vi.advanceTimersByTimeAsync(1000)
    await expect(pending).resolves.toEqual([1, 2])
    expect(http.history.get.map((row) => row.params.page)).toEqual([1, 2, 2])
    http.reset()
    http.onGet("/rows").reply(429, {}, { "Retry-After": "60" })
    const controller = new AbortController()
    const cancelled = getArrayPage(
      "/rows",
      { page: 1, pageSize: 100 },
      {},
      controller.signal
    )
    const rejection = expect(cancelled).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(1)
    controller.abort()
    await rejection
    expect(http.history.get).toHaveLength(1)
  } finally {
    vi.useRealTimers()
  }
})
