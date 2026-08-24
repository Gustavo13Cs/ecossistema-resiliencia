"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { api, setCsrfToken, setUnauthorizedHandler } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import type { AuthUser } from "@/types/auth"

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

const publicRoutes = new Set(["/", "/auth/login", "/auth/register"])
const allowedRoles = new Set(["ADMIN", "NUTRITIONIST", "PERSONAL", "PHYSIO"])

const isAllowedRole = (role?: string) => allowedRoles.has(role ?? "")

const getRedirectPath = (role?: string) => {
  if (role === 'ADMIN') return '/home'
  return '/clientes'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const invalidRoleLogoutUserId = useRef<string | null>(null)
  const sessionExpired = useRef(false)
  const isAdminRedirecting = user?.role === 'ADMIN' && pathname !== '/home'

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
    queryClient.clear()
    setCsrfToken(null)
    setUser(null)
    router.replace("/auth/login?reason=session-expired")
  }, [queryClient, router])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  // Ao montar o provider (ex: refresh de página), tenta hidratar o usuário
  // a partir do cookie HttpOnly via GET /auth/me.
  // O browser envia o cookie automaticamente — sem precisar de localStorage.
  useEffect(() => {
    const hydrateUser = async () => {
      try {
        const { data } = await api.get<AuthSessionResponse>('/auth/me')
        setCsrfToken(data.csrfToken)
        setAuthenticatedUser(data.user)
      } catch {
        // Cookie expirado ou ausente — usuário não autenticado
        queryClient.clear()
        setCsrfToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    hydrateUser()
  }, [queryClient, setAuthenticatedUser])

  useEffect(() => {
    if (!isLoading) {
      if (user && !isAllowedRole(user.role)) {
        if (invalidRoleLogoutUserId.current === user.sub) {
          return
        }

        invalidRoleLogoutUserId.current = user.sub
        void (async () => {
          try {
            await api.post('/auth/logout')
          } finally {
            queryClient.clear()
            setUser(null)
            router.replace('/auth/login')
          }
        })()
        return
      }

      invalidRoleLogoutUserId.current = null
      const isPublicRoute = publicRoutes.has(pathname)

      if (!user && !isPublicRoute && !sessionExpired.current) {
        router.replace("/auth/login")
      } else if (user) {
        if (user.role === 'ADMIN' && pathname !== '/home') {
          router.replace('/home')
        } else if (isPublicRoute) {
          router.push(getRedirectPath(user.role))
        }
      }
    }
  }, [user, isLoading, pathname, queryClient, router])

  // Chamado pelo componente de login APÓS a requisição POST /auth/login ter sido feita com sucesso.
  // O cookie já foi setado pelo servidor — basta buscar os dados do usuário.
  const login = async () => {
    const { data } = await api.get<AuthSessionResponse>('/auth/me')
    setCsrfToken(data.csrfToken)
    setAuthenticatedUser(data.user)
    router.push(getRedirectPath(data.user.role))
  }

  // Chama o endpoint de logout no servidor para limpar o cookie HttpOnly.
  // JavaScript não tem acesso ao cookie — só o servidor pode apagá-lo.
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      queryClient.clear()
      setCsrfToken(null)
      setUser(null)
      router.push("/auth/login")
    }
  }

  if (isLoading || (user && !isAllowedRole(user.role)) || isAdminRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
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
