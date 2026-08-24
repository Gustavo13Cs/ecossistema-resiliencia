import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import { LayoutWrapper } from "@/components/LayoutWrapper"
import { AuthProvider } from "@/contexts/auth-context"
import { ProfessionalRouteBoundary } from "./ProfessionalRouteBoundary"

const navigation = vi.hoisted(() => ({
  pathname: "/home",
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

const users = {
  personal: {
    sub: "personal-1",
    role: "PERSONAL",
    email: "personal@example.test",
    name: "Rui",
  },
  physio: {
    sub: "physio-1",
    role: "PHYSIO",
    email: "physio@example.test",
    name: "Ana",
  },
  admin: {
    sub: "admin-1",
    role: "ADMIN",
    email: "admin@example.test",
    name: "Admin",
  },
} as const satisfies Record<string, AuthUser>

describe("ProfessionalRouteBoundary", () => {
  let mock: AxiosMockAdapter
  let queryClient: QueryClient

  const renderWithProvider = (children: ReactNode) => render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  )

  const respondWithSession = (user: AuthUser) => {
    mock.onGet("/auth/me").reply(200, {
      user,
      csrfToken: "csrf-session",
    })
  }

  beforeEach(() => {
    mock = new AxiosMockAdapter(api)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    navigation.pathname = "/home"
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

  it("redirects an incompatible direct professional route before rendering it", async () => {
    navigation.pathname = "/clientes/c1/nova-dieta"
    respondWithSession(users.personal)

    renderWithProvider(
      <ProfessionalRouteBoundary>
        <div>Editor de dieta protegido</div>
      </ProfessionalRouteBoundary>,
    )

    expect(screen.queryByText("Editor de dieta protegido")).not.toBeInTheDocument()
    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/home?access=denied")
    })
    expect(screen.queryByText("Editor de dieta protegido")).not.toBeInTheDocument()
  })

  it("renders a direct route only after a compatible session is hydrated", async () => {
    navigation.pathname = "/clientes/c1/nova-reabilitacao"
    respondWithSession(users.physio)

    renderWithProvider(
      <ProfessionalRouteBoundary>
        <div>Editor de reabilitação autorizado</div>
      </ProfessionalRouteBoundary>,
    )

    expect(screen.queryByText("Editor de reabilitação autorizado")).not.toBeInTheDocument()
    expect(await screen.findByText("Editor de reabilitação autorizado")).toBeInTheDocument()
    expect(navigation.replace).not.toHaveBeenCalledWith("/home?access=denied")
  })

  it("redirects an authenticated professional from login to the private home", async () => {
    navigation.pathname = "/auth/login"
    respondWithSession(users.personal)

    renderWithProvider(<div>Sessão profissional</div>)

    expect(await screen.findByText("Sessão profissional")).toBeInTheDocument()
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith("/home")
    })
  })

  it("keeps public routes outside the app shell", async () => {
    navigation.pathname = "/auth/login"
    mock.onGet("/auth/me").reply(401)

    renderWithProvider(
      <LayoutWrapper>
        <div>Página pública</div>
      </LayoutWrapper>,
    )

    expect(await screen.findByText("Página pública")).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).not.toBeInTheDocument()
  })

  it("wraps a professional route in the shell and keeps ADMIN home isolated", async () => {
    respondWithSession(users.personal)

    const professionalRender = renderWithProvider(
      <LayoutWrapper>
        <div>Home profissional</div>
      </LayoutWrapper>,
    )

    expect(await screen.findByText("Home profissional")).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument()

    professionalRender.unmount()
    mock.resetHandlers()
    respondWithSession(users.admin)

    renderWithProvider(
      <LayoutWrapper>
        <div>Home administrativa</div>
      </LayoutWrapper>,
    )

    expect(await screen.findByText("Home administrativa")).toBeInTheDocument()
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).not.toBeInTheDocument()
  })
})
