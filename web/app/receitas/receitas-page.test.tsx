import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import type { AuthUser } from "@/types/auth"
import type { RecipeFood, RecipeSummary } from "@/types/recipe"
import ReceitasPage from "./page"

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const http = new AxiosMockAdapter(api)
const originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture
const originalSetPointerCapture = HTMLElement.prototype.setPointerCapture
const originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false
  HTMLElement.prototype.setPointerCapture = () => undefined
  HTMLElement.prototype.releasePointerCapture = () => undefined
  HTMLElement.prototype.scrollIntoView = () => undefined
})

afterAll(() => {
  HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture
  HTMLElement.prototype.setPointerCapture = originalSetPointerCapture
  HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView
})
const food: RecipeFood = {
  id: "food-one",
  name: "Lentilha cozida",
  baseUnit: "100 g",
  baseAmount: 100,
  kcal: 116,
  protein: 9,
  carbs: 20,
  fat: 0.4,
  fiber: 8,
  sodium: 2,
  calcium: 19,
  iron: 3.3,
}
const recipe: RecipeSummary = {
  id: "recipe-one",
  status: "ACTIVE",
  currentVersionId: "version-one",
  currentVersion: {
    id: "version-one",
    recipeId: "recipe-one",
    version: 1,
    name: "Sopa de lentilha",
    description: "Preparação principal",
    category: "MAIN_MEAL",
    servings: 4,
    instructions: "Cozinhe e sirva.",
    isGlutenFree: true,
    isLactoseFree: true,
    isVegan: true,
    kcal: 230,
    protein: 14,
    carbs: 38,
    fat: 4,
    fiber: 10,
    sodium: 180,
    calcium: 60,
    iron: 4,
    ingredients: [
      {
        id: "ingredient-one",
        recipeVersionId: "version-one",
        foodId: "food-one",
        quantity: 240,
        measure: "g",
        food,
      },
    ],
    createdAt: "2026-09-20T12:00:00.000Z",
    publishedAt: "2026-09-20T12:00:00.000Z",
  },
  createdAt: "2026-09-20T12:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(<ReceitasPage />, { wrapper })
}

beforeEach(() => {
  authState.user = {
    sub: "nutritionist-one",
    role: "NUTRITIONIST",
    name: "Dra. Ana",
  }
  http.reset()
})

afterEach(() => {
  cleanup()
  authState.user = null
})

describe("ReceitasPage", { timeout: 15_000 }, () => {
  it("substitui o placeholder por uma biblioteca operacional", async () => {
    http.onGet("/recipes").reply(200, [])
    renderPage()

    expect(
      await screen.findByRole("heading", { name: /banco de receitas/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /nova receita/i })).toBeEnabled()
    expect(screen.queryByText(/em planejamento/i)).not.toBeInTheDocument()
    expect(
      await screen.findByText(/nenhuma receita cadastrada/i),
    ).toBeInTheDocument()
  })

  it("combina busca, categoria, restrições e ciclo de vida", async () => {
    http.onGet("/recipes").reply(200, [recipe])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Sopa de lentilha")

    await user.type(screen.getByRole("searchbox", { name: /buscar receitas/i }), "sopa")
    await user.click(screen.getByRole("combobox", { name: /categoria/i }))
    await user.click(screen.getByRole("option", { name: /refeição principal/i }))
    await user.click(screen.getByRole("checkbox", { name: /sem glúten/i }))
    await user.click(screen.getByRole("checkbox", { name: /vegano/i }))
    await user.click(screen.getByRole("button", { name: /arquivadas/i }))

    await waitFor(() => {
      const params = http.history.get.at(-1)?.params
      expect(params).toEqual({
        q: "sopa",
        category: "MAIN_MEAL",
        isGlutenFree: true,
        isVegan: true,
        status: "ARCHIVED",
      })
    })
  })

  it("distingue ausência de resultados do banco ainda vazio", async () => {
    http.onGet("/recipes").reply(200, [])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/nenhuma receita cadastrada/i)

    await user.type(screen.getByRole("searchbox", { name: /buscar receitas/i }), "mingau")

    expect(
      await screen.findByText(/nenhuma receita encontrada/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /limpar filtros/i })).toBeEnabled()
  })

  it("oferece recuperação quando a listagem falha", async () => {
    http.onGet("/recipes").replyOnce(500).onGet("/recipes").reply(200, [recipe])
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByText(/não foi possível carregar suas receitas/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }))

    expect(await screen.findByText("Sopa de lentilha")).toBeInTheDocument()
  })

  it("cria com ingredientes, mostra o aviso manual e nunca envia macros ou foto", async () => {
    http.onGet("/recipes").reply(200, [])
    http.onGet("/foods/search").reply((config) => {
      expect(config.params).toEqual({ q: "lentilha" })
      return [200, [food]]
    })
    http.onPost("/recipes").reply((config) => [201, { ...recipe, ...JSON.parse(config.data as string) }])
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/nenhuma receita cadastrada/i)

    await user.click(screen.getByRole("button", { name: /nova receita/i }))
    expect(
      screen.getByText(
        "Marcadores informados manualmente. Confira ingredientes e rótulos.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/foto|imagem|url/i)).not.toBeInTheDocument()

    await user.type(screen.getByRole("textbox", { name: /^nome/i }), "Sopa de lentilha")
    await user.click(screen.getByRole("combobox", { name: /categoria/i }))
    await user.click(screen.getByRole("option", { name: /refeição principal/i }))
    const servings = screen.getByRole("spinbutton", { name: /porções/i })
    await user.clear(servings)
    await user.type(servings, "4")
    await user.type(screen.getByRole("searchbox", { name: /buscar alimento/i }), "lentilha")
    const foodResult = await screen.findByRole("button", {
      name: /adicionar lentilha cozida/i,
    })
    expect(within(foodResult).getByText("Base: 100 g")).toBeInTheDocument()
    expect(within(foodResult).queryByText(/100\s*·\s*100\s*g/i)).not.toBeInTheDocument()
    await user.click(foodResult)

    const ingredient = screen.getByRole("group", { name: /lentilha cozida/i })
    const quantity = within(ingredient).getByRole("spinbutton", { name: /quantidade/i })
    expect(quantity).toHaveValue(100)
    await user.clear(quantity)
    await user.type(quantity, "240")
    const measure = within(ingredient).getByRole("textbox", { name: /medida/i })
    expect(measure).toHaveValue("g")

    const preview = screen.getByRole("region", { name: /prévia por porção/i })
    expect(within(preview).getByText("1,2 mg")).toBeInTheDocument()
    expect(within(preview).getByText("11,4 mg")).toBeInTheDocument()
    expect(within(preview).getByText("2 mg")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /salvar receita/i }))

    await waitFor(() => expect(http.history.post).toHaveLength(1))
    const payload = JSON.parse(http.history.post[0]?.data ?? "{}") as Record<string, unknown>
    expect(payload.ingredients).toEqual([
      { foodId: "food-one", quantity: 240, measure: "g" },
    ])
    expect(payload).not.toHaveProperty("kcal")
    expect(payload).not.toHaveProperty("protein")
    expect(payload).not.toHaveProperty("photo")
    expect(payload).not.toHaveProperty("imageUrl")
  })

  it("edita criando uma nova versão sem enviar nutrientes", async () => {
    http.onGet("/recipes").reply(200, [recipe])
    http.onPatch("/recipes/recipe-one").reply(200, recipe)
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Sopa de lentilha")

    await user.click(
      screen.getByRole("button", { name: /editar sopa de lentilha/i }),
    )
    const name = screen.getByRole("textbox", { name: /^nome/i })
    await user.clear(name)
    await user.type(name, "Sopa de lentilha cremosa")
    await user.click(screen.getByRole("button", { name: /salvar receita/i }))

    await waitFor(() => expect(http.history.patch).toHaveLength(1))
    const payload = JSON.parse(
      http.history.patch[0]?.data ?? "{}",
    ) as Record<string, unknown>
    expect(payload).toMatchObject({
      name: "Sopa de lentilha cremosa",
      expectedVersion: 1,
    })
    expect(payload).not.toHaveProperty("kcal")
    expect(payload).not.toHaveProperty("protein")
  })

  it("duplica a receita pela ação identificada pelo nome", async () => {
    http.onGet("/recipes").reply(200, [recipe])
    http.onPost("/recipes/recipe-one/duplicate").reply(201, {
      ...recipe,
      id: "recipe-copy",
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Sopa de lentilha")

    await user.click(
      screen.getByRole("button", { name: /duplicar sopa de lentilha/i }),
    )

    await waitFor(() => expect(http.history.post).toHaveLength(1))
    expect(http.history.post[0]?.url).toBe("/recipes/recipe-one/duplicate")
  })

  it("arquiva e restaura a receita com confirmação", async () => {
    let status: RecipeSummary["status"] = "ACTIVE"
    http.onGet("/recipes").reply(() => [200, [{ ...recipe, status }]])
    http.onPatch("/recipes/recipe-one/archive").reply(() => {
      status = "ARCHIVED"
      return [200, { ...recipe, status }]
    })
    http.onPatch("/recipes/recipe-one/restore").reply(() => {
      status = "ACTIVE"
      return [200, { ...recipe, status }]
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Sopa de lentilha")

    await user.click(
      screen.getByRole("button", { name: /arquivar sopa de lentilha/i }),
    )
    await user.click(
      await screen.findByRole("button", { name: /confirmar arquivar/i }),
    )
    expect(
      await screen.findByRole("button", {
        name: /restaurar sopa de lentilha/i,
      }),
    ).toBeEnabled()

    await user.click(
      screen.getByRole("button", { name: /restaurar sopa de lentilha/i }),
    )
    await user.click(
      await screen.findByRole("button", { name: /confirmar restaurar/i }),
    )

    await waitFor(() => expect(http.history.patch).toHaveLength(2))
    expect(http.history.patch.map((request) => request.url)).toEqual([
      "/recipes/recipe-one/archive",
      "/recipes/recipe-one/restore",
    ])
  })

  it("abre histórico nomeado e mantém versões em somente leitura", async () => {
    const secondVersion = {
      ...recipe.currentVersion,
      id: "version-two",
      version: 2,
      name: "Sopa de lentilha cremosa",
      createdAt: "2026-09-21T12:00:00.000Z",
    }
    http.onGet("/recipes").reply(200, [recipe])
    http.onGet("/recipes/recipe-one").reply(200, {
      ...recipe,
      currentVersionId: "version-two",
      currentVersion: secondVersion,
      versions: [recipe.currentVersion, secondVersion],
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("Sopa de lentilha")

    await user.click(
      screen.getByRole("button", { name: /histórico sopa de lentilha/i }),
    )

    const dialog = await screen.findByRole("dialog", {
      name: /histórico da receita/i,
    })
    expect(within(dialog).getByText(/versão 2/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/versão 1/i)).toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: /editar|salvar|excluir/i }),
    ).not.toBeInTheDocument()
  })
})
