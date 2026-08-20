"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ArrowLeft, User, Activity, Brain, Lock, Apple, TrendingUp, Plus, Save, X, Dumbbell, Stethoscope, ClipboardList,LineChart as LineChartIcon, TableProperties ,FileText, Eye, Calculator, Beaker, ActivitySquare, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useQueryClient } from "@tanstack/react-query"
import { usePatientRecord } from "@/hooks/features/usePatientRecord"
import { invalidatePatientAssessments, invalidatePatientProfile } from "@/lib/query-invalidation"
import dynamic from "next/dynamic"

import { AssessmentModal } from "@/components/AssessmentModal"
import { PhysioAssessmentModal } from "@/components/PhysioAssessmentModal"

const BodyCompositionChart = dynamic(() => import("@/components/features/patient/BodyCompositionChart"), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-xl bg-slate-100" aria-label="Carregando gráfico" />,
})

export default function FichaPacientePage() {
  const { user: loggedInUser } = useAuth()
  const params = useParams()
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id
  const queryClient = useQueryClient()
  const { patient, assessments, anamneses, loading, patientError } = usePatientRecord(patientId)

  const [viewMode, setViewMode] = useState<"chart" | "table">("chart")
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [savingAssessment, setSavingAssessment] = useState(false)
  const [newAssessment, setNewAssessment] = useState({
    weight: "", bodyFat: "", muscleMass: "", waist: "", abdomen: "", hips: "", notes: ""
  })

  const [showEditModal, setShowEditModal] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editData, setEditData] = useState<any>({})

  const [selectedAnamnesis, setSelectedAnamnesis] = useState<any>(null)

  useEffect(() => {
    if (patientError) toast.error("Erro ao carregar a ficha do paciente.")
  }, [patientError])

  const refreshAssessments = async () => {
    if (loggedInUser?.sub && patientId) {
      await invalidatePatientAssessments(queryClient, loggedInUser.sub, patientId)
    }
  }


  // 🌟 FUNÇÃO PARA ABRIR O MODAL E PREENCHER COM OS DADOS ATUAIS
  const handleOpenEdit = () => {
    setEditData({
      name: patient.name || "",
      phone: patient.phone || "",
      birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : "",
      gender: patient.gender || "",
      goal: patient.goal || "",
      height: patient.height || "",
      initialWeight: patient.initialWeight || "",
      allergies: patient.allergies || "",
      pathologies: patient.pathologies || "",
      typicalSleep: patient.typicalSleep || "",
      stressLevel: patient.stressLevel || "",
      foodRelationship: patient.foodRelationship || "",
      psychologyHistory: patient.psychologyHistory || "",
      exerciseType: patient.exerciseType || "",
      exerciseFrequency: patient.exerciseFrequency || "",
      exerciseDuration: patient.exerciseDuration || ""
    })
    setShowEditModal(true)
  }

  // 🌟 FUNÇÃO PARA SALVAR A EDIÇÃO
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingEdit(true)
    try {
      const payload = {
        ...editData,
        height: editData.height ? Number(editData.height) : null,
        initialWeight: editData.initialWeight ? Number(editData.initialWeight) : null,
        stressLevel: editData.stressLevel ? Number(editData.stressLevel) : null,
        birthDate: editData.birthDate ? new Date(editData.birthDate).toISOString() : null,
      }
      await api.patch(`/users/${patientId}`, payload)
      toast.success("Ficha atualizada com sucesso!")
      setShowEditModal(false)
      if (loggedInUser?.sub && patientId) {
        await invalidatePatientProfile(queryClient, loggedInUser.sub, patientId)
      }
    } catch (error) {
      toast.error("Erro ao atualizar o cadastro.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleSaveAssessment = async () => {
    if (!newAssessment.weight) {
      toast.error("O peso é obrigatório para gerar o gráfico!")
      return
    }
    setSavingAssessment(true)
    try {
      const payload = {
        userId: patientId,
        weight: Number(newAssessment.weight),
        bodyFat: newAssessment.bodyFat ? Number(newAssessment.bodyFat) : undefined,
        muscleMass: newAssessment.muscleMass ? Number(newAssessment.muscleMass) : undefined,
        waist: newAssessment.waist ? Number(newAssessment.waist) : undefined,
        abdomen: newAssessment.abdomen ? Number(newAssessment.abdomen) : undefined,
        hips: newAssessment.hips ? Number(newAssessment.hips) : undefined,
        notes: newAssessment.notes
      }
      await api.post('/assessments', payload)
      toast.success("Avaliação salva com sucesso! Gráfico atualizado.")
      setNewAssessment({ weight: "", bodyFat: "", muscleMass: "", waist: "", abdomen: "", hips: "", notes: "" })
      setShowAssessmentModal(false)
      await refreshAssessments()
    } catch (error) {
      toast.error("Erro ao salvar a avaliação.")
    } finally {
      setSavingAssessment(false)
    }
  }

  const DataBlock = ({ label, value }: { label: string, value: any }) => (
    <div className="space-y-1 bg-white p-4 rounded-lg border border-slate-100 shadow-sm w-full overflow-hidden">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-slate-800 break-words">{value || <span className="text-slate-300">-</span>}</p>
    </div>
  )

  if (loading) return <div className="p-8 text-center text-slate-500">A carregar prontuário...</div>
  if (!patient) return <div className="p-8 text-center text-rose-500">Paciente não encontrado.</div>

  const isNutri = loggedInUser?.role === 'NUTRITIONIST'
  const isPersonal = loggedInUser?.role === 'PERSONAL'
  const isFisio = loggedInUser?.role === 'PHYSIO'

  const chartData = assessments.map(a => ({
    ...a,
    displayDate: new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }))

  return (
    <div className="min-h-screen bg-slate-50 py-8 relative">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-8">
        
        <div className={`flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border-b-4 ${
          isPersonal ? 'border-blue-500' : isFisio ? 'border-purple-500' : 'border-teal-500'
        }`}>
          <div className="flex items-center gap-6">
            <Link href="/membros">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-sm text-white ${
                isPersonal ? 'bg-blue-500' : isFisio ? 'bg-purple-500' : 'bg-teal-500'
              }`}>
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
                <p className="text-slate-500 font-medium">Cadastrado em {new Date(patient.createdAt).toLocaleDateString('pt-PT')}</p>
              </div>
            </div>
          </div>
          
          {/* CABEÇALHO - APENAS AÇÕES PRINCIPAIS */}
          <div className="flex items-center gap-3">
            <Link href={`/membros/${params.id}/visao-360`}>
              <Button variant="outline" className="h-11 text-slate-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 hover:text-indigo-700 font-bold">
                <LayoutGrid className="w-4 h-4 mr-2" /> Visão 360°
              </Button>
            </Link>
            <Button variant="outline" className="h-11 text-slate-700 border-slate-300 bg-white" onClick={handleOpenEdit}>
              Editar Cadastro
            </Button>
            
            {isNutri && (
              <Link href={`/membros/${params.id}/nova-dieta`}>
                <Button className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md">
                  <Apple className="w-4 h-4 mr-2" /> Prescrever Dieta
                </Button>
              </Link>
            )}

            {isPersonal && (
              <Link href={`/membros/${params.id}/novo-treino`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md h-11">
                  <Dumbbell className="w-4 h-4 mr-2" /> Prescrever Treino
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {isNutri && (
            <Link href={`/membros/${params.id}/nova-anamnese`}>
              <Button className="w-full h-14 bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-700 font-bold shadow-sm justify-start px-5 transition-all">
                <ClipboardList className="w-5 h-5 mr-3 opacity-70" /> Nova Anamnese
              </Button>
            </Link>
          )}
          
          {isNutri && (
             <Link href={`/membros/${params.id}/calculo-energetico`}>
               <Button className="w-full h-14 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold shadow-sm justify-start px-5 transition-all">
                 <Calculator className="w-5 h-5 mr-3 opacity-70" /> Cálculo Energético
               </Button>
             </Link>
          )}
          
          {isNutri && (
             <Link href={`/membros/${params.id}/nova-suplementacao`}>
               <Button className="w-full h-14 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 font-bold shadow-sm justify-start px-5 transition-all">
                 <Beaker className="w-5 h-5 mr-3 opacity-70" /> Fórmulas / Suplementos
               </Button>
             </Link>
          )}

          {isNutri && (
             <Link href={`/membros/${params.id}/exames`}>
               <Button className="w-full h-14 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold shadow-sm justify-start px-5 transition-all">
                 <ActivitySquare className="w-5 h-5 mr-3 opacity-70" /> Exames Lab.
               </Button>
             </Link>
          )}

          {isFisio && (
             <Button onClick={() => setShowAssessmentModal(true)} className="w-full h-14 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 font-bold shadow-sm justify-start px-5 transition-all">
               <Activity className="w-5 h-5 mr-3 opacity-70" /> Avaliação Postural
             </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card className="shadow-sm border-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4" /> Identificação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 bg-slate-50/30">
                <DataBlock label="E-mail" value={patient.email} />
                <DataBlock label="WhatsApp" value={patient.phone} />
                <DataBlock label="Nascimento" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-PT') : null} />
                <DataBlock label="Sexo" value={patient.gender} />
                <DataBlock label="Objetivo" value={patient.goal} />
              </CardContent>
            </Card>

            {patient.nutritionistNotes && (
              <Card className="shadow-sm border-0 border-l-4 border-l-slate-600">
                <CardHeader className="bg-slate-100 border-b border-slate-200 py-4">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <Lock className="w-4 h-4" /> Observações Clínicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {patient.nutritionistNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-9 space-y-6">
            {(isNutri || isPersonal) && (
              <Card className="shadow-md border-0 overflow-hidden ring-1 ring-slate-200">
                <CardHeader className="bg-slate-800 border-b border-slate-700 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <TrendingUp className={`w-5 h-5 ${isPersonal ? 'text-blue-400' : 'text-emerald-400'}`} /> 
                    Composição Corporal
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-900 rounded-lg p-1 flex">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setViewMode("chart")}
                        className={`h-8 px-3 ${viewMode === 'chart' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        <LineChartIcon className="w-4 h-4 mr-2" /> Gráfico
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setViewMode("table")}
                        className={`h-8 px-3 ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        <TableProperties className="w-4 h-4 mr-2" /> Tabela
                      </Button>
                    </div>

                    <Button onClick={() => setShowAssessmentModal(true)} size="sm" className={`${isPersonal ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white border-0`}>
                      <Plus className="w-4 h-4 mr-1" /> Avaliar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 bg-white">
                  {assessments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                      <p className="font-medium">Nenhuma avaliação registada ainda.</p>
                      <p className="text-sm mt-1">Registe as medidas da primeira consulta para iniciar o acompanhamento.</p>
                    </div>
                  ) : viewMode === "chart" ? (
                    <BodyCompositionChart data={chartData} isPersonal={isPersonal} />
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Peso (kg)</th>
                            <th className="px-6 py-4">Gordura (%)</th>
                            <th className="px-6 py-4">Músculo (kg)</th>
                            <th className="px-6 py-4">Cintura / Abdômen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assessments.slice().reverse().map((assessment, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                {new Date(assessment.date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-slate-700 font-bold">{assessment.weight || '-'}</td>
                              <td className="px-6 py-4 text-rose-600 font-medium">{assessment.bodyFat ? `${assessment.bodyFat}%` : '-'}</td>
                              <td className="px-6 py-4 text-emerald-600 font-medium">{assessment.muscleMass || '-'}</td>
                              <td className="px-6 py-4 text-slate-600">
                                {assessment.waist || '-'} cm / {assessment.abdomen || '-'} cm
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            <div className="grid md:grid-cols-1 gap-6">
              <Card className="shadow-sm border-0 border-t-4 border-t-teal-500">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <CardTitle className="text-base flex items-center gap-2 text-teal-700">
                    <Activity className="w-5 h-5" /> Saúde Física e Antropometria Inicial
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-slate-50/50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DataBlock label="Altura" value={patient.height ? `${patient.height} cm` : null} />
                    <DataBlock label="Peso" value={patient.initialWeight ? `${patient.initialWeight} kg` : null} />
                    <DataBlock label="Alergias / Intolerâncias" value={patient.allergies} />
                    <DataBlock label="Patologias Diagnosticadas" value={patient.pathologies} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                    <Brain className="w-5 h-5" /> Estilo de Vida e Comportamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-slate-50/50">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DataBlock label="Padrão de Sono" value={patient.typicalSleep} />
                    <DataBlock label="Nível de Estresse (1-5)" value={patient.stressLevel} />
                    <DataBlock label="Relação com Comida" value={patient.foodRelationship} />
                    <DataBlock label="Acompanhamento Psicológico" value={patient.psychologyHistory} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 border-t-4 border-t-indigo-500">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                    <Activity className="w-5 h-5" /> Atividade Física
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DataBlock label="Esportes / Exercícios" value={patient.exerciseType} />
                    <DataBlock label="Frequência Semanal" value={patient.exerciseFrequency} />
                    <DataBlock label="Duração Média" value={patient.exerciseDuration} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm mt-6">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" /> Histórico Clínico (Anamneses)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {anamneses.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        Nenhuma anamnese registada. Preencha uma nova anamnese na consulta.
                      </div>
                    ) : (
                      anamneses.map(anamnese => (
                        <div key={anamnese.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-bold text-slate-700">Anamnese Geral</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Registada a {new Date(anamnese.createdAt).toLocaleDateString('pt-BR')} 
                              {anamnese.creator?.name ? ` por ${anamnese.creator.name}` : ''}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-teal-700 border-teal-200 hover:bg-teal-50" 
                            onClick={() => setSelectedAnamnesis(anamnese)}
                          >
                            <Eye className="w-4 h-4 mr-2"/> Consultar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 MODAL DE EDIÇÃO DE CADASTRO */}
      {showEditModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowEditModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
            
            <div className={`sticky top-0 z-10 flex justify-between items-center p-5 border-b shadow-sm ${
              isPersonal ? 'bg-blue-50 border-blue-100' : isFisio ? 'bg-purple-50 border-purple-100' : 'bg-teal-50 border-teal-100'
            }`}>
              <h2 className={`font-bold text-lg flex items-center gap-2 ${
                isPersonal ? 'text-blue-800' : isFisio ? 'text-purple-800' : 'text-teal-800'
              }`}>
                <ClipboardList className="w-5 h-5" /> Editar Cadastro ({patient.name})
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)} className="h-8 w-8 rounded-full bg-white/50 hover:bg-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-8">
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">1. Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input required value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">2. Perfil Físico</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Objetivo Principal</Label>
                    <Input value={editData.goal} onChange={e => setEditData({...editData, goal: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Input value={editData.gender} onChange={e => setEditData({...editData, gender: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nascimento</Label>
                    <Input type="date" value={editData.birthDate} onChange={e => setEditData({...editData, birthDate: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Peso Declarado (kg)</Label>
                    <Input type="number" step="0.1" value={editData.initialWeight} onChange={e => setEditData({...editData, initialWeight: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Altura (cm)</Label>
                    <Input type="number" value={editData.height} onChange={e => setEditData({...editData, height: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">3. Saúde e Comportamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label>Alergias / Intolerâncias</Label>
                    <Input value={editData.allergies} onChange={e => setEditData({...editData, allergies: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Patologias Diagnosticadas</Label>
                    <Input value={editData.pathologies} onChange={e => setEditData({...editData, pathologies: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Padrão de Sono / Rotina</Label>
                    <Input value={editData.typicalSleep} onChange={e => setEditData({...editData, typicalSleep: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Estresse (1-5)</Label>
                    <Input type="number" min="1" max="5" value={editData.stressLevel} onChange={e => setEditData({...editData, stressLevel: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Relação com Comida</Label>
                    <Input value={editData.foodRelationship} onChange={e => setEditData({...editData, foodRelationship: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Acompanhamento Psicológico</Label>
                    <Input value={editData.psychologyHistory} onChange={e => setEditData({...editData, psychologyHistory: e.target.value})} className="h-11" />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">4. Atividade Física</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label>Esportes / Exercícios praticados</Label>
                    <Input 
                      placeholder="Ex: Musculação, Corrida, Crossfit..." 
                      value={editData.exerciseType} 
                      onChange={e => setEditData({...editData, exerciseType: e.target.value})} 
                      className="h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência Semanal</Label>
                    <Input 
                      placeholder="Ex: 3 a 4x na semana" 
                      value={editData.exerciseFrequency} 
                      onChange={e => setEditData({...editData, exerciseFrequency: e.target.value})} 
                      className="h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração Média (por treino)</Label>
                    <Input 
                      placeholder="Ex: 60 minutos" 
                      value={editData.exerciseDuration} 
                      onChange={e => setEditData({...editData, exerciseDuration: e.target.value})} 
                      className="h-11" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t mt-8 flex justify-end gap-3">
                <Button type="button" variant="outline" className="h-12 px-6" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingEdit} className={`h-12 px-8 text-white font-bold text-lg shadow-md ${
                  isPersonal ? 'bg-blue-600 hover:bg-blue-700' : isFisio ? 'bg-purple-600 hover:bg-purple-700' : 'bg-teal-600 hover:bg-teal-700'
                }`}>
                  {isSavingEdit ? "A Salvar..." : `Salvar Alterações`}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* RENDERIZAÇÃO INTELIGENTE DOS MODAIS DE AVALIAÇÃO */}
      {isFisio ? (
        <PhysioAssessmentModal 
          isOpen={showAssessmentModal} 
          onClose={() => setShowAssessmentModal(false)} 
          patientId={params.id as string}
          onSuccess={refreshAssessments}
        />
      ) : (
        <AssessmentModal 
          isOpen={showAssessmentModal} 
          onClose={() => setShowAssessmentModal(false)} 
          patientId={params.id as string}
          onSuccess={refreshAssessments}
        />
      )}

      {selectedAnamnesis && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setSelectedAnamnesis(null)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             
             <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <FileText className="w-5 h-5 text-teal-600"/> Documento Clínico Oficial
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">Registado a {new Date(selectedAnamnesis.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedAnamnesis.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
               </div>
               <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200" onClick={() => setSelectedAnamnesis(null)}>
                 <X className="w-5 h-5"/>
               </Button>
             </div>

             {/* Corpo do Documento */}
             <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">
                
                {/* Secção Clínica */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Histórico Clínico e Atual</h4>
                  
                  {selectedAnamnesis.clinicalHistory && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Doenças Anteriores e Atuais:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnamnesis.clinicalHistory}</p></div>
                  )}
                  {selectedAnamnesis.pathologies && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Patologias Confirmadas:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnamnesis.pathologies}</p></div>
                  )}
                  {selectedAnamnesis.medications && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Medicamentos em Uso:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnamnesis.medications}</p></div>
                  )}
                </div>

                {/* Secção Intestino */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Intestino & Urina</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAnamnesis.bowelMovement && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Frequência Evacuatória:</p><p className="text-sm text-slate-700">{selectedAnamnesis.bowelMovement}</p></div>
                    )}
                    {selectedAnamnesis.bristolScale && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Escala de Bristol:</p><p className="text-sm text-slate-700">Tipo {selectedAnamnesis.bristolScale}</p></div>
                    )}
                  </div>
                  {selectedAnamnesis.urineColor && (
                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Coloração da Urina:</p><p className="text-sm text-slate-700">{selectedAnamnesis.urineColor}</p></div>
                  )}
                </div>

                {/* Secção Queixas e Família */}
                <div className="space-y-4">
                  <h4 className="font-black text-sm text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Sintomas & Estilo de Vida</h4>
                  {selectedAnamnesis.symptoms && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Sintomas e Queixas:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnamnesis.symptoms}</p></div>
                  )}
                  {selectedAnamnesis.familyHistory && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Histórico Familiar:</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAnamnesis.familyHistory}</p></div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAnamnesis.waterIntake && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Água Diária:</p><p className="text-sm text-slate-700">{selectedAnamnesis.waterIntake} L</p></div>
                    )}
                    {selectedAnamnesis.alcoholAndSmoking && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-1">Álcool/Tabagismo:</p><p className="text-sm text-slate-700">{selectedAnamnesis.alcoholAndSmoking}</p></div>
                    )}
                  </div>
                </div>

                <div className="text-center pt-4 opacity-50">
                  <p className="text-xs font-bold text-slate-400">Documento fechado. Edições não são permitidas por segurança ética.</p>
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  )
}
