"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Dumbbell, Plus, Search, Activity, ArrowRight, X, Clock, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function TreinosHubPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para o Modal de Seleção de Aluno
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Estado para o Modal Bonito de Apagar
  const [workoutToDelete, setWorkoutToDelete] = useState<{id: string, name: string} | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const patientsRes = await api.get("/users")
      setPatients(patientsRes.data)
      try {
        const workoutsRes = await api.get("/workouts")
        setWorkouts(workoutsRes.data || [])
      } catch (err) {
        setWorkouts([])
      }
    } catch (error) {
      console.error("Erro ao carregar dados", error)
    } finally {
      setLoading(false)
    }
  }

  const executeDelete = async () => {
    if (!workoutToDelete) return
    try {
      await api.delete(`/workouts/${workoutToDelete.id}`)
      setWorkouts(workouts.filter(w => w.id !== workoutToDelete.id))
      toast.success("Ficha apagada com sucesso!")
    } catch (error) {
      toast.error("Erro ao apagar a ficha.")
    } finally {
      setWorkoutToDelete(null)
    }
  }

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectPatient = (patientId: string) => {
    router.push(`/membros/${patientId}/novo-treino`)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-blue-600" /> Central de Treinos
            </h1>
            <p className="text-slate-500 mt-1">
              Faça a gestão das periodizações e prescreva novas fichas de treino para os seus alunos.
            </p>
          </div>

          <Button 
            onClick={() => setShowSelectModal(true)}
            className="h-12 px-6 shadow-md text-base text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Prescrição
          </Button>
        </div>

        {/* RESUMO RÁPIDO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-0 border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Fichas de Treino Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-800">{workouts.length}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Ação Rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 font-medium mt-1 mb-3">Precisa de ajustar uma carga ou exercício?</p>
              <Button onClick={() => setShowSelectModal(true)} variant="outline" className="w-full border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
                Selecionar Aluno para Editar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE TREINOS RECENTES */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
              <Clock className="w-5 h-5" /> Últimas Fichas Prescritas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="py-4 px-6">Aluno</TableHead>
                    <TableHead className="px-6">Data da Prescrição</TableHead>
                    <TableHead className="px-6">Foco / Periodização</TableHead>
                    <TableHead className="text-right px-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500 animate-pulse">
                        A carregar histórico...
                      </TableCell>
                    </TableRow>
                  ) : workouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                        <Dumbbell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        Nenhuma ficha de treino encontrada no histórico.<br/>
                        Clique em "Nova Prescrição" para montar o seu primeiro treino!
                      </TableCell>
                    </TableRow>
                  ) : (
                    workouts.map((treino) => (
                      <TableRow key={treino.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-semibold text-slate-700 py-4 px-6">
                          {treino.user?.name || "Aluno Removido"}
                        </TableCell>
                        <TableCell className="text-slate-500 px-6">
                          {new Date(treino.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell className="text-slate-500 px-6 font-medium">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                            {treino.title}
                          </span>
                          {treino.goal}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" size="sm" 
                              onClick={() => router.push(`/membros/${treino.userId}/novo-treino`)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 mr-1" /> Abrir Ficha
                            </Button>
                            <Button 
                              variant="outline" size="icon" 
                              onClick={() => setWorkoutToDelete({ id: treino.id, name: treino.user?.name || "Aluno" })}
                              className="text-rose-500 border-rose-200 hover:bg-rose-50 h-9 w-9"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🌟 MODAL INTELIGENTE: SELECIONAR ALUNO PARA O TREINO */}
      {showSelectModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowSelectModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Para quem é este treino?</h2>
                <p className="text-sm text-slate-500">Selecione o aluno na sua lista.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSelectModal(false)} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Buscar pelo nome..." 
                  className="pl-10 h-12 bg-slate-50 focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-2 mt-4">
                {filteredPatients.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Nenhum aluno encontrado.</p>
                ) : (
                  filteredPatients.map(patient => (
                    <div 
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient.id)}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
                    >
                      <div>
                        <p className="font-bold text-slate-700 group-hover:text-blue-800">{patient.name}</p>
                        <p className="text-xs text-slate-400">{patient.goal || "Sem objetivo mapeado"}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 🌟 MODAL BONITO DE EXCLUSÃO (TREINOS) */}
      {workoutToDelete && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setWorkoutToDelete(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
               <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                 <Trash2 className="w-8 h-8 text-rose-500" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800">Apagar Ficha?</h2>
               <p className="text-slate-500">
                 Tem a certeza que deseja apagar a ficha de <span className="font-bold text-slate-700">{workoutToDelete.name}</span>? Esta ação não pode ser desfeita.
               </p>
               <div className="flex gap-3 pt-4">
                 <Button variant="outline" className="flex-1 h-12 text-slate-600 font-bold" onClick={() => setWorkoutToDelete(null)}>Cancelar</Button>
                 <Button className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={executeDelete}>Sim, Apagar</Button>
               </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}