import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AxiosMockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { usePersonalDayAgenda } from "./usePersonalDayAgenda";
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: { sub: "personal", role: "PERSONAL" } }) }));
const http = new AxiosMockAdapter(api);
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T02:59:59.000Z"));
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
        return { ...original.call(this), timeZone: "America/Sao_Paulo" };
    });
    http.onGet("/appointments").reply(200, []);
});
afterEach(() => {
    cleanup();
    http.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
function mount() {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: {
        children: ReactNode;
    }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>;
    return renderHook(() => usePersonalDayAgenda(), { wrapper });
}
it("rolls_day_on_focus_and_midnight_without_provisional_fetch", async () => {
    const { result } = mount();
    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.period).toEqual({ from: "2026-10-14T03:00:00.000Z", to: "2026-10-15T03:00:00.000Z" });
    expect(http.history.get).toHaveLength(1);
    expect(http.history.get[0].params.from).toBe("2026-10-14T03:00:00.000Z");
    await act(async () => {
        await vi.advanceTimersByTimeAsync(1001);
    });
    expect(result.current.period?.from).toBe("2026-10-15T03:00:00.000Z");
    vi.setSystemTime(new Date("2026-10-16T14:00:00Z"));
    await act(async () => {
        window.dispatchEvent(new Event("focus"));
    });
    expect(result.current.period?.from).toBe("2026-10-16T03:00:00.000Z");
    expect(http.history.get.every(r => r.params.from && r.params.to)).toBe(true);
});
it("refreshes_day_when_returning_to_visible_tab", async () => {
    const { result } = mount();
    vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
    await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.period?.from).toBe("2026-10-17T03:00:00.000Z");
});

it("rejects_manual_refresh_until_browser_period_is_resolved", async () => {
  const { result } = mount()
  expect(result.current.period).toBeNull()
  await act(async () => {
    await expect(result.current.refetch()).rejects.toThrow()
  })
  expect(http.history.get).toHaveLength(0)
  expect(result.current.period).toBeNull()
  expect(result.current.state).toBe("loading")
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  const reads = http.history.get.length
  await act(async () => { await result.current.refetch() })
  expect(http.history.get).toHaveLength(reads + 1)
  expect(http.history.get.at(-1)?.params.from).toBe("2026-10-14T03:00:00.000Z")
})
