"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, CheckCircle2, Target, Printer, Stethoscope, Timer, Repeat, Share2, Info, LayoutList } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function NovaReabilitacaoPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patientName, setPatientName] = useState("Carregando...")

  const [planInfo, setPlanInfo] = useState({ 
    title: "Protocolo de Reabilitação", 
    goal: "Controle de dor e ganho de ADM", 
    durationWeeks: 4,
    notes: "" 
  })

  const [sessions, setSessions] = useState([
    { 
      id: `s${Date.now()}`, 
      name: "Fase 1 - Analgesia", 
      focus: "Eletroterapia e Terapia Manual", 
      exercises: [
        { id: `e${Date.now()}`, name: "TENS (Corrente Convencional)", sets: "20 min", reps: "Contínuo", notes: "100Hz / 50µs no local da dor" }
      ] 
    }
  ])

  useEffect(() => {
    const loadData = async () => {
      try {
        const userRes = await api.get(`/users/${params.id}`)
        setPatientName(userRes.data.name)

        const planRes = await api.get(`/rehab-plans/user/${params.id}/active`)
        if (planRes.data) {
          const active = planRes.data
          setPlanInfo({
            title: active.title,
            goal: active.goal || "",
            durationWeeks: active.durationWeeks || 4,
            notes: active.notes || ""
          })

          if (active.sessions && active.sessions.length > 0) {
            setSessions(active.sessions.map((s: any) => ({
              id: s.id || `s${Date.now() + Math.random()}`,
              name: s.name,
              focus: s.focus || "",
              exercises: s.exercises.map((e: any) => ({
                id: e.id || `e${Date.now() + Math.random()}`,
                name: e.name,
                sets: e.sets || "",
                reps: e.reps || "",
                notes: e.notes || ""
              }))
            })))
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados", error)
      }
    }
    loadData()
  }, [params.id])

  const addSession = () => {
    setSessions([...sessions, { 
      id: `s${Date.now()}`, 
      name: `Fase ${sessions.length + 1}`, 
      focus: "", 
      exercises: [] 
    }])
  }

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id))
  }

  const addExercise = (sessionId: string) => {
    setSessions(sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          exercises: [...session.exercises, { id: `e${Date.now()}`, name: "", sets: "", reps: "", notes: "" }]
        }
      }
      return session
    }))
  }

  const removeExercise = (sessionId: string, exerciseId: string) => {
    setSessions(sessions.map(session => {
      if (session.id === sessionId) {
        return { ...session, exercises: session.exercises.filter(e => e.id !== exerciseId) }
      }
      return session
    }))
  }

  const updateExercise = (sessionId: string, exerciseId: string, field: string, value: string) => {
    setSessions(sessions.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          exercises: session.exercises.map(ex => ex.id === exerciseId ? { ...ex, [field]: value } : ex)
        }
      }
      return session
    }))
  }

  const handleSavePlan = async () => {
    if (sessions.some(s => s.exercises.length === 0)) {
      toast.error("Todas as fases precisam ter pelo menos uma terapia/exercício!")
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: planInfo.title,
        goal: planInfo.goal,
        durationWeeks: planInfo.durationWeeks,
        notes: planInfo.notes,
        userId: params.id,
        sessions: sessions.map(session => ({
          name: session.name,
          focus: session.focus,
          exercises: session.exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            notes: ex.notes
          }))
        }))
      }

      await api.post('/rehab-plans', payload)
      toast.success("Protocolo salvo com sucesso!")
      router.push(`/membros/${params.id}`)
    } catch (error) {
      toast.error("Erro ao salvar o protocolo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto space-y-6 print:px-0 print:max-w-4xl">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-4">
            <Link href={`/membros/${params.id}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-800">Prescrição Fisioterapêutica</h1>
              </div>
              <p className="text-slate-500 font-medium">Paciente: <span className="text-purple-600">{patientName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100">
              <Share2 className="w-5 h-5 mr-2" /> Partilhar WhatsApp
            </Button>
            <Button variant="outline" className="h-12 border-slate-300 text-slate-700" onClick={() => window.print()}>
              <Printer className="w-5 h-5 mr-2" /> Exportar PDF
            </Button>
            <Button onClick={handleSavePlan} disabled={loading} className="h-12 px-8 bg-purple-600 hover:bg-purple-700 text-lg shadow-md text-white">
              <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "A Salvar..." : "Finalizar Protocolo"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* PAINEL LATERAL DE METAS */}
          <div className="lg:col-span-3 space-y-6 sticky top-8 print:hidden">
             <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-800 text-white border-b-4 border-purple-500 py-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" /> Metas do Tratamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-bold">Diagnóstico / Protocolo</Label>
                    <Input value={planInfo.title} onChange={(e) => setPlanInfo({...planInfo, title: e.target.value})} className="font-semibold bg-white" placeholder="Ex: Pós-Op LCA" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-bold">Objetivo Clínico</Label>
                    <Input value={planInfo.goal} onChange={(e) => setPlanInfo({...planInfo, goal: e.target.value})} className="font-semibold bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-bold">Duração (Semanas)</Label>
                    <Input type="number" value={planInfo.durationWeeks} onChange={(e) => setPlanInfo({...planInfo, durationWeeks: Number(e.target.value)})} className="font-bold text-purple-700 bg-purple-50 text-center text-lg" />
                  </div>
                </CardContent>
             </Card>

             <Card className="border border-slate-200 shadow-sm bg-purple-50/50">
                <CardHeader className="py-4 border-b border-purple-100 bg-purple-50">
                  <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
                    <LayoutList className="w-4 h-4" /> Resumo das Fases
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {sessions.map(session => (
                      <div key={session.id} className="flex flex-col bg-white p-2 px-3 rounded-lg border shadow-sm">
                        <span className="font-bold text-slate-700 text-sm">{session.name}</span>
                        <span className="text-xs font-medium text-slate-500 truncate">{session.focus || "Sem foco"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
             </Card>
          </div>

          {/* ÁREA PRINCIPAL: AS FASES */}
          <div className="lg:col-span-9 space-y-6 print:w-full">
            
            <div className="hidden print:block mb-8 border-b-2 border-purple-600 pb-6">
              <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Plano de Reabilitação</h1>
              <h2 className="text-xl text-slate-600 mt-2 font-medium">Paciente: {patientName} • {planInfo.title}</h2>
            </div>

            {sessions.map((session, index) => (
              <Card key={session.id} className="border border-slate-200 shadow-md overflow-hidden">
                
                <CardHeader className="bg-slate-800 py-3 border-b-4 border-purple-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full md:w-2/3">
                      <Input 
                        value={session.name} 
                        onChange={(e) => { const n = [...sessions]; n[index].name = e.target.value; setSessions(n) }} 
                        className="w-40 font-black text-center text-slate-800 bg-white" 
                      />
                      <Input 
                        placeholder="Objetivo da Fase (Ex: Mobilidade e Analgesia)"
                        value={session.focus} 
                        onChange={(e) => { const n = [...sessions]; n[index].focus = e.target.value; setSessions(n) }} 
                        className="font-bold border-none shadow-none text-white placeholder:text-slate-400 bg-slate-700/50 flex-1" 
                      />
                    </div>
                    
                    <Button variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-slate-700 h-8 p-2" onClick={() => removeSession(session.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Apagar Fase
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-5">Terapia / Exercício</div>
                    <div className="col-span-3 text-center">Duração / Séries</div>
                    <div className="col-span-3 text-center">Frequência / Reps</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {session.exercises.map((ex, exIdx) => (
                      <div key={ex.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 md:px-6 md:py-3 hover:bg-purple-50/30 items-start group transition-colors">
                        
                        <div className="col-span-1 md:col-span-5 space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="font-black text-slate-300 w-5">{exIdx + 1}.</span>
                             <Input 
                               placeholder="Nome da terapia/exercício..." 
                               value={ex.name} 
                               onChange={(e) => updateExercise(session.id, ex.id, 'name', e.target.value)} 
                               className="font-bold text-slate-800 h-9" 
                             />
                           </div>
                           <Input 
                             placeholder="Parâmetros (Ex: 100Hz / 50µs)" 
                             value={ex.notes} 
                             onChange={(e) => updateExercise(session.id, ex.id, 'notes', e.target.value)} 
                             className="h-7 text-xs bg-slate-50 border-dashed text-slate-500 ml-7" 
                           />
                        </div>

                        <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                          <Timer className="w-4 h-4 text-slate-400 md:hidden" />
                          <Input value={ex.sets} onChange={(e) => updateExercise(session.id, ex.id, 'sets', e.target.value)} className="h-9 font-bold text-center w-full" placeholder="Ex: 20 min ou 3" />
                        </div>

                        <div className="col-span-1 md:col-span-3 flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-slate-400 md:hidden" />
                          <Input value={ex.reps} onChange={(e) => updateExercise(session.id, ex.id, 'reps', e.target.value)} className="h-9 font-bold text-center w-full" placeholder="Ex: Contínuo ou 15" />
                        </div>
                        
                        <div className="col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExercise(session.id, ex.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <Button variant="ghost" className="w-full text-purple-600 hover:bg-purple-100 font-bold" onClick={() => addExercise(session.id)}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Terapia / Exercício
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button onClick={addSession} className="w-full h-14 border-2 border-dashed border-slate-300 bg-white text-slate-600 hover:text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all font-bold text-lg">
              <Plus className="w-5 h-5 mr-2" /> Criar Nova Fase de Reabilitação
            </Button>

            <Card className="bg-slate-800 text-white mt-12 border-0 shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-700">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-400" /> Orientações para Casa
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <textarea 
                  value={planInfo.notes} 
                  onChange={(e) => setPlanInfo({...planInfo, notes: e.target.value})} 
                  placeholder="Orientações sobre gelo, restrições de movimento, ergonomia..." 
                  className="w-full min-h-[120px] p-4 bg-slate-900/50 rounded-xl text-sm placeholder:text-slate-500 border border-slate-700 focus:ring-1 focus:ring-purple-500 outline-none resize-y" 
                />
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}