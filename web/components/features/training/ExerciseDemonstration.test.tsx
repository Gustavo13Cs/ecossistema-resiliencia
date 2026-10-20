import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"
import type { DemonstrationPresentation } from "@/types/exercise-demonstration"
import { ExerciseDemonstration } from "./ExerciseDemonstration"

afterEach(cleanup)
const asset = { id: "a", type: "IMAGE" as const, url: "https://cdn.jsdelivr.net/gh/bryllim/workout-guide@aac599224bb9780305239607ef98540b7e0ce389/packages/workout-guide/assets/exercise-bench-press.svg", alt: "Posição do supino", author: "Autor <script>alert(1)</script>", licenseName: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", sourcePageUrl: "https://github.com/bryllim/workout-guide", upstreamSourcePageUrl: "https://github.com/everkinetic/data", changes: "Cores alteradas", displayAllowed: true }
const snapshot: DemonstrationPresentation = { revision: "r1", instruction: "Mantenha o apoio estável.", assets: [asset] }
it("media_404_keeps_text_and_prescription_actions", () => {
  const unavailable = vi.fn()
  render(<><ExerciseDemonstration snapshot={snapshot} onUnavailable={unavailable} /><button>Adicionar ao treino</button></>)
  const image = screen.getByRole("img")
  expect(image).toHaveAttribute("loading", "lazy")
  expect(image).toHaveAttribute("referrerpolicy", "no-referrer")
  expect(screen.getByText("Ilustração")).toBeVisible()
  fireEvent.error(image)
  expect(screen.queryByRole("img")).not.toBeInTheDocument()
  expect(screen.getByText("Demonstração indisponível")).toBeVisible()
  expect(screen.getByText(snapshot.instruction)).toBeVisible()
  expect(screen.getByRole("button", { name: "Adicionar ao treino" })).toBeEnabled()
  expect(unavailable).toHaveBeenCalledOnce()
})
it("withdrawn_asset_is_not_rendered", () => {
  const { container } = render(<ExerciseDemonstration snapshot={{ ...snapshot, assets: [{ ...asset, displayAllowed: false }] }} />)
  expect(container.querySelector("img,video,iframe,script")).toBeNull()
  expect(screen.getByText("Demonstração indisponível")).toBeVisible()
})
it("video_requires_user_action", async () => {
  const { container } = render(<ExerciseDemonstration snapshot={{ ...snapshot, assets: [{ ...asset, type: "VIDEO" }] }} />)
  expect(container.querySelector("video")).toBeNull()
  await userEvent.click(screen.getByRole("button", { name: "Carregar vídeo" }))
  expect(container.querySelector("video")).toHaveAttribute("controls")
  expect(container.querySelector("video")).not.toHaveAttribute("autoplay")
  expect(container.querySelector("video")).not.toHaveAttribute("loop")
  expect(container.querySelector("iframe,script")).toBeNull()
})
it("own_video_opens_only_safe_external_link", () => {
  const { rerender, container } = render(<ExerciseDemonstration snapshot={{ revision: "1", instruction: "", personalVideoUrl: "https://www.youtube.com/watch?v=abcdefghijk" }} />)
  const link = screen.getByRole("link", { name: "Abrir vídeo" })
  expect(link).toHaveAttribute("target", "_blank")
  expect(link).toHaveAttribute("rel", "noopener noreferrer")
  expect(link).toHaveAttribute("referrerpolicy", "no-referrer")
  for (const url of ["javascript:alert(1)", "https://youtube.com.evil.com/watch?v=abcdefghijk", "https://user:pass@www.youtube.com/watch?v=abcdefghijk", "https://www.youtube.com/watch?v=abcdefghijk&tracking=1"]) {
    rerender(<ExerciseDemonstration snapshot={{ revision: "1", instruction: "", personalVideoUrl: url }} />)
    expect(screen.queryByRole("link", { name: "Abrir vídeo" })).toBeNull()
  }
  expect(container.querySelector("iframe,script")).toBeNull()
})
it("renders complete escaped credits and manual fallback", () => {
  const { container, rerender } = render(<ExerciseDemonstration snapshot={snapshot} />)
  expect(screen.getByText(asset.author, { exact: false })).toBeVisible()
  expect(screen.getByText("Cores alteradas", { exact: false })).toBeVisible()
  expect(screen.getByRole("link", { name: "Fonte original" })).toHaveAttribute("href", asset.upstreamSourcePageUrl)
  expect(container.querySelector("script")).toBeNull()
  rerender(<ExerciseDemonstration snapshot={null} />)
  expect(screen.getByText("Demonstração indisponível")).toBeVisible()
})
