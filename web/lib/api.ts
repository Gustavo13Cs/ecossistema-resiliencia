import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"])
const AUTH_401_PATHS = new Set(["/auth/me", "/auth/login", "/auth/logout"])
const NO_AUTH_REFRESH_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/csrf"])

let csrfToken: string | null = null
let unauthorizedHandler: (() => void) | null = null
let csrfRefreshPromise: Promise<string> | null = null
let authRefreshPromise: Promise<void> | null = null

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _csrfRetry?: boolean
  _authRetry?: boolean
}

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function requestPath(url?: string) {
  if (!url) return ""

  try {
    return new URL(url, "http://safemove.local").pathname
  } catch {
    return url.split("?", 1)[0]
  }
}

function isUnauthorized(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401
}

function isCsrfRejection(error: unknown): error is {
  config: RetriableRequestConfig
  response: { status: number; data?: { message?: unknown } }
} {
  if (!axios.isAxiosError(error) || !error.config) return false

  const method = error.config.method?.toLowerCase()
  const message = error.response?.data?.message
  return (
    error.response?.status === 403 &&
    Boolean(method && UNSAFE_METHODS.has(method)) &&
    message === "Token CSRF inválido." &&
    !(error.config as RetriableRequestConfig)._csrfRetry
  )
}

async function refreshCsrfToken() {
  if (!csrfRefreshPromise) {
    csrfRefreshPromise = api
      .get<{ csrfToken: string }>("/auth/csrf")
      .then(({ data }) => {
        if (typeof data.csrfToken !== "string" || data.csrfToken.length === 0) {
          throw new Error("Sessão sem token CSRF válido")
        }
        setCsrfToken(data.csrfToken)
        return data.csrfToken
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) setCsrfToken(null)
        throw error
      })
      .finally(() => {
        csrfRefreshPromise = null
      })
  }

  return csrfRefreshPromise
}

async function refreshAuthSession() {
  if (!authRefreshPromise) {
    const rotate = async () => {
      await refreshCsrfToken()
      const { data } = await api.post<{ csrfToken: string }>("/auth/refresh")
      if (typeof data.csrfToken !== "string" || !data.csrfToken) throw new Error("Sessão sem token CSRF válido")
      setCsrfToken(data.csrfToken)
    }
    const recover = async () => {
      if (typeof navigator === "undefined" || !navigator.locks) return rotate()

      await navigator.locks.request("safemove-auth-refresh", async () => {
        // Outra aba pode ter renovado os cookies enquanto aguardávamos o lock.
        const session = await api.get<{ csrfToken?: string }>("/auth/me", { validateStatus: () => true })
        if (session.status === 200) {
          if (typeof session.data.csrfToken === "string" && session.data.csrfToken) setCsrfToken(session.data.csrfToken)
          else await refreshCsrfToken()
          return
        }
        if (session.status !== 401) throw new AxiosError("Não foi possível verificar a sessão", AxiosError.ERR_BAD_RESPONSE, session.config, session.request, session)
        await rotate()
      })
    }
    authRefreshPromise = recover().catch((error: unknown) => {
      if (isUnauthorized(error)) setCsrfToken(null)
      throw error
    }).finally(() => { authRefreshPromise = null })
  }
  return authRefreshPromise
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Envia os cookies HttpOnly automaticamente em toda requisição
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase()
  if (csrfToken && method && UNSAFE_METHODS.has(method)) {
    config.headers["X-CSRF-Token"] = csrfToken
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (isCsrfRejection(error)) {
      const freshToken = await refreshCsrfToken()
      error.config._csrfRetry = true
      error.config.headers["X-CSRF-Token"] = freshToken
      return api.request(error.config)
    }

    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !NO_AUTH_REFRESH_PATHS.has(requestPath(error.config.url))
    ) {
      const config = error.config as RetriableRequestConfig
      if (!config._authRetry) {
        config._authRetry = true
        try {
          await refreshAuthSession()
        } catch (refreshError) {
          if (isUnauthorized(refreshError) && !AUTH_401_PATHS.has(requestPath(config.url))) unauthorizedHandler?.()
          throw refreshError
        }
        return api.request(config)
      }
      setCsrfToken(null)
      if (!AUTH_401_PATHS.has(requestPath(config.url))) unauthorizedHandler?.()
    }

    throw error
  },
)
