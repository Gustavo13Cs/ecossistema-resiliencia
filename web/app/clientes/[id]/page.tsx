"use client"

import axios from "axios"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeft, ArrowLeftRight, Apple, Dumbbell, Activity, Pill,
  FileText, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  Eye, Zap, Bookmark, HeartPulse, Scale, Flame, ShieldAlert,
  Clock, AlertTriangle, CheckCircle2, TrendingUp, Sparkles, RefreshCw, X
} from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AssessmentModal } from "@/components/AssessmentModal"
import { PhysioAssessmentModal } from "@/components/PhysioAssessmentModal"
import { ClientForm } from "@/components/features/clients/ClientForm"
import { useAuth } from "@/contexts/auth-context"
import { useClientRecord } from "@/hooks/features/useClientRecord"
import { api } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type { Client, ClientFormValues } from "@/types/client"

function isNotFoundError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404
}

function isConflictError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 409
}

export default function ClienteHubPage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()

  const isNutri = user?.role === 'NUTRITIONIST' || user?.role === 'ADMIN'
  const isPersonal = user?.role === 'PERSONAL' || user?.role === 'ADMIN'
  const isFisio = user?.role === 'PHYSIO' || user?.role === 'ADMIN'

  // Hook unificado que busca tudo do cliente
  const {
    client,
    activeDiet,
    dietHistory,
    activeWorkout,
    activeRehab,
    activeSupplement,
    assessments,
    physioAssessments,
    anamneses,
    consultationNotes,
    labExams,
    loading,
    clientError,
    refetchAll,
  } = useClientRecord(clientId)

  // Estados de Modais
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [selectedAnamnesis, setSelectedAnamnesis] = useState<any>(null)
  const [expandedDietId, setExpandedDietId] = useState<string | null>(null)
  const [compareDiets, setCompareDiets] = useState<any[]>([])
  const [showCompareModal, setShowCompareModal] = useState(false)

  // Notas de Consulta
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<any>(null)
  const [noteForm, setNoteForm] = useState({ content: '', tags: '', nextSteps: '' })
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Operações de Ciclo de Vida do Cliente (Update / Archive)
  const lifecycleMutationInFlight = useRef(false)
  const [isLifecycleOperationActive, setIsLifecycleOperationActive] = useState(false)
  const [isReloadingLatest, setIsReloadingLatest] = useState(false)
  const [formRevision, setFormRevision] = useState(0)

  const updateClient = useMutation({
    mutationFn: async ({
      values,
      expectedUpdatedAt,
    }: {
      values: ClientFormValues
      expectedUpdatedAt: string
    }) => {
      const response = await api.patch<Client>(`/clients/${clientId}`, {
        ...values,
        expectedUpdatedAt,
      })
      return response.data
    },
  })

  const archiveClient = useMutation({
    mutationFn: async () => {
      const response = await api.patch<Client>(`/clients/${clientId}/status`, { status: "ARCHIVED" })
      return response.data
    },
  })

  const lifecyclePending =
    isLifecycleOperationActive ||
    isReloadingLatest ||
    updateClient.isPending ||
    archiveClient.isPending

  const invalidateClientRecords = async () => {
    if (!user?.sub) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ACTIVE") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user.sub, "ARCHIVED") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.client(user.sub, clientId) }),
    ])
  }

  const handleUpdate = async (values: ClientFormValues, expectedUpdatedAt: string) => {
    if (lifecyclePending || lifecycleMutationInFlight.current) {
      throw new Error("Já existe uma operação em andamento")
    }

    lifecycleMutationInFlight.current = true
    setIsLifecycleOperationActive(true)
    try {
      const updatedClient = await updateClient.mutateAsync({ values, expectedUpdatedAt })
      await invalidateClientRecords()
      toast.success("Prontuário atualizado com sucesso!")
      return updatedClient
    } finally {
      lifecycleMutationInFlight.current = false
      setIsLifecycleOperationActive(false)
    }
  }

  const handleArchive = async () => {
    if (lifecyclePending || lifecycleMutationInFlight.current) return
    lifecycleMutationInFlight.current = true
    setIsLifecycleOperationActive(true)
    try {
      await archiveClient.mutateAsync()
      await invalidateClientRecords()
      toast.success("Cliente arquivado com sucesso.")
      router.push("/clientes")
    } catch {
      toast.error("Não foi possível arquivar o cliente. Tente novamente.")
      lifecycleMutationInFlight.current = false
      setIsLifecycleOperationActive(false)
    }
  }

  // Handlers de Notas de Consulta
  const handleOpenNoteModal = (note?: any) => {
    if (note) {
      setEditingNote(note)
      setNoteForm({ content: note.content || '', tags: note.tags || '', nextSteps: note.nextSteps || '' })
    } else {
      setEditingNote(null)
      setNoteForm({ content: '', tags: '', nextSteps: '' })
    }
    setShowNoteModal(true)
  }

  const handleSaveNote = async () => {
    if (!noteForm.content.trim()) {
      toast.error("Preencha o conteúdo da nota.")
      return
    }

    setIsSavingNote(true)
    try {
      if (editingNote) {
        await api.patch(`/consultation-notes/${editingNote.id}`, noteForm)
        toast.success("Nota atualizada com sucesso!")
      } else {
        await api.post(`/consultation-notes`, { patientId: clientId, ...noteForm })
        toast.success("Nota de consulta registrada!")
      }
      setShowNoteModal(false)
      if (user?.sub) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.consultationNotes(user.sub, clientId) })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Erro ao salvar a nota.")
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta nota de evolução?")) return
    try {
      await api.delete(`/consultation-notes/${noteId}`)
      toast.success("Nota excluída.")
      if (user?.sub) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.consultationNotes(user.sub, clientId) })
      }
    } catch {
      toast.error("Erro ao excluir nota.")
    }
  }

  // Handlers de Comparação de Dietas
  const toggleDietCompare = (diet: any) => {
    if (compareDiets.some(d => d.id === diet.id)) {
      setCompareDiets(compareDiets.filter(d => d.id !== diet.id))
    } else {
      if (compareDiets.length >= 2) {
        setCompareDiets([compareDiets[1], diet])
      } else {
        setCompareDiets([...compareDiets, diet])
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Cliente não encontrado</h2>
        <p className="text-slate-500 text-sm mt-1">O prontuário solicitado não foi localizado.</p>
        <Link href="/clientes" className="mt-4">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Clientes</Button>
        </Link>
      </div>
    )
  }

  // Cálculo de idade e IMC
  const birthDate = client.birthDate ? new Date(client.birthDate) : null
  const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
  const heightM = client.height ? (client.height > 3 ? client.height / 100 : client.height) : null
  const weightKg = client.initialWeight ?? null
  const imc = heightM && weightKg ? (weightKg / (heightM * heightM)).toFixed(1) : null

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-6">

        {/* ════════ HEADER DO CLIENTE ════════ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Dados do Perfil */}
            <div className="flex items-center gap-5">
              <Link href="/clientes">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Button>
              </Link>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">{client.name}</h1>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                    {client.status === 'ACTIVE' ? 'ATIVO' : 'ARQUIVADO'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 font-medium">
                  {client.goal && <span className="text-indigo-600 font-bold">🎯 {client.goal}</span>}
                  {age && <span>{age} anos</span>}
                  {client.gender && <span>{client.gender}</span>}
                  {client.height && <span>📏 {client.height} cm</span>}
                  {client.initialWeight && <span>⚖️ {client.initialWeight} kg</span>}
                  {imc && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">IMC: {imc}</span>}
                  {client.phone && <span>📱 {client.phone}</span>}
                </div>
              </div>
            </div>

            {/* Ações Rápidas do Topo */}
            <div className="flex flex-wrap items-center gap-2">
              {isNutri && (
                <Link href={`/clientes/${clientId}/nova-dieta`}>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs">
                    <Apple className="w-4 h-4 mr-1.5" /> Prescrever Dieta
                  </Button>
                </Link>
              )}
              {isPersonal && (
                <Link href={`/clientes/${clientId}/novo-treino`}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs">
                    <Dumbbell className="w-4 h-4 mr-1.5" /> Prescrever Treino
                  </Button>
                </Link>
              )}
              {isFisio && (
                <Link href={`/clientes/${clientId}/nova-reabilitacao`}>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs">
                    <HeartPulse className="w-4 h-4 mr-1.5" /> Prescrever Reab
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 font-medium"
                onClick={() => setShowAssessmentModal(true)}
              >
                <TrendingUp className="w-4 h-4 mr-1.5 text-indigo-600" /> Nova Avaliação
              </Button>
              <Link href={`/clientes/${clientId}/visao-360`}>
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-bold">
                  <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" /> Visão 360°
                </Button>
              </Link>
            </div>

          </div>
        </div>

        {/* ════════ NAVEGAÇÃO POR ABAS ════════ */}
        <Tabs defaultValue="visao-geral" className="w-full space-y-6">
          <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap h-auto gap-1">
            <TabsTrigger value="visao-geral" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="nutricao" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Apple className="w-3.5 h-3.5 mr-1.5" /> Nutrição & Dietas
            </TabsTrigger>
            <TabsTrigger value="treino" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Dumbbell className="w-3.5 h-3.5 mr-1.5" /> Treinamento
            </TabsTrigger>
            <TabsTrigger value="fisio" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <HeartPulse className="w-3.5 h-3.5 mr-1.5" /> Fisioterapia
            </TabsTrigger>
            <TabsTrigger value="notas" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Evolução & Notas ({consultationNotes.length})
            </TabsTrigger>
            <TabsTrigger value="avaliacoes" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Avaliações & Exames
            </TabsTrigger>
            <TabsTrigger value="prontuario" className="rounded-xl px-4 py-2.5 font-bold text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              ⚙️ Dados & Prontuário
            </TabsTrigger>
          </TabsList>

          {/* ════════ ABA 1: VISÃO GERAL (HUB 360°) ════════ */}
          <TabsContent value="visao-geral" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card Nutrição */}
              <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50/40 shadow-sm">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Nutrição</span>
                  <Apple className="w-4 h-4 text-teal-600" />
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1">
                  <p className="font-bold text-slate-800 truncate">{activeDiet?.title || 'Sem dieta ativa'}</p>
                  <p className="text-xs text-slate-500">
                    {activeDiet ? `${activeDiet.targetKcal} kcal • P: ${activeDiet.proteinG}g / C: ${activeDiet.carbsG}g` : 'Clique para prescrever'}
                  </p>
                  <Link href={`/clientes/${clientId}/nova-dieta`} className="inline-block pt-2">
                    <span className="text-xs font-bold text-teal-600 hover:underline">
                      {activeDiet ? 'Editar plano →' : '+ Nova prescrição →'}
                    </span>
                  </Link>
                </CardContent>
              </Card>

              {/* Card Treino */}
              <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/40 shadow-sm">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Treinamento</span>
                  <Dumbbell className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1">
                  <p className="font-bold text-slate-800 truncate">{activeWorkout?.name || 'Sem treino ativo'}</p>
                  <p className="text-xs text-slate-500">
                    {activeWorkout?.splits ? `${activeWorkout.splits.length} divisões de treino` : 'Clique para montar ficha'}
                  </p>
                  <Link href={`/clientes/${clientId}/novo-treino`} className="inline-block pt-2">
                    <span className="text-xs font-bold text-blue-600 hover:underline">
                      {activeWorkout ? 'Editar treino →' : '+ Novo treino →'}
                    </span>
                  </Link>
                </CardContent>
              </Card>

              {/* Card Reabilitação */}
              <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/40 shadow-sm">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Fisioterapia</span>
                  <HeartPulse className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1">
                  <p className="font-bold text-slate-800 truncate">{activeRehab?.diagnosis || 'Sem reab ativa'}</p>
                  <p className="text-xs text-slate-500">
                    {activeRehab ? `Fase ${activeRehab.phase} • ${activeRehab.exercises?.length || 0} exercícios` : 'Nenhum protocolo ativo'}
                  </p>
                  <Link href={`/clientes/${clientId}/nova-reabilitacao`} className="inline-block pt-2">
                    <span className="text-xs font-bold text-purple-600 hover:underline">
                      {activeRehab ? 'Ver protocolo →' : '+ Novo protocolo →'}
                    </span>
                  </Link>
                </CardContent>
              </Card>

              {/* Card Suplementação */}
              <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50/40 shadow-sm">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Suplementos</span>
                  <Pill className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-1">
                  <p className="font-bold text-slate-800 truncate">{activeSupplement?.title || 'Sem suplementos'}</p>
                  <p className="text-xs text-slate-500">
                    {activeSupplement ? `${activeSupplement.items?.length || 0} fórmulas ativas` : 'Nenhum manipulado ativo'}
                  </p>
                  <Link href={`/clientes/${clientId}/nova-suplementacao`} className="inline-block pt-2">
                    <span className="text-xs font-bold text-amber-600 hover:underline">
                      {activeSupplement ? 'Editar fórmulas →' : '+ Nova prescrição →'}
                    </span>
                  </Link>
                </CardContent>
              </Card>

            </div>

            {/* Ações e Atalhos Rápidos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Coluna 1: Próximos Passos & Últimas Notas */}
              <Card className="lg:col-span-2 border border-slate-200 shadow-sm">
                <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Últimas Notas Clínicas
                  </CardTitle>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => handleOpenNoteModal()}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nova Nota
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {consultationNotes.length === 0 ? (
                    <p className="text-sm text-slate-400 p-6 text-center">
                      Nenhuma nota registrada. Clique em "Nova Nota" para documentar a consulta.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {consultationNotes.slice(0, 3).map((note: any) => (
                        <div key={note.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-slate-400 font-semibold">
                              {new Date(note.createdAt).toLocaleDateString('pt-BR')} às {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {note.creator?.name && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                {note.creator.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-2">{note.content}</p>
                          {note.nextSteps && (
                            <p className="text-xs text-indigo-600 mt-2 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded">
                              📌 {note.nextSteps}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Coluna 2: Ferramentas de Produtividade */}
              <div className="space-y-4">
                <Card className="border border-slate-200 shadow-sm">
                  <CardHeader className="py-3 px-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> Ferramentas do Profissional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    <Link href={`/clientes/${clientId}/calculo-energetico`} className="block">
                      <div className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Flame className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-700">Cálculo de TMB / GET</span>
                        </div>
                        <span className="text-xs text-indigo-600 font-bold">Abrir →</span>
                      </div>
                    </Link>
                    <Link href={`/clientes/${clientId}/exames`} className="block">
                      <div className="p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold text-slate-700">Exames Laboratoriais ({labExams.length})</span>
                        </div>
                        <span className="text-xs text-purple-600 font-bold">Abrir →</span>
                      </div>
                    </Link>
                    <Link href={`/clientes/${clientId}/nova-anamnese`} className="block">
                      <div className="p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-slate-700">Anamnese Completa ({anamneses.length})</span>
                        </div>
                        <span className="text-xs text-teal-600 font-bold">Abrir →</span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* ════════ ABA 2: NUTRIÇÃO & DIETAS ════════ */}
          <TabsContent value="nutricao" className="space-y-6 mt-0">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">Planeamento Nutricional</h3>
                <p className="text-xs text-slate-500">Gerencie a dieta ativa e consulte o histórico de fases alimentares.</p>
              </div>
              <Link href={`/clientes/${clientId}/nova-dieta`}>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  <Plus className="w-4 h-4 mr-1.5" /> Nova Prescrição de Dieta
                </Button>
              </Link>
            </div>

            {/* Dieta Ativa */}
            {activeDiet ? (
              <Card className="border border-teal-200 shadow-sm">
                <CardHeader className="bg-teal-50/70 border-b border-teal-100 py-4 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-teal-950">{activeDiet.title}</CardTitle>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">ATIVA</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{activeDiet.goal} • {activeDiet.targetKcal} kcal</p>
                  </div>
                  <Link href={`/clientes/${clientId}/nova-dieta`}>
                    <Button variant="outline" size="sm" className="border-teal-300 text-teal-700 bg-white hover:bg-teal-50">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Calorias</span>
                      <p className="text-lg font-black text-slate-800">{activeDiet.targetKcal} kcal</p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-xl border border-teal-100">
                      <span className="text-[10px] font-bold text-teal-700 uppercase">Proteínas</span>
                      <p className="text-lg font-black text-teal-800">{activeDiet.proteinG}g</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Carboidratos</span>
                      <p className="text-lg font-black text-amber-800">{activeDiet.carbsG}g</p>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">Gorduras</span>
                      <p className="text-lg font-black text-rose-800">{activeDiet.fatG}g</p>
                    </div>
                  </div>

                  {/* Refeições */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-sm text-slate-700">Refeições Prescritas:</h4>
                    {(activeDiet.meals || []).map((meal: any) => (
                      <div key={meal.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-slate-800">{meal.time} — {meal.name}</span>
                        </div>
                        <ul className="space-y-1">
                          {(meal.items || []).map((item: any) => (
                            <li key={item.id} className="text-xs text-slate-600 flex justify-between">
                              <span>• {item.quantity}g {item.food?.name || 'Alimento'} {item.measure ? `(${item.measure})` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-8 text-center text-slate-400">
                <Apple className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm text-slate-600">Nenhum plano alimentar ativo</p>
                <p className="text-xs mt-1">Crie a primeira prescrição dietética para este cliente.</p>
              </Card>
            )}

            {/* Histórico de Dietas */}
            {dietHistory.length > 0 && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Apple className="w-5 h-5 text-teal-600" /> Histórico de Dietas ({dietHistory.length})
                  </CardTitle>
                  {compareDiets.length === 2 && (
                    <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100" onClick={() => setShowCompareModal(true)}>
                      <ArrowLeftRight className="w-4 h-4 mr-1" /> Comparar ({compareDiets.length})
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {dietHistory.map((diet: any) => {
                      const isExpanded = expandedDietId === diet.id
                      const isSelected = compareDiets.some(d => d.id === diet.id)
                      return (
                        <div key={diet.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedDietId(isExpanded ? null : diet.id)}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800">{diet.title}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diet.isActive ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {diet.isActive ? 'ATIVA' : 'INATIVA'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {diet.goal} • {diet.targetKcal} kcal • {new Date(diet.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`text-xs ${isSelected ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'}`}
                                onClick={(e) => { e.stopPropagation(); toggleDietCompare(diet) }}
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> {isSelected ? 'Selecionada' : 'Comparar'}
                              </Button>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                              {(diet.meals || []).map((m: any) => (
                                <div key={m.id} className="bg-slate-50 p-2.5 rounded text-xs text-slate-600">
                                  <span className="font-bold text-slate-700">{m.time} — {m.name}</span>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {(m.items || []).map((i: any) => `${i.quantity}g ${i.food?.name}`).join(', ')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ════════ ABA 3: TREINAMENTO ════════ */}
          <TabsContent value="treino" className="space-y-6 mt-0">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">Planilhas de Treino</h3>
                <p className="text-xs text-slate-500">Prescreva e gerencie as divisões de treino deste cliente.</p>
              </div>
              <Link href={`/clientes/${clientId}/novo-treino`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  <Plus className="w-4 h-4 mr-1.5" /> Nova Ficha de Treino
                </Button>
              </Link>
            </div>

            {activeWorkout ? (
              <Card className="border border-blue-200 shadow-sm">
                <CardHeader className="bg-blue-50/70 border-b border-blue-100 py-4 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-blue-950">{activeWorkout.name}</CardTitle>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">ATIVO</span>
                    </div>
                    {activeWorkout.goal && <p className="text-xs text-slate-600 mt-0.5">{activeWorkout.goal}</p>}
                  </div>
                  <Link href={`/clientes/${clientId}/novo-treino`}>
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 bg-white hover:bg-blue-50">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {(activeWorkout.splits || []).map((split: any) => (
                    <div key={split.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-sm text-slate-800">{split.name} {split.focus ? `— ${split.focus}` : ''}</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded">
                          {split.exercises?.length || 0} exercícios
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(split.exercises || []).map((ex: any) => (
                          <div key={ex.id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                            <span className="font-semibold text-slate-700">{ex.name}</span>
                            <span className="text-slate-500 font-mono">{ex.sets} séries x {ex.reps} reps {ex.rest ? `(${ex.rest})` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-8 text-center text-slate-400">
                <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm text-slate-600">Nenhum treino ativo</p>
                <p className="text-xs mt-1">Crie a primeira planilha de musculação ou treino funcional.</p>
              </Card>
            )}
          </TabsContent>

          {/* ════════ ABA 4: FISIOTERAPIA & REAB ════════ */}
          <TabsContent value="fisio" className="space-y-6 mt-0">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">Reabilitação & Fisioterapia</h3>
                <p className="text-xs text-slate-500">Acompanhamento cinético-funcional e prescrição de condutas.</p>
              </div>
              <Link href={`/clientes/${clientId}/nova-reabilitacao`}>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                  <Plus className="w-4 h-4 mr-1.5" /> Novo Protocolo
                </Button>
              </Link>
            </div>

            {activeRehab ? (
              <Card className="border border-purple-200 shadow-sm">
                <CardHeader className="bg-purple-50/70 border-b border-purple-100 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-purple-950">{activeRehab.diagnosis}</CardTitle>
                    <p className="text-xs text-slate-600 mt-0.5">Fase {activeRehab.phase} • Meta: {activeRehab.goals}</p>
                  </div>
                  <Link href={`/clientes/${clientId}/nova-reabilitacao`}>
                    <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 bg-white hover:bg-purple-50">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {activeRehab.precautions && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700">
                      ⚠️ <strong>Precauções:</strong> {activeRehab.precautions}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Exercícios Terapêuticos:</h4>
                    {(activeRehab.exercises || []).map((ex: any) => (
                      <div key={ex.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{ex.name}</span>
                          <span className="font-mono text-slate-500">{ex.sets}x{ex.reps}</span>
                        </div>
                        {ex.instructions && <p className="text-slate-500 text-[11px] mt-1">{ex.instructions}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-8 text-center text-slate-400">
                <HeartPulse className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm text-slate-600">Nenhum protocolo de reabilitação ativo</p>
              </Card>
            )}
          </TabsContent>

          {/* ════════ ABA 5: EVOLUÇÃO & NOTAS CLÍNICAS ════════ */}
          <TabsContent value="notas" className="space-y-6 mt-0">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">Evolução Clínica & Notas de Consulta</h3>
                <p className="text-xs text-slate-500">Documente retornos, alterações de conduta e próximos passos.</p>
              </div>
              <Button onClick={() => handleOpenNoteModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Nova Nota
              </Button>
            </div>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-0">
                {consultationNotes.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-slate-600">Nenhuma nota de consulta registrada</p>
                    <p className="text-xs mt-1">Clique em "Nova Nota" para documentar a evolução.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {consultationNotes.map((note: any) => (
                      <div key={note.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-slate-500">
                                📅 {new Date(note.createdAt).toLocaleDateString('pt-BR')} às {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {note.creator?.name && (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                  {note.creator.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            {note.nextSteps && (
                              <div className="mt-3 p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs text-indigo-900 font-medium flex items-center gap-2">
                                <span>📌</span> <strong>Próximos Passos:</strong> {note.nextSteps}
                              </div>
                            )}
                            {note.tags && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {note.tags.split(',').map((tag: string, i: number) => (
                                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    #{tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleOpenNoteModal(note)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleDeleteNote(note.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ ABA 6: AVALIAÇÕES & EXAMES ════════ */}
          <TabsContent value="avaliacoes" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Avaliações Físicas */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Avaliações Físicas ({assessments.length})
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowAssessmentModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nova Avaliação
                  </Button>
                </CardHeader>
                <CardContent className="p-4">
                  {assessments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Nenhuma avaliação física registrada.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {assessments.map((a: any) => (
                        <div key={a.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{new Date(a.date).toLocaleDateString('pt-BR')}</span>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              {a.weight ? `${a.weight} kg` : ''} {a.bodyFat ? `• ${a.bodyFat}% BF` : ''} {a.leanMass ? `• ${a.leanMass} kg MM` : ''}
                            </p>
                          </div>
                          {a.creator?.name && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {a.creator.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Anamneses Documentadas */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" /> Anamneses Salvas ({anamneses.length})
                  </CardTitle>
                  <Link href={`/clientes/${clientId}/nova-anamnese`}>
                    <Button size="sm" variant="outline" className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Nova Anamnese
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4">
                  {anamneses.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">Nenhuma anamnese registrada.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {anamneses.map((anamnese: any) => (
                        <div key={anamnese.id} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800">Registrada em {new Date(anamnese.createdAt).toLocaleDateString('pt-BR')}</span>
                            {anamnese.creator?.name && <p className="text-slate-400 text-[11px]">por {anamnese.creator.name}</p>}
                          </div>
                          <Button size="sm" variant="outline" className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50" onClick={() => setSelectedAnamnesis(anamnese)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> Consultar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ════════ ABA 7: DADOS CADASTRAIS & PRONTUÁRIO ════════ */}
          <TabsContent value="prontuario" className="space-y-6 mt-0">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <CardTitle className="text-lg">Prontuário & Dados do Cliente</CardTitle>
                  <CardDescription>Atualize histórico de saúde, estilo de vida e observações privadas.</CardDescription>
                </div>
                {client.status === "ARCHIVED" ? (
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                    Cliente arquivado
                  </span>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm" disabled={lifecyclePending}>
                        Arquivar cliente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O prontuário será preservado e poderá ser restaurado na listagem de arquivados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={lifecyclePending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={lifecyclePending} onClick={handleArchive}>
                          {lifecyclePending ? "Arquivando..." : "Confirmar arquivamento"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                <ClientForm
                  key={`${clientId}:${formRevision}`}
                  mode="update"
                  initialValues={client}
                  initialVersion={client.updatedAt || new Date().toISOString()}
                  submitLabel="Salvar alterações no prontuário"
                  pending={lifecyclePending}
                  onSubmit={handleUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>

      {/* ════════ MODAL DE AVALIAÇÃO FÍSICA ════════ */}
      {isFisio ? (
        <PhysioAssessmentModal
          isOpen={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          patientId={clientId}
          onSuccess={() => { refetchAll(); setShowAssessmentModal(false) }}
        />
      ) : (
        <AssessmentModal
          isOpen={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          patientId={clientId}
          onSuccess={() => { refetchAll(); setShowAssessmentModal(false) }}
        />
      )}

      {/* ════════ MODAL DE NOTA DE CONSULTA ════════ */}
      {showNoteModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowNoteModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-50 p-5 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> {editingNote ? 'Editar Nota de Consulta' : 'Nova Nota de Consulta'}
              </h2>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowNoteModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Evolução / Observações da Consulta <span className="text-rose-500">*</span></Label>
                <textarea
                  value={noteForm.content}
                  onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                  placeholder="Descreva o que foi discutido, decisões tomadas, como o cliente está progredindo..."
                  className="w-full min-h-[120px] p-4 text-sm border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Próximos Passos / Follow-up</Label>
                <textarea
                  value={noteForm.nextSteps}
                  onChange={e => setNoteForm({ ...noteForm, nextSteps: e.target.value })}
                  placeholder="Ex: Aumentar proteína na próxima fase, retorno em 15 dias..."
                  className="w-full min-h-[60px] p-3 text-sm border border-slate-200 rounded-xl resize-none focus:ring-1 focus:ring-indigo-500 outline-none bg-indigo-50/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Tags <span className="text-slate-400 font-normal text-xs">(separadas por vírgula)</span></Label>
                <Input
                  value={noteForm.tags}
                  onChange={e => setNoteForm({ ...noteForm, tags: e.target.value })}
                  placeholder="Ex: retorno-15d, aumento-proteina, fase-2"
                  className="h-10"
                />
              </div>
              <Button onClick={handleSaveNote} disabled={isSavingNote} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md">
                {isSavingNote ? "A Salvar..." : editingNote ? "Salvar Alterações" : "Registrar Nota"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ════════ MODAL DE DETALHES DA ANAMNESE ════════ */}
      {selectedAnamnesis && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setSelectedAnamnesis(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-teal-50 p-5 border-b border-teal-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-teal-900">Anamnese Clínica Fechada</h3>
                <p className="text-xs text-slate-500">Registrada em {new Date(selectedAnamnesis.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedAnamnesis(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto text-sm text-slate-700">
              {selectedAnamnesis.clinicalHistory && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="font-bold text-xs text-slate-500 mb-1">Histórico Clínico:</p>
                  <p>{selectedAnamnesis.clinicalHistory}</p>
                </div>
              )}
              {selectedAnamnesis.medications && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="font-bold text-xs text-slate-500 mb-1">Medicamentos em uso:</p>
                  <p>{selectedAnamnesis.medications}</p>
                </div>
              )}
              {selectedAnamnesis.foodHabits && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="font-bold text-xs text-slate-500 mb-1">Hábitos Alimentares:</p>
                  <p>{selectedAnamnesis.foodHabits}</p>
                </div>
              )}
              {selectedAnamnesis.digestiveHealth && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="font-bold text-xs text-slate-500 mb-1">Saúde Digestiva / Intestino:</p>
                  <p>{selectedAnamnesis.digestiveHealth}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ════════ MODAL DE COMPARAÇÃO DE DIETAS ════════ */}
      {showCompareModal && compareDiets.length === 2 && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowCompareModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex justify-between items-center z-10 shadow-sm">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" /> Comparação de Dietas
              </h2>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowCompareModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {compareDiets.map((diet, idx) => (
                  <div key={diet.id} className="space-y-4">
                    <div className={`p-4 rounded-xl border-2 ${idx === 0 ? 'border-teal-300 bg-teal-50/30' : 'border-indigo-300 bg-indigo-50/30'}`}>
                      <p className="font-black text-lg text-slate-800">{diet.title}</p>
                      <p className="text-xs text-slate-500">{diet.goal} • {new Date(diet.createdAt).toLocaleDateString('pt-BR')}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diet.isActive ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
                        {diet.isActive ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <table className="w-full text-sm mt-6 border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="text-left py-3 px-2 text-slate-500 font-semibold">Parâmetro</th>
                    <th className="text-center py-3 px-2 font-bold text-teal-700">{compareDiets[0].title}</th>
                    <th className="text-center py-3 px-2 font-bold text-indigo-700">{compareDiets[1].title}</th>
                    <th className="text-center py-3 px-2 text-slate-500 font-semibold">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { label: 'Calorias (kcal)', k: 'targetKcal' },
                    { label: 'Proteínas (g)', k: 'proteinG' },
                    { label: 'Carboidratos (g)', k: 'carbsG' },
                    { label: 'Gorduras (g)', k: 'fatG' },
                    { label: 'Fibras (g)', k: 'fiberG' },
                    { label: 'Duração (dias)', k: 'durationDays' },
                  ].map(row => {
                    const v1 = compareDiets[0][row.k] ?? 0
                    const v2 = compareDiets[1][row.k] ?? 0
                    const diff = v2 - v1
                    return (
                      <tr key={row.k} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2 text-slate-600 font-medium">{row.label}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{v1}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-800">{v2}</td>
                        <td className={`py-3 px-2 text-center font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {diff > 0 ? '+' : ''}{diff !== 0 ? diff : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
