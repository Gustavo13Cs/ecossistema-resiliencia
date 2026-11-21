import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"])
const AUTH_401_PATHS = new Set(["/auth/me", "/auth/login", "/auth/logout"])
const NO_AUTH_REFRESH_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/csrf"])

let csrfToken: string | null = null
let unauthorizedHandler: (() => void) | null = null
let authSessionEpoch = 0
let csrfRefreshState: { epoch: number; promise: Promise<string> } | null = null
let authRefreshState: { epoch: number; promise: Promise<void> } | null = null

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _csrfRetry?: boolean
  _authRetry?: boolean
  _authEpoch?: number
}

function updateCsrfTokenIfCurrent(token: string | null, expectedEpoch: number) {
  if (authSessionEpoch === expectedEpoch) {
    csrfToken = token
  }
}

/**
 * Advances the client auth epoch so stale in-flight 401/refresh handlers
 * from an earlier session cannot clear or overwrite newer CSRF state.
 */
export function advanceAuthSessionEpoch() {
  authSessionEpoch += 1
}

export function setCsrfToken(token: string | null) {
  authSessionEpoch += 1
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

async function refreshCsrfToken(expectedEpoch: number): Promise<string> {
  if (!csrfRefreshState || csrfRefreshState.epoch !== expectedEpoch) {
    let state!: { epoch: number; promise: Promise<string> }
    const promise = api
      .get<{ csrfToken: string }>("/auth/csrf")
      .then(({ data }) => {
        if (typeof data.csrfToken !== "string" || data.csrfToken.length === 0) {
          throw new Error("Sessão sem token CSRF válido")
        }
        updateCsrfTokenIfCurrent(data.csrfToken, expectedEpoch)
        return data.csrfToken
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          updateCsrfTokenIfCurrent(null, expectedEpoch)
        }
        throw error
      })
      .finally(() => {
        if (csrfRefreshState === state) {
          csrfRefreshState = null
        }
      })
    state = { epoch: expectedEpoch, promise }
    csrfRefreshState = state
  }

  return csrfRefreshState.promise
}

async function refreshAuthSession(expectedEpoch: number): Promise<void> {
  if (!authRefreshState || authRefreshState.epoch !== expectedEpoch) {
    const rotate = async () => {
      await refreshCsrfToken(expectedEpoch)
      if (authSessionEpoch !== expectedEpoch) {
        throw new AxiosError(
          "Sessão substituída durante a renovação",
          AxiosError.ERR_CANCELED,
        )
      }
      const { data } = await api.post<{ csrfToken: string }>("/auth/refresh")
      if (typeof data.csrfToken !== "string" || !data.csrfToken) {
        throw new Error("Sessão sem token CSRF válido")
      }
      updateCsrfTokenIfCurrent(data.csrfToken, expectedEpoch)
    }
    const recover = async () => {
      if (authSessionEpoch !== expectedEpoch) {
        throw new AxiosError(
          "Sessão substituída durante a renovação",
          AxiosError.ERR_CANCELED,
        )
      }
      if (typeof navigator === "undefined" || !navigator.locks) return rotate()

      await navigator.locks.request("safemove-auth-refresh", async () => {
        if (authSessionEpoch !== expectedEpoch) {
          throw new AxiosError(
            "Sessão substituída durante a renovação",
            AxiosError.ERR_CANCELED,
          )
        }
        // Outra aba pode ter renovado os cookies enquanto aguardávamos o lock.
        const session = await api.get<{ csrfToken?: string }>("/auth/me", {
          validateStatus: () => true,
        })
        if (session.status === 200) {
          if (typeof session.data.csrfToken === "string" && session.data.csrfToken) {
            updateCsrfTokenIfCurrent(session.data.csrfToken, expectedEpoch)
          } else {
            await refreshCsrfToken(expectedEpoch)
          }
          return
        }
        if (session.status !== 401) {
          throw new AxiosError(
            "Não foi possível verificar a sessão",
            AxiosError.ERR_BAD_RESPONSE,
            session.config,
            session.request,
            session,
          )
        }
        await rotate()
      })
    }
    let state!: { epoch: number; promise: Promise<void> }
    const promise = recover()
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          updateCsrfTokenIfCurrent(null, expectedEpoch)
        }
        throw error
      })
      .finally(() => {
        if (authRefreshState === state) {
          authRefreshState = null
        }
      })
    state = { epoch: expectedEpoch, promise }
    authRefreshState = state
  }
  return authRefreshState.promise
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Envia os cookies HttpOnly automaticamente em toda requisição
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const retriableConfig = config as RetriableRequestConfig
  retriableConfig._authEpoch ??= authSessionEpoch
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
      const requestEpoch = error.config._authEpoch ?? authSessionEpoch
      if (requestEpoch !== authSessionEpoch) {
        throw error
      }
      const freshToken = await refreshCsrfToken(requestEpoch)
      if (requestEpoch !== authSessionEpoch) {
        throw error
      }
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
      const requestEpoch = config._authEpoch ?? authSessionEpoch
      if (requestEpoch !== authSessionEpoch) {
        throw error
      }
      if (!config._authRetry) {
        config._authRetry = true
        try {
          await refreshAuthSession(requestEpoch)
        } catch (refreshError) {
          if (
            requestEpoch === authSessionEpoch &&
            isUnauthorized(refreshError) &&
            !AUTH_401_PATHS.has(requestPath(config.url))
          ) {
            unauthorizedHandler?.()
          }
          throw refreshError
        }
        if (requestEpoch !== authSessionEpoch) {
          throw error
        }
        return api.request(config)
      }
      if (requestEpoch === authSessionEpoch) {
        updateCsrfTokenIfCurrent(null, requestEpoch)
        if (!AUTH_401_PATHS.has(requestPath(config.url))) {
          unauthorizedHandler?.()
        }
      }
    }

    throw error
  },
)
