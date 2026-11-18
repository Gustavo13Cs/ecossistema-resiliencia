import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { makeTestClient } from "@/test/client-fixture"
import type { WorkoutTemplateDetail, WorkoutTemplateSummary } from "@/types/workout-template"
import { WorkoutTemplatesHub } from "./WorkoutTemplatesHub"

const auth = vi.hoisted(() => ({
  user: { sub: "personal-1", role: "PERSONAL", name: "Personal" },
}))
const push = vi.hoisted(() => vi.fn())

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => auth,
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))
vi.mock("./ExerciseLibraryCombobox", () => ({
  ExerciseLibraryCombobox: () => null,
}))

const globalTemplate: WorkoutTemplateDetail = {
  id: "tpl-global-1",
  title: "Upper Lower SafeMove",
  description: "Base global de hipertrofia 4x/semana",
  goal: "MUSCLE_GAIN",
  level: "INTERMEDIATE",
  targetAudience: "Adultos intermediários",
  environment: "FULL_GYM",
  estimatedWeeks: 8,
  schemaVersion: 3,
  archivedAt: null,
  createdAt: "2026-11-01T12:00:00Z",
  updatedAt: "2026-11-01T12:00:00Z",
  isGlobal: true,
  content: {
    title: "Upper Lower SafeMove",
    goal: "Hipertrofia",
    durationWeeks: 8,
    notes: "",
    splits: [
      {
        name: "Superior A",
        focus: "",
        weeklyFrequency: 2,
        exercises: [
          {
            name: "Supino reto com barra",
            sets: "4",
            reps: "6-8",
            rest: "120s",
            notes: "",
            load: "",
            muscleGroup: "CHEST",
            effortType: "RIR",
            effortTarget: "2",
            tempo: "3-0-1-0",
            method: "STANDARD",
          },
        ],
      },
    ],
  },
}

const privateTemplate: WorkoutTemplateDetail = {
  id: "tpl-priv-1",
  title: "Full Body Condomínio",
  description: "Adaptação enxuta com halteres e polia",
  goal: "CONDITIONING",
  level: "BEGINNER",
  targetAudience: "Iniciantes com rotina corrida",
  environment: "CONDO_GYM",
  estimatedWeeks: 6,
  schemaVersion: 3,
  archivedAt: null,
  createdAt: "2026-11-05T12:00:00Z",
  updatedAt: "2026-11-05T12:00:00Z",
  isGlobal: false,
  content: {
    title: "Full Body Condomínio",
    goal: "Condicionamento",
    durationWeeks: 6,
    notes: "",
    splits: [
      {
        name: "Treino Único",
        focus: "",
        weeklyFrequency: 3,
        exercises: [
          {
            name: "Agachamento goblet",
            sets: "3",
            reps: "10-12",
            rest: "75s",
            notes: "",
            load: "",
            muscleGroup: "QUADRICEPS",
            effortType: "RPE",
            effortTarget: "7",
            tempo: "2-0-1-0",
            method: "STANDARD",
          },
        ],
      },
    ],
  },
}

describe("WorkoutTemplatesHub", () => {
  let http: AxiosMockAdapter
  let cache: QueryClient
  let store: WorkoutTemplateDetail[]

  beforeEach(() => {
    Object.defineProperty(window, "navigation", {
      configurable: true,
      value: new EventTarget(),
    })
    auth.user = { sub: "personal-1", role: "PERSONAL", name: "Personal" }
    push.mockReset()
    http = new AxiosMockAdapter(api)
    cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    store = [structuredClone(privateTemplate), structuredClone(globalTemplate)]

    http.onGet("/workouts/templates").reply(config => {
      const params = (config.params ?? {}) as Record<string, string | undefined>
      const origin = params.origin ?? "all"
      const status = params.status ?? "active"
      const environment = params.environment
      const q = params.q?.toLowerCase()

      const filtered: WorkoutTemplateSummary[] = store.filter(item => {
        if (origin === "global" && !item.isGlobal) return false
        if (origin === "private" && item.isGlobal) return false
        if (status === "active" && item.archivedAt) return false
        if (status === "archived" && !item.archivedAt) return false
        if (environment && item.environment !== environment) return false
        if (
          q &&
          !item.title.toLowerCase().includes(q) &&
          !(item.description ?? "").toLowerCase().includes(q)
        ) {
          return false
        }
        return true
      })
      return [200, { items: filtered, nextCursor: null }]
    })

    http.onGet(/\/workouts\/templates\/[^/]+$/).reply(config => {
      const id = config.url?.split("/").pop()
      const found = store.find(item => item.id === id)
      return found ? [200, found] : [404, { message: "Not found" }]
    })
  })

  afterEach(() => {
    cleanup()
    cache.clear()
    http.restore()
  })

  function mount() {
    return render(
      <QueryClientProvider client={cache}>
        <WorkoutTemplatesHub />
      </QueryClientProvider>,
    )
  }

  it("blocks non-PERSONAL roles without issuing API calls", () => {
    auth.user = { sub: "nutri-1", role: "NUTRITIONIST", name: "Nutri" }
    mount()
    expect(
      screen.getByRole("heading", { name: "Área de treinamento indisponível" }),
    ).toBeVisible()
    expect(http.history.get).toHaveLength(0)
  })

  it("lists global and private templates, supports tab navigation and environment filtering", async () => {
    const user = userEvent.setup()
    mount()

    expect(await screen.findByText("Full Body Condomínio")).toBeVisible()
    expect(screen.getByText("Upper Lower SafeMove")).toBeVisible()

    // Global template must NOT expose Editar or Arquivar
    expect(
      screen.queryByRole("button", { name: "Editar Upper Lower SafeMove" }),
    ).toBeNull()
    expect(
      screen.queryByRole("button", { name: "Arquivar Upper Lower SafeMove" }),
    ).toBeNull()
    expect(
      screen.getByRole("button", { name: "Editar Full Body Condomínio" }),
    ).toBeVisible()

    // Filter by environment CONDO_GYM
    await user.selectOptions(
      screen.getByLabelText("Ambiente de treino"),
      "CONDO_GYM",
    )
    await waitFor(() =>
      expect(screen.queryByText("Upper Lower SafeMove")).toBeNull(),
    )
    expect(screen.getByText("Full Body Condomínio")).toBeVisible()

    // Reset environment and use keyboard ArrowRight on tabs to switch to Meus modelos -> SafeMove
    await user.selectOptions(screen.getByLabelText("Ambiente de treino"), "")
    const allTab = screen.getByRole("tab", { name: "Todos ativos" })
    allTab.focus()
    await user.keyboard("{ArrowRight}{ArrowRight}")
    expect(screen.getByRole("tab", { name: "SafeMove" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(await screen.findByText("Upper Lower SafeMove")).toBeVisible()
    expect(screen.queryByText("Full Body Condomínio")).toBeNull()
  })

  it("creates a standalone private template from scratch", async () => {
    const user = userEvent.setup()
    http.onPost("/workouts/templates").reply(config => {
      const body = JSON.parse(config.data as string) as WorkoutTemplateDetail
      const created: WorkoutTemplateDetail = {
        ...privateTemplate,
        id: "tpl-created-1",
        title: body.title,
        goal: body.goal,
        level: body.level,
        environment: body.environment ?? null,
        description: body.description ?? null,
        targetAudience: body.targetAudience ?? null,
        content: body.content,
      }
      store.unshift(created)
      return [201, created]
    })

    mount()
    await screen.findByText("Full Body Condomínio")

    await user.click(screen.getByRole("button", { name: "Novo modelo" }))
    const dialog = await screen.findByRole("dialog", {
      name: "Novo modelo de treino",
    })

    await user.type(
      within(dialog).getByLabelText("Nome do modelo"),
      "Força Base Studio 3x",
    )
    await user.selectOptions(
      within(dialog).getByLabelText("Objetivo principal"),
      "STRENGTH",
    )
    await user.selectOptions(
      within(dialog).getByLabelText("Nível recomendado"),
      "INTERMEDIATE",
    )
    await user.selectOptions(
      within(dialog).getByLabelText("Ambiente recomendado (opcional)"),
      "STUDIO",
    )
    await user.type(
      within(dialog).getByLabelText("Nome do exercício"),
      "Levantamento terra",
    )
    await user.type(within(dialog).getByLabelText("Séries"), "5")
    await user.type(within(dialog).getByLabelText("Repetições"), "5")

    await user.click(
      within(dialog).getByRole("button", { name: "Criar modelo privado" }),
    )

    expect(
      await screen.findByText(/Modelo "Força Base Studio 3x" criado/i),
    ).toBeVisible()
    expect(screen.getByText("Força Base Studio 3x")).toBeVisible()
  })

  it("duplicates a SafeMove global template into a private editable copy and archives/restores private templates", async () => {
    const user = userEvent.setup()
    http
      .onPost("/workouts/templates/tpl-global-1/duplicate")
      .reply(() => {
        const copy: WorkoutTemplateDetail = {
          ...globalTemplate,
          id: "tpl-copy-1",
          title: "Cópia de Upper Lower SafeMove",
          isGlobal: false,
        }
        store.unshift(copy)
        return [201, copy]
      })

    http
      .onPost("/workouts/templates/tpl-priv-1/archive")
      .reply(() => {
        const target = store.find(item => item.id === "tpl-priv-1")!
        target.archivedAt = "2026-11-06T15:00:00Z"
        return [200, target]
      })

    http
      .onPost("/workouts/templates/tpl-priv-1/restore")
      .reply(() => {
        const target = store.find(item => item.id === "tpl-priv-1")!
        target.archivedAt = null
        return [200, target]
      })

    mount()
    await screen.findByText("Upper Lower SafeMove")

    await user.click(
      screen.getByRole("button", {
        name: "Criar minha versão de Upper Lower SafeMove",
      }),
    )
    expect(
      await screen.findByText(/Cópia privada criada: "Cópia de Upper Lower SafeMove"/i),
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Editar cópia agora" }),
    ).toBeVisible()

    // Archive private template
    await user.click(
      screen.getByRole("button", { name: "Arquivar Full Body Condomínio" }),
    )
    await waitFor(() =>
      expect(screen.queryByText("Full Body Condomínio")).toBeNull(),
    )

    // Switch to Arquivados tab and restore it
    await user.click(screen.getByRole("tab", { name: "Arquivados" }))
    expect(await screen.findByText("Full Body Condomínio")).toBeVisible()
    await user.click(
      screen.getByRole("button", { name: "Restaurar Full Body Condomínio" }),
    )
    await waitFor(() =>
      expect(screen.queryByText("Full Body Condomínio")).toBeNull(),
    )
  })

  it("edits an existing private template", async () => {
    const user = userEvent.setup()
    http.onPatch("/workouts/templates/tpl-priv-1").reply(config => {
      const patch = JSON.parse(config.data as string) as Partial<WorkoutTemplateDetail>
      const target = store.find(item => item.id === "tpl-priv-1")!
      Object.assign(target, patch)
      return [200, target]
    })

    mount()
    await screen.findByText("Full Body Condomínio")

    await user.click(
      screen.getByRole("button", { name: "Editar Full Body Condomínio" }),
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Editar modelo de treino",
    })
    const titleInput = within(dialog).getByLabelText("Nome do modelo")
    await user.clear(titleInput)
    await user.type(titleInput, "Full Body Condomínio v2")
    await user.click(
      within(dialog).getByRole("button", {
        name: "Salvar alterações do modelo",
      }),
    )

    expect(
      await screen.findByText(/Modelo "Full Body Condomínio v2" atualizado/i),
    ).toBeVisible()
    expect(screen.getByText("Full Body Condomínio v2")).toBeVisible()
  })

  it("applies a template to an active student and recovers existing open draft on 409", async () => {
    const user = userEvent.setup()
    http.onGet("/clients").reply(200, [
      { ...makeTestClient("c1", "Marina Costa", "ACTIVE"), professionalId: "personal-1" },
      { ...makeTestClient("c2", "Rafael Souza", "ACTIVE"), professionalId: "personal-1" },
    ])
    http
      .onPost("/workouts/templates/tpl-priv-1/create-draft")
      .replyOnce(409, {
        code: "DRAFT_EXISTS",
        id: "draft-open-99",
        clientId: "c1",
      })
      .onPost("/workouts/templates/tpl-priv-1/create-draft")
      .reply(201, {
        id: "draft-new-1",
        clientId: "c2",
        status: "OPEN",
      })
    http.onGet("/workouts/drafts/draft-open-99").reply(200, {
      id: "draft-open-99",
      clientId: "c1",
      status: "OPEN",
    })

    mount()
    await screen.findByText("Full Body Condomínio")

    await user.click(
      screen.getByRole("button", {
        name: "Aplicar em aluno: Full Body Condomínio",
      }),
    )
    const dialog = await screen.findByRole("dialog", {
      name: "Aplicar modelo em aluno",
    })

    // First student has an existing open draft -> 409 recovery
    await user.click(await within(dialog).findByLabelText(/Marina Costa/))
    await user.click(
      within(dialog).getByRole("button", { name: "Criar rascunho para aluno" }),
    )

    const openExistingBtn = await within(dialog).findByRole("button", {
      name: "Abrir rascunho existente",
    })
    expect(push).not.toHaveBeenCalled()
    await user.click(openExistingBtn)
    expect(push).toHaveBeenCalledWith("/clientes/c1/rascunhos/draft-open-99")

    // Apply to second student -> 201 direct navigation
    push.mockReset()
    await user.click(
      screen.getByRole("button", {
        name: "Aplicar em aluno: Full Body Condomínio",
      }),
    )
    const secondDialog = await screen.findByRole("dialog", {
      name: "Aplicar modelo em aluno",
    })
    await user.click(await within(secondDialog).findByLabelText(/Rafael Souza/))
    await user.click(
      within(secondDialog).getByRole("button", {
        name: "Criar rascunho para aluno",
      }),
    )
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/clientes/c2/rascunhos/draft-new-1"),
    )
  })
})
