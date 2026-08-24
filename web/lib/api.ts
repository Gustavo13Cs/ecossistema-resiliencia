import axios from "axios";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"])
const AUTH_401_PATHS = new Set(["/auth/me", "/auth/login", "/auth/logout"])

let csrfToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

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
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !AUTH_401_PATHS.has(requestPath(error.config?.url))
    ) {
      unauthorizedHandler?.()
    }

    return Promise.reject(error)
  },
)
