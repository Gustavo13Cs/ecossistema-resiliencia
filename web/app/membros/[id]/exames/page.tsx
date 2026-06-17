"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Plus, Trash2, ActivitySquare, LineChart as ChartIcon, FileText } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useLabExams } from "@/hooks/features/useLabExams"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { toast } from "sonner"

export default function ExamesLaboratoriaisPage() {
  const params = useParams()
  const patientId = params.id as string
  const { loading, saving, exams, uniqueMarkers, selectedChartMarker, setSelectedChartMarker, chartData, saveExam } = useLabExams(patientId)

  const [activeTab, setActiveTab] = useState<'chart' | 'new'>('chart')
  
  // Estado do formulário de novo exame
  const [examDate, setExamDate] = useState("")
  const [markers, setMarkers] = useState([{ id: Date.now(), name: "", value: "", unit: "" }])

  const handleAddMarker = () => setMarkers([...markers, { id: Date.now(), name: "", value: "", unit: "" }])
  const handleRemoveMarker = (id: number) => setMarkers(markers.filter(m => m.id !== id))
  const updateMarker = (id: number, field: string, value: string) => {
    setMarkers(markers.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const handleSubmit = () => {
    if (!examDate) return toast.error("Selecione a data da coleta.")
    const validMarkers = markers.filter(m => m.name && m.value && m.unit)
    if (validMarkers.length === 0) return toast.error("Adicione pelo menos um marcador com valor e unidade.")
    
    saveExam({
      date: new Date(examDate).toISOString(),
      markers: validMarkers.map(m => ({ name: m.name, value: Number(m.value), unit: m.unit }))
    })
  }

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">A carregar marcadores...</div>

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto max-w-5xl space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-6 bg-white p-6 rounded-2xl shadow-sm border-b-4 border-rose-500">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${patientId}`}><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5 text-slate-600" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ActivitySquare className="w-6 h-6 text-rose-600" /> Exames Laboratoriais</h1>
            </div>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
             <Button variant={activeTab === 'chart' ? 'default' : 'ghost'} onClick={() => setActiveTab('chart')} className={activeTab === 'chart' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}><ChartIcon className="w-4 h-4 mr-2"/> Gráficos</Button>
             <Button variant={activeTab === 'new' ? 'default' : 'ghost'} onClick={() => setActiveTab('new')} className={activeTab === 'new' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}><Plus className="w-4 h-4 mr-2"/> Novo Registro</Button>
          </div>
        </div>

        {activeTab === 'chart' ? (
          <div className="space-y-6 animate-in fade-in">
             {exams.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                   <ActivitySquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                   <p className="text-slate-500 font-medium">Nenhum exame registado para este paciente.</p>
                   <Button onClick={() => setActiveTab('new')} variant="outline" className="mt-4 text-rose-600 border-rose-200"><Plus className="w-4 h-4 mr-2"/> Lançar Primeiro Exame</Button>
                </div>
             ) : (
                <Card className="border-0 shadow-lg">
                  <CardHeader className="bg-slate-800 text-white rounded-t-xl border-b border-slate-700 flex flex-row items-center justify-between py-4">
                     <CardTitle className="text-lg flex items-center gap-2"><ChartIcon className="w-5 h-5 text-rose-400" /> Evolução de Marcadores</CardTitle>
                     <select 
                       value={selectedChartMarker} 
                       onChange={e => setSelectedChartMarker(e.target.value)}
                       className="h-10 px-3 rounded-lg border-none bg-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                     >
                       {uniqueMarkers.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </CardHeader>
                  <CardContent className="p-6 bg-white">
                     {chartData.length > 0 ? (
                       <div className="h-[400px] w-full mt-4">
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                             <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={50} />
                             <Tooltip 
                               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                               formatter={(value: number, name: string, props: any) => [`${value} ${props.payload.unit}`, selectedChartMarker]}
                             />
                             <Line type="monotone" dataKey="value" stroke="#e11d48" strokeWidth={3} dot={{ r: 6, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 8, fill: "#e11d48" }} />
                           </LineChart>
                         </ResponsiveContainer>
                       </div>
                     ) : (
                       <p className="text-center text-slate-400 py-10">Dados insuficientes para gerar o gráfico.</p>
                     )}
                  </CardContent>
                </Card>
             )}
          </div>
        ) : (
          <Card className="border border-slate-200 shadow-sm animate-in fade-in">
             <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
               <CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5 text-slate-500" /> Dados da Coleta</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
                <div className="w-full md:w-1/3 space-y-2">
                   <Label className="font-bold text-slate-700">Data da Coleta do Sangue</Label>
                   <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="h-12 bg-slate-50" />
                </div>

                <div className="space-y-4">
                   <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-6">Marcador (Ex: Glicemia)</div>
                      <div className="col-span-3">Resultado</div>
                      <div className="col-span-2">Unidade (Ex: mg/dL)</div>
                   </div>
                   
                   {markers.map((marker) => (
                     <div key={marker.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="col-span-6">
                          <Label className="md:hidden text-xs font-bold text-slate-500">Marcador</Label>
                          <Input placeholder="Ex: Colesterol Total" value={marker.name} onChange={e => updateMarker(marker.id, 'name', e.target.value)} className="font-bold text-slate-800" />
                        </div>
                        <div className="col-span-3">
                          <Label className="md:hidden text-xs font-bold text-slate-500">Resultado</Label>
                          <Input type="number" placeholder="Ex: 180.5" value={marker.value} onChange={e => updateMarker(marker.id, 'value', e.target.value)} className="font-bold text-slate-800" />
                        </div>
                        <div className="col-span-2">
                          <Label className="md:hidden text-xs font-bold text-slate-500">Unidade</Label>
                          <Input placeholder="Ex: mg/dL" value={marker.unit} onChange={e => updateMarker(marker.id, 'unit', e.target.value)} className="bg-slate-50 text-slate-600" />
                        </div>
                        <div className="col-span-1 flex justify-end md:justify-center pt-6 md:pt-0">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveMarker(marker.id)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="w-5 h-5"/></Button>
                        </div>
                     </div>
                   ))}
                </div>

                <Button onClick={handleAddMarker} variant="outline" className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-rose-600 h-12 font-bold"><Plus className="w-5 h-5 mr-2" /> Adicionar outro marcador</Button>
                
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                   <Button onClick={handleSubmit} disabled={saving} className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md">
                     <Save className="w-5 h-5 mr-2" /> {saving ? "A salvar..." : "Salvar Exames"}
                   </Button>
                </div>
             </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}