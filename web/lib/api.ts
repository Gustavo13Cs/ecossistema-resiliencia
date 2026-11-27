import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"])
const AUTH_401_PATHS = new Set(["/auth/me", "/auth/login", "/auth/logout"])
const NO_AUTH_REFRESH_PATHS = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/csrf"])

type RefreshedSessionPayload = {
  user: {
    sub: string
    role: string
    email?: string
    name?: string
  }
  csrfToken: string
}

let csrfToken: string | null = null
let unauthorizedHandler: (() => void) | null = null
let authSessionEpoch = 0
let csrfRefreshState: { epoch: number; promise: Promise<string> } | null = null
let authRefreshState: { epoch: number; promise: Promise<RefreshedSessionPayload | null> } | null = null

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

export function extractSessionPayload(
  data: unknown,
  fallbackCsrfToken?: string,
): RefreshedSessionPayload | null {
  if (!data || typeof data !== "object") return null

  const record = data as Record<string, unknown>
  const resolvedCsrfToken =
    typeof record.csrfToken === "string" && record.csrfToken
      ? record.csrfToken
      : typeof fallbackCsrfToken === "string" && fallbackCsrfToken
        ? fallbackCsrfToken
        : ""
  if (!resolvedCsrfToken) return null

  if (!record.user || typeof record.user !== "object") return null
  const userRecord = record.user as Record<string, unknown>
  if (
    typeof userRecord.sub !== "string" ||
    !userRecord.sub ||
    typeof userRecord.role !== "string" ||
    !userRecord.role
  ) {
    return null
  }

  return {
    user: {
      sub: userRecord.sub,
      role: userRecord.role,
      ...(typeof userRecord.email === "string" ? { email: userRecord.email } : {}),
      ...(typeof userRecord.name === "string" ? { name: userRecord.name } : {}),
    },
    csrfToken: resolvedCsrfToken,
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
      .get<{ csrfToken: string }>("/auth/csrf", { timeout: 12_000 })
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

async function refreshAuthSession(
  expectedEpoch: number,
): Promise<RefreshedSessionPayload | null> {
  if (!authRefreshState || authRefreshState.epoch !== expectedEpoch) {
    const rotate = async (): Promise<RefreshedSessionPayload | null> => {
      await refreshCsrfToken(expectedEpoch)
      if (authSessionEpoch !== expectedEpoch) {
        throw new AxiosError(
          "Sessão substituída durante a renovação",
          AxiosError.ERR_CANCELED,
        )
      }
      const { data } = await api.post<{ csrfToken: string; user?: unknown }>(
        "/auth/refresh", undefined, { timeout: 12_000 },
      )
      if (typeof data.csrfToken !== "string" || !data.csrfToken) {
        throw new Error("Sessão sem token CSRF válido")
      }
      updateCsrfTokenIfCurrent(data.csrfToken, expectedEpoch)
      return extractSessionPayload(data)
    }
    const recover = async (): Promise<RefreshedSessionPayload | null> => {
      if (authSessionEpoch !== expectedEpoch) {
        throw new AxiosError(
          "Sessão substituída durante a renovação",
          AxiosError.ERR_CANCELED,
        )
      }
      if (typeof navigator === "undefined" || !navigator.locks) return rotate()

      let acquiredImmediately = false
      let immediateResult: RefreshedSessionPayload | null = null
      await navigator.locks.request(
        "safemove-auth-refresh",
        { ifAvailable: true },
        async (lock) => {
          if (!lock) return
          acquiredImmediately = true
          if (authSessionEpoch !== expectedEpoch) {
            throw new AxiosError(
              "Sessão substituída durante a renovação",
              AxiosError.ERR_CANCELED,
            )
          }
          immediateResult = await rotate()
        },
      )
      if (acquiredImmediately) {
        return immediateResult
      }

      let waitedResult: RefreshedSessionPayload | null = null
      await navigator.locks.request("safemove-auth-refresh", async () => {
        if (authSessionEpoch !== expectedEpoch) {
          throw new AxiosError(
            "Sessão substituída durante a renovação",
            AxiosError.ERR_CANCELED,
          )
        }
        // Outra aba pode ter renovado os cookies enquanto aguardávamos o lock.
        const session = await api.get<{ csrfToken?: string; user?: unknown }>(
          "/auth/me",
          {
            timeout: 12_000,
            validateStatus: () => true,
          },
        )
        if (session.status === 200) {
          let resolvedCsrf: string
          if (
            typeof session.data?.csrfToken === "string" &&
            session.data.csrfToken
          ) {
            updateCsrfTokenIfCurrent(session.data.csrfToken, expectedEpoch)
            resolvedCsrf = session.data.csrfToken
          } else {
            resolvedCsrf = await refreshCsrfToken(expectedEpoch)
          }
          waitedResult = extractSessionPayload(session.data, resolvedCsrf)
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
        waitedResult = await rotate()
      })
      return waitedResult
    }
    let state!: { epoch: number; promise: Promise<RefreshedSessionPayload | null> }
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
        let refreshedSession: RefreshedSessionPayload | null
        try {
          refreshedSession = await refreshAuthSession(requestEpoch)
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
        if (config.signal?.aborted) {
          throw new AxiosError(
            "canceled",
            AxiosError.ERR_CANCELED,
            config,
          )
        }
        if (
          requestPath(config.url) === "/auth/me" &&
          (config.method?.toLowerCase() ?? "get") === "get" &&
          refreshedSession
        ) {
          const response: AxiosResponse<RefreshedSessionPayload> = {
            data: refreshedSession,
            status: 200,
            statusText: "OK",
            headers: {},
            config,
          }
          return response
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
