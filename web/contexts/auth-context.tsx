"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { jwtDecode } from "jwt-decode"

type User = {
  sub: string;
  role: string;
  email?: string;
  businessContext?: string;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
        // Se não tem login e tenta aceder a uma área privada -> Rua!
        router.push("/auth/login")
      } else if (user && isPublicRoute) {
        // Se já tem login e tenta ir para a página de login -> Dashboard!
        router.push("/home")
      }
    }
  }, [user, isLoading, pathname, router])

  const login = (token: string) => {
    localStorage.setItem("token", token)
    const decoded = jwtDecode(token) as User
    setUser(decoded)
    router.push("/home")
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