"use client"

import { useEffect, useState } from "react"
import { Dumbbell, Repeat, Timer, Info } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

export default function TreinoPacientePage() {
  const { user } = useAuth()
  const [workout, setWorkout] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.sub) {
      api.get(`/workouts/user/${user.sub}/active`)
        .then(res => setWorkout(res.data))
        .catch(() => setWorkout(null))
        .finally(() => setLoading(false))
    }
  }, [user])

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Dumbbell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800">Treino do Dia</h1>
          <p className="text-slate-500">A sua ficha de exercícios físicos.</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">A carregar a sua ficha de treino...</p>
        </div>
      ) : !workout ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
           <Dumbbell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
           <p className="text-slate-500 font-medium">Você ainda não tem um treino ativo.</p>
           <p className="text-sm text-slate-400 mt-1">Fale com o seu Personal Trainer.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-md">
            <h2 className="text-2xl font-bold">{workout.title}</h2>
            <p className="opacity-90 mt-1">{workout.goal}</p>
            {workout.notes && (
              <div className="mt-4 p-3 bg-black/10 rounded-lg flex gap-3 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>{workout.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {workout.splits?.map((day: any) => (
            <div key={day.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 text-lg">{day.name}</h3>
                  <span className="text-sm font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">{day.focus}</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {day.exercises?.map((ex: any, idx: number) => (
                    <div key={ex.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="font-black text-slate-300 text-xl">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-800">{ex.name}</p>
                          {ex.notes && <p className="text-xs text-slate-500 mt-0.5">{ex.notes}</p>}
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pl-8 md:pl-0">
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                          <Repeat className="w-4 h-4" /> {ex.sets}x{ex.reps}
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold">
                          <Timer className="w-4 h-4" /> {ex.rest}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}