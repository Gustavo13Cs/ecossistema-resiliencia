"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { api } from "@/lib/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 🔒 AQUI ESTÁ A NOSSA SEGURANÇA: Batendo na nossa API NestJS!
      const response = await api.post("/auth/login", {
        email,
        password,
      })

      // Guardamos o Crachá (Token) no navegador do usuário
      localStorage.setItem("token", response.data.access_token)

      // Redireciona para o Dashboard
      router.push("/home") 
      
    } catch (error: any) {
      // Se a senha estiver errada, a nossa API avisa e nós mostramos o erro bonito na tela
      setError(error.response?.data?.message || "E-mail ou senha incorretos")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-pink-50 via-purple-50 to-teal-50">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
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
                {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar no Sistema"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}