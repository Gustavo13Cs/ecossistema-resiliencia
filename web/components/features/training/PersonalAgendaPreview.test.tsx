import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Appointment } from "@/types/appointment";
import type { usePersonalDayAgenda } from "@/hooks/features/usePersonalDayAgenda";
import { PersonalAgendaPreview } from "./PersonalAgendaPreview";
afterEach(cleanup);
function appointment(id: string, hour: number, status: Appointment["status"] = "SCHEDULED"): Appointment {
    return { id, professionalId: "p", clientId: id, client: { id, name: `Aluno ${id}`, status: "ACTIVE" }, kind: "SESSION", status, modality: "ONLINE", startsAt: `2026-10-14T${hour}:00:00Z`, endsAt: `2026-10-14T${hour}:30:00Z`, timeZone: "America/Sao_Paulo", location: null, meetingUrl: null, notes: null, cancellationReason: null, cancelledAt: null, createdAt: "2026-10-13T12:00:00Z", updatedAt: "2026-10-13T12:00:00Z" };
}
it("excludes_cancelled_and_keeps_status_with_five_in_start_order", () => {
    const appointments = [appointment("late", 18), appointment("cancelled", 10, "CANCELLED"), appointment("done", 12, "COMPLETED"), appointment("missed", 13, "NO_SHOW"), appointment("third", 14), appointment("fourth", 15), appointment("fifth", 16)];
    const agenda = { appointments, timeZone: "America/Sao_Paulo", state: "ready", refetch: vi.fn() } as unknown as ReturnType<typeof usePersonalDayAgenda>;
    render(<PersonalAgendaPreview agenda={agenda}/>);
    const list = screen.getByRole("list", { name: "Compromissos de hoje" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getAllByRole("link")[0]).toHaveTextContent("Aluno done");
    expect(screen.getByText("Concluído")).toBeVisible();
    expect(screen.getByText("Faltou")).toBeVisible();
    expect(screen.queryByText("Aluno cancelled")).not.toBeInTheDocument();
    expect(screen.queryByText("Aluno late")).not.toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeVisible();
    expect(screen.getAllByText("Sessão · Online")).toHaveLength(5);
});
