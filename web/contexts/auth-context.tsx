"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { jwtDecode } from "jwt-decode"

type User = {
  sub: string;
  role: string;
  email?: string;
  name?: string;
  businessContext?: string;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getRedirectPath = (role?: string) => {
  switch (role) {
    case 'PATIENT': return '/paciente'
    case 'NUTRITIONIST': return '/dietas'
    case 'PERSONAL': return '/treinos'
    case 'PHYSIO': return '/reabilitacao'
    default: return '/membros' 
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const publicRoutes = ["/", "/auth/login", "/auth/register"]

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      try {
        const decoded = jwtDecode(token) as User
        setUser(decoded)
      } catch (err) {
        localStorage.removeItem("token")
        setUser(null)
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = publicRoutes.includes(pathname)
      
      if (!user && !isPublicRoute) {
        router.push("/auth/login")
      } else if (user) {
        if (isPublicRoute) {
          router.push(getRedirectPath(user.role))
        } 
        else if (user.role === 'PATIENT' && !pathname.startsWith('/paciente')) {
          router.push('/paciente')
        } 
        else if (user.role !== 'PATIENT' && pathname.startsWith('/paciente')) {
          router.push(getRedirectPath(user.role))
        }
      }
    }
  }, [user, isLoading, pathname, router])

  const login = (token: string) => {
    localStorage.setItem("token", token)
    const decoded = jwtDecode(token) as User
    setUser(decoded)
    
    // 🌟 Após o login bem sucedido, envia para a página certa
    router.push(getRedirectPath(decoded.role))
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    router.push("/auth/login")
  }

  if (isLoading) {
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