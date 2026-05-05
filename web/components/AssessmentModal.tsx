"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Activity, Save } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context" // 🌟 Importamos o contexto de Auth

interface AssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  onSuccess: () => void
}

export function AssessmentModal({ isOpen, onClose, patientId, onSuccess }: AssessmentModalProps) {
  // 🌟 Descobre quem está a usar o modal
  const { user: loggedInUser } = useAuth()
  const isNutri = loggedInUser?.role === 'NUTRITIONIST'
  const isPersonal = loggedInUser?.role === 'PERSONAL'
  const isFisio = loggedInUser?.role === 'PHYSIO'

  // 🌟 Define as cores dinâmicas
  const themeColor = isPersonal ? 'bg-blue-600' : isFisio ? 'bg-purple-600' : 'bg-teal-600'
  const hoverColor = isPersonal ? 'hover:bg-blue-700' : isFisio ? 'hover:bg-purple-700' : 'hover:bg-teal-700'
  const tabTextColor = isPersonal ? 'data-[state=active]:text-blue-700' : isFisio ? 'data-[state=active]:text-purple-700' : 'data-[state=active]:text-teal-700'

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({
    weight: "", bodyFat: "", muscleMass: "",
    waist: "", abdomen: "", hips: "", thorax: "",
    armLeft: "", armRight: "", thighLeft: "", thighRight: "", calfLeft: "", calfRight: "",
    skinfoldTriceps: "", skinfoldSubscapular: "", skinfoldChest: "", skinfoldAxillary: "", 
    skinfoldSuprailiac: "", skinfoldAbdominal: "", skinfoldThigh: "",
    benchPress1RM: "", squat1RM: "", deadlift1RM: "", vo2Max: "",
    notes: ""
  })

  if (!isOpen) return null

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    const payload: Record<string, any> = { userId: patientId }
    
    Object.keys(formData).forEach(key => {
      if (formData[key] !== "") {
        payload[key] = key === "notes" ? formData[key] : Number(formData[key])
      }
    })

    try {
      await api.post('/assessments', payload)
      toast.success("Avaliação salva com sucesso!")
      onSuccess()
      onClose()
    } catch (error) {
      toast.error("Erro ao salvar a avaliação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* CABEÇALHO DINÂMICO */}
        <div className={`${themeColor} p-5 text-white flex justify-between items-center`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5" /> 
              {isPersonal ? "Nova Avaliação Física" : "Nova Avaliação Corporal"}
            </h2>
            <p className="opacity-90 text-sm">Preencha apenas os dados recolhidos hoje.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className={`text-white ${hoverColor} rounded-full`}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <Tabs defaultValue="globais" className="w-full">
            
            {/* ABAS DINÂMICAS: 4 Abas para Personal, 3 Abas para Nutri */}
            <TabsList className={`grid w-full bg-slate-100 p-1 mb-6 ${isPersonal ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="globais" className={`data-[state=active]:bg-white ${tabTextColor} data-[state=active]:shadow-sm`}>Globais</TabsTrigger>
              <TabsTrigger value="perimetros" className={`data-[state=active]:bg-white ${tabTextColor} data-[state=active]:shadow-sm`}>Perímetros</TabsTrigger>
              <TabsTrigger value="dobras" className={`data-[state=active]:bg-white ${tabTextColor} data-[state=active]:shadow-sm`}>Dobras</TabsTrigger>
              {isPersonal && (
                <TabsTrigger value="performance" className={`data-[state=active]:bg-white ${tabTextColor} data-[state=active]:shadow-sm`}>Performance</TabsTrigger>
              )}
            </TabsList>

            {/* ABA 1: MEDIDAS GLOBAIS */}
            <TabsContent value="globais" className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="font-bold text-slate-700">Peso (kg) <span className="text-rose-500">*</span></Label><Input type="number" step="0.1" value={formData.weight} onChange={e => handleChange('weight', e.target.value)} className="bg-white font-bold" autoFocus /></div>
                <div className="space-y-1.5"><Label className="font-bold text-slate-700">% Gordura</Label><Input type="number" step="0.1" value={formData.bodyFat} onChange={e => handleChange('bodyFat', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="font-bold text-slate-700">Músculo (kg ou %)</Label><Input type="number" step="0.1" value={formData.muscleMass} onChange={e => handleChange('muscleMass', e.target.value)} className="bg-white" /></div>
              </div>
            </TabsContent>

            {/* ABA 2: PERÍMETROS */}
            <TabsContent value="perimetros" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5"><Label className="text-slate-600">Tórax (cm)</Label><Input type="number" value={formData.thorax} onChange={e => handleChange('thorax', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Cintura (cm)</Label><Input type="number" value={formData.waist} onChange={e => handleChange('waist', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Abdômen (cm)</Label><Input type="number" value={formData.abdomen} onChange={e => handleChange('abdomen', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Quadril (cm)</Label><Input type="number" value={formData.hips} onChange={e => handleChange('hips', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Braço Esq. (cm)</Label><Input type="number" value={formData.armLeft} onChange={e => handleChange('armLeft', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Braço Dir. (cm)</Label><Input type="number" value={formData.armRight} onChange={e => handleChange('armRight', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Coxa Esq. (cm)</Label><Input type="number" value={formData.thighLeft} onChange={e => handleChange('thighLeft', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Coxa Dir. (cm)</Label><Input type="number" value={formData.thighRight} onChange={e => handleChange('thighRight', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Panturrilha Esq. (cm)</Label><Input type="number" value={formData.calfLeft} onChange={e => handleChange('calfLeft', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600">Panturrilha Dir. (cm)</Label><Input type="number" value={formData.calfRight} onChange={e => handleChange('calfRight', e.target.value)} className="bg-white" /></div>
              </div>
            </TabsContent>

            {/* ABA 3: DOBRAS CUTÂNEAS */}
            <TabsContent value="dobras" className="space-y-4 animate-in fade-in duration-300">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Tríceps (mm)</Label><Input type="number" value={formData.skinfoldTriceps} onChange={e => handleChange('skinfoldTriceps', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Subescapular</Label><Input type="number" value={formData.skinfoldSubscapular} onChange={e => handleChange('skinfoldSubscapular', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Peitoral</Label><Input type="number" value={formData.skinfoldChest} onChange={e => handleChange('skinfoldChest', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Axilar Média</Label><Input type="number" value={formData.skinfoldAxillary} onChange={e => handleChange('skinfoldAxillary', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Supra-ilíaca</Label><Input type="number" value={formData.skinfoldSuprailiac} onChange={e => handleChange('skinfoldSuprailiac', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Abdominal</Label><Input type="number" value={formData.skinfoldAbdominal} onChange={e => handleChange('skinfoldAbdominal', e.target.value)} className="bg-white" /></div>
                <div className="space-y-1.5"><Label className="text-slate-600 text-xs">Coxa</Label><Input type="number" value={formData.skinfoldThigh} onChange={e => handleChange('skinfoldThigh', e.target.value)} className="bg-white" /></div>
               </div>
            </TabsContent>

            {/* ABA 4: PERFORMANCE (SÓ APARECE PARA PERSONAL TRAINER) */}
            {isPersonal && (
              <TabsContent value="performance" className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1.5"><Label className="text-slate-600">Supino 1RM (kg)</Label><Input type="number" value={formData.benchPress1RM} onChange={e => handleChange('benchPress1RM', e.target.value)} className="bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-slate-600">Agachamento 1RM (kg)</Label><Input type="number" value={formData.squat1RM} onChange={e => handleChange('squat1RM', e.target.value)} className="bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-slate-600">Terra 1RM (kg)</Label><Input type="number" value={formData.deadlift1RM} onChange={e => handleChange('deadlift1RM', e.target.value)} className="bg-white" /></div>
                  <div className="space-y-1.5"><Label className="text-slate-600">VO2 Max</Label><Input type="number" value={formData.vo2Max} onChange={e => handleChange('vo2Max', e.target.value)} className="bg-white" /></div>
                </div>
              </TabsContent>
            )}
            
            <div className="mt-4">
              <Label className="text-slate-600 font-bold">Observações / Anotações Rápidas</Label>
              <textarea 
                value={formData.notes} 
                onChange={e => handleChange('notes', e.target.value)} 
                className="w-full min-h-[80px] mt-1 p-3 border border-slate-200 rounded-lg resize-none focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                placeholder="Ex: Paciente relatou ter seguido bem a dieta na última semana."
              />
            </div>
          </Tabs>
        </div>

        {/* RODAPÉ DINÂMICO */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <Button variant="outline" className="h-11 px-6 font-bold text-slate-600" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !formData.weight} className={`h-11 px-8 font-bold text-white shadow-md ${themeColor} ${hoverColor}`}>
            <Save className="w-4 h-4 mr-2" /> {loading ? "A Salvar..." : "Salvar Avaliação"}
          </Button>
        </div>

      </div>
    </>
  )
}