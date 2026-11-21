import { StrictMode } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { makeTestClient } from "@/test/client-fixture"
import type { FoodNutrition } from "@/types/diet"
import NovaDietaPage from "./page"

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "client-one" }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "pro-one", role: "NUTRITIONIST", name: "Ana" } }) }))
vi.mock("@/hooks/features/useClientRecord", () => ({
  useClientRecord: () => ({ client: { ...makeTestClient("client-one", "Cliente", "ACTIVE"), professionalId: "pro-one" }, status: "ready", refetch: vi.fn() }),
}))
vi.mock("@/components/features/diet/MacroDistributionChart", () => ({ default: () => <div /> }))

const http = new AxiosMockAdapter(api)
const food: FoodNutrition = { id: "rice", name: "Arroz atual", source: "TACO", baseUnit: "g", baseAmount: 100, kcal: 130, protein: 3, carbs: 28, fat: 1, fiber: 1, sodium: 0, calcium: 0, iron: 0 }
const requests = () => http.history.get.filter((request) => /^\/foods(?:\/search)?\?/.test(request.url ?? ""))
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
function renderEditor(strict = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const page = <QueryClientProvider client={client}><NovaDietaPage /></QueryClientProvider>
  return render(strict ? <StrictMode>{page}</StrictMode> : page)
}
function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: "Buscar e Adicionar Alimento ou Receita" }))
  return within(screen.getByRole("dialog", { name: "Banco de Alimentos e Receitas" }))
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  http.reset()
  http.onGet("/diet-plans/client/client-one/active").reply(200, null)
  http.onGet(/^\/foods/).reply(200, [food])
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe("diet food catalogue requests", () => {
  it("loads the initial catalogue once without a second request after debounce", async () => {
    renderEditor()
    await advance(0)
    expect(requests()).toHaveLength(1)
    await advance(1000)
    expect(requests()).toHaveLength(1)
    expect(openPicker().getByText("Arroz atual")).toBeInTheDocument()
  })

  it("issues only one initial request when Strict Mode replays mount effects", async () => {
    renderEditor(true)
    await advance(1000)
    expect(requests()).toHaveLength(1)
  })

  it("loads a new source once and does not reload when clicking the active source", async () => {
    renderEditor()
    await advance(1000)
    const picker = openPicker()
    http.resetHistory()
    fireEvent.click(picker.getByRole("button", { name: "TACO" }))
    await advance(0)
    expect(requests().map((request) => request.url)).toEqual(["/foods?source=TACO"])
    await advance(1000)
    fireEvent.click(picker.getByRole("button", { name: "TACO" }))
    await advance(1000)
    expect(requests()).toHaveLength(1)
  })

  it("keeps the search debounce, skips one character and refreshes once after clearing", async () => {
    renderEditor()
    await advance(1000)
    const picker = openPicker()
    const search = picker.getByRole("textbox", { name: "Buscar alimentos" })
    http.resetHistory()
    fireEvent.change(search, { target: { value: "a" } })
    await advance(1000)
    expect(requests()).toHaveLength(0)
    fireEvent.change(search, { target: { value: "ar" } })
    await advance(300)
    fireEvent.change(search, { target: { value: "arroz" } })
    await advance(499)
    expect(requests()).toHaveLength(0)
    await advance(1)
    expect(requests().map((request) => request.url)).toEqual(["/foods/search?q=arroz&source=TODAS"])
    fireEvent.change(search, { target: { value: "" } })
    await advance(1000)
    expect(requests().map((request) => request.url)).toEqual(["/foods/search?q=arroz&source=TODAS", "/foods?source=TODAS"])
  })

  it("does not replace the latest source results with a delayed previous response", async () => {
    let finishPrevious!: (response: [number, FoodNutrition[]]) => void
    const previous = new Promise<[number, FoodNutrition[]]>((resolve) => { finishPrevious = resolve })
    http.resetHandlers()
    http.onGet("/diet-plans/client/client-one/active").reply(200, null)
    http.onGet("/foods?source=TODAS").reply(() => previous)
    http.onGet("/foods?source=TACO").reply(200, [food])
    renderEditor()
    await advance(0)
    const picker = openPicker()
    fireEvent.click(picker.getByRole("button", { name: "TACO" }))
    await advance(1000)
    expect(picker.getByText("Arroz atual")).toBeInTheDocument()
    await act(async () => { finishPrevious([200, [{ ...food, id: "old", name: "Resultado antigo" }]]) })
    expect(picker.getByText("Arroz atual")).toBeInTheDocument()
    expect(picker.queryByText("Resultado antigo")).not.toBeInTheDocument()
  })
})
