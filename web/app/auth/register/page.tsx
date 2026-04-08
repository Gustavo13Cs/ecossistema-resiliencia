"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    companyName: "",
    profession: "PERSONAL_TRAINER", 
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.post("/auth/register", formData)
      toast.success("Conta corporativa criada com sucesso! Faça o login.")
      router.push("/auth/login")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao criar conta. Verifique os dados.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-2 text-center pb-8 border-b border-slate-100">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              SafeMove B2B Premium
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Configure o seu ambiente de trabalho e comece a monitorizar a sua equipa, alunos ou pacientes hoje mesmo.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Secção 1: Dados Pessoais */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome Completo</Label>
                  <Input id="name" required placeholder="Ex: Carlos Silva" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp para Contacto</Label>
                  <Input id="phone" required placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 bg-slate-50" />
                </div>
              </div>

              {/* Secção 2: Dados do Negócio */}
              <div className="grid md:grid-cols-2 gap-5 p-5 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-blue-900">Nome do Negócio / Empresa</Label>
                  <Input id="companyName" required placeholder="Ex: Studio Fit, TechCorp" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="h-11 border-blue-200" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-blue-900">Área de Atuação</Label>
                  <select
                    id="profession"
                    className="flex h-11 w-full rounded-md border border-blue-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  >
                    <option value="PERSONAL_TRAINER">Personal Trainer</option>
                    <option value="NUTRITIONIST">Nutricionista / Clínica</option>
                    <option value="HR_CORPORATE">Recursos Humanos (Empresa)</option>
                    <option value="PHYSIOTHERAPIST">Fisioterapeuta</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail Corporativo</Label>
                  <Input id="email" type="email" required placeholder="contato@suaempresa.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha de Acesso</Label>
                  <Input id="password" type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-11 bg-slate-50" />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white shadow-lg mt-4" disabled={isLoading}>
                {isLoading ? "A preparar o seu ambiente..." : "Criar Plataforma B2B"}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-600 border-t pt-6">
              Já é um parceiro SafeMove?{" "}
              <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                Faça Login na sua conta
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}