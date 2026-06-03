"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// 1. Adicionamos o useEffect
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
// 2. Adicionamos o roteador para expulsar quem já está logado
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // 3. A nossa nova "Cortina" (começa fechada)
  const [isPageLoading, setIsPageLoading] = useState(true) 
  
  const { login } = useAuth()
  const router = useRouter()

  // 4. O Vigia da Portaria: Verifica se já há token antes de renderizar
  useEffect(() => {
    // Procura o token no armazenamento (ajuste o nome se o seu useAuth salvar com outro nome, ex: '@SafeMove:token')
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('safeMove_token')
    
    if (token) {
      // Se tem crachá, joga direto pro sistema! A cortina nem abre.
      router.push('/paciente') // ou '/home' dependendo de onde é o seu painel principal
    } else {
      // Se não tem crachá, abrimos a cortina e mostramos o formulário
      setIsPageLoading(false)
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      })

      login(response.data.access_token)
      
    } catch (error: any) {
      setError(error.response?.data?.message || "E-mail ou senha incorretos")
    } finally {
      setIsLoading(false)
    }
  }

  // 5. O que aparece enquanto verificamos o crachá
  if (isPageLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="font-semibold text-teal-700 animate-pulse">A preparar a portaria...</p>
        </div>
      </div>
    )
  }

  // 6. O Formulário Original (só renderiza se não tiver token)
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              SafeMove B2B
            </CardTitle>
            <CardDescription className="text-base">Bem-vindo de volta! Acesse sua conta corporativa</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail Corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="carlos.silva@empresa.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</p>}
                
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              Ainda não tem o sistema?{" "}
              <Link href="/auth/register" className="font-semibold text-teal-600 hover:underline">
                Cadastre-se gratuitamente
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}