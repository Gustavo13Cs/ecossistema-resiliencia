import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PeriodizationEditor } from "./PeriodizationEditor"
import { suggestPeriodization } from "@/lib/workout-periodization"

describe("configurador de periodização", () => {
  afterEach(cleanup)
  it("habilita explicitamente e sugere fases sem inventar data", () => {
    const onChange = vi.fn()
    render(<PeriodizationEditor durationWeeks="8" value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole("button",{name:"Configurar periodização"}))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({startsOn:"",phases:expect.any(Array)}),"8")
  })
  it("edita data e progressão sem alterar a configuração original", () => {
    const value = suggestPeriodization(8)
    const onChange = vi.fn()
    render(<PeriodizationEditor durationWeeks="8" value={value} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("Data de início"),{target:{value:"2026-10-23"}})
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({startsOn:"2026-10-23"}))
    expect(value.startsOn).toBe("")
    fireEvent.click(screen.getByLabelText("Ativar progressão programada"))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({progression:{intervalWeeks:2,repsDelta:1,effortDelta:1}}))
  })
  it("bloqueia alterações em prontuário somente leitura", () => {
    render(<PeriodizationEditor durationWeeks="8" value={suggestPeriodization(8)} onChange={vi.fn()} disabled />)
    expect(screen.getByLabelText("Data de início")).toBeDisabled()
    expect(screen.getByRole("button",{name:"Desativar periodização"})).toBeDisabled()
  })
})
