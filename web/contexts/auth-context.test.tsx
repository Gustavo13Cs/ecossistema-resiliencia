import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import LandingPage from "@/app/page"
import LoginPage from "@/app/auth/login/page"
import RegisterPage from "@/app/auth/register/page"
import { LayoutWrapper } from "@/components/LayoutWrapper"
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
  const { login, user } = useAuth()
  return (
    <>
      <div>{user?.sub ?? "anonymous"}</div>
      <button type="button" onClick={() => void login()}>
        Reestabelecer sessão
      </button>
    </>
  )
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
    navigation.pathname = "/clientes"
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

  it("announces a named loading state while the secure session hydrates", async () => {
    let resolveSession!: (response: [number, {
      user: typeof professional
      csrfToken: string
    }]) => void

    mock.onGet("/auth/me").reply(() => new Promise((resolve) => {
      resolveSession = resolve
    }))
    renderAuthProvider(queryClient, <SessionProbe />)

    const loadingState = screen.getByRole("status", {
      name: "Carregando sua área profissional",
    })
    expect(loadingState).toHaveAttribute("aria-busy", "true")
    expect(loadingState).toHaveTextContent("Verificando sua sessão segura.")

    await waitFor(() => {
      expect(resolveSession).toBeTypeOf("function")
    })
    await act(async () => {
      resolveSession([200, {
        user: professional,
        csrfToken: "csrf-from-session",
      }])
    })
    expect(await screen.findByText("pro-1")).toBeInTheDocument()
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

  it("recovers an expired access token during hydration before clearing cached data", async () => {
    queryClient.setQueryData(["clients"], [{ id: "c1" }])
    mock.onGet("/auth/me").replyOnce(401).onGet("/auth/me").reply(200, { user: professional, csrfToken: "recovered-csrf" })
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(200, { csrfToken: "recovered-csrf" })
    renderAuthProvider(queryClient, <SessionProbe />)
    expect(await screen.findByText("pro-1")).toBeInTheDocument()
    expect(queryClient.getQueryData(["clients"])).toEqual([{ id: "c1" }])
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(1)
    expect(mock.history.get.map(({ url }) => url)).toEqual(["/auth/me", "/auth/csrf", "/auth/me"])
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it("clears cached and in-memory session state after a definitively rejected refresh", async () => {
    queryClient.setQueryData(["clients"], [{ id: "c1" }])
    mock.onGet("/auth/me").reply(200, {
      user: professional,
      csrfToken: "csrf-from-session",
    })
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(401)
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

  it("coalesces concurrent 401 teardown until a valid session is established", async () => {
    mock.onGet("/auth/me").reply(200, {
      user: professional,
      csrfToken: "csrf-from-session",
    })
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(401)
    renderAuthProvider(queryClient, <SessionProbe />)
    expect(await screen.findByText("pro-1")).toBeInTheDocument()

    await act(async () => {
      await Promise.allSettled([api.get("/clients"), api.get("/clients")])
    })

    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeInTheDocument()
      expect(navigation.replace).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Reestabelecer sessão" }),
    )
    expect(await screen.findByText("pro-1")).toBeInTheDocument()

    await act(async () => {
      await expect(api.get("/clients")).rejects.toBeDefined()
    })

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledTimes(2)
    })
  })

  it("preserves the active user and clinical cache when refresh returns 500", async () => {
    const key = ["lab-exams", professional.sub, "synthetic-client"]
    const exams = [{ id: "synthetic-exam" }]
    queryClient.setQueryData(key, exams)
    mock.onGet("/auth/me").reply(200, { user: professional, csrfToken: "csrf-from-session" })
    mock.onGet("/clients").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(500)
    renderAuthProvider(queryClient, <SessionProbe />)
    expect(await screen.findByText("pro-1")).toBeInTheDocument()

    await act(async () => {
      await expect(api.get("/clients")).rejects.toMatchObject({ response: { status: 500 } })
    })

    expect(screen.getByText("pro-1")).toBeInTheDocument()
    expect(queryClient.getQueryData(key)).toEqual(exams)
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(mock.history.post.filter(({ url }) => url === "/auth/refresh")).toHaveLength(1)
  })

  it.each([
    ["/", <LandingPage key="home" />, "Seu trabalho clínico, em uma base privada"],
    ["/auth/login", <LoginPage key="login" />, "Entrar no SafeMove"],
    ["/auth/register", <RegisterPage key="register" />, "Criar conta profissional"],
  ] as const)(
    "renders public route %s directly in initial SSR HTML without the auth loading barrier",
    (route, pageElement, expectedHeading) => {
      navigation.pathname = route

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LayoutWrapper>{pageElement}</LayoutWrapper>
          </AuthProvider>
        </QueryClientProvider>,
      )

      expect(html).toContain(expectedHeading)
      expect(html).not.toContain("Carregando sua área profissional")
      expect(html).not.toContain("Verificando sua sessão segura.")
    },
  )

  it.each(["/clientes", "/home"] as const)(
    "keeps protected route %s behind the loading barrier in initial SSR HTML",
    (route) => {
      navigation.pathname = route

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LayoutWrapper>
              <div>Conteúdo clínico privado</div>
            </LayoutWrapper>
          </AuthProvider>
        </QueryClientProvider>,
      )

      expect(html).toContain("Carregando sua área profissional")
      expect(html).toContain("Verificando sua sessão segura.")
      expect(html).not.toContain("Conteúdo clínico privado")
      expect(html).not.toContain("Navegação principal")
    },
  )

  it.each(["/", "/auth/login"] as const)(
    "renders public route %s immediately while session check is pending and stays rendered on 401",
    async (route) => {
      let resolveSession!: (response: [number, Record<string, never>]) => void
      navigation.pathname = route
      mock.onGet("/auth/me").reply(
        () =>
          new Promise((resolve) => {
            resolveSession = resolve
          }),
      )
      mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
      mock.onPost("/auth/refresh").reply(401)

      renderAuthProvider(
        queryClient,
        <LayoutWrapper>
          <div>Conteúdo público inicial</div>
        </LayoutWrapper>,
      )

      expect(screen.getByText("Conteúdo público inicial")).toBeInTheDocument()
      expect(
        screen.queryByRole("status", { name: "Carregando sua área profissional" }),
      ).not.toBeInTheDocument()

      await waitFor(() => {
        expect(resolveSession).toBeTypeOf("function")
      })
      await act(async () => {
        resolveSession([401, {}])
      })

      expect(screen.getByText("Conteúdo público inicial")).toBeInTheDocument()
      expect(navigation.push).not.toHaveBeenCalled()
      expect(navigation.replace).not.toHaveBeenCalled()
    },
  )

  it("ignores stale mount 401 from /auth/me when login completes before initial check settles", async () => {
    let rejectMountSession!: (response: [number, Record<string, never>]) => void
    let callCount = 0
    navigation.pathname = "/auth/login"
    queryClient.setQueryData(["private-key"], { preserved: true })

    mock.onGet("/auth/me").reply(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise((resolve) => {
          rejectMountSession = resolve
        })
      }
      return [200, { user: professional, csrfToken: "csrf-from-login" }]
    })
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(401)
    mock.onPost("/records").reply((config) => {
      expect(config.headers?.["X-CSRF-Token"]).toBe("csrf-from-login")
      return [201, {}]
    })

    renderAuthProvider(queryClient, <SessionProbe />)
    expect(screen.getByText("anonymous")).toBeInTheDocument()

    await waitFor(() => {
      expect(rejectMountSession).toBeTypeOf("function")
    })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reestabelecer sessão" }))
    })
    expect(await screen.findByText("pro-1")).toBeInTheDocument()
    expect(navigation.push).toHaveBeenCalledWith("/home")

    await act(async () => {
      rejectMountSession([401, {}])
    })

    expect(screen.getByText("pro-1")).toBeInTheDocument()
    expect(queryClient.getQueryData(["private-key"])).toEqual({ preserved: true })
    await api.post("/records", {})
  })

  it("redirects an authenticated professional from landing route / to /home", async () => {
    navigation.pathname = "/"
    mock.onGet("/auth/me").reply(200, {
      user: professional,
      csrfToken: "csrf-from-session",
    })

    renderAuthProvider(queryClient, <div>Landing pública</div>)

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith("/home")
    })
  })

  it("never renders protected children for unauthenticated visitors and redirects to login", async () => {
    navigation.pathname = "/clientes"
    mock.onGet("/auth/me").reply(401)
    mock.onGet("/auth/csrf").reply(200, { csrfToken: "bootstrap-csrf" })
    mock.onPost("/auth/refresh").reply(401)

    renderAuthProvider(
      queryClient,
      <LayoutWrapper>
        <div>Conteúdo clínico protegido</div>
      </LayoutWrapper>,
    )

    expect(screen.queryByText("Conteúdo clínico protegido")).not.toBeInTheDocument()
    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/auth/login")
    })
    expect(screen.queryByText("Conteúdo clínico protegido")).not.toBeInTheDocument()
  })

  it.each(["/clientes", "/"] as const)(
    "blocks and logs out sessions carrying an unrecognized role on %s",
    async (route) => {
      let resolveLogout!: (response: [number, Record<string, never>]) => void
      navigation.pathname = route
      queryClient.setQueryData(["stale-key"], { leaked: true })
      mock.onGet("/auth/me").reply(200, {
        user: {
          sub: "unknown-1",
          role: "UNKNOWN" as typeof professional.role,
          email: "unknown@example.test",
          name: "Desconhecido",
        },
        csrfToken: "csrf-unknown",
      })
      mock.onPost("/auth/logout").reply(
        () =>
          new Promise((resolve) => {
            resolveLogout = resolve
          }),
      )
      mock.onPost("/audit").reply((config) => {
        expect(config.headers?.["X-CSRF-Token"]).toBeUndefined()
        return [201, {}]
      })

      renderAuthProvider(
        queryClient,
        <LayoutWrapper>
          <div>Conteúdo protegido</div>
        </LayoutWrapper>,
      )

      await waitFor(() => {
        expect(resolveLogout).toBeTypeOf("function")
      })
      expect(
        screen.getByRole("status", { name: "Carregando sua área profissional" }),
      ).toBeInTheDocument()
      expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()

      await act(async () => {
        resolveLogout([200, {}])
      })

      await waitFor(() => {
        expect(mock.history.post.some(({ url }) => url === "/auth/logout")).toBe(true)
        expect(navigation.replace).toHaveBeenCalledWith("/auth/login")
      })
      if (route === "/clientes") {
        expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()
      }
      expect(queryClient.getQueryData(["stale-key"])).toBeUndefined()
      await api.post("/audit", {})
    },
  )
})
