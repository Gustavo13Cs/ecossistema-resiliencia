import { createElement, type ReactNode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { useClientsPage } from "./useClients"
import { useLabMarkerSeries } from "./useLabMarkerSeries"
const session = vi.hoisted(() => ({ user: { sub: "owner-a" } }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => session }))
const http = new AxiosMockAdapter(api)
function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      })
  )
  return createElement(QueryClientProvider, { client }, children)
}
import { useState } from "react"
beforeEach(() => {
  http.reset()
  session.user = { sub: "owner-a" }
})
afterEach(cleanup)
describe("paged consumers", () => {
  it("navigates, searches globally, resets on status/account and clamps after removal", async () => {
    let total = 26
    http
      .onGet("/clients")
      .reply((config) => [
        200,
        [
          {
            id: `${session.user.sub}-${config.params.status}-${config.params.q ?? ""}-${config.params.page}`,
          },
        ],
        { "X-Pagination-Total": String(config.params.q ? 1 : total) },
      ])
    const { result, rerender } = renderHook(
      ({ status, q }: { status: "ACTIVE" | "ARCHIVED"; q: string }) =>
        useClientsPage(status, q),
      { wrapper: Wrapper, initialProps: { status: "ACTIVE", q: "" } }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => result.current.setPage(2))
    await waitFor(() =>
      expect(result.current.data?.items[0].id).toBe("owner-a-ACTIVE--2")
    )
    rerender({ status: "ACTIVE", q: "fora da primeira" })
    await waitFor(() => expect(result.current.data?.pagination.total).toBe(1))
    expect(result.current.page).toBe(1)
    rerender({ status: "ARCHIVED", q: "" })
    await waitFor(() =>
      expect(result.current.data?.items[0].id).toBe("owner-a-ARCHIVED--1")
    )
    act(() => result.current.setPage(2))
    await waitFor(() =>
      expect(result.current.data?.items[0].id).toBe("owner-a-ARCHIVED--2")
    )
    session.user = { sub: "owner-b" }
    rerender({ status: "ACTIVE", q: "" })
    expect(result.current.data).toBeUndefined()
    await waitFor(() =>
      expect(result.current.data?.items[0].id).toBe("owner-b-ACTIVE--1")
    )
    act(() => result.current.setPage(2))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    total = 25
    await act(async () => {
      await result.current.refetch()
    })
    await waitFor(() => expect(result.current.page).toBe(1))
  })
  it("fetches all lightweight graph points only when the chart consumer mounts", async () => {
    http
      .onGet("/lab-exams/longitudinal")
      .reply((config) => [
        200,
        Array.from(
          { length: config.params.page === 1 ? 100 : 1 },
          (_, index) => ({
            id: `${config.params.page}-${index}`,
            clientId: "c",
            clientName: "Cliente",
            date: "2026-01-01",
            name: "Glicemia de Jejum",
            value: 95,
            unit: "mg/dL",
          })
        ),
        { "X-Pagination-Total": "101" },
      ])
    const { result } = renderHook(
      () => useLabMarkerSeries("Glicemia de Jejum"),
      { wrapper: Wrapper }
    )
    await waitFor(() => expect(result.current.data).toHaveLength(101))
    expect(result.current.data[100].status).toBe("BORDERLINE")
    expect(http.history.get.map((config) => config.params.page)).toEqual([1, 2])
    expect(
      http.history.get.every((config) => config.params.pageSize === 100)
    ).toBe(true)
  })
})
