import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthUser, ProfessionalRole } from "@/types/auth"
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
}))

const ROLE_CASES = [
  {
    role: "NUTRITIONIST",
    roleLabel: "Nutricionista",
    areaLabel: "Área de Nutrição",
    ownLinks: ["Planos alimentares", "Alimentos"],
    foreignLinks: ["Planilhas", "Reabilitação"],
  },
  {
    role: "PERSONAL",
    roleLabel: "Personal Trainer",
    areaLabel: "Área de Treinamento",
    ownLinks: ["Planilhas"],
    foreignLinks: ["Planos alimentares", "Alimentos", "Reabilitação"],
  },
  {
    role: "PHYSIO",
    roleLabel: "Fisioterapeuta",
    areaLabel: "Área de Fisioterapia",
    ownLinks: ["Reabilitação"],
    foreignLinks: ["Planos alimentares", "Alimentos", "Planilhas"],
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
    ({ role, roleLabel, areaLabel, ownLinks, foreignLinks }) => {
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

      ownLinks.forEach((label) => {
        expect(within(primaryNavigation).getByRole("link", { name: label })).toBeInTheDocument()
      })
      foreignLinks.forEach((label) => {
        expect(within(primaryNavigation).queryByRole("link", { name: label })).not.toBeInTheDocument()
      })
    },
  )

  it("keeps the mobile menu and account logout operable in keyboard order", async () => {
    const user = userEvent.setup()
    renderShell("PERSONAL")

    const mobileMenuButton = screen.getByRole("button", { name: "Abrir menu" })
    mobileMenuButton.focus()
    await user.keyboard("{Enter}")

    const mobileDialog = screen.getByRole("dialog", { name: "Menu de navegação" })
    const closeButton = within(mobileDialog).getByRole("button", { name: "Fechar menu" })
    expect(closeButton).toHaveFocus()

    await user.tab()
    expect(within(mobileDialog).getByRole("link", { name: "Início" })).toHaveFocus()

    await user.keyboard("{Escape}")
    expect(mobileMenuButton).toHaveFocus()

    const accountButton = screen.getByRole("button", { name: "Abrir menu da conta" })
    accountButton.focus()
    await user.keyboard("{Enter}")

    const accountMenu = screen.getByRole("menu", { name: "Conta" })
    const logoutButton = within(accountMenu).getByRole("menuitem", { name: "Sair" })
    expect(logoutButton).toHaveFocus()

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
