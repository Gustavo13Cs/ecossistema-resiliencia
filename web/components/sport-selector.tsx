// web/components/sport-selector.tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bike, Mountain, Footprints, PersonStanding } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

// Cores corporativas voltadas para saúde
const sports = [
  { id: "Musculação", name: "Musculação", icon: PersonStanding, color: "from-blue-500 to-blue-700", bgColor: "bg-blue-50 hover:bg-blue-100", description: "Treino de força e resistência" },
  { id: "Ciclismo", name: "Ciclismo", icon: Bike, color: "from-sky-500 to-sky-700", bgColor: "bg-sky-50 hover:bg-sky-100", description: "Bike indoor ou rua" },
  { id: "Corrida", name: "Corrida", icon: Mountain, color: "from-teal-500 to-teal-700", bgColor: "bg-teal-50 hover:bg-teal-100", description: "Esteira ou parque" },
  { id: "Yoga", name: "Yoga", icon: Footprints, color: "from-emerald-500 to-emerald-700", bgColor: "bg-emerald-50 hover:bg-emerald-100", description: "Recuperação ativa" },
]

export function SportSelector() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    durationMinutes: "",
    intensity: "MODERADO",
    sleepHours: "",
    moodLevel: "3",
  })

  const openModal = (sportName: string) => {
    setSelectedSport(sportName)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      
      await api.post("/workouts", {
        activityType: selectedSport,
        durationMinutes: Number(formData.durationMinutes),
        intensity: formData.intensity,
        sleepHours: formData.sleepHours ? Number(formData.sleepHours) : undefined,
        moodLevel: formData.moodLevel ? Number(formData.moodLevel) : undefined,
      })

      setIsOpen(false)
      setFormData({ durationMinutes: "", intensity: "MODERADO", sleepHours: "", moodLevel: "3" })
      window.location.reload()
      
    } catch (error) {
      alert("Erro ao salvar o registro. Verifique sua conexão.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sports.map((sport) => {
          const Icon = sport.icon
          return (
            <Card
              key={sport.id}
              className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 border-0 ${sport.bgColor}`}
              onClick={() => openModal(sport.name)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${sport.color} shadow-sm flex items-center justify-center`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800">{sport.name}</h3>
                  <p className="text-sm text-slate-600">{sport.description}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-800">Registrar: {selectedSport}</DialogTitle>
            <DialogDescription>
              Preencha os dados da sua atividade e sua percepção de bem-estar hoje.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (min) *</Label>
                <Input id="duration" type="number" min="1" required value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: e.target.value})} placeholder="Ex: 45" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intensity">Intensidade *</Label>
                <select
                  id="intensity"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.intensity}
                  onChange={e => setFormData({...formData, intensity: e.target.value})}
                >
                  <option value="LEVE">Leve</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="INTENSO">Intenso</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-teal-700">Resiliência e Recuperação</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sleep">Horas de Sono</Label>
                  <Input id="sleep" type="number" step="0.5" min="0" max="24" value={formData.sleepHours} onChange={e => setFormData({...formData, sleepHours: e.target.value})} placeholder="Ex: 7.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mood">Humor (1 a 5)</Label>
                  <Input id="mood" type="number" min="1" max="5" value={formData.moodLevel} onChange={e => setFormData({...formData, moodLevel: e.target.value})} placeholder="Ex: 4" />
                </div>
              </div>
            </div>

            {/* Botão de salvar agora com a identidade corporativa */}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white hover:from-blue-700 hover:to-teal-600 shadow-md">
              {loading ? "Salvando..." : "Salvar Registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}