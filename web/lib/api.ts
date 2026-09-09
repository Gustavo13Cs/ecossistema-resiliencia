import axios, { type InternalAxiosRequestConfig } from "axios";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"])
const AUTH_401_PATHS = new Set(["/auth/me", "/auth/login", "/auth/logout"])

let csrfToken: string | null = null
let unauthorizedHandler: (() => void) | null = null
let csrfRefreshPromise: Promise<string> | null = null

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _csrfRetry?: boolean
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
      .get<{ csrfToken: string }>("/auth/me")
      .then(({ data }) => {
        if (typeof data.csrfToken !== "string" || data.csrfToken.length === 0) {
          throw new Error("Sessão sem token CSRF válido")
        }
        setCsrfToken(data.csrfToken)
        return data.csrfToken
      })
      .catch((error: unknown) => {
        setCsrfToken(null)
        throw error
      })
      .finally(() => {
        csrfRefreshPromise = null
      })
  }

  return csrfRefreshPromise
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
      !AUTH_401_PATHS.has(requestPath(error.config?.url))
    ) {
      unauthorizedHandler?.()
    }

    throw error
  },
)
