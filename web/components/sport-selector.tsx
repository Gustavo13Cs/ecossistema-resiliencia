"use client"

import { useState } from "react"
import { Activity, Droplet, BrainCircuit, HeartPulse, CheckCircle2, Scale, MessageSquare } from "lucide-react" 
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

export function SportSelector() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const contextConfig: Record<string, any> = {
    PERSONAL_TRAINER: {
      title: "Registar Atividade Física",
      icon: <Activity className="w-6 h-6 text-blue-600" />,
      themeColor: "blue",
      activities: ["Musculação", "Corrida", "Yoga", "Crossfit", "Ciclismo"],
      durationLabel: "Duração do Treino (minutos)",
      intensityLabel: "Intensidade do Treino",
      notesPlaceholder: "Senti alguma dor? Como foi o treino de hoje?",
      intensities: [
        { value: "LEVE", label: "Leve", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
        { value: "MODERADO", label: "Moderado", color: "border-amber-200 bg-amber-50 text-amber-700" },
        { value: "INTENSO", label: "Intenso", color: "border-rose-200 bg-rose-50 text-rose-700" }
      ]
    },
    NUTRITIONIST: {
      title: "Diário Alimentar e Hidratação",
      icon: <Droplet className="w-6 h-6 text-teal-600" />,
      themeColor: "teal",
      activities: ["Plano Alimentar", "Refeição Livre", "Jejum Intermitente", "Suplementação", "Outros"],
      durationLabel: "Copos de Água Bebidos (unidades)",
      intensityLabel: "Adesão à Dieta Hoje",
      notesPlaceholder: "Descreva o que comeu fora do plano ou observações do dia...",
      intensities: [
        { value: "INTENSO", label: "100% no Foco", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
        { value: "MODERADO", label: "Pequenos Deslizes", color: "border-amber-200 bg-amber-50 text-amber-700" },
        { value: "LEVE", label: "Saí do Plano", color: "border-rose-200 bg-rose-50 text-rose-700" }
      ]
    },
    HR_CORPORATE: {
      title: "Check-in de Saúde Mental",
      icon: <BrainCircuit className="w-6 h-6 text-indigo-600" />,
      themeColor: "indigo",
      activities: ["Trabalho Focado", "Reuniões", "Trabalho Criativo", "Burocracia", "Gestão"],
      durationLabel: "Tempo de Pausas (minutos)",
      intensityLabel: "Nível de Estresse no Trabalho",
      notesPlaceholder: "Algum bloqueio no trabalho ou situação de estresse?",
      intensities: [
        { value: "LEVE", label: "Tranquilo", color: "border-emerald-200 bg-emerald-50 text-emerald-700" },
        { value: "MODERADO", label: "Gerenciável", color: "border-amber-200 bg-amber-50 text-amber-700" },
        { value: "INTENSO", label: "Alto Estresse", color: "border-rose-200 bg-rose-50 text-rose-700" }
      ]
    }
  }

  const currentContext = user?.businessContext && contextConfig[user.businessContext] 
    ? contextConfig[user.businessContext] 
    : contextConfig["PERSONAL_TRAINER"]

  const colorMap: Record<string, any> = {
    blue: { activeCard: "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500", activeButton: "bg-blue-600 hover:bg-blue-700", topBar: "bg-blue-500" },
    teal: { activeCard: "border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500", activeButton: "bg-teal-600 hover:bg-teal-700", topBar: "bg-teal-500" },
    indigo: { activeCard: "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500", activeButton: "bg-indigo-600 hover:bg-indigo-700", topBar: "bg-indigo-500" }
  }

  const theme = colorMap[currentContext.themeColor];

  const [selectedActivity, setSelectedActivity] = useState(currentContext.activities[0])
  const [duration, setDuration] = useState([45])
  const [intensity, setIntensity] = useState("MODERADO")
  const [sleep, setSleep] = useState([7])
  const [mood, setMood] = useState(4)
  
  const [weight, setWeight] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post("/workouts", {
        activityType: selectedActivity,
        durationMinutes: duration[0],
        intensity,
        sleepHours: sleep[0],
        moodLevel: mood,
        weight: weight ? parseFloat(weight) : null,
        notes: notes || null,
      })
      toast.success("Registo guardado com sucesso!")
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      toast.error("Erro ao guardar o registo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 bg-white/90 backdrop-blur shadow-lg overflow-hidden">
      <div className={`h-2 w-full ${theme.topBar}`}></div>
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            {currentContext.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{currentContext.title}</h2>
            <p className="text-slate-500">Como foi o seu dia hoje?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* LADO ESQUERDO: Atividade e Intensidade */}
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Categoria principal
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {currentContext.activities.map((act: string) => {
                  const isSelected = selectedActivity === act;
                  return (
                    <button
                      key={act} type="button" onClick={() => setSelectedActivity(act)}
                      className={`relative flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 text-left
                        ${isSelected ? theme.activeCard : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <span className="truncate pr-2">{act}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 animate-in zoom-in duration-200" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  {currentContext.durationLabel}
                </label>
                <span className="text-2xl font-bold text-slate-700">{duration[0]}</span>
              </div>
              <Slider value={duration} onValueChange={setDuration} max={120} step={1} className="py-4" />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                {currentContext.intensityLabel}
              </label>
              <div className="flex gap-3">
                {currentContext.intensities.map((int: any) => (
                  <button
                    key={int.value} type="button" onClick={() => setIntensity(int.value)}
                    className={`flex-1 py-3 px-2 md:px-4 rounded-xl font-medium border-2 transition-all text-xs md:text-sm
                      ${intensity === int.value ? int.color + ` ring-2 ring-offset-2 scale-[1.02] shadow-md` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LADO DIREITO: Sono, Humor, Peso e Notas */}
          <div className="space-y-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500"/>
                  Horas de Sono
                </label>
                <span className="text-xl font-bold text-slate-700">{sleep[0]}h</span>
              </div>
              <Slider value={sleep} onValueChange={setSleep} max={12} step={0.5} className="py-4" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Humor Geral
                </label>
                <div className="text-3xl filter drop-shadow-sm">
                  {mood === 1 && "😫"} {mood === 2 && "😕"} {mood === 3 && "😐"}
                  {mood === 4 && "🙂"} {mood === 5 && "🤩"}
                </div>
              </div>
              <Slider value={[mood]} onValueChange={(val) => setMood(val[0])} min={1} max={5} step={1} className="py-4" />
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-500"/>
                  Peso Atual (kg) - Opcional
                </label>
                <input 
                  type="number" step="0.1" placeholder="Ex: 75.5" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="flex h-11 w-full md:w-1/2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-500"/>
                  Observações / Diário
                </label>
                <textarea 
                  placeholder={currentContext.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 resize-y"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <Button 
            onClick={handleSubmit} disabled={loading}
            className={`w-full h-14 text-lg text-white shadow-xl ${theme.activeButton}`}
          >
            {loading ? "A processar..." : "Salvar Diário"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}