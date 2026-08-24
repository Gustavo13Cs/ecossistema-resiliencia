import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import { AuthProvider, useAuth } from "./auth-context"

const navigation = vi.hoisted(() => ({
  pathname: "/clientes",
  push: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
  }),
}))

const professional = {
  sub: "pro-1",
  role: "NUTRITIONIST" as const,
  email: "pro@example.test",
  name: "Ana",
}

function SessionProbe() {
  const { user } = useAuth()
  return <div>{user?.sub ?? "anonymous"}</div>
}

function renderAuthProvider(queryClient: QueryClient, children: ReactNode) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  )
}

describe("AuthProvider session lifecycle", () => {
  let mock: AxiosMockAdapter
  let queryClient: QueryClient

  beforeEach(() => {
    mock = new AxiosMockAdapter(api)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    navigation.push.mockReset()
    navigation.replace.mockReset()
    setCsrfToken(null)
    setUnauthorizedHandler(null)
  })

  afterEach(() => {
    cleanup()
    mock.restore()
    queryClient.clear()
    setCsrfToken(null)
    setUnauthorizedHandler(null)
  })

  it("hydrates the wrapped session user and keeps its CSRF token in memory", async () => {
    mock.onGet("/auth/me").reply(200, {
      user: professional,
      csrfToken: "csrf-from-session",
    })
    mock.onPost("/clients").reply((config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("csrf-from-session")
      return [201, { id: "c1" }]
    })
    renderAuthProvider(queryClient, <SessionProbe />)

    expect(await screen.findByText("pro-1")).toBeInTheDocument()
    await api.post("/clients", { name: "Cliente" })
  })

  it("clears cached and in-memory session state after an unrelated 401", async () => {
    queryClient.setQueryData(["clients"], [{ id: "c1" }])
    mock.onGet("/auth/me").reply(200, {
      user: professional,
      csrfToken: "csrf-from-session",
    })
    mock.onGet("/clients").reply(401)
    mock.onPost("/records").reply((config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBeUndefined()
      return [201, {}]
    })
    renderAuthProvider(queryClient, <SessionProbe />)
    expect(await screen.findByText("pro-1")).toBeInTheDocument()

    await act(async () => {
      await expect(api.get("/clients")).rejects.toBeDefined()
    })

    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeInTheDocument()
      expect(queryClient.getQueryData(["clients"])).toBeUndefined()
      expect(navigation.replace).toHaveBeenCalledWith(
        "/auth/login?reason=session-expired",
      )
      expect(navigation.replace).toHaveBeenCalledTimes(1)
    })
    await api.post("/records", {})
  })
})
