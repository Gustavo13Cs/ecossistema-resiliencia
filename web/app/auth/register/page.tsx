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
import { User, Apple, Dumbbell, Activity } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    companyName: "",
    role: "PATIENT", 
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.post("/auth/register", formData)
      toast.success("Conta criada com sucesso! Faça o login.")
      router.push("/auth/login")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao criar conta. Verifique os dados.")
    } finally {
      setIsLoading(false)
    }
  }

  // Perfis disponíveis para seleção
  const roles = [
    { id: "PATIENT", label: "Paciente / Aluno", icon: User, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", activeBorder: "border-slate-500", activeBg: "bg-slate-50" },
    { id: "NUTRITIONIST", label: "Nutricionista", icon: Apple, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200", activeBorder: "border-emerald-500", activeBg: "bg-emerald-50" },
    { id: "PERSONAL", label: "Personal Trainer", icon: Dumbbell, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", activeBorder: "border-blue-500", activeBg: "bg-blue-50" },
    { id: "PHYSIO", label: "Fisioterapeuta", icon: Activity, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200", activeBorder: "border-purple-500", activeBg: "bg-purple-50" },
  ]

  const isProfessional = formData.role !== "PATIENT"

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="space-y-2 text-center pb-6 border-b border-slate-100">
            <CardTitle className="text-3xl font-black text-slate-800">
              Crie a sua conta
            </CardTitle>
            <CardDescription className="text-base text-slate-500">
              Junte-se à plataforma de saúde mais completa e integrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleRegister} className="space-y-8">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Como você quer utilizar a plataforma?</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {roles.map((r) => {
                    const Icon = r.icon
                    const isActive = formData.role === r.id
                    
                    return (
                      <div 
                        key={r.id}
                        onClick={() => setFormData({ ...formData, role: r.id, companyName: r.id === "PATIENT" ? "" : formData.companyName })}
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
                          isActive 
                            ? `${r.activeBorder} ${r.activeBg} shadow-md scale-[1.02]` 
                            : `border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50`
                        }`}
                      >
                        <div className={`p-3 rounded-full ${isActive ? r.bg : 'bg-slate-100'}`}>
                          <Icon className={`w-6 h-6 ${isActive ? r.color : 'text-slate-400'}`} />
                        </div>
                        <span className={`text-sm font-bold text-center ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                          {r.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dados Pessoais */}
              <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4" /> Dados Pessoais
                </h3>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" required placeholder="Ex: Carlos Silva" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input id="phone" required placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 bg-white" />
                  </div>
                </div>
              </div>

              {isProfessional && (
                <div className="space-y-4 bg-blue-50/50 p-6 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-4">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2">
                    🏢 Informações do Consultório / Estúdio
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-blue-900">Nome do Local de Atendimento (Opcional)</Label>
                    <Input id="companyName" placeholder="Ex: Clínica Bem Estar, Studio Fit" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="h-11 bg-white border-blue-200 focus-visible:ring-blue-500" />
                  </div>
                </div>
              )}

              {/* Dados de Acesso */}
              <div className="grid md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail de Acesso</Label>
                  <Input id="email" type="email" required placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha de Segurança</Label>
                  <Input id="password" type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="h-11" />
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-lg bg-slate-800 hover:bg-slate-900 text-white shadow-lg font-bold" disabled={isLoading}>
                {isLoading ? "A criar conta..." : "Finalizar Cadastro"}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-600 border-t pt-6">
              Já possui uma conta?{" "}
              <Link href="/auth/login" className="font-bold text-slate-800 hover:text-slate-600 hover:underline">
                Faça Login aqui
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}