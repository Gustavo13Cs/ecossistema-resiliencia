"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle2, Activity, Droplets, AlertCircle, HeartPulse, ShieldAlert, FileText } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function NovaAnamnesePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patientName, setPatientName] = useState("A carregar...")
  
  const [activeTab, setActiveTab] = useState('clinico')

  const [formData, setFormData] = useState({
    clinicalHistory: "",
    medications: "",
    pathologies: "",
    bowelMovement: "",
    bristolScale: "",
    urineColor: "",
    symptoms: "",
    familyHistory: "",
    waterIntake: "",
    alcoholAndSmoking: ""
  })

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await api.get(`/users/${params.id}`)
        setPatientName(res.data.name)
      } catch (error) {
        toast.error("Erro ao carregar paciente.")
      }
    }
    fetchPatient()
  }, [params.id])

  const handleSaveAnamnesis = async () => {
    setLoading(true)
    try {
      const payload = {
        patientId: params.id,
        clinicalHistory: formData.clinicalHistory,
        medications: formData.medications,
        pathologies: formData.pathologies,
        bowelMovement: formData.bowelMovement,
        bristolScale: formData.bristolScale ? Number(formData.bristolScale) : undefined,
        urineColor: formData.urineColor,
        symptoms: formData.symptoms,
        familyHistory: formData.familyHistory,
        waterIntake: formData.waterIntake ? Number(formData.waterIntake) : undefined,
        alcoholAndSmoking: formData.alcoholAndSmoking,
      }

      await api.post('/anamneses', payload)
      toast.success("Anamnese guardada com sucesso! Documento selado.")
      router.push(`/membros/${params.id}`)
    } catch (error) {
      toast.error("Erro ao guardar a Anamnese.")
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'clinico', label: 'Histórico Clínico', icon: Activity },
    { id: 'intestino', label: 'Intestino & Urina', icon: Droplets },
    { id: 'sintomas', label: 'Sintomas & Queixas', icon: AlertCircle },
    { id: 'habitos', label: 'Família & Estilo de Vida', icon: HeartPulse },
  ]

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto max-w-5xl space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border-b-4 border-teal-500">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-600" /> Nova Anamnese Geral
              </h1>
              <p className="text-slate-500 font-medium mt-1">Paciente: <span className="text-teal-700">{patientName}</span></p>
            </div>
          </div>
          
          <Button onClick={handleSaveAnamnesis} disabled={loading} className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold shadow-md">
            <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "A Salvar..." : "Selar e Guardar"}
          </Button>
        </div>

        {/* ALERTA DE DOCUMENTO INTOCÁVEL */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Atenção: Documento Clínico Oficial</p>
            <p className="opacity-90">Por questões de ética e histórico clínico, após salvar esta anamnese, ela será trancada e não poderá ser editada. Revise os dados com o paciente antes de finalizar.</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg overflow-hidden">
          {/* NAVEGAÇÃO DE ABAS */}
          <div className="flex flex-wrap md:flex-nowrap bg-slate-100 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-white text-teal-700 border-b-2 border-teal-500 shadow-[0_-4px_0_0_inset_#14b8a6]' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>

          <CardContent className="p-8">
            
            {/* ABA 1: HISTÓRICO CLÍNICO */}
            {activeTab === 'clinico' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-black text-slate-800 mb-4 border-b pb-2">Histórico Clínico e Atual</h3>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold">Histórico de Doenças Anteriores e Atuais (O que já teve? Fez cirurgias?)</Label>
                  <textarea value={formData.clinicalHistory} onChange={e => setFormData({...formData, clinicalHistory: e.target.value})} className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-slate-50" placeholder="Ex: Apendicite em 2015, asma controlada..." />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold">Medicamentos em Uso (Quais? Qual dosagem?)</Label>
                  <textarea value={formData.medications} onChange={e => setFormData({...formData, medications: e.target.value})} className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-slate-50" placeholder="Ex: Losartana 50mg ao acordar..." />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold">Patologias Confirmadas (Tem laudo?)</Label>
                  <textarea value={formData.pathologies} onChange={e => setFormData({...formData, pathologies: e.target.value})} className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-slate-50" placeholder="Ex: Diabetes Tipo 2, Esteatose Hepática Grau 1..." />
                </div>
              </div>
            )}

            {/* ABA 2: INTESTINO E URINA */}
            {activeTab === 'intestino' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-black text-slate-800 mb-4 border-b pb-2">Função Intestinal e Urinária</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-slate-600 font-bold">Frequência Evacuatória</Label>
                    <Input value={formData.bowelMovement} onChange={e => setFormData({...formData, bowelMovement: e.target.value})} className="h-11 bg-slate-50" placeholder="Ex: 1x ao dia, a cada 2 dias..." />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-slate-600 font-bold">Escala de Bristol (1 a 7)</Label>
                    <Input type="number" min="1" max="7" value={formData.bristolScale} onChange={e => setFormData({...formData, bristolScale: e.target.value})} className="h-11 bg-slate-50" placeholder="Ex: 4 (Normal)" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-slate-600 font-bold">Coloração e Odor da Urina</Label>
                    <Input value={formData.urineColor} onChange={e => setFormData({...formData, urineColor: e.target.value})} className="h-11 bg-slate-50" placeholder="Ex: Amarelo claro, sem odor forte..." />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: SINTOMAS E QUEIXAS */}
            {activeTab === 'sintomas' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-black text-slate-800 mb-4 border-b pb-2">Rastreamento Metabólico e Sintomas</h3>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold">Relato de Sintomas Frequentes (Dores de cabeça, azia, inchaço, fadiga, queda de cabelo...)</Label>
                  <textarea value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} className="w-full min-h-[250px] p-4 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-slate-50" placeholder="Ex: Sente muita azia após o almoço, acorda cansado, unhas fracas..." />
                </div>
              </div>
            )}

            {/* ABA 4: FAMÍLIA E HÁBITOS */}
            {activeTab === 'habitos' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-black text-slate-800 mb-4 border-b pb-2">Histórico Familiar e Estilo de Vida</h3>
                <div className="space-y-3">
                  <Label className="text-slate-600 font-bold">Doenças na Família (Pais, avós...)</Label>
                  <textarea value={formData.familyHistory} onChange={e => setFormData({...formData, familyHistory: e.target.value})} className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-slate-50" placeholder="Ex: Pai hipertenso, mãe com hipotireoidismo..." />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <Label className="text-slate-600 font-bold">Ingestão de Água Diária (Litros)</Label>
                     <Input type="number" step="0.1" value={formData.waterIntake} onChange={e => setFormData({...formData, waterIntake: e.target.value})} className="h-11 bg-slate-50" placeholder="Ex: 2.5" />
                  </div>
                  <div className="space-y-3">
                     <Label className="text-slate-600 font-bold">Consumo de Álcool / Tabagismo</Label>
                     <Input value={formData.alcoholAndSmoking} onChange={e => setFormData({...formData, alcoholAndSmoking: e.target.value})} className="h-11 bg-slate-50" placeholder="Ex: Bebe cerveja aos fins de semana, não fuma..." />
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}