import { makeTestClient } from "@/test/client-fixture";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { ProfessionalDashboard } from "../dashboard/ProfessionalDashboard";
import type { AuthUser } from "@/types/auth";
const auth = vi.hoisted(() => ({ user: { sub: "personal", role: "PERSONAL", name: "Ana" } as AuthUser | null }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const http = new AxiosMockAdapter(api);
const workspace = { counts: { activeStudents: 7, archivedStudents: 2, withoutActiveWorkout: 3 }, items: [{ clientId: "c1", name: "Bruno", goal: "Força", updatedAt: "2026-10-14T12:00:00Z", section: "WITHOUT_ACTIVE_WORKOUT" }, { clientId: "c1", name: "Bruno", goal: "Força", updatedAt: "2026-10-14T12:00:00Z", section: "RECENT" }] };
function mount() {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    return { cache, ...render(<QueryClientProvider client={cache}><ProfessionalDashboard /></QueryClientProvider>) };
}
beforeEach(() => {
  vi.stubGlobal("navigation", Object.assign(new EventTarget(), { traverseTo: vi.fn() }))
    http.reset();
    auth.user = { sub: "personal", role: "PERSONAL", name: "Ana" };
    http.onGet("/workouts/workspace").reply(200, workspace);
    http.onGet("/appointments").reply(200, []);
    navigation.push.mockReset();
});
afterEach(cleanup);
it("shows_personal_work_without_generic_directory_queries", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: "Área de treinamento" })).toBeVisible();
    expect(await screen.findByText("7")).toBeVisible();
    const pending = screen.getByRole("region", { name: "Alunos sem treino ativo" });
    expect(within(pending).getByRole("link", { name: "Criar prescrição para Bruno" })).toHaveAttribute("href", "/clientes/c1/novo-treino");
    expect(http.history.get.map(r => r.url)).not.toContain("/clients");
    expect(http.history.get.map(r => r.url)).not.toContain("/users");
    expect(screen.getByRole("link", { name: "Novo aluno" })).toHaveAttribute("href", "/clientes/novo");
});
it("distinguishes_new_and_archived_only_accounts", async () => {
    http.onGet("/workouts/workspace").reply(200, { counts: { activeStudents: 0, archivedStudents: 2, withoutActiveWorkout: 0 }, items: [] });
    const view = mount();
    expect(await screen.findByText("Sua base tem apenas alunos arquivados")).toBeVisible();
    expect(screen.queryByText("Sua base começa aqui")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver alunos arquivados" })).toHaveAttribute("href", "/clientes?status=ARCHIVED");
    view.unmount();
    http.onGet("/workouts/workspace").reply(200, { counts: { activeStudents: 0, archivedStudents: 0, withoutActiveWorkout: 0 }, items: [] });
    mount();
    expect(await screen.findByText("Sua base começa aqui")).toBeVisible();
    expect(screen.getByText("Cadastrar aluno → Registrar avaliação → Criar treino")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Compromissos de hoje" })).toBeVisible();
});
it("keeps_successful_blocks_when_agenda_fails", async () => {
    http.onGet("/appointments").reply(503);
    mount();
    expect(await screen.findByText("Agenda indisponível")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
});
it("never_fabricates_counts_on_workspace_failure", async () => {
    http.onGet("/workouts/workspace").reply(503);
    mount();
    expect(await screen.findByText("Resumo indisponível")).toBeVisible();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(await screen.findByText("Nenhum compromisso para hoje")).toBeVisible();
});
it.each([["workspace", 401], ["workspace", 403], ["agenda", 401], ["agenda", 403]] as const)("removes_usable_content_on_%s_%s_even_with_cached_success", async (target, status) => {
    const { cache } = mount();
    await screen.findByText("7");
    http.onGet("/auth/csrf").reply(401);
    if (target === "workspace") {
        http.onGet("/workouts/workspace").reply(status);
        await cache.invalidateQueries({ queryKey: queryKeys.trainingWorkspace("personal") });
    }
    else {
        http.onGet("/appointments").reply(status);
        await cache.invalidateQueries({ queryKey: queryKeys.appointmentsRoot("personal") });
    }
    expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible();
    expect(screen.queryByText("Bruno")).not.toBeInTheDocument();
    expect(screen.queryByText("7")).not.toBeInTheDocument();
});
it("dispatches_role_changes_and_absent_accounts_without_hook_order_regression", async () => {
    const view = mount();
    await screen.findByText("7");
    auth.user = { sub: "nutri", role: "NUTRITIONIST" };
    http.onGet("/clients").reply(200, []);
    view.rerender(<QueryClientProvider client={view.cache}><ProfessionalDashboard /></QueryClientProvider>);
    expect(await screen.findByText("Sua base começa aqui")).toBeVisible();
    const calls = http.history.get.length;
    auth.user = null;
    view.rerender(<QueryClientProvider client={view.cache}><ProfessionalDashboard /></QueryClientProvider>);
    expect(screen.getByText("Base privada indisponível")).toBeVisible();
    expect(http.history.get).toHaveLength(calls);
});
it("opens_active_student_picker_and_routes_selected_client", async () => {
    http.onGet("/clients", { params: { status: "ACTIVE" } }).reply(200, [makeTestClient("c1", "Bruno", "ACTIVE")]);
    const user = userEvent.setup();
    mount();
    await screen.findByText("7");
    await user.click(screen.getByRole("button", { name: "Nova prescrição" }));
    await user.click(await screen.findByRole("button", { name: "Selecionar Bruno" }));
    expect(navigation.push).toHaveBeenCalledWith("/clientes/c1/novo-treino");
});
it("removes_dashboard_content_when_picker_access_is_denied", async () => {
    http.onGet("/clients").reply(403);
    const user = userEvent.setup();
    mount();
    await screen.findByText("7");
    await user.click(screen.getByRole("button", { name: "Nova prescrição" }));
    expect(await screen.findByText("Restabeleça seu acesso")).toBeVisible();
    expect(screen.queryByText("Bruno")).not.toBeInTheDocument();
    expect(screen.queryByText("7")).not.toBeInTheDocument();
});

afterEach(() => vi.unstubAllGlobals())
