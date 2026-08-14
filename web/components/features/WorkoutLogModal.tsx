"use client"

import { useState, useEffect } from "react"
import { X, Dumbbell, Minus, Plus, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWorkoutLog, type ExerciseSetInput } from "@/hooks/features/useWorkoutLog"

type Exercise = { id: string; name: string; sets: string; reps: string }
type Split = { id: string; name: string; focus?: string; exercises: Exercise[] }
type Workout = { id: string; title: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  workout: Workout
  split: Split
  onLogged: () => void
}

function buildInitialExercises(split: Split): ExerciseSetInput[] {
  return split.exercises.map((ex) => {
    const numSets = parseInt(ex.sets) || 3
    return {
      exerciseId: ex.id,
      exerciseName: ex.name,
      plannedSets: ex.sets,
      plannedReps: ex.reps,
      sets: Array.from({ length: numSets }, (_, i) => ({
        setNumber: i + 1,
        repsActual: parseInt(ex.reps) || 0,
        weightKg: null,
      })),
    }
  })
}

export function WorkoutLogModal({ isOpen, onClose, workout, split, onLogged }: Props) {
  const [exercises, setExercises] = useState<ExerciseSetInput[]>([])
  const [pse, setPse] = useState(5)
  const [notes, setNotes] = useState("")
  const { submitLog, loading } = useWorkoutLog(() => { onLogged(); onClose() })

  useEffect(() => {
    if (isOpen) setExercises(buildInitialExercises(split))
  }, [isOpen, split])

  const updateSet = (exIdx: number, setIdx: number, field: 'repsActual' | 'weightKg', value: string) => {
    setExercises(prev => prev.map((ex, i) =>
      i !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) =>
          j !== setIdx ? s : { ...s, [field]: value === '' ? null : Number(value) }
        )
      }
    ))
  }

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((ex, i) =>
      i !== exIdx ? ex : {
        ...ex,
        sets: [...ex.sets, {
          setNumber: ex.sets.length + 1,
          repsActual: ex.sets[ex.sets.length - 1]?.repsActual ?? 0,
          weightKg: ex.sets[ex.sets.length - 1]?.weightKg ?? null,
        }]
      }
    ))
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises(prev => prev.map((ex, i) =>
      i !== exIdx || ex.sets.length <= 1 ? ex : {
        ...ex,
        sets: ex.sets.filter((_, j) => j !== setIdx).map((s, j) => ({ ...s, setNumber: j + 1 }))
      }
    ))
  }

  const handleSubmit = () => {
    submitLog({ workoutId: workout.id, splitId: split.id, pse, notes, exercises })
  }

  const pseColor = pse <= 3 ? 'text-emerald-600' : pse <= 6 ? 'text-amber-500' : 'text-rose-600'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] flex flex-col bg-white sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-5 h-5" />
            <div>
              <p className="text-xs font-medium opacity-80">{split.focus}</p>
              <h2 className="font-bold text-lg leading-tight">{split.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Exercícios */}
          {exercises.map((ex, exIdx) => (
            <div key={ex.exerciseId} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{ex.exerciseName}</p>
                  <p className="text-xs text-slate-500">Prescrito: {ex.plannedSets} séries × {ex.plannedReps} reps</p>
                </div>
                <button
                  onClick={() => addSet(exIdx)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Série
                </button>
              </div>

              {/* Grid de séries */}
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1">
                  <span className="text-xs font-bold text-slate-400 text-center">#</span>
                  <span className="text-xs font-bold text-slate-400 text-center">Peso (kg)</span>
                  <span className="text-xs font-bold text-slate-400 text-center">Reps feitas</span>
                  <span />
                </div>

                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
                    <span className="text-sm font-black text-slate-400 text-center">{s.setNumber}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="—"
                      value={s.weightKg ?? ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weightKg', e.target.value)}
                      className="w-full text-center text-sm font-semibold bg-white border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                      type="number"
                      min={0}
                      value={s.repsActual}
                      onChange={(e) => updateSet(exIdx, setIdx, 'repsActual', e.target.value)}
                      className="w-full text-center text-sm font-semibold bg-white border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => removeSet(exIdx, setIdx)}
                      disabled={ex.sets.length <= 1}
                      className="flex items-center justify-center text-slate-300 hover:text-rose-500 disabled:opacity-0 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* PSE */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <p className="font-bold text-slate-800">Como foi o treino? <span className="text-xs font-normal text-slate-400">(PSE 1–10)</span></p>
              </div>
              <span className={`text-2xl font-black ${pseColor}`}>{pse}</span>
            </div>
            <input
              type="range" min={1} max={10} value={pse}
              onChange={(e) => setPse(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Muito fácil</span><span>Moderado</span><span>Exaustivo</span>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observação (opcional)</label>
            <textarea
              rows={2}
              placeholder="Ex: Dor no ombro direito no supino..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base rounded-xl shadow-md"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Salvando...
              </div>
            ) : '💪 Concluir Treino'}
          </Button>
        </div>
      </div>
    </div>
  )
}
