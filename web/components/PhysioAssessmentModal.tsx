"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Activity, Save, Stethoscope } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface PhysioAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  onSuccess: () => void
}

export function PhysioAssessmentModal({ isOpen, onClose, patientId, onSuccess }: PhysioAssessmentModalProps) {
  const [loading, setLoading] = useState(false)
  
  // Estado para os campos da Fisioterapia
  const [formData, setFormData] = useState({
    chiefComplaint: "", historyOfIllness: "", painLevel: "",
    posturalAnalysis: "", palpation: "", jointMobility: "", 
    orthopedicTests: "", treatmentPlan: ""
  })

  if (!isOpen) return null

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        userId: patientId,
        ...formData,
        painLevel: formData.painLevel ? Number(formData.painLevel) : null
      }

      await api.post('/physio-assessments', payload)
      toast.success("Avaliação Fisioterapêutica salva!")
      onSuccess()
      onClose()
    } catch (error) {
      toast.error("Erro ao salvar avaliação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* CABEÇALHO ROXO (Padrão Fisio) */}
        <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Stethoscope className="w-5 h-5" /> Avaliação Fisioterapêutica
            </h2>
            <p className="opacity-90 text-sm">Registo clínico e cinésio-funcional do paciente.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-purple-700 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <Tabs defaultValue="anamnese" className="w-full">
            
            <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1 mb-6">
              <TabsTrigger value="anamnese" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">Anamnese</TabsTrigger>
              <TabsTrigger value="exame" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">Exame Físico</TabsTrigger>
              <TabsTrigger value="conduta" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">Plano & Conduta</TabsTrigger>
            </TabsList>

            {/* ABA 1: ANAMNESE E DOR */}
            <TabsContent value="anamnese" className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Queixa Principal (QP) <span className="text-rose-500">*</span></Label>
                  <Input value={formData.chiefComplaint} onChange={e => handleChange('chiefComplaint', e.target.value)} placeholder="Ex: Dor no joelho direito ao subir escadas" className="bg-white font-medium" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">História da Moléstia Atual (HMA)</Label>
                  <textarea value={formData.historyOfIllness} onChange={e => handleChange('historyOfIllness', e.target.value)} className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg resize-y focus:ring-1 focus:ring-purple-500 outline-none text-sm bg-white" placeholder="Descreva como e quando os sintomas começaram..." />
                </div>
                <div className="space-y-2 w-1/3">
                  <Label className="font-bold text-slate-700 flex items-center gap-2">Escala de Dor (EVA) <span className="text-xs font-normal text-slate-400">0 a 10</span></Label>
                  <Input type="number" min="0" max="10" value={formData.painLevel} onChange={e => handleChange('painLevel', e.target.value)} className="bg-white text-lg font-bold text-rose-500" placeholder="Ex: 7" />
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: EXAME FÍSICO */}
            <TabsContent value="exame" className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Análise Postural</Label>
                  <textarea value={formData.posturalAnalysis} onChange={e => handleChange('posturalAnalysis', e.target.value)} className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg resize-none focus:ring-1 focus:ring-purple-500 outline-none text-sm bg-white" placeholder="Ex: Ombro direito elevado, anteriorização de cabeça..." />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Palpação</Label>
                  <textarea value={formData.palpation} onChange={e => handleChange('palpation', e.target.value)} className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg resize-none focus:ring-1 focus:ring-purple-500 outline-none text-sm bg-white" placeholder="Ex: Tensão no trapézio superior, dor à palpação na patela..." />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Mobilidade Articular (ADM)</Label>
                  <textarea value={formData.jointMobility} onChange={e => handleChange('jointMobility', e.target.value)} className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg resize-none focus:ring-1 focus:ring-purple-500 outline-none text-sm bg-white" placeholder="Ex: Flexão de joelho limitada a 90 graus..." />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Testes Ortopédicos / Especiais</Label>
                  <textarea value={formData.orthopedicTests} onChange={e => handleChange('orthopedicTests', e.target.value)} className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg resize-none focus:ring-1 focus:ring-purple-500 outline-none text-sm bg-white" placeholder="Ex: Teste de Lachman (+), Gaveta Anterior (+)..." />
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: CONDUTA */}
            <TabsContent value="conduta" className="space-y-4 animate-in fade-in duration-300">
               <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                  <Label className="font-bold text-slate-700">Plano de Tratamento / Conduta</Label>
                  <textarea value={formData.treatmentPlan} onChange={e => handleChange('treatmentPlan', e.target.value)} className="w-full min-h-[150px] p-4 border border-slate-200 rounded-lg resize-y focus:ring-1 focus:ring-purple-500 outline-none text-sm bg-white" placeholder="Descreva os objetivos do tratamento (Ex: 1. Controle da dor, 2. Ganho de ADM) e as técnicas a serem utilizadas..." />
               </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* RODAPÉ */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <Button variant="outline" className="h-11 px-6 font-bold text-slate-600" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !formData.chiefComplaint} className="h-11 px-8 font-bold text-white shadow-md bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" /> {loading ? "A Salvar..." : "Salvar Avaliação Fisioterapêutica"}
          </Button>
        </div>

      </div>
    </>
  )
}