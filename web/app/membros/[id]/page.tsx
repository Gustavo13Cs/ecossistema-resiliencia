"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ArrowLeft, User, Activity, HeartPulse, Brain, Lock } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function FichaPacientePage() {
  const { user: loggedInUser } = useAuth()
  const params = useParams()
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchPatient()
    }
  }, [params.id])

  const fetchPatient = async () => {
    try {
      // Busca os dados específicos deste paciente
      const response = await api.get(`/users/${params.id}`)
      setPatient(response.data)
    } catch (error) {
      toast.error("Erro ao carregar a ficha do paciente.")
    } finally {
      setLoading(false)
    }
  }

  // Componente auxiliar para deixar o código limpo e os dados bonitos!
  const DataBlock = ({ label, value }: { label: string, value: any }) => (
    <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300">-</span>}</p>
    </div>
  )

  if (loading) return <div className="p-8 text-center text-slate-500">A carregar prontuário...</div>
  if (!patient) return <div className="p-8 text-center text-rose-500">Paciente não encontrado.</div>

  const isNutri = loggedInUser?.businessContext === 'NUTRITIONIST'

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* CABEÇALHO DA FICHA */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <Link href="/membros">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                ${isNutri ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600'}`}>
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
                <p className="text-slate-500 font-medium">Cadastrado em {new Date(patient.createdAt).toLocaleDateString('pt-PT')}</p>
              </div>
            </div>
          </div>
          
          <Button variant="outline" className="hidden md:flex">
            Editar Cadastro
          </Button>
        </div>

        {/* CORPO DO PRONTUÁRIO */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* COLUNA ESQUERDA: Dados Básicos */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4" /> Identificação e Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 bg-slate-50/30">
                <DataBlock label="E-mail" value={patient.email} />
                <DataBlock label="WhatsApp" value={patient.phone} />
                <DataBlock label="Data de Nascimento" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-PT') : null} />
                <DataBlock label="Sexo" value={patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : null} />
              </CardContent>
            </Card>

            {/* Apenas mostra observações se for Nutri */}
            {isNutri && patient.nutritionistNotes && (
              <Card className="shadow-sm border-0 border-l-4 border-l-slate-600">
                <CardHeader className="bg-slate-100 border-b border-slate-200 py-4">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <Lock className="w-4 h-4" /> Observações Internas
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

          {/* COLUNA DIREITA: Anamnese Larga */}
          <div className="lg:col-span-2 space-y-6">
            {isNutri ? (
              <>
                {/* SAÚDE FÍSICA E ANTROPOMETRIA */}
                <Card className="shadow-sm border-0 border-t-4 border-t-teal-500">
                  <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <CardTitle className="text-base flex items-center gap-2 text-teal-700">
                      <HeartPulse className="w-5 h-5" /> Saúde Física e Antropometria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-slate-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <DataBlock label="Altura" value={patient.height ? `${patient.height} cm` : null} />
                      <DataBlock label="Peso Inicial" value={patient.initialWeight ? `${patient.initialWeight} kg` : null} />
                      <div className="col-span-2">
                        <DataBlock label="Alergias / Intolerâncias" value={patient.allergies} />
                      </div>
                    </div>
                    <DataBlock label="Patologias Diagnósticadas" value={patient.pathologies} />
                  </CardContent>
                </Card>

                {/* ESTILO DE VIDA */}
                <Card className="shadow-sm border-0 border-t-4 border-t-amber-500">
                  <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      <Brain className="w-5 h-5" /> Estilo de Vida e Comportamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DataBlock label="Profissão / Rotina" value={patient.typicalSleep} />
                      <DataBlock label="Nível de Estresse (1-5)" value={patient.stressLevel ? `${patient.stressLevel}/5` : null} />
                      <DataBlock label="Relação com Comida" value={patient.foodRelationship} />
                      <DataBlock label="Acompanhamento Psicológico" value={patient.psychologyHistory} />
                    </div>
                  </CardContent>
                </Card>

                {/* ATIVIDADE FÍSICA */}
                <Card className="shadow-sm border-0 border-t-4 border-t-indigo-500">
                  <CardHeader className="bg-white border-b border-slate-100 py-4">
                    <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                      <Activity className="w-5 h-5" /> Atividade Física
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-slate-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DataBlock label="Pratica Exercício?" value={patient.exerciseType} />
                      <DataBlock label="Frequência" value={patient.exerciseFrequency} />
                      <DataBlock label="Duração" value={patient.exerciseDuration} />
                      <DataBlock label="Possui Personal?" value={patient.hasPersonal} />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-white rounded-xl border border-slate-200 text-slate-400">
                Este perfil não possui dados clínicos avançados.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}