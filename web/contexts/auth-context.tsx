"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import axios from "axios"
import { createPortal } from "react-dom"
import { readSessionEvent, sessionEvents } from "@/lib/session-events"
import { subscribeToSessionResume } from "@/lib/session-resume"
import { useRouter, usePathname } from "next/navigation"
import { AsyncState } from "@/components/feedback/AsyncState"
import { SessionScreen } from "@/components/auth/SessionScreen"
import sessionStyles from "@/components/auth/SessionScreen.module.css"
import { advanceAuthSessionEpoch, api, extractSessionPayload, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import type { AuthUser, UserRole } from "@/types/auth"
import { discardLegacyClinicalStorage } from "@/lib/discard-legacy-clinical-storage"
import { isPublicRoute } from "@/lib/public-routes"

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (response?: unknown) => Promise<void>;
  logout: () => Promise<void>;
}

type AuthSessionResponse = {
  user: AuthUser
  csrfToken: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const allowedRoles = new Set(["ADMIN", "NUTRITIONIST", "PERSONAL", "PHYSIO"])

const isAllowedRole = (role?: string): role is UserRole => allowedRoles.has(role ?? "")

const getRedirectPath = (role?: string) => {
  if (role === 'ADMIN') return '/home'
  return '/home'
}

async function confirmLogin(response: unknown, signal: AbortSignal): Promise<AuthSessionResponse> {
  const session = extractSessionPayload(response)
  if (session && isAllowedRole(session.user.role) && response && typeof response === "object" &&
      "cookieReceipt" in response && typeof response.cookieReceipt === "string") {
    const confirmation = await fetch("/auth/login", {
      method: "HEAD", cache: "no-store", credentials: "same-origin", redirect: "error", signal,
      headers: { "X-Login-Receipt": response.cookieReceipt },
    }).catch(() => null)
    signal.throwIfAborted()
    if (confirmation?.status === 204) {
      return { user: { ...session.user, role: session.user.role }, csrfToken: session.csrfToken }
    }
  }
  // Respostas e deployments anteriores continuam a confirmar a sessão pela API.
  const { data } = await api.get<AuthSessionResponse>("/auth/me", { signal })
  if (session && session.user.sub !== data.user.sub) throw new Error("A conta da sessão mudou.")
  return data
}

async function sessionAlreadyEnded(logoutError: unknown) {
  if (!axios.isAxiosError(logoutError) || logoutError.response?.status !== 401) return false
  try {
    await api.get("/auth/me", { timeout: 12_000 })
    return false
  } catch (error) {
    return axios.isAxiosError(error) && error.response?.status === 401
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const invalidRoleLogoutUserId = useRef<string | null>(null)
  const sessionExpired = useRef(false)
  const sessionGenerationRef = useRef(0)
  const hydrateAbortRef = useRef<AbortController | null>(null)
  const onPublicRoute = isPublicRoute(pathname)
  const isInvalidRole = Boolean(user && !isAllowedRole(user.role))
  const isAdminRedirecting = user?.role === 'ADMIN' && pathname !== '/home'
  const shouldBlockContent =
    (!onPublicRoute && isLoading) || isInvalidRole || isAdminRedirecting

  const subject = useRef<string | null>(null)
  const events = useRef<ReturnType<typeof sessionEvents> | null>(null)
  const logoutLocked = useRef(false)
  const [logoutState, setLogoutState] = useState<"idle" | "sending" | "pending">("idle")
  const [verification, setVerification] = useState<"idle" | "checking" | "offline">("idle")

  const clearIdentity = useCallback(() => {
    subject.current = null
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  const setAuthenticatedUser = useCallback((nextUser: AuthUser) => {
    sessionExpired.current = false
    if (subject.current && subject.current !== nextUser.sub) queryClient.clear()
    subject.current = nextUser.sub
    setUser(nextUser)
  }, [queryClient])

  const interruptSessionCheck = useCallback(() => {
    hydrateAbortRef.current?.abort()
    hydrateAbortRef.current = null
    advanceAuthSessionEpoch()
    setVerification("idle")
    return ++sessionGenerationRef.current
  }, [])

  const handleUnauthorized = useCallback(() => {
    if (sessionExpired.current || logoutLocked.current) return

    sessionExpired.current = true
    interruptSessionCheck()
    clearIdentity()
    setCsrfToken(null)
    setIsLoading(false)
    router.replace("/auth/login?reason=session-expired")
  }, [clearIdentity, interruptSessionCheck, router])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  const checkSession = useCallback(async () => {
    if (hydrateAbortRef.current || logoutLocked.current) return
    const controller = new AbortController()
    hydrateAbortRef.current = controller
    const generation = ++sessionGenerationRef.current
    setVerification("checking")
    let retryNeeded = false
    try {
      const { data } = await api.get<AuthSessionResponse>("/auth/me", {
        signal: controller.signal, timeout: 12_000,
      })
      if (generation !== sessionGenerationRef.current) return
      setCsrfToken(data.csrfToken)
      setAuthenticatedUser(data.user)
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return
      if (subject.current && !(axios.isAxiosError(error) && error.response?.status === 401)) {
        retryNeeded = true
        return
      }
      clearIdentity()
      setCsrfToken(null)
    } finally {
      if (hydrateAbortRef.current === controller) {
        hydrateAbortRef.current = null
        setVerification(retryNeeded ? "offline" : "idle")
        setIsLoading(false)
      }
    }
  }, [clearIdentity, setAuthenticatedUser])

  useEffect(() => {
    discardLegacyClinicalStorage()
    const applyTransition = (transition: "pending" | "signed-out" | "signed-in") => {
      interruptSessionCheck()
      clearIdentity()
      setCsrfToken(null)
      logoutLocked.current = transition === "pending"
      setLogoutState(logoutLocked.current ? "pending" : "idle")
      setIsLoading(transition === "signed-in")
      if (transition === "signed-in") void checkSession()
    }
    const bus = sessionEvents(event => applyTransition(event.transition))
    events.current = bus
    const resume = () => {
      if (document.visibilityState === "hidden") return
      const saved = readSessionEvent()
      if (saved?.transition === "pending") {
        if (!logoutLocked.current) applyTransition("pending")
        return
      }
      if (logoutLocked.current && saved) {
        applyTransition(saved.transition)
        return
      }
      void checkSession()
    }
    const unsubscribeResume = subscribeToSessionResume(resume)
    if (readSessionEvent()?.transition === "pending") applyTransition("pending")
    else void checkSession()
    return () => {
      sessionGenerationRef.current++
      hydrateAbortRef.current?.abort()
      hydrateAbortRef.current = null
      events.current = null
      bus.close()
      unsubscribeResume()
    }
  }, [checkSession, clearIdentity, interruptSessionCheck])

  const logout = useCallback(async () => {
    const generation = interruptSessionCheck()
    logoutLocked.current = true
    setLogoutState("sending")
    clearIdentity()
    events.current?.publish("pending")
    try {
      await api.post("/auth/logout", undefined, { timeout: 12_000 })
    } catch (error) {
      if (!(await sessionAlreadyEnded(error))) {
        if (generation === sessionGenerationRef.current) setLogoutState("pending")
        return
      }
    }
    if (generation !== sessionGenerationRef.current) return
    setCsrfToken(null)
    events.current?.publish("signed-out")
    logoutLocked.current = false
    setLogoutState("idle")
    setIsLoading(false)
    router.replace("/auth/login")
  }, [clearIdentity, interruptSessionCheck, router])

  useEffect(() => {
    if (!isLoading && !logoutLocked.current) {
      if (user && !isAllowedRole(user.role)) {
        if (invalidRoleLogoutUserId.current === user.sub) {
          return
        }

        invalidRoleLogoutUserId.current = user.sub
        void logout()
        return
      }

      invalidRoleLogoutUserId.current = null
      const isPublic = isPublicRoute(pathname)

      if (!user && !isPublic && !sessionExpired.current) {
        router.replace("/auth/login")
      } else if (user) {
        if (user.role === 'ADMIN' && pathname !== '/home') {
          router.replace('/home')
        } else if (isPublic) {
          router.push(getRedirectPath(user.role))
        }
      }
    }
  }, [user, isLoading, pathname, logout, router])

  const login = async (response?: unknown) => {
    const generation = interruptSessionCheck()
    const controller = new AbortController()
    hydrateAbortRef.current = controller
    events.current?.publish("signed-in")
    try {
      const data = await confirmLogin(response, controller.signal)
      if (sessionGenerationRef.current !== generation) {
        return
      }
      setCsrfToken(data.csrfToken)
      setAuthenticatedUser(data.user)
      setIsLoading(false)
      router.push(getRedirectPath(data.user.role))
    } catch (error) {
      if (sessionGenerationRef.current === generation) {
        setIsLoading(false)
      }
      throw error
    } finally {
      if (hydrateAbortRef.current === controller) hydrateAbortRef.current = null
    }
  }

  if (logoutState === "pending") {
    return (
      <AsyncState kind="error" title="Saída pendente"
        description="Confirme a saída antes de deixar este dispositivo."
        action={<button type="button" onClick={() => void logout()}>Tentar sair novamente</button>}
      />
    )
  }

  if (shouldBlockContent || logoutState === "sending") {
    return (
      <SessionScreen
        title={logoutState === "sending" ? "Encerrando sua sessão" : "Carregando sua área profissional"}
        description={logoutState === "sending" ? "Aguarde enquanto concluímos sua saída." : "Verificando sua sessão segura."}
      />
    )
  }

  return (
    <AuthContext.Provider key={onPublicRoute ? "public" : user?.sub ?? "anonymous"} value={{ user, isLoading, login, logout }}>
      {user && !onPublicRoute && verification !== "idle" && createPortal(
        <div data-session-shield="" className={sessionStyles.shield}>
          {/* A máscara inclui diálogos em portals e mantém formulários montados. */}
          <style>{'body > :not([data-session-shield]) { display: none !important; }'}</style>
          <SessionScreen
            isOffline={verification === "offline"}
            title={verification === "offline" ? "Não foi possível verificar sua sessão" : "Verificando sua sessão"}
            description={verification === "offline" ? "Confira sua conexão e tente novamente para continuar." : "Estamos confirmando seu acesso à área profissional."}
            onRetry={() => void checkSession()}
          />
        </div>, document.body,
      )}
      <div className={!onPublicRoute && verification === "idle" ? sessionStyles.reveal : undefined}>
        {children}
      </div>
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
