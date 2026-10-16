import { makeTestClient } from "@/test/client-fixture";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AxiosMockAdapter from "axios-mock-adapter";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { WorkoutClientPicker } from "./WorkoutClientPicker";
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "personal", role: "PERSONAL" } }) }));
const http = new AxiosMockAdapter(api);
afterEach(() => {
    cleanup();
    http.reset();
});
it("fetches_only_active_clients_while_open_and_supports_keyboard_touch_and_close_focus", async () => {
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [makeTestClient("c1", "Bruno", "ACTIVE")]);
    const selected = vi.fn();
    function Harness() {
        const [open, setOpen] = useState(false);
        return <><button onClick={() => setOpen(true)}>Nova prescrição</button><WorkoutClientPicker open={open} onOpenChange={setOpen} onSelect={selected}/></>;
    }
    ;
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={cache}><Harness /></QueryClientProvider>);
    expect(http.history.get).toHaveLength(0);
    const trigger = screen.getByRole("button", { name: "Nova prescrição" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const select = await screen.findByRole("button", { name: "Selecionar Bruno" });
    expect(select).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "Fechar seleção" })).toHaveClass("min-h-11");
    select.focus();
    await user.keyboard("{Enter}");
    expect(selected).toHaveBeenCalledWith("c1");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(http.history.get).toHaveLength(1);
    expect(http.history.get[0].params).toEqual({ status: "ACTIVE" });
});
it("reports_fetch_failure_instead_of_empty_list", async () => {
    http.onGet("/clients").reply(503);
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={cache}><WorkoutClientPicker open onOpenChange={vi.fn()} onSelect={vi.fn()}/></QueryClientProvider>);
    expect(await screen.findByText("Alunos indisponíveis")).toBeVisible();
    expect(screen.queryByText("Nenhum aluno ativo")).not.toBeInTheDocument();
});
