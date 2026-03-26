// web/app/membros/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, UserPlus } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { toast } from "sonner" // <-- Importamos a biblioteca mágica!

export default function MembrosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post("/users", formData)
      
      toast.success("Membro cadastrado com sucesso!")
      setFormData({ name: "", email: "", password: "", role: "EMPLOYEE" })
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao cadastrar membro.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 pb-12">
      <header className="bg-white/80 backdrop-blur border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/home">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Gestão de Membros
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-0 bg-white/90 backdrop-blur shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-slate-800">Cadastrar Novo Membro</CardTitle>
            <CardDescription>
              Adicione colaboradores, alunos ou pacientes à sua plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" required placeholder="Ex: João da Silva" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Acesso</Label>
                <Input id="email" type="email" required placeholder="joao@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}/>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha Inicial</Label>
                  <Input id="password" type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}/>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Perfil</Label>
                  <select
                    id="role"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="EMPLOYEE">Membro / Aluno / Cliente</option>
                    <option value="HR_MANAGER">Gestor / Profissional</option>
                    <option value="ADMIN">Administrador (Dono)</option>
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:from-blue-700 hover:to-teal-600 shadow-md h-11 text-base">
                {loading ? "Cadastrando..." : "Cadastrar Membro"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}