"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, CheckCircle2, Target, Printer, Dumbbell, Timer, Repeat, Share2, Info, LayoutList } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function NovoTreinoPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patientName, setPatientName] = useState("Carregando...")

  // Informações Gerais do Treino
  const [workoutInfo, setWorkoutInfo] = useState({ 
    title: "Mesociclo 1 - Hipertrofia", 
    goal: "Ganho de Massa Muscular", 
    durationWeeks: 4,
    notes: "" 
  })

  // Estrutura das Fichas de Treino (Treino A, Treino B, etc.)
  const [splits, setSplits] = useState([
    { 
      id: `s${Date.now()}`, 
      name: "Treino A", 
      focus: "Peito e Tríceps", 
      exercises: [
        { id: `e${Date.now()}`, name: "Supino Reto com Barra", sets: "4", reps: "10 a 12", rest: "90s", notes: "Focar na fase excêntrica" }
      ] 
    }
  ])

  useEffect(() => {
    const loadData = async () => {
      try {
        const userRes = await api.get(`/users/${params.id}`)
        setPatientName(userRes.data.name)

        const workoutRes = await api.get(`/workouts/user/${params.id}/active`)
        if (workoutRes.data) {
          const active = workoutRes.data
          
          setWorkoutInfo({
            title: active.title,
            goal: active.goal || "",
            durationWeeks: active.durationWeeks || 4,
            notes: active.notes || ""
          })

          if (active.splits && active.splits.length > 0) {
            setSplits(active.splits.map((s: any) => ({
              id: s.id || `s${Date.now() + Math.random()}`,
              name: s.name,
              focus: s.focus || "",
              exercises: s.exercises.map((e: any) => ({
                id: e.id || `e${Date.now() + Math.random()}`,
                name: e.name,
                sets: e.sets,
                reps: e.reps,
                rest: e.rest || "",
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

  // --- FUNÇÕES DE MANIPULAÇÃO DAS FICHAS ---
  const addSplit = () => {
    const nextLetter = String.fromCharCode(65 + splits.length) 
    setSplits([...splits, { 
      id: `s${Date.now()}`, 
      name: `Treino ${nextLetter}`, 
      focus: "", 
      exercises: [] 
    }])
  }

  const removeSplit = (id: string) => {
    setSplits(splits.filter(s => s.id !== id))
  }

  // --- FUNÇÕES DE MANIPULAÇÃO DOS EXERCÍCIOS ---
  const addExercise = (splitId: string) => {
    setSplits(splits.map(split => {
      if (split.id === splitId) {
        return {
          ...split,
          exercises: [...split.exercises, { id: `e${Date.now()}`, name: "", sets: "3", reps: "10 a 15", rest: "60s", notes: "" }]
        }
      }
      return split
    }))
  }

  const removeExercise = (splitId: string, exerciseId: string) => {
    setSplits(splits.map(split => {
      if (split.id === splitId) {
        return { ...split, exercises: split.exercises.filter(e => e.id !== exerciseId) }
      }
      return split
    }))
  }

  const updateExercise = (splitId: string, exerciseId: string, field: string, value: string) => {
    setSplits(splits.map(split => {
      if (split.id === splitId) {
        return {
          ...split,
          exercises: split.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return { ...ex, [field]: value }
            }
            return ex
          })
        }
      }
      return split
    }))
  }

  const handleSaveWorkout = async () => {
    // Validação básica
    if (splits.some(s => s.exercises.length === 0)) {
      toast.error("Todas as fichas (Treino A, B, etc.) precisam ter pelo menos um exercício!")
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: workoutInfo.title,
        goal: workoutInfo.goal,
        durationWeeks: workoutInfo.durationWeeks,
        notes: workoutInfo.notes,
        userId: params.id,
        splits: splits.map(split => ({
          name: split.name,
          focus: split.focus,
          exercises: split.exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            notes: ex.notes
          }))
        }))
      }

      // Envia para o backend
      await api.post('/workouts', payload)
      toast.success("Plano de Treino salvo com sucesso!")
      router.push(`/membros/${params.id}`)
      
    } catch (error) {
      toast.error("Erro ao salvar o treino. Verifique os dados.")
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
                <h1 className="text-3xl font-bold text-slate-800">Prescrição de Treino</h1>
              </div>
              <p className="text-slate-500 font-medium">Aluno: <span className="text-blue-600">{patientName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
              <Share2 className="w-5 h-5 mr-2" /> Partilhar WhatsApp
            </Button>
            <Button variant="outline" className="h-12 border-slate-300 text-slate-700" onClick={() => window.print()}>
              <Printer className="w-5 h-5 mr-2" /> Exportar PDF
            </Button>
            <Button onClick={handleSaveWorkout} disabled={loading} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg shadow-md">
              <CheckCircle2 className="w-5 h-5 mr-2" /> {loading ? "A Salvar..." : "Finalizar Ficha"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* PAINEL LATERAL DE METAS (STICKY) */}
          <div className="lg:col-span-3 space-y-6 sticky top-8 print:hidden">
             <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-slate-800 text-white border-b-4 border-blue-500 py-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-400" /> Metas do Ciclo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 bg-slate-50/50">
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-bold">Fase / Periodização</Label>
                    <Input value={workoutInfo.title} onChange={(e) => setWorkoutInfo({...workoutInfo, title: e.target.value})} className="font-semibold bg-white" placeholder="Ex: Fase de Adaptação" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-bold">Objetivo Principal</Label>
                    <Input value={workoutInfo.goal} onChange={(e) => setWorkoutInfo({...workoutInfo, goal: e.target.value})} className="font-semibold bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-bold">Duração (Semanas)</Label>
                    <Input type="number" value={workoutInfo.durationWeeks} onChange={(e) => setWorkoutInfo({...workoutInfo, durationWeeks: Number(e.target.value)})} className="font-bold text-blue-700 bg-blue-50 text-center text-lg" />
                  </div>
                </CardContent>
             </Card>

             <Card className="border border-slate-200 shadow-sm bg-blue-50/50">
                <CardHeader className="py-4 border-b border-blue-100 bg-blue-50">
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                    <LayoutList className="w-4 h-4" /> Resumo da Rotina
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {splits.map(split => (
                      <div key={split.id} className="flex items-center justify-between bg-white p-2 px-3 rounded-lg border shadow-sm">
                        <span className="font-bold text-slate-700 text-sm">{split.name}</span>
                        <span className="text-xs font-medium text-slate-500 truncate max-w-[120px]">{split.focus || "Sem foco"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
             </Card>
          </div>

          {/* ÁREA PRINCIPAL: AS FICHAS DE TREINO */}
          <div className="lg:col-span-9 space-y-6 print:w-full">
            
            {/* Cabeçalho exclusivo para impressão */}
            <div className="hidden print:block mb-8 border-b-2 border-blue-600 pb-6">
              <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Plano de Treinamento</h1>
              <h2 className="text-xl text-slate-600 mt-2 font-medium">Aluno: {patientName} • {workoutInfo.title} ({workoutInfo.durationWeeks} Semanas)</h2>
            </div>

            {splits.map((split, index) => (
              <Card key={split.id} className="border border-slate-200 shadow-md print:border-slate-300 print:shadow-none print:break-inside-avoid overflow-hidden">
                
                <CardHeader className="bg-slate-800 py-3 print:bg-slate-100 border-b-4 border-blue-500 print:border-blue-600">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full md:w-2/3">
                      <Input 
                        value={split.name} 
                        onChange={(e) => {
                          const n = [...splits]; n[index].name = e.target.value; setSplits(n)
                        }} 
                        className="w-28 font-black text-center text-slate-800 print:hidden bg-white uppercase" 
                      />
                      <Input 
                        placeholder="Foco do treino (Ex: Costas e Bíceps)"
                        value={split.focus} 
                        onChange={(e) => {
                          const n = [...splits]; n[index].focus = e.target.value; setSplits(n)
                        }} 
                        className="font-bold border-none shadow-none text-white placeholder:text-slate-400 bg-slate-700/50 print:hidden flex-1" 
                      />
                      <span className="hidden print:inline font-black text-blue-700 px-2 text-xl">{split.name}</span>
                      <span className="hidden print:inline font-bold text-slate-700 text-lg uppercase ml-2">- {split.focus}</span>
                    </div>
                    
                    <Button variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-slate-700 h-8 p-2 print:hidden" onClick={() => removeSplit(split.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Apagar Ficha
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider print:grid">
                    <div className="col-span-5">Exercício</div>
                    <div className="col-span-2 text-center">Séries</div>
                    <div className="col-span-2 text-center">Repetições</div>
                    <div className="col-span-2 text-center">Descanso</div>
                    <div className="col-span-1 print:hidden"></div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {split.exercises.map((ex, exIdx) => (
                      <div key={ex.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 md:px-6 md:py-3 hover:bg-blue-50/30 items-start print:py-2 group transition-colors">
                        
                        <div className="col-span-1 md:col-span-5 space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="font-black text-slate-300 print:text-slate-500 w-5">{exIdx + 1}.</span>
                             <Input 
                               placeholder="Nome do exercício..." 
                               value={ex.name} 
                               onChange={(e) => updateExercise(split.id, ex.id, 'name', e.target.value)} 
                               className="font-bold text-slate-800 h-9 print:border-0 print:p-0 print:h-auto" 
                             />
                           </div>
                           <Input 
                             placeholder="Observações (Ex: Drop-set na última)" 
                             value={ex.notes} 
                             onChange={(e) => updateExercise(split.id, ex.id, 'notes', e.target.value)} 
                             className="h-7 text-xs bg-slate-50 border-dashed text-slate-500 print:border-0 print:p-0 print:h-auto print:italic ml-7" 
                           />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex items-center md:justify-center gap-2">
                          <Repeat className="w-4 h-4 text-slate-400 md:hidden" />
                          <Input value={ex.sets} onChange={(e) => updateExercise(split.id, ex.id, 'sets', e.target.value)} className="h-9 font-bold text-center w-full print:border-0 print:p-0" placeholder="Ex: 4" />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex items-center md:justify-center gap-2">
                          <Target className="w-4 h-4 text-slate-400 md:hidden" />
                          <Input value={ex.reps} onChange={(e) => updateExercise(split.id, ex.id, 'reps', e.target.value)} className="h-9 font-bold text-center w-full print:border-0 print:p-0" placeholder="Ex: 10-12" />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex items-center md:justify-center gap-2">
                          <Timer className="w-4 h-4 text-slate-400 md:hidden" />
                          <Input value={ex.rest} onChange={(e) => updateExercise(split.id, ex.id, 'rest', e.target.value)} className="h-9 font-medium text-slate-600 text-center w-full print:border-0 print:p-0" placeholder="Ex: 60s" />
                        </div>
                        
                        <div className="col-span-1 flex justify-end print:hidden">
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExercise(split.id, ex.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-slate-50 print:hidden border-t border-slate-100">
                    <Button variant="ghost" className="w-full text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-bold" onClick={() => addExercise(split.id)}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Exercício
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button onClick={addSplit} className="w-full h-14 border-2 border-dashed border-slate-300 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 print:hidden transition-all font-bold text-lg">
              <Plus className="w-5 h-5 mr-2" /> Criar Nova Ficha (Treino)
            </Button>
            
            <Card className="bg-slate-800 text-white mt-12 print:hidden border-0 shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-700">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" /> Orientações Gerais do Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <textarea 
                  value={workoutInfo.notes} 
                  onChange={(e) => setWorkoutInfo({...workoutInfo, notes: e.target.value})} 
                  placeholder="Orientações sobre aquecimento, cárdio pós-treino, alongamentos..." 
                  className="w-full min-h-[120px] p-4 bg-slate-900/50 rounded-xl text-sm placeholder:text-slate-500 border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none resize-y" 
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}