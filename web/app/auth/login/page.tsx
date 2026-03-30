"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()

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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}