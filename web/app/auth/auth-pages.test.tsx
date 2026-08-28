import AxiosMockAdapter from "axios-mock-adapter"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import LandingPage from "@/app/page"
import LoginPage from "@/app/auth/login/page"
import RegisterPage from "@/app/auth/register/page"
import { api } from "@/lib/api"

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
}))

const auth = vi.hoisted(() => ({
  login: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ login: auth.login }),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe("public professional journey", () => {
  let mockApi: AxiosMockAdapter

  beforeEach(() => {
    mockApi = new AxiosMockAdapter(api)
    navigation.push.mockReset()
    auth.login.mockReset()
  })

  afterEach(() => {
    cleanup()
    mockApi.restore()
  })

  it("presents SafeMove to professionals without corporate claims", () => {
    render(<LandingPage />)

    expect(
      screen.getByRole("heading", {
        name: /seu trabalho clínico, em uma base privada/i,
      }),
    ).toBeVisible()
    expect(screen.getByText("Nutricionista")).toBeVisible()
    expect(screen.getByText("Personal Trainer")).toBeVisible()
    expect(screen.getByText("Fisioterapeuta")).toBeVisible()
    expect(
      screen.queryByText(
        /recursos humanos|saúde corporativa|colaboradores|equipe/i,
      ),
    ).not.toBeInTheDocument()
  })

  it("distinguishes invalid credentials from an unavailable service", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/login").replyOnce(401)
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/e-mail/i), "pro@example.test")
    await user.type(screen.getByLabelText("Senha"), "Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: /entrar/i }))

    expect(
      await screen.findByRole("alert", { name: "E-mail ou senha inválidos." }),
    ).toBeVisible()

    mockApi.resetHandlers()
    mockApi.onPost("/auth/login").networkErrorOnce()
    await user.click(screen.getByRole("button", { name: /entrar/i }))

    expect(
      await screen.findByRole("alert", {
        name: "Não foi possível acessar o SafeMove agora. Tente novamente.",
      }),
    ).toBeVisible()
  })

  it("names both authentication entry points for professionals", () => {
    const { unmount } = render(<LoginPage />)
    expect(
      screen.queryByRole("heading", { name: "Entrar no SafeMove" }),
    ).toBeVisible()

    unmount()
    render(<RegisterPage />)
    expect(
      screen.queryByRole("heading", { name: "Criar conta profissional" }),
    ).toBeVisible()
  })

  it.each([
    [429, "Muitas tentativas. Aguarde um momento e tente novamente."],
    [503, "O SafeMove está indisponível no momento. Tente novamente."],
  ])("maps status %s to a recoverable page error", async (status, message) => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/login").reply(status)
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/e-mail/i), "pro@example.test")
    await user.type(screen.getByLabelText("Senha"), "Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: /entrar/i }))

    expect(await screen.findByRole("alert", { name: message })).toBeVisible()
  })

  it("keeps a malformed login e-mail beside the field and off the network", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/login").reply(200)
    render(<LoginPage />)

    const email = screen.getByLabelText("E-mail")
    await user.click(email)
    await user.paste("abc")
    await user.click(screen.getByLabelText("Senha"))
    await user.paste("Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    const error = screen.getByText("Informe um e-mail válido.")
    expect(error).toBeVisible()
    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(email.getAttribute("aria-describedby")).toContain(error.id)
    expect(mockApi.history.post).toHaveLength(0)
  })

  it("keeps a malformed registration e-mail beside the field and off the network", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/register").reply(201)
    render(<RegisterPage />)

    const email = screen.getByLabelText("E-mail")
    await user.click(screen.getByLabelText("Nome completo"))
    await user.paste("Ana Souza")
    await user.click(email)
    await user.paste("abc")
    await user.click(screen.getByLabelText("Senha"))
    await user.paste("Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    const error = screen.getByText("Informe um e-mail válido.")
    expect(error).toBeVisible()
    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(email.getAttribute("aria-describedby")).toContain(error.id)
    expect(mockApi.history.post).toHaveLength(0)
  })

  it("clears only the implicated login errors when their values change", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/login").reply(401)
    render(<LoginPage />)

    await user.click(screen.getByRole("button", { name: "Entrar" }))
    const emailError = screen.getByText("Informe seu e-mail.")
    const passwordError = screen.getByText("Informe sua senha.")

    await user.type(screen.getByLabelText("E-mail"), "pro@example.test")
    expect(emailError).not.toBeInTheDocument()
    expect(passwordError).toBeVisible()

    await user.type(screen.getByLabelText("Senha"), "Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: "Entrar" }))
    expect(
      await screen.findByRole("alert", { name: "E-mail ou senha inválidos." }),
    ).toBeVisible()

    await user.type(screen.getByLabelText("Senha"), "x")
    expect(
      screen.queryByRole("alert", { name: "E-mail ou senha inválidos." }),
    ).not.toBeInTheDocument()
  })

  it("clears a stale registration error when the implicated e-mail changes", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/register").reply(409, {
      message: "detail that must not be forwarded",
    })
    render(<RegisterPage />)

    await user.click(screen.getByLabelText("Nome completo"))
    await user.paste("Ana Souza")
    await user.click(screen.getByLabelText("E-mail"))
    await user.paste("ana@example.test")
    await user.click(screen.getByLabelText("Senha"))
    await user.paste("Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(
      await screen.findByRole("alert", {
        name: "Este e-mail já está cadastrado. Entre ou use outro e-mail.",
      }),
    ).toBeVisible()
    expect(screen.queryByText("detail that must not be forwarded")).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("E-mail"), "x")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("performs one credential POST and one session hydration on successful login", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/login").reply(200)
    auth.login.mockResolvedValue(undefined)
    render(<LoginPage />)

    await user.click(screen.getByLabelText("E-mail"))
    await user.paste("pro@example.test")
    await user.click(screen.getByLabelText("Senha"))
    await user.paste("Senha-forte-2026")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    await waitFor(() => expect(auth.login).toHaveBeenCalledTimes(1))
    expect(mockApi.history.post).toHaveLength(1)
  })

  it("offers exactly one professional role before contact fields and submits it", async () => {
    const user = userEvent.setup()
    let submittedBody: Record<string, unknown> | undefined
    mockApi.onPost("/auth/register").reply((config) => {
      submittedBody = JSON.parse(config.data as string) as Record<string, unknown>
      return [201, { id: "professional-1" }]
    })
    render(<RegisterPage />)

    const roleGroup = screen.getByRole("radiogroup", {
      name: "Escolha sua atuação profissional",
    })
    const roleOptions = within(roleGroup).getAllByRole("radio")
    expect(roleOptions).toHaveLength(3)
    expect(within(roleGroup).getByRole("radio", { name: "Nutricionista" })).toBeVisible()
    expect(within(roleGroup).getByRole("radio", { name: "Personal Trainer" })).toBeVisible()
    expect(within(roleGroup).getByRole("radio", { name: "Fisioterapeuta" })).toBeVisible()
    expect(screen.queryByRole("radio", { name: /admin/i })).not.toBeInTheDocument()
    expect(
      roleGroup.compareDocumentPosition(screen.getByLabelText("E-mail")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(screen.getByRole("radio", { name: "Fisioterapeuta" }))
    await user.click(screen.getByLabelText("Nome completo"))
    await user.paste("Ana Souza")
    await user.click(screen.getByLabelText("E-mail"))
    await user.paste("ana@example.test")
    await user.click(screen.getByLabelText("Senha"))
    await user.paste("Árvoreforte1")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    await waitFor(() => {
      expect(submittedBody?.role).toBe("PHYSIO")
      expect(submittedBody).not.toHaveProperty("roles")
    })
  })

  it("shows password requirements before submit and associates validation to the field", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/register").reply(201)
    render(<RegisterPage />)

    const password = screen.getByLabelText(/senha/i)
    expect(screen.getByText("Mínimo de 8 caracteres")).toBeVisible()
    expect(screen.getByText("Uma letra maiúscula")).toBeVisible()
    expect(screen.getByText("Uma letra minúscula")).toBeVisible()
    expect(screen.getByText("Um número")).toBeVisible()

    await user.click(screen.getByLabelText("Nome completo"))
    await user.paste("Ana Souza")
    await user.click(screen.getByLabelText("E-mail"))
    await user.paste("ana@example.test")
    await user.click(password)
    await user.paste("senhafraca")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(mockApi.history.post).toHaveLength(0)
    const error = screen.getByText(
      "A senha precisa atender a todos os requisitos.",
    )
    expect(error).toBeVisible()
    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(password).toHaveAttribute("aria-describedby")
    expect(password.getAttribute("aria-describedby")).toContain(error.id)
  })

  it("rejects seven password code points when an emoji uses a surrogate pair", async () => {
    const user = userEvent.setup()
    mockApi.onPost("/auth/register").reply(201)
    render(<RegisterPage />)

    await user.click(screen.getByLabelText("Nome completo"))
    await user.paste("Ana Souza")
    await user.click(screen.getByLabelText("E-mail"))
    await user.paste("ana@example.test")
    const password = screen.getByLabelText("Senha")
    await user.click(password)
    await user.paste("Aa1xxx😀")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    const error = screen.getByText(
      "A senha precisa ter no mínimo 8 caracteres.",
    )
    expect(error).toBeVisible()
    expect(password.getAttribute("aria-describedby")).toContain(error.id)
    expect(mockApi.history.post).toHaveLength(0)
  })

  it("submits eight password code points when one is an emoji", async () => {
    const user = userEvent.setup()
    let submittedBody: Record<string, unknown> | undefined
    mockApi.onPost("/auth/register").reply((config) => {
      submittedBody = JSON.parse(config.data as string) as Record<string, unknown>
      return [201, { id: "professional-1" }]
    })
    render(<RegisterPage />)

    await user.click(screen.getByLabelText("Nome completo"))
    await user.paste("Ana Souza")
    await user.click(screen.getByLabelText("E-mail"))
    await user.paste("ana@example.test")
    await user.click(screen.getByLabelText("Senha"))
    await user.paste("Aa1xxxx😀")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    await waitFor(() => {
      expect(submittedBody?.password).toBe("Aa1xxxx😀")
    })
  })
})
