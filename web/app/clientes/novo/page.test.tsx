import { makeTestClient } from "@/test/client-fixture";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import NovoClientePage from "./page";
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "personal", role: "PERSONAL" } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const http = new AxiosMockAdapter(api);
afterEach(() => {
    cleanup();
    http.reset();
    navigation.push.mockReset();
});
it("invalidates_training_workspace_after_real_student_creation", async () => {
    http.onPost("/clients").reply(201, makeTestClient("c1", "Bruno", "ACTIVE"));
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    cache.setQueryData(queryKeys.trainingWorkspace("personal"), { counts: { activeStudents: 0 } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={cache}><NovoClientePage /></QueryClientProvider>);
    await user.type(screen.getByRole("textbox", { name: /Nome completo/ }), "Bruno");
    await user.click(screen.getByRole("button", { name: "Salvar aluno" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes"));
    expect(cache.getQueryState(queryKeys.trainingWorkspace("personal"))?.isInvalidated).toBe(true);
});

function WorkspaceObservers() {
    useQuery({
        queryKey: queryKeys.clients("personal", "ACTIVE"),
        queryFn: async () => (await api.get("/clients")).data,
    });
    useQuery({
        queryKey: queryKeys.trainingWorkspace("personal"),
        queryFn: async () => (await api.get("/workouts/workspace")).data,
    });
    return null;
}

it("invalidates_clients_and_training_workspace_in_parallel_before_navigating", async () => {
    http.onGet("/clients").reply(200, []);
    http.onGet("/workouts/workspace").reply(200, { counts: { activeStudents: 0 } });
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
        <QueryClientProvider client={cache}>
            <WorkspaceObservers />
            <NovoClientePage />
        </QueryClientProvider>,
    );
    await waitFor(() =>
        expect(http.history.get.map((req) => req.url).sort()).toEqual(["/clients", "/workouts/workspace"]),
    );

    let resolveClients!: (res: [number, unknown]) => void;
    let resolveWorkspace!: (res: [number, unknown]) => void;
    let clientsRefetchStarted = false;
    let workspaceRefetchStarted = false;
    http.onPost("/clients").reply(201, makeTestClient("c1", "Bruno", "ACTIVE"));
    http.onGet("/clients").reply(() => {
        clientsRefetchStarted = true;
        return new Promise((resolve) => {
            resolveClients = resolve;
        });
    });
    http.onGet("/workouts/workspace").reply(() => {
        workspaceRefetchStarted = true;
        return new Promise((resolve) => {
            resolveWorkspace = resolve;
        });
    });

    await user.type(screen.getByRole("textbox", { name: /Nome completo/ }), "Bruno");
    await user.click(screen.getByRole("button", { name: "Salvar aluno" }));

    await waitFor(() => {
        expect(clientsRefetchStarted).toBe(true);
        expect(workspaceRefetchStarted).toBe(true);
    });
    expect(navigation.push).not.toHaveBeenCalled();

    resolveClients([200, [makeTestClient("c1", "Bruno", "ACTIVE")]]);
    resolveWorkspace([200, { counts: { activeStudents: 1 } }]);
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/clientes"));
    cache.clear();
});
