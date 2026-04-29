"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ArrowLeft, User, Activity, Brain, Lock, Apple, TrendingUp, Plus, Save, X, Dumbbell, Stethoscope, ClipboardList } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

export default function FichaPacientePage() {
  const { user: loggedInUser } = useAuth()
  const params = useParams()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [assessments, setAssessments] = useState<any[]>([])
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [savingAssessment, setSavingAssessment] = useState(false)
  const [newAssessment, setNewAssessment] = useState({
    weight: "", bodyFat: "", muscleMass: "", waist: "", abdomen: "", hips: "", notes: ""
  })

  // 🌟 NOVOS ESTADOS PARA O MODAL DE EDIÇÃO
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editData, setEditData] = useState<any>({})

  useEffect(() => {
    if (params.id) {
      fetchPatient()
      fetchAssessments()
    }
  }, [params.id])

  const fetchPatient = async () => {
    try {
      const response = await api.get(`/users/${params.id}`)
      setPatient(response.data)
    } catch (error) {
      toast.error("Erro ao carregar a ficha do paciente.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAssessments = async () => {
    try {
      const response = await api.get(`/assessments/user/${params.id}`)
      setAssessments(response.data)
    } catch (error) {
      console.error("Erro ao carregar avaliações", error)
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
      exerciseDuration: patient.exerciseDuration || "",
      hasPersonal: patient.hasPersonal || ""
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
      await api.put(`/users/${params.id}`, payload)
      toast.success("Ficha atualizada com sucesso!")
      setShowEditModal(false)
      fetchPatient() // Recarrega os dados na tela
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
        userId: params.id,
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
      fetchAssessments()
    } catch (error) {
      toast.error("Erro ao salvar a avaliação.")
    } finally {
      setSavingAssessment(false)
    }
  }

  const DataBlock = ({ label, value }: { label: string, value: any }) => (
    <div className="space-y-1 bg-white p-4 rounded-lg border border-slate-100 shadow-sm w-full">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300">-</span>}</p>
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
          
          <div className="flex items-center gap-3">
            {isNutri && (
              <Link href={`/membros/${params.id}/nova-dieta`}>
                <Button className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md">
                  <Apple className="w-4 h-4 mr-2" /> Prescrever Dieta
                </Button>
              </Link>
            )}
            {isPersonal && (
              <Link href={`/membros/${params.id}/novo-treino`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Dumbbell className="w-4 h-4 mr-2" /> Prescrever Treino
                </Button>
              </Link>
            )}
            {isFisio && (
              <Button className="h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md">
                <Activity className="w-4 h-4 mr-2" /> Avaliação Postural
              </Button>
            )}
            <Button variant="outline" className="h-11 text-slate-700 border-slate-300" onClick={handleOpenEdit}>
              Editar Cadastro
            </Button>
          </div>
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
                <CardHeader className="bg-slate-800 border-b border-slate-700 py-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <TrendingUp className={`w-5 h-5 ${isPersonal ? 'text-blue-400' : 'text-emerald-400'}`} /> 
                    Composição Corporal
                  </CardTitle>
                  <Button onClick={() => setShowAssessmentModal(true)} size="sm" className={`${isPersonal ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white border-0`}>
                    <Plus className="w-4 h-4 mr-1" /> Nova Avaliação
                  </Button>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  {assessments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                      <p className="font-medium">Nenhuma avaliação registada ainda.</p>
                      <p className="text-sm mt-1">Registe as medidas da primeira consulta para iniciar o gráfico.</p>
                    </div>
                  ) : (
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="displayDate" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={40} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#0f172a" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="bodyFat" name="Gordura (%)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} />
                          <Line type="monotone" dataKey="muscleMass" name="Músculo (kg)" stroke={isPersonal ? '#3b82f6' : '#10b981'} strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
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
                    <DataBlock label="Peso Declarado" value={patient.initialWeight ? `${patient.initialWeight} kg` : null} />
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DataBlock label="Pratica Exercício?" value={patient.exerciseType} />
                    <DataBlock label="Frequência" value={patient.exerciseFrequency} />
                    <DataBlock label="Duração Média" value={patient.exerciseDuration} />
                    <DataBlock label="Possui Personal?" value={patient.hasPersonal} />
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <Label>Pratica Exercício?</Label>
                    <Input value={editData.exerciseType} onChange={e => setEditData({...editData, exerciseType: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Input value={editData.exerciseFrequency} onChange={e => setEditData({...editData, exerciseFrequency: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração Média</Label>
                    <Input value={editData.exerciseDuration} onChange={e => setEditData({...editData, exerciseDuration: e.target.value})} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Possui Personal?</Label>
                    <Input value={editData.hasPersonal} onChange={e => setEditData({...editData, hasPersonal: e.target.value})} className="h-11" />
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

      {/* MODAL DE AVALIAÇÃO ... MANTIDO ... */}
      {showAssessmentModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowAssessmentModal(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className={`p-5 text-white flex items-center justify-between ${isPersonal ? 'bg-blue-800' : 'bg-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`${isPersonal ? 'bg-blue-500' : 'bg-emerald-500'} p-2 rounded-lg`}><TrendingUp className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-xl font-bold">Nova Avaliação Corporal</h2>
                  <p className="text-slate-300 text-xs mt-0.5">Registe os dados da avaliação de hoje</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white" onClick={() => setShowAssessmentModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Medidas Globais</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Peso (kg) <span className="text-rose-500">*</span></Label>
                    <Input type="number" placeholder="Ex: 85.5" value={newAssessment.weight} onChange={e => setNewAssessment({...newAssessment, weight: e.target.value})} className="font-semibold text-lg h-12" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">% Gordura</Label>
                    <Input type="number" placeholder="Ex: 18.2" value={newAssessment.bodyFat} onChange={e => setNewAssessment({...newAssessment, bodyFat: e.target.value})} className="h-12" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Músculo (kg/% )</Label>
                    <Input type="number" placeholder="Ex: 35.0" value={newAssessment.muscleMass} onChange={e => setNewAssessment({...newAssessment, muscleMass: e.target.value})} className="h-12" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider">Circunferências Principais (cm)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Cintura</Label>
                    <Input type="number" placeholder="Ex: 80" value={newAssessment.waist} onChange={e => setNewAssessment({...newAssessment, waist: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Abdômen</Label>
                    <Input type="number" placeholder="Ex: 85" value={newAssessment.abdomen} onChange={e => setNewAssessment({...newAssessment, abdomen: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Quadril</Label>
                    <Input type="number" placeholder="Ex: 100" value={newAssessment.hips} onChange={e => setNewAssessment({...newAssessment, hips: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 h-12 text-slate-600" onClick={() => setShowAssessmentModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveAssessment} disabled={savingAssessment || !newAssessment.weight} className={`flex-1 h-12 text-white font-bold shadow-md ${isPersonal ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {savingAssessment ? "A Salvar..." : <><Save className="w-4 h-4 mr-2" /> Salvar Medidas</>}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}