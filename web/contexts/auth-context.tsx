"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { api } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"

type User = {
  sub: string;
  role: string;
  email?: string;
  name?: string;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const invalidRoleLogoutUserId = useRef<string | null>(null)
  const isAdminRedirecting = user?.role === 'ADMIN' && pathname !== '/home'

  const setAuthenticatedUser = useCallback((nextUser: User) => {
    setUser((currentUser) => {
      if (currentUser?.sub && currentUser.sub !== nextUser.sub) {
        queryClient.clear()
      }
      return nextUser
    })
  }, [queryClient])

  // Ao montar o provider (ex: refresh de página), tenta hidratar o usuário
  // a partir do cookie HttpOnly via GET /auth/me.
  // O browser envia o cookie automaticamente — sem precisar de localStorage.
  useEffect(() => {
    const hydrateUser = async () => {
      try {
        const { data } = await api.get<User>('/auth/me')
        setAuthenticatedUser(data)
      } catch {
        // Cookie expirado ou ausente — usuário não autenticado
        queryClient.clear()
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

      if (!user && !isPublicRoute) {
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
    const { data } = await api.get<User>('/auth/me')
    setAuthenticatedUser(data)
    router.push(getRedirectPath(data.role))
  }

  // Chama o endpoint de logout no servidor para limpar o cookie HttpOnly.
  // JavaScript não tem acesso ao cookie — só o servidor pode apagá-lo.
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      queryClient.clear()
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
