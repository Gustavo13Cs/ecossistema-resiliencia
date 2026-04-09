"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { UserPlus, ArrowLeft, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function NovoMembroPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", phone: "", birthDate: "", department: "", goal: "",
    gender: "", height: "", initialWeight: "", allergies: "", pathologies: "",
    typicalSleep: "", stressLevel: "", foodRelationship: "", psychologyHistory: "",
    exerciseType: "", exerciseFrequency: "", exerciseDuration: "", hasPersonal: "", workActivityLevel: "",
    nutritionistNotes: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        role: "EMPLOYEE",
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        initialWeight: formData.initialWeight ? parseFloat(formData.initialWeight) : undefined,
        stressLevel: formData.stressLevel ? parseInt(formData.stressLevel) : undefined,
      }
      await api.post("/users", payload)
      toast.success("Paciente cadastrado com sucesso!")
      router.push("/membros")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao cadastrar paciente.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* MUDANÇA 1: De max-w-4xl para max-w-6xl para alargar muito mais a tela */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/membros">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">
            {user?.businessContext === 'NUTRITIONIST' ? 'Novo Paciente' : 'Novo Membro'}
          </h1>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center bg-white border-b border-slate-100 rounded-t-xl pb-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Prontuário de Cadastro</CardTitle>
            <CardDescription>Preencha os dados iniciais detalhadamente.</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8 px-8 md:px-12">
            <form onSubmit={handleSubmit} className="space-y-10">
              
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b pb-2">Identificação e Acesso</h3>
                {/* MUDANÇA 2: Grelha de 4 colunas para a primeira secção */}
                <div className="grid grid-cols-4 gap-6">
                  <div className="space-y-2 col-span-4 lg:col-span-2">
                    <Label>Nome Completo</Label>
                    <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
                  </div>
                  <div className="space-y-2 col-span-2 lg:col-span-1">
                    <Label>E-mail (Login)</Label>
                    <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}/>
                  </div>
                  <div className="space-y-2 col-span-2 lg:col-span-1">
                    <Label>Senha Inicial</Label>
                    <Input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}/>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>WhatsApp</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}/>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Nascimento</Label>
                    <Input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}/>
                  </div>
                </div>
              </div>

              {user?.businessContext === 'NUTRITIONIST' && (
                <>
                  <div className="space-y-5 bg-teal-50/50 p-8 rounded-2xl border border-teal-100">
                    <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider border-b border-teal-200 pb-2">Saúde Física</h3>
                    {/* Grelha de 6 colunas para alinhar perfeitamente */}
                    <div className="grid grid-cols-6 gap-6">
                      <div className="space-y-2 col-span-2">
                        <Label>Sexo</Label>
                        <select className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                          <option value="">Selecione</option><option value="M">Masc</option><option value="F">Fem</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Altura (cm)</Label>
                        <Input type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Peso Inicial (kg)</Label>
                        <Input type="number" step="0.1" value={formData.initialWeight} onChange={(e) => setFormData({ ...formData, initialWeight: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-3">
                        <Label>Alergias / Intolerâncias</Label>
                        <Input placeholder="Ex: Lactose, Glúten..." value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-3">
                        <Label>Patologias Diagnósticadas</Label>
                        <Input placeholder="Ex: Diabetes, Hipertensão..." value={formData.pathologies} onChange={(e) => setFormData({ ...formData, pathologies: e.target.value })}/>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 bg-amber-50/50 p-8 rounded-2xl border border-amber-100">
                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider border-b border-amber-200 pb-2">Estilo de Vida e Comportamento</h3>
                    <div className="grid grid-cols-4 gap-6">
                      <div className="space-y-2 col-span-2">
                        <Label>Profissão / Rotina</Label>
                        <Input value={formData.typicalSleep} onChange={(e) => setFormData({ ...formData, typicalSleep: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Nível de Estresse (1-5)</Label>
                        <Input type="number" min="1" max="5" value={formData.stressLevel} onChange={(e) => setFormData({ ...formData, stressLevel: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Relação com Comida / Compulsão</Label>
                        <Input value={formData.foodRelationship} onChange={(e) => setFormData({ ...formData, foodRelationship: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Acompanhamento Psicológico?</Label>
                        <Input value={formData.psychologyHistory} onChange={(e) => setFormData({ ...formData, psychologyHistory: e.target.value })}/>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100">
                    <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-2">Atividade Física</h3>
                    {/* Tudo lado a lado (4 colunas) */}
                    <div className="grid grid-cols-4 gap-6">
                      <div className="space-y-2 col-span-1">
                        <Label>Pratica Exercício?</Label>
                        <Input placeholder="Ex: Musculação" value={formData.exerciseType} onChange={(e) => setFormData({ ...formData, exerciseType: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label>Frequência Semanal</Label>
                        <Input placeholder="Ex: 3x na semana" value={formData.exerciseFrequency} onChange={(e) => setFormData({ ...formData, exerciseFrequency: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label>Duração</Label>
                        <Input placeholder="Ex: 60 min" value={formData.exerciseDuration} onChange={(e) => setFormData({ ...formData, exerciseDuration: e.target.value })}/>
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label>Tem Personal?</Label>
                        <Input placeholder="Sim/Não" value={formData.hasPersonal} onChange={(e) => setFormData({ ...formData, hasPersonal: e.target.value })}/>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 bg-slate-100 p-8 rounded-2xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-300 pb-2">
                      <Lock className="w-4 h-4" /> Observações Internas (Privado)
                    </h3>
                    <div className="space-y-2">
                      <textarea 
                        placeholder="Anotações privadas do nutricionista..." 
                        value={formData.nutritionistNotes} onChange={(e) => setFormData({ ...formData, nutritionistNotes: e.target.value })}
                        className="flex min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 resize-y"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-6 border-t border-slate-100">
                <Button type="submit" disabled={loading} className={`w-full h-14 text-lg font-semibold shadow-xl ${user?.businessContext === 'NUTRITIONIST' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {loading ? "A processar..." : "Finalizar Prontuário e Cadastrar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}