import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ProfessionalRole } from "@/types/auth"
import { ClientForm } from "./ClientForm"

const EXPECTED_FIELD_NAMES: Record<ProfessionalRole, readonly string[]> = {
  NUTRITIONIST: [
    "name", "email", "phone", "birthDate", "gender", "goal", "professionalNotes",
    "privacyNotes", "height", "initialWeight", "allergies", "pathologies", "typicalSleep",
    "stressLevel", "foodRelationship", "psychologyHistory", "workActivityLevel",
  ],
  PERSONAL: [
    "name", "email", "phone", "birthDate", "gender", "goal", "professionalNotes",
    "privacyNotes", "height", "initialWeight", "pathologies", "exerciseType",
    "exerciseFrequency", "exerciseDuration", "hasPersonal", "workActivityLevel",
  ],
  PHYSIO: [
    "name", "email", "phone", "birthDate", "gender", "goal", "professionalNotes",
    "privacyNotes", "height", "initialWeight", "pathologies", "exerciseType",
    "exerciseFrequency", "exerciseDuration", "workActivityLevel",
  ],
}

afterEach(cleanup)

describe("ClientForm role-aware intake", () => {
  it.each(Object.entries(EXPECTED_FIELD_NAMES) as [ProfessionalRole, readonly string[]][])(
    "renders only the %s field policy",
    (role, expectedNames) => {
      const { container } = render(
        <ClientForm
          mode="create"
          role={role}
          submitLabel="Salvar"
          pending={false}
          onSubmit={vi.fn()}
        />,
      )

      const renderedNames = Array.from(container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[name]"))
        .map((field) => field.name)

      expect(renderedNames.sort()).toEqual([...expectedNames].sort())
    },
  )

  it("submits only visible update fields and never nulls hidden initial values", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ updatedAt: "2026-09-03T13:00:00.000Z" })
    const { container } = render(
      <ClientForm
        mode="update"
        role="PERSONAL"
        initialVersion="2026-09-03T12:00:00.000Z"
        initialValues={{
          name: "  Marina Lopes  ",
          allergies: "Campo legado que pertence à nutrição",
          foodRelationship: "Nunca enviar neste workspace",
          exerciseFrequency: "3 vezes por semana",
        }}
        submitLabel="Salvar alterações"
        pending={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const [payload, version] = onSubmit.mock.calls[0]

    expect(Object.keys(payload).sort()).toEqual([...EXPECTED_FIELD_NAMES.PERSONAL].sort())
    expect(payload).toMatchObject({
      name: "Marina Lopes",
      exerciseFrequency: "3 vezes por semana",
    })
    expect(payload).not.toHaveProperty("allergies")
    expect(payload).not.toHaveProperty("foodRelationship")
    expect(version).toBe("2026-09-03T12:00:00.000Z")
  })

  it("keeps nutrition-only controls out of the Personal intake", () => {
    render(
      <ClientForm
        mode="create"
        role="PERSONAL"
        submitLabel="Salvar aluno"
        pending={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText("Frequência de exercícios")).toBeInTheDocument()
    expect(screen.queryByLabelText("Relação com a alimentação")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Alergias e restrições")).not.toBeInTheDocument()
  })
})
