import { createElement, useState, type ReactNode } from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import type { AuthUser } from "@/types/auth"
import { api } from "@/lib/api"
import Page from "./page"
const session = vi.hoisted(() => ({
  user: {
    sub: "owner-a",
    role: "NUTRITIONIST",
    name: "Profissional",
  } as AuthUser,
}))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => session }))
vi.mock("@/hooks/features/useClients", () => ({
  useClients: () => ({
    data: [{ id: session.user.sub + "-client", name: "Cliente" }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock("next/dynamic", () => ({ default: () => () => null }))
const http = new AxiosMockAdapter(api, { delayResponse: 60 })
function Wrapper({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  )
  return createElement(QueryClientProvider, { client }, children)
}
beforeEach(() => {
  session.user = { sub: "owner-a", role: "NUTRITIONIST", name: "Profissional" }
  http.reset()
  http
    .onGet("/lab-exams")
    .reply((config) =>
      config.params.clientId &&
      config.params.clientId !== session.user.sub + "-client"
        ? [404]
        : [200, []]
    )
  http.onGet("/lab-orders").reply(200, [])
})
afterEach(cleanup)
it("keeps search mounted and focused across delayed global queries and errors", async () => {
  render(<Page />, { wrapper: Wrapper })
  const user = userEvent.setup({ delay: 20 })
  const input = await screen.findByPlaceholderText(
    "Buscar por paciente, laboratório ou marcador..."
  )
  await user.type(input, "glicemia")
  expect(input).toHaveValue("glicemia")
  expect(input).toHaveFocus()
  await waitFor(() =>
    expect(http.history.get.at(-1)?.params.q).toBe("glicemia")
  )
  http.onGet("/lab-exams").reply(500)
  await user.type(input, "x")
  await screen.findByText("Não foi possível carregar os exames")
  expect(input).toHaveFocus()
  expect(input).toHaveValue("glicemiax")
})
it("resets the selected private client when the account changes", async () => {
  const { rerender } = render(<Page />, { wrapper: Wrapper })
  const user = userEvent.setup({ delay: 20 })
  await screen.findByPlaceholderText(
    "Buscar por paciente, laboratório ou marcador..."
  )
  await user.selectOptions(screen.getAllByRole("combobox")[0], "owner-a-client")
  await waitFor(() =>
    expect(
      http.history.get.some((row) => row.params.clientId === "owner-a-client")
    ).toBe(true)
  )
  const before = http.history.get.length
  session.user = { ...session.user, sub: "owner-b" }
  rerender(<Page />)
  await waitFor(() =>
    expect(
      http.history.get.slice(before).some((row) => row.url === "/lab-exams")
    ).toBe(true)
  )
  expect(
    http.history.get
      .slice(before)
      .filter((row) => row.url === "/lab-exams")
      .every((row) => !row.params.clientId)
  ).toBe(true)
  expect(screen.getAllByRole("combobox")[0]).toHaveValue("ALL")
})
