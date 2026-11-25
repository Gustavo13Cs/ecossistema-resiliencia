import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AxiosMockAdapter from "axios-mock-adapter"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import NovaReabilitacaoPage from "@/app/clientes/[id]/nova-reabilitacao/page"
import ReabilitacaoPage from "@/app/reabilitacao/page"
import { api } from "@/lib/api"
import type { RehabPlan } from "@/hooks/features/useFisio"
import { RehabPrintDialog } from "./RehabPrintDialog"

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const notices = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const printHelper = vi.hoisted(() => ({ openPrintWindow: vi.fn() }))

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "client-1" }),
  useRouter: () => navigation,
}))
vi.mock("sonner", () => ({ toast: notices }))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { sub: "physio-1", role: "PHYSIO", name: "Dr. Rafael" },
  }),
}))
vi.mock("@/lib/print-document", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/print-document")>()
  return {
    ...actual,
    openPrintWindow: printHelper.openPrintWindow,
  }
})

const approvedSvgUrl =
  "https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg"

const existingPlan: RehabPlan = {
  id: "rehab-1",
  title: "Protocolo Inicial Joelho",
  goal: "Analgesia",
  durationWeeks: 6,
  currentPhaseIndex: 0,
  notes: "Gelo após sessão.",
  sessions: [
    {
      id: "s-1",
      name: "Fase 1",
      focus: "Controle de dor",
      progressionCriteria: "EVA <= 3",
      estimatedWeeks: 2,
      exercises: [
        {
          id: "ex-1",
          name: "Exercício Base",
          sets: "3",
          reps: "12",
          category: "KINESIOTHERAPY",
          isHomeExercise: false,
        },
      ],
    },
    {
      id: "s-2",
      name: "Fase 2",
      focus: "Fortalecimento",
      progressionCriteria: "ADM simétrica",
      estimatedWeeks: 4,
      exercises: [
        {
          id: "ex-2",
          name: "Dead bug",
          sets: "3",
          reps: "10",
          category: "KINESIOTHERAPY",
          isHomeExercise: true,
          homeFrequency: "1x ao dia",
          patientInstructions: "Mantenha a respiração contínua.",
        },
      ],
    },
  ],
}

describe("Rehab P3 advanced editor, catalogs, phase advancement and PDF", () => {
  let http: AxiosMockAdapter
  let cache: QueryClient

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cache}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    cache = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    http = new AxiosMockAdapter(api)
    http.onGet("/clients/client-1").reply(200, {
      id: "client-1",
      name: "Lucas Ferreira",
      status: "ACTIVE",
    })
    http.onGet("/clients").reply(200, [
      { id: "client-1", name: "Lucas Ferreira", status: "ACTIVE" },
    ])
    http.onGet("/rehab-plans/client/client-1/active").reply(200, existingPlan)
    http.onGet("/rehab-plans/protocol-catalog").reply(200, [
      {
        id: "proto-lombalgia-mecanica",
        conditionArea: "Coluna Lombar",
        title: "Lombalgia Mecânica & Controle Motor Lombar",
        goal: "Controle motor",
        durationWeeks: 8,
        notes: "Caminhadas leves",
        sessions: [
          {
            name: "Fase 1 - Modulação",
            focus: "Analgesia",
            estimatedWeeks: 2,
            progressionCriteria: "EVA <= 3",
            exercises: [
              {
                name: "Dead bug",
                category: "KINESIOTHERAPY",
                catalogExerciseId: "cat-core-10",
                sets: "3",
                reps: "10",
                isHomeExercise: true,
                homeFrequency: "1x ao dia",
                patientInstructions: "Estenda braço e perna opostos devagar.",
              },
            ],
          },
        ],
      },
    ])
    http.onGet("/rehab-plans/templates").reply(200, [])
    http
      .onGet("/rehab-plans/exercise-catalog?onlyWithIllustration=true")
      .reply(200, [
        {
          id: "cat-core-10",
          name: "Dead bug",
          muscleGroup: "CORE",
          equipment: "BODYWEIGHT",
          notes: null,
          hasIllustration: true,
          demonstration: {
            revision: "2026-10-19.1:1",
            instruction: "Instrução oficial SafeMove Dead bug",
            assets: [
              {
                id: "workout-guide-dead-bug-frame-1",
                type: "IMAGE",
                url: approvedSvgUrl,
                alt: "Ilustração Dead bug",
                sourcePageUrl:
                  "https://github.com/bryllim/workout-guide/blob/aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/dead-bug/frame-1.svg",
                author: "Bryl Lim",
                licenseName: "CC BY-SA 4.0",
                licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
                displayAllowed: true,
              },
            ],
          },
        },
      ])
  })

  afterEach(() => {
    cleanup()
    cache.clear()
    http.restore()
  })

  it("imports a curated protocol, edits modality/home params, updates in-place (PATCH), and saves template", async () => {
    const user = userEvent.setup()
    http.onPatch("/rehab-plans/rehab-1").reply(200, existingPlan)
    http.onPost("/rehab-plans/templates").reply(201, {
      ...existingPlan,
      id: "tpl-1",
      isTemplate: true,
    })

    render(<NovaReabilitacaoPage />, { wrapper })
    await screen.findByDisplayValue("Protocolo Inicial Joelho")

    // Importa protocolo pronto
    await user.click(screen.getByRole("button", { name: /Protocolos Prontos/i }))
    await user.click(await screen.findByRole("button", { name: "Usar protocolo" }))
    expect(
      screen.getByDisplayValue("Lombalgia Mecânica & Controle Motor Lombar"),
    ).toBeVisible()

    // Salva como modelo próprio
    await user.click(screen.getByRole("button", { name: /Salvar como Modelo/i }))
    await waitFor(() =>
      expect(
        http.history.post.some(r => r.url === "/rehab-plans/templates"),
      ).toBe(true),
    )

    // Vincula exercício da biblioteca visual e muda item para Eletroterapia
    await user.click(
      screen.getByRole("button", { name: "Biblioteca Visual" }),
    )
    await user.click(
      await screen.findByRole("button", { name: "Selecionar exercício" }),
    )
    expect(screen.getByText("Ilustração vinculada")).toBeVisible()

    // Adiciona item de eletroterapia com preset TENS Convencional
    await user.click(
      screen.getByRole("button", { name: /Adicionar Terapia \/ Exercício/i }),
    )
    const selects = screen.getAllByRole("combobox")
    await user.selectOptions(selects[1], "ELECTROTHERAPY")
    await user.click(screen.getByRole("button", { name: "TENS Convencional" }))

    // Salva alterações in-place (PATCH)
    await user.click(screen.getByRole("button", { name: /Salvar Alterações/i }))
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/clientes/client-1"),
    )
    expect(http.history.patch).toHaveLength(1)
    expect(http.history.patch[0].url).toBe("/rehab-plans/rehab-1")
    const patchBody = JSON.parse(http.history.patch[0].data as string) as {
      title: string
      sessions: Array<{
        exercises: Array<Record<string, unknown>>
      }>
    }
    expect(patchBody.title).toBe("Lombalgia Mecânica & Controle Motor Lombar")
    expect(patchBody.sessions[0].exercises[0]).toMatchObject({
      catalogExerciseId: "cat-core-10",
      isHomeExercise: true,
    })
    expect(patchBody.sessions[0].exercises[0]).not.toHaveProperty(
      "demonstrationSnapshot",
    )
    expect(patchBody.sessions[0].exercises[1]).toMatchObject({
      category: "ELECTROTHERAPY",
      modalityParams: { modality: "TENS", frequency: "100 Hz" },
    })
  })

  it("opens print window from RehabPrintDialog and shows alert when popup is blocked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    printHelper.openPrintWindow.mockReturnValueOnce(null)

    render(
      <RehabPrintDialog
        open
        plan={existingPlan}
        patientName="Lucas Ferreira"
        onClose={onClose}
      />,
      { wrapper },
    )

    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/bloqueou a janela de impressão/i)
    expect(onClose).not.toHaveBeenCalled()

    printHelper.openPrintWindow.mockReturnValueOnce({ closed: false } as Window)
    await user.click(screen.getByRole("button", { name: "Gerar PDF A4" }))
    expect(printHelper.openPrintWindow).toHaveBeenCalledTimes(2)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("advances active protocol phase from ReabilitacaoPage", async () => {
    const user = userEvent.setup()
    http.onPatch("/rehab-plans/rehab-1/phase").reply(200, {
      ...existingPlan,
      currentPhaseIndex: 1,
    })

    render(<ReabilitacaoPage />, { wrapper })
    await screen.findByRole("option", { name: "Lucas Ferreira" })
    fireEvent.change(screen.getByLabelText("Paciente"), {
      target: { value: "client-1" },
    })
    await screen.findByText("Protocolo Inicial Joelho")

    await user.click(
      screen.getByRole("button", { name: "Definir como fase atual" }),
    )
    await waitFor(() => expect(http.history.patch).toHaveLength(1))
    expect(http.history.patch[0].url).toBe("/rehab-plans/rehab-1/phase")
    expect(JSON.parse(http.history.patch[0].data as string)).toEqual({
      currentPhaseIndex: 1,
    })
  })
})
