"use client"

import { useState } from "react"
import { X, Apple } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMealLog, MEAL_LOG_CONFIG, type MealLogStatus } from "@/hooks/features/useMealLog"

type Meal = { id: string; name: string; time?: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  meal: Meal
  onLogged: (mealId: string, status: MealLogStatus) => void
}

const STATUS_OPTIONS: MealLogStatus[] = ['FOLLOWED', 'SUBSTITUTED', 'SKIPPED']

export function MealLogModal({ isOpen, onClose, meal, onLogged }: Props) {
  const [selected, setSelected] = useState<MealLogStatus | null>(null)
  const [notes, setNotes] = useState("")
  const { submitLog, loading } = useMealLog((mealId, status) => {
    onLogged(mealId, status)
    onClose()
  })

  const handleSubmit = async () => {
    if (!selected) return
    await submitLog(meal.id, selected, notes)
    setSelected(null)
    setNotes("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
          <div className="flex items-center gap-3">
            <Apple className="w-5 h-5" />
            <div>
              {meal.time && <p className="text-xs font-medium opacity-80">{meal.time}</p>}
              <h2 className="font-bold text-lg leading-tight">{meal.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-600">Como foi essa refeição?</p>

          {/* Opções de status */}
          <div className="space-y-2.5">
            {STATUS_OPTIONS.map((status) => {
              const cfg = MEAL_LOG_CONFIG[status]
              const isSelected = selected === status
              return (
                <button
                  key={status}
                  onClick={() => setSelected(status)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                    isSelected
                      ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                  {isSelected && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-current" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Campo de observação — aparece quando substituiu ou pulou */}
          {selected && selected !== 'FOLLOWED' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Conta mais (opcional)
              </label>
              <textarea
                rows={2}
                placeholder={
                  selected === 'SUBSTITUTED'
                    ? 'Ex: Troquei arroz por batata doce...'
                    : 'Ex: Estava fora de casa...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
            </div>
          )}

          {/* Botão de salvar */}
          <Button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="w-full h-11 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Salvando...
              </div>
            ) : 'Salvar Registro'}
          </Button>
        </div>
      </div>
    </div>
  )
}
