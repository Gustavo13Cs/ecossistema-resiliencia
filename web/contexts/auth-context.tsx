"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AsyncState } from "@/components/feedback/AsyncState"
import { advanceAuthSessionEpoch, api, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import type { AuthUser } from "@/types/auth"
import { discardLegacyClinicalStorage } from "@/lib/discard-legacy-clinical-storage"
import { isPublicRoute } from "@/lib/public-routes"

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

type AuthSessionResponse = {
  user: AuthUser
  csrfToken: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const allowedRoles = new Set(["ADMIN", "NUTRITIONIST", "PERSONAL", "PHYSIO"])

const isAllowedRole = (role?: string) => allowedRoles.has(role ?? "")

const getRedirectPath = (role?: string) => {
  if (role === 'ADMIN') return '/home'
  return '/home'
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

  const setAuthenticatedUser = useCallback((nextUser: AuthUser) => {
    sessionExpired.current = false
    setUser((currentUser) => {
      if (currentUser?.sub && currentUser.sub !== nextUser.sub) {
        queryClient.clear()
      }
      return nextUser
    })
  }, [queryClient])

  const handleUnauthorized = useCallback(() => {
    if (sessionExpired.current) return

    sessionExpired.current = true
    hydrateAbortRef.current?.abort()
    hydrateAbortRef.current = null
    advanceAuthSessionEpoch()
    sessionGenerationRef.current += 1
    queryClient.clear()
    setCsrfToken(null)
    setUser(null)
    setIsLoading(false)
    router.replace("/auth/login?reason=session-expired")
  }, [queryClient, router])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  // Ao montar o provider (ex: refresh de página), tenta hidratar o usuário
  // a partir do cookie HttpOnly via GET /auth/me; o interceptor recupera access
  // expirado com CSRF -> refresh -> uma nova tentativa de me.
  // O browser envia o cookie automaticamente — sem precisar de localStorage.
  useEffect(() => {
    let isActive = true
    const controller = new AbortController()
    hydrateAbortRef.current = controller
    const generation = ++sessionGenerationRef.current

    const hydrateUser = async () => {
      discardLegacyClinicalStorage()
      try {
        const { data } = await api.get<AuthSessionResponse>('/auth/me', {
          signal: controller.signal,
        })
        if (!isActive || sessionGenerationRef.current !== generation) {
          return
        }
        setCsrfToken(data.csrfToken)
        setAuthenticatedUser(data.user)
      } catch {
        // Cookie expirado ou ausente — usuário não autenticado
        if (!isActive || sessionGenerationRef.current !== generation) {
          return
        }
        queryClient.clear()
        setCsrfToken(null)
        setUser(null)
      } finally {
        if (hydrateAbortRef.current === controller) {
          hydrateAbortRef.current = null
        }
        if (isActive && sessionGenerationRef.current === generation) {
          setIsLoading(false)
        }
      }
    }

    void hydrateUser()
    return () => {
      isActive = false
      controller.abort()
      if (hydrateAbortRef.current === controller) {
        hydrateAbortRef.current = null
      }
    }
  }, [queryClient, setAuthenticatedUser])

  useEffect(() => {
    if (!isLoading) {
      if (user && !isAllowedRole(user.role)) {
        if (invalidRoleLogoutUserId.current === user.sub) {
          return
        }

        invalidRoleLogoutUserId.current = user.sub
        hydrateAbortRef.current?.abort()
        hydrateAbortRef.current = null
        advanceAuthSessionEpoch()
        sessionGenerationRef.current += 1
        void (async () => {
          try {
            await api.post('/auth/logout')
          } finally {
            queryClient.clear()
            setCsrfToken(null)
            setUser(null)
            router.replace('/auth/login')
          }
        })()
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
  }, [user, isLoading, pathname, queryClient, router])

  // Chamado pelo componente de login APÓS a requisição POST /auth/login ter sido feita com sucesso.
  // O cookie já foi setado pelo servidor — basta buscar os dados do usuário.
  const login = async () => {
    hydrateAbortRef.current?.abort()
    hydrateAbortRef.current = null
    advanceAuthSessionEpoch()
    const generation = ++sessionGenerationRef.current
    try {
      const { data } = await api.get<AuthSessionResponse>('/auth/me')
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
    }
  }

  // Chama o endpoint de logout no servidor para limpar o cookie HttpOnly.
  // JavaScript não tem acesso ao cookie — só o servidor pode apagá-lo.
  const logout = async () => {
    hydrateAbortRef.current?.abort()
    hydrateAbortRef.current = null
    advanceAuthSessionEpoch()
    sessionGenerationRef.current += 1
    try {
      await api.post('/auth/logout')
    } finally {
      queryClient.clear()
      setCsrfToken(null)
      setUser(null)
      setIsLoading(false)
      router.push("/auth/login")
    }
  }

  if (shouldBlockContent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sm-canvas)] px-4 py-8">
        <div className="w-full max-w-xl">
          <AsyncState
            kind="loading"
            title="Carregando sua área profissional"
            description="Verificando sua sessão segura."
          />
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
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
