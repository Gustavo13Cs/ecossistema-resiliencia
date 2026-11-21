import { createElement, useState, type ReactNode } from "react"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { useLabMarkerSeries } from "./useLabMarkerSeries"
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { sub: "owner" } }),
}))
const http = new AxiosMockAdapter(api)
function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  )
  return createElement(QueryClientProvider, { client }, children)
}
beforeEach(() => http.reset())
afterEach(cleanup)
it("reads the legacy aggregate only when the point route does not exist", async () => {
  http
    .onGet("/lab-exams/longitudinal")
    .reply(404, {
      message: "Cannot GET /lab-exams/longitudinal?markerName=X_%",
    })
  http
    .onGet("/lab-exams")
    .reply(200, [
      {
        id: "exam",
        clientId: "client",
        client: { id: "client", name: "Cliente" },
        date: "2026-01-01",
        markers: [{ id: "marker", name: "X_%", value: 95, unit: "u" }],
      },
    ])
  const { result } = renderHook(() => useLabMarkerSeries("x_%", "client"), {
    wrapper: Wrapper,
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toMatchObject([
    { id: "exam", name: "X_%", value: 95, unit: "u" },
  ])
  expect(http.history.get.map((row) => row.url)).toEqual([
    "/lab-exams/longitudinal",
    "/lab-exams",
  ])
})
it("preserves an ownership error without fetching an unrelated aggregate", async () => {
  http
    .onGet("/lab-exams/longitudinal")
    .reply(404, { message: "Cliente não encontrado" })
  const { result } = renderHook(() => useLabMarkerSeries("X_%", "foreign"), {
    wrapper: Wrapper,
  })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.data).toEqual([])
  expect(http.history.get.map((row) => row.url)).toEqual([
    "/lab-exams/longitudinal",
  ])
})
