import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import AxiosMockAdapter from "axios-mock-adapter"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { api, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import { ReauthenticateButton } from "./ReauthenticateButton"

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock("next/navigation", () => ({ usePathname: () => "/treinos", useRouter: () => navigation }))
const http = new AxiosMockAdapter(api)
let cache: QueryClient
function Recovery() {
  const { user } = useAuth()
  return <><span>{user?.sub ?? "anonymous"}</span><ReauthenticateButton /></>
}
beforeEach(() => {
  vi.clearAllMocks()
  http.reset()
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  http.onGet("/auth/me").reply(200, {
    user: { sub: "personal", role: "PERSONAL", name: "Personal", email: "personal@example.test" },
    csrfToken: "test-csrf",
  })
})
afterEach(() => { cleanup(); cache.clear(); setCsrfToken(null); setUnauthorizedHandler(null) })

it.each([204, 503])("clears the current session and opens the real login route after logout status %s", async status => {
  http.onPost("/auth/logout").reply(status)
  render(<QueryClientProvider client={cache}><AuthProvider><Recovery /></AuthProvider></QueryClientProvider>)
  await screen.findByText("personal")
  cache.setQueryData(["private-record"], { marker: "cached" })
  fireEvent.click(screen.getByRole("button", { name: "Entrar novamente" }))
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/auth/login"))
  expect(screen.getByText("anonymous")).toBeVisible()
  expect(cache.getQueryData(["private-record"])).toBeUndefined()
  expect(http.history.post.map(request => request.url)).toEqual(["/auth/logout"])
})
