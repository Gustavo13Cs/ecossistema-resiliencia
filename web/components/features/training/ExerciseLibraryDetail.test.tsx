import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, expect, it, vi } from "vitest"
import { api } from "@/lib/api"
import { ExerciseLibraryDetail } from "./ExerciseLibraryDetail"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "p1", role: "PERSONAL" } }) }))
const http = new AxiosMockAdapter(api)
afterEach(() => { cleanup(); http.reset() })
it("dialog_restores_focus_and_has_credits", async () => {
  http.onGet("/workouts/exercise-library/cat-1").reply(200, { id: "cat-1", name: "Prancha", source: "CATALOG", muscleGroup: "CORE", demonstration: { revision: "r1", instruction: "Apoio estável", assets: [{ id: "a", type: "IMAGE", displayAllowed: false, url: "https://cdn.jsdelivr.net/a.svg", alt: "Prancha", author: "Autoria completa", licenseName: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", sourcePageUrl: "https://github.com/source", upstreamSourcePageUrl: "https://github.com/upstream", changes: "Alteração de cor" }] } })
  function Harness() { const [open, setOpen] = useState(false); return <><button onClick={() => setOpen(true)}>Ver execução</button><ExerciseLibraryDetail exerciseId="cat-1" open={open} onOpenChange={setOpen} /></> }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Harness /></QueryClientProvider>)
  await userEvent.click(screen.getByRole("button", { name: "Ver execução" }))
  expect(await screen.findByText("Autoria completa", { exact: false })).toBeVisible()
  expect(screen.getByRole("link", { name: "CC BY 4.0" })).toBeVisible()
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  expect(screen.getByRole("button", { name: "Ver execução" })).toHaveFocus()
})


it("excludes_both_saved_detail_content_and_its_overlay_from_print", () => {
  render(<ExerciseLibraryDetail open onOpenChange={() => {}} saved={{ name: "Prancha salva", snapshot: { revision: "r1", instruction: "Apoio estável" } }} />)
  const content = screen.getByRole("dialog")
  const overlay = content.previousElementSibling
  expect(overlay).toHaveAttribute("data-slot", "dialog-overlay")
  expect(overlay).toHaveClass("fixed", "bg-black/50", "print:hidden")
  expect(content).toHaveClass("print:hidden")
  expect(screen.getByText("Prancha salva")).toBeVisible()
})

it("keeps_other_dialog_overlays_unchanged_without_explicit_opt_in", () => {
  render(<Dialog open><DialogContent><DialogTitle>Outro diálogo</DialogTitle><DialogDescription>Conteúdo existente</DialogDescription></DialogContent></Dialog>)
  const content = screen.getByRole("dialog")
  const overlay = content.previousElementSibling
  expect(overlay).toHaveAttribute("data-slot", "dialog-overlay")
  expect(overlay).toHaveClass("fixed", "bg-black/50")
  expect(overlay).not.toHaveClass("print:hidden")
  expect(content).not.toHaveClass("print:hidden")
})
