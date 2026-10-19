import { useEffect, useState } from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import LoginPage from "@/app/auth/login/page"
import { api, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { makeTestClient } from "@/test/client-fixture"
import { WorkoutDraftWorkspace } from "./WorkoutDraftWorkspace"

const editorPath = "/clientes/c1/rascunhos/d1"
const navigation = vi.hoisted(() => ({ pathname: "/clientes/c1/rascunhos/d1", push: vi.fn(), replace: vi.fn(), navigate: (_path: string) => {} }))
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation }))
vi.mock("./ExerciseLibraryCombobox", () => ({ ExerciseLibraryCombobox: () => null }))
const personal = { sub: "personal", role: "PERSONAL", name: "Profissional", email: "personal@example.test" }
const content = { title: "Elaboração salva", goal: "", notes: "", durationWeeks: null, splits: [] }
const draft = { id: "d1", clientId: "c1", status: "OPEN", version: 1, schemaVersion: 1, content, sourceWorkoutId: null, baseActiveWorkoutId: null, finalizedWorkoutId: null, createdAt: "2026-10-17T12:00:00Z", updatedAt: "2026-10-17T12:00:00Z", closedAt: null }
let http: AxiosMockAdapter
let cache: QueryClient

function SessionProbe() {
  const { user } = useAuth()
  return <span>{user?.sub ?? "anonymous"}</span>
}
function App() {
  const [path, setPath] = useState(editorPath)
  useEffect(() => { navigation.navigate = path => { navigation.pathname = path; setPath(path) } }, [])
  return <AuthProvider><SessionProbe />{path === "/auth/login" ? <LoginPage /> : path === "/home" ? <button onClick={() => navigation.push(editorPath)}>Abrir rascunho</button> : <WorkoutDraftWorkspace clientId="c1" draftId="d1" />}</AuthProvider>
}
beforeEach(() => {
  navigation.pathname = editorPath
  navigation.push.mockReset().mockImplementation((path: string) => navigation.navigate(path))
  navigation.replace.mockReset().mockImplementation((path: string) => navigation.navigate(path))
  vi.stubGlobal("navigation", Object.assign(new EventTarget(), { traverseTo: vi.fn() }))
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  http = new AxiosMockAdapter(api)
  setCsrfToken(null); setUnauthorizedHandler(null)
  http.onGet("/auth/me").reply(200, { user: personal, csrfToken: "synthetic-csrf" })
  http.onPost("/auth/logout").reply(200)
  http.onPost("/auth/login").reply(200)
  http.onGet("/clients/c1").reply(200, makeTestClient("c1", "Ana", "ACTIVE"))
  http.onGet("/workouts/drafts/d1").reply(200, draft)
  http.onGet("/workouts/client/c1/active").reply(200, null)
})
afterEach(() => { cleanup(); cache.clear(); http.restore(); setCsrfToken(null); setUnauthorizedHandler(null); vi.unstubAllGlobals() })

it.each(["active", "detail", "client"] as const)("reauthenticates_after_%s_403_and_opens_the_saved_draft_in_a_new_authorized_session", async source => {
  render(<QueryClientProvider client={cache}><App /></QueryClientProvider>)
  fireEvent.change(await screen.findByLabelText("Título da prescrição"), { target: { value: "Edição privada não salva" } })
  const url = source === "active" ? "/workouts/client/c1/active" : source === "detail" ? "/workouts/drafts/d1" : "/clients/c1"
  const key = source === "active" ? queryKeys.activeWorkout("personal", "c1") : source === "detail" ? queryKeys.workoutDraft("personal", "c1", "d1") : queryKeys.client("personal", "c1")
  http.onGet(url).reply(403)
  await act(async () => { await cache.invalidateQueries({ queryKey: key }) })
  await screen.findByRole("heading", { name: "Restabeleça seu acesso" })
  expect(screen.queryByLabelText("Título da prescrição")).not.toBeInTheDocument()
  // A ação tem que encerrar a sessão real do provider antes de abrir a rota pública.
  fireEvent.click(screen.getByText("Entrar novamente"))
  expect(await screen.findByRole("heading", { name: "Entrar no SafeMove" })).toBeVisible()
  expect(screen.getByText("anonymous")).toBeInTheDocument()
  expect(navigation.pathname).toBe("/auth/login")
  expect(http.history.post.filter(request => request.url === "/auth/logout")).toHaveLength(1)
  expect(cache.getQueryData([...queryKeys.workoutDraftsRoot("personal"), "access"])).toBeUndefined()
  expect(cache.getQueryData(queryKeys.workoutDraft("personal", "c1", "d1"))).toBeUndefined()
  http.onGet(url).reply(200, source === "active" ? null : source === "detail" ? draft : makeTestClient("c1", "Ana", "ACTIVE"))
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: personal.email } })
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "synthetic-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }))
  fireEvent.click(await screen.findByRole("button", { name: "Abrir rascunho" }))
  expect(await screen.findByLabelText("Título da prescrição")).toHaveValue(content.title)
  expect(screen.queryByDisplayValue("Edição privada não salva")).not.toBeInTheDocument()
  expect(screen.getByText("personal")).toBeInTheDocument()
  await waitFor(() => expect(http.history.get.filter(request => request.url === "/workouts/drafts/d1")).toHaveLength(source === "detail" ? 3 : 2))
})
