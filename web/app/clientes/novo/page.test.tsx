import { makeTestClient } from "@/test/client-fixture";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
