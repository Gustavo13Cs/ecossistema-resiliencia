"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
// 🌟 NOVO: Adicionamos o AlertTriangle para o nosso modal de aviso
import { Eye, UserPlus, X, ClipboardList, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export default function MembrosPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  
  // Estados do Modal de Criação
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 🌟 NOVO: Estados do Modal de Exclusão Bonito
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, patientId: "", patientName: "" })
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", phone: "", birthDate: "", gender: "",
    goal: "", height: "", initialWeight: "", allergies: "", pathologies: "",
    typicalSleep: "", stressLevel: "", foodRelationship: "", psychologyHistory: "",
    exerciseType: "", exerciseFrequency: "", exerciseDuration: "", hasPersonal: ""
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users")
      setUsers(response.data)
    } catch (error) {
      console.error("Erro ao buscar membros", error)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        height: formData.height ? Number(formData.height) : undefined,
        initialWeight: formData.initialWeight ? Number(formData.initialWeight) : undefined,
        stressLevel: formData.stressLevel ? Number(formData.stressLevel) : undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
      }

      await api.post("/users", payload)
      toast.success(`${clientLabel} cadastrado com sucesso!`)
      setShowAddModal(false)
      
      setFormData({
        name: "", email: "", password: "", phone: "", birthDate: "", gender: "",
        goal: "", height: "", initialWeight: "", allergies: "", pathologies: "",
        typicalSleep: "", stressLevel: "", foodRelationship: "", psychologyHistory: "",
        exerciseType: "", exerciseFrequency: "", exerciseDuration: "", hasPersonal: ""
      })
      fetchUsers() 
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Erro ao cadastrar ${clientLabel.toLowerCase()}.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🌟 NOVO: Função que abre o Modal Bonito
  const confirmDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, patientId: id, patientName: name })
  }

  // 🌟 NOVO: Função que realmente deleta no banco quando o usuário clica em "Sim"
  const executeDelete = async () => {
    setIsDeleting(true)
    try {
      await api.delete(`/users/${deleteModal.patientId}`)
      toast.success(`${clientLabel} removido com sucesso!`)
      fetchUsers() 
      setDeleteModal({ isOpen: false, patientId: "", patientName: "" })
    } catch (error) {
      toast.error("Erro ao remover o paciente.")
    } finally {
      setIsDeleting(false)
    }
  }

  const isPersonal = user?.role === 'PERSONAL'
  const isFisio = user?.role === 'PHYSIO'
  const clientLabel = isPersonal ? 'Aluno' : 'Paciente'

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Diretório de {clientLabel}s
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie fichas, acompanhamentos e evolução dos seus {clientLabel.toLowerCase()}s.
            </p>
          </div>

          <Button 
            onClick={() => setShowAddModal(true)}
            className={`h-12 px-6 shadow-md text-base text-white ${
              isPersonal ? 'bg-blue-600 hover:bg-blue-700' : 
              isFisio ? 'bg-purple-600 hover:bg-purple-700' : 
              'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Cadastrar Novo {clientLabel}
          </Button>
        </div>

        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className={`${
            isPersonal ? 'bg-blue-50 border-blue-100' : 
            isFisio ? 'bg-purple-50 border-purple-100' : 
            'bg-teal-50 border-teal-100'
          } border-b`}>
            <CardTitle className={`text-lg flex items-center gap-2 ${
              isPersonal ? 'text-blue-800' : isFisio ? 'text-purple-800' : 'text-teal-800'
            }`}>
              {clientLabel}s Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="py-4 px-6">Nome</TableHead>
                    <TableHead className="px-6">E-mail</TableHead>
                    <TableHead className="px-6">Contato</TableHead>
                    <TableHead className="text-right px-6">Ações Rápidas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-semibold text-slate-700 py-4 px-6">{u.name}</TableCell>
                      <TableCell className="text-slate-500 px-6">{u.email}</TableCell>
                      <TableCell className="text-slate-500 px-6 font-medium">{u.phone || '-'}</TableCell>
                      
                      <TableCell className="text-right space-x-2 px-6">
                        <Link href={`/membros/${u.id}`}>
                          <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-100">
                            <Eye className="w-4 h-4 mr-1" /> Prontuário Completo
                          </Button>
                        </Link>
                        
                        {/* 🌟 Botão de Deletar agora chama o nosso Modal Bonito */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => confirmDelete(u.id, u.name)}
                          className="text-rose-500 border-rose-200 hover:bg-rose-50 px-2"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                        Nenhum {clientLabel.toLowerCase()} registado ainda. Clique no botão de cadastrar acima.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE CADASTRO ... (MANTIDO IGUAL) */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowAddModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
            <div className={`sticky top-0 z-10 flex justify-between items-center p-5 border-b shadow-sm ${
              isPersonal ? 'bg-blue-50 border-blue-100' : isFisio ? 'bg-purple-50 border-purple-100' : 'bg-teal-50 border-teal-100'
            }`}>
              <h2 className={`font-bold text-lg flex items-center gap-2 ${
                isPersonal ? 'text-blue-800' : isFisio ? 'text-purple-800' : 'text-teal-800'
              }`}>
                <ClipboardList className="w-5 h-5" /> Ficha de Cadastro Completa ({clientLabel})
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="h-8 w-8 rounded-full bg-white/50 hover:bg-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleCreatePatient} className="p-8">
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">1. Dados de Acesso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input required placeholder="Ex: Carlos Mendes" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail de Login *</Label>
                    <Input type="email" required placeholder="carlos@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha Temporária *</Label>
                    <Input type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input placeholder="(11) 99999-9999" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">2. Perfil Físico</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Objetivo Principal</Label>
                    <Input placeholder="Ex: Hipertrofia, Emagrecimento..." value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Input placeholder="M / F" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nascimento</Label>
                    <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Peso Declarado (kg)</Label>
                    <Input type="number" step="0.1" placeholder="Ex: 80.5" value={formData.initialWeight} onChange={e => setFormData({...formData, initialWeight: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Altura (cm)</Label>
                    <Input type="number" placeholder="Ex: 175" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">3. Saúde e Comportamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label>Alergias / Intolerâncias</Label>
                    <Input placeholder="Ex: Lactose, Amendoim" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Patologias Diagnosticadas</Label>
                    <Input placeholder="Ex: Diabetes, HAS" value={formData.pathologies} onChange={e => setFormData({...formData, pathologies: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Padrão de Sono / Rotina</Label>
                    <Input placeholder="Ex: 6 horas, sono agitado" value={formData.typicalSleep} onChange={e => setFormData({...formData, typicalSleep: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Estresse (1-5)</Label>
                    <Input type="number" min="1" max="5" placeholder="Ex: 3" value={formData.stressLevel} onChange={e => setFormData({...formData, stressLevel: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Relação com Comida</Label>
                    <Input placeholder="Ex: Compulsão aos finais de semana" value={formData.foodRelationship} onChange={e => setFormData({...formData, foodRelationship: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Acompanhamento Psicológico</Label>
                    <Input placeholder="Sim / Não (Motivo)" value={formData.psychologyHistory} onChange={e => setFormData({...formData, psychologyHistory: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">4. Atividade Física</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <Label>Pratica Exercício?</Label>
                    <Input placeholder="Ex: Musculação" value={formData.exerciseType} onChange={e => setFormData({...formData, exerciseType: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Input placeholder="Ex: 4x na semana" value={formData.exerciseFrequency} onChange={e => setFormData({...formData, exerciseFrequency: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração Média</Label>
                    <Input placeholder="Ex: 60 minutos" value={formData.exerciseDuration} onChange={e => setFormData({...formData, exerciseDuration: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Possui Personal?</Label>
                    <Input placeholder="Sim / Não" value={formData.hasPersonal} onChange={e => setFormData({...formData, hasPersonal: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t mt-8 flex justify-end gap-3">
                <Button type="button" variant="outline" className="h-12 px-6" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className={`h-12 px-8 text-white font-bold text-lg shadow-md ${
                  isPersonal ? 'bg-blue-600 hover:bg-blue-700' : isFisio ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'
                }`}>
                  {isSubmitting ? "A Salvar..." : `Confirmar Cadastro`}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 🌟 NOVO: MEGA MODAL DE CONFIRMAÇÃO PADRÃO */}
      {deleteModal.isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setDeleteModal({ isOpen: false, patientId: "", patientName: "" })}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Desvincular {clientLabel}?</h2>
              <p className="text-slate-500">
                Tem a certeza que deseja remover <strong className="text-slate-700">{deleteModal.patientName}</strong> da sua lista de acompanhamento? 
                O histórico permanecerá salvo no sistema, mas ele será removido da sua visão.
              </p>
            </div>
            
            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 text-slate-600 font-bold" 
                onClick={() => setDeleteModal({ isOpen: false, patientId: "", patientName: "" })}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={executeDelete} 
                disabled={isDeleting} 
                className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
              >
                {isDeleting ? "A remover..." : "Sim, Remover"}
              </Button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}