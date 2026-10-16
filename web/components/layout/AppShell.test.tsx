import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthUser, ProfessionalRole } from "@/types/auth"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { api } from "@/lib/api"
import { ProfessionalDashboard } from "@/components/features/dashboard/ProfessionalDashboard"
import { AsyncState } from "@/components/feedback/AsyncState"
import { AppShell } from "./AppShell"

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
  logout: vi.fn<() => Promise<void>>(),
}))

const navigation = vi.hoisted(() => ({ pathname: "/home" }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    login: vi.fn(),
    logout: authState.logout,
  }),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
}))

const ROLE_CASES = [
  {
    role: "NUTRITIONIST",
    roleLabel: "Nutricionista",
    areaLabel: "Área de Nutrição",
    clientLabel: "Clientes",
    ownLinks: ["Planos alimentares", "Alimentos"],
    foreignLinks: ["Treinos", "Reabilitação"],
  },
  {
    role: "PERSONAL",
    roleLabel: "Personal Trainer",
    areaLabel: "Área de Treinamento",
    clientLabel: "Alunos",
    ownLinks: ["Treinos"],
    foreignLinks: ["Planos alimentares", "Alimentos", "Reabilitação"],
  },
  {
    role: "PHYSIO",
    roleLabel: "Fisioterapeuta",
    areaLabel: "Área de Fisioterapia",
    clientLabel: "Pacientes",
    ownLinks: ["Reabilitação"],
    foreignLinks: ["Planos alimentares", "Alimentos", "Treinos"],
  },
] as const

const renderShell = (role: ProfessionalRole) => {
  authState.user = {
    sub: `professional-${role.toLowerCase()}`,
    role,
    name: "Ana Lima",
    email: "ana@example.test",
  }

  return render(
    <AppShell>
      <h1>Resumo do trabalho</h1>
    </AppShell>,
  )
}

describe("AppShell", () => {
  beforeEach(() => {
    authState.logout.mockReset()
    authState.logout.mockResolvedValue()
    navigation.pathname = "/home"
  })

  afterEach(() => {
    cleanup()
    authState.user = null
  })

  it.each(ROLE_CASES)(
    "renders an isolated $role workspace with named landmarks",
    ({ role, roleLabel, areaLabel, clientLabel, ownLinks, foreignLinks }) => {
      renderShell(role)

      const primaryNavigation = screen.getByRole("navigation", {
        name: "Navegação principal",
      })

      expect(screen.getByRole("complementary", { name: areaLabel })).toBeInTheDocument()
      expect(screen.getByRole("banner", { name: "Cabeçalho do workspace" })).toBeInTheDocument()
      expect(screen.getByRole("main", { name: "Conteúdo principal" })).toBeInTheDocument()
      expect(
        screen.getAllByText("Base privada · somente sua conta").length,
      ).toBeGreaterThan(0)
      expect(screen.getAllByText(roleLabel).length).toBeGreaterThan(0)
      expect(screen.getByRole("button", { name: "Abrir menu" })).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: "Buscar cliente" }),
      ).toHaveAttribute("href", "/clientes?focus=search")
      expect(
        within(primaryNavigation).getByRole("link", { name: clientLabel }),
      ).toHaveAttribute("href", "/clientes")
      expect(
        within(primaryNavigation).queryByRole("link", { name: "Histórico de acessos" }),
      ).not.toBeInTheDocument()
      expect(
        within(primaryNavigation).getByRole("link", { name: "Visão geral" }),
      ).toHaveAttribute("aria-current", "page")
      expect(
        within(primaryNavigation).getByRole("link", { name: "Agenda" }),
      ).toHaveAttribute("href", "/agenda")
      expect(
        within(primaryNavigation).getByRole("link", { name: "Avaliações" }),
      ).toHaveAttribute("href", "/avaliacoes")

      ownLinks.forEach((label) => {
        expect(within(primaryNavigation).getByRole("link", { name: label })).toBeInTheDocument()
      })
      foreignLinks.forEach((label) => {
        expect(within(primaryNavigation).queryByRole("link", { name: label })).not.toBeInTheDocument()
      })
    },
  )

  it.each(ROLE_CASES)(
    "keeps the $role mobile workspace isolated from other professions",
    async ({ role, clientLabel, ownLinks, foreignLinks }) => {
      const user = userEvent.setup()
      renderShell(role)

      await user.click(screen.getByRole("button", { name: "Abrir menu" }))

      const mobileNavigation = within(
        screen.getByRole("dialog", { name: "Menu de navegação" }),
      ).getByRole("navigation", { name: "Navegação móvel" })

      expect(
        within(mobileNavigation).getByRole("link", { name: clientLabel }),
      ).toHaveAttribute("href", "/clientes")
      expect(
        within(mobileNavigation).queryByRole("link", { name: "Histórico de acessos" }),
      ).not.toBeInTheDocument()
      expect(
        within(mobileNavigation).getByRole("link", { name: "Visão geral" }),
      ).toHaveAttribute("aria-current", "page")
      expect(
        within(mobileNavigation).getByRole("link", { name: "Agenda" }),
      ).toHaveAttribute("href", "/agenda")
      expect(
        within(mobileNavigation).getByRole("link", { name: "Avaliações" }),
      ).toHaveAttribute("href", "/avaliacoes")

      ownLinks.forEach((label) => {
        expect(within(mobileNavigation).getByRole("link", { name: label })).toBeInTheDocument()
      })
      foreignLinks.forEach((label) => {
        expect(within(mobileNavigation).queryByRole("link", { name: label })).not.toBeInTheDocument()
      })
    },
  )

  it("traps mobile focus, makes the background unreachable, and restores the trigger", async () => {
    const user = userEvent.setup()
    renderShell("PERSONAL")

    const mobileMenuButton = screen.getByRole("button", { name: "Abrir menu" })
    mobileMenuButton.focus()
    await user.keyboard("{Enter}")

    const mobileDialog = screen.getByRole("dialog", { name: "Menu de navegação" })
    const closeButton = within(mobileDialog).getByRole("button", { name: "Fechar menu" })
    const mobileLogout = within(mobileDialog).getByRole("button", { name: "Sair" })
    expect(closeButton).toHaveFocus()
    expect(screen.queryByRole("link", { name: "Buscar cliente" })).not.toBeInTheDocument()

    mobileLogout.focus()
    await user.tab()
    expect(closeButton).toHaveFocus()

    closeButton.focus()
    await user.tab({ shift: true })
    expect(mobileLogout).toHaveFocus()

    await user.keyboard("{Escape}")
    expect(mobileMenuButton).toHaveFocus()
  })

  it("uses an honest account region with keyboard close, focus restoration, and logout", async () => {
    const user = userEvent.setup()
    renderShell("PERSONAL")

    const accountButton = screen.getByRole("button", { name: "Abrir menu da conta" })
    accountButton.focus()
    await user.keyboard("{Enter}")

    const accountRegion = screen.getByRole("region", { name: "Conta" })
    const logoutButton = within(accountRegion).getByRole("button", { name: "Sair" })
    expect(logoutButton).toHaveFocus()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("region", { name: "Conta" })).not.toBeInTheDocument()
    expect(accountButton).toHaveFocus()

    await user.keyboard("{Enter}")
    const reopenedRegion = screen.getByRole("region", { name: "Conta" })
    const reopenedLogout = within(reopenedRegion).getByRole("button", { name: "Sair" })
    expect(reopenedLogout).toHaveFocus()
    await user.keyboard("{Enter}")
    expect(authState.logout).toHaveBeenCalledTimes(1)
  })
})

describe("AsyncState", () => {
  afterEach(cleanup)

  it.each([
    ["loading", "status", "Carregando clientes"],
    ["empty", "status", "Nenhum cliente"],
    ["error", "alert", "Não foi possível carregar"],
  ] as const)("announces the %s state with the right live region", (kind, role, title) => {
    const props: ComponentProps<typeof AsyncState> = {
      kind,
      title,
      description: "Descrição recuperável e objetiva.",
    }

    render(<AsyncState {...props} />)

    expect(screen.getByRole(role)).toHaveAccessibleName(title)
    expect(screen.getByText("Descrição recuperável e objetiva.")).toBeInTheDocument()
  })
})

it("keeps_personal_daily_work_inside_the_shared_shell", async () => {
  const http = new AxiosMockAdapter(api)
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  http.onGet("/workouts/workspace").reply(200, { counts: { activeStudents: 0, archivedStudents: 0, withoutActiveWorkout: 0 }, items: [] })
  http.onGet("/appointments").reply(200, [])
  authState.user = { sub: "personal", role: "PERSONAL", name: "Ana" }
  try {
    render(<QueryClientProvider client={cache}><AppShell><ProfessionalDashboard /></AppShell></QueryClientProvider>)
    const main = screen.getByRole("main", { name: "Conteúdo principal" })
    expect(within(main).getByRole("heading", { name: "Área de treinamento" })).toBeVisible()
    expect(await within(main).findByText("Sua base começa aqui")).toBeVisible()
    expect(within(main).getByRole("link", { name: "Abrir agenda" })).toHaveAttribute("href", "/agenda")
  } finally {
    cleanup()
    cache.clear()
    http.restore()
    authState.user = null
  }
})
