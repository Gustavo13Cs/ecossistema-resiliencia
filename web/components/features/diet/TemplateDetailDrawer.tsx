"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { DietTemplate } from "@/hooks/features/useDietTemplates"
import {
  Flame,
  Clock,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Info,
  Calendar,
  Utensils,
  Share2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface TemplateDetailDrawerProps {
  template: DietTemplate | null
  isOpen: boolean
  onClose: () => void
  onImportClick: (template: DietTemplate) => void
}

export function TemplateDetailDrawer({
  template,
  isOpen,
  onClose,
  onImportClick,
}: TemplateDetailDrawerProps) {
  const [copied, setCopied] = useState(false)

  if (!template) return null

  const totalKcal = template.targetKcal || 2000
  const protKcal = template.proteinG * 4
  const carbKcal = template.carbsG * 4
  const fatKcal = template.fatG * 9
  const sumKcal = protKcal + carbKcal + fatKcal || totalKcal

  const protPct = Math.round((protKcal / sumKcal) * 100)
  const carbPct = Math.round((carbKcal / sumKcal) * 100)
  const fatPct = Math.round((fatKcal / sumKcal) * 100)

  const handleCopyMenuText = () => {
    let text = `📋 *${template.title.toUpperCase()}*\n`
    text += `🎯 *Objetivo:* ${template.goal}\n`
    text += `🔥 *Meta Calórica:* ${template.targetKcal} kcal/dia\n`
    text += `📊 *Macros:* P: ${template.proteinG}g (${protPct}%) | C: ${template.carbsG}g (${carbPct}%) | G: ${template.fatG}g (${fatPct}%)\n\n`

    template.meals.forEach((meal, idx) => {
      text += `🍽️ *${idx + 1}. ${meal.name}* ${meal.time ? `(${meal.time})` : ""}\n`
      if (meal.notes) text += `   _Obs: ${meal.notes}_\n`
      meal.items.forEach((item) => {
        const foodName = item.name || item.food?.name || "Alimento"
        text += `   • ${foodName}: ${item.quantity} ${item.measure}${item.notes ? ` (${item.notes})` : ""}\n`
      })
      text += `\n`
    })

    if (template.notes) {
      text += `💡 *Orientações Gerais:*\n${template.notes}\n\n`
    }
    text += `Prescrito via SafeMove Nutrição.`

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Cardápio completo copiado para a área de transferência!")
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-6 rounded-t-lg relative">
          <div className="flex items-center gap-2 mb-1.5">
            {template.isSystem ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 mr-1" /> Template SafeMove Curado
              </Badge>
            ) : (
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[10px] font-semibold uppercase tracking-wider">
                Modelo do Profissional
              </Badge>
            )}
            {template.category && (
              <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700">
                {template.category}
              </Badge>
            )}
          </div>

          <DialogTitle className="text-2xl font-bold text-white">
            {template.title}
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-sm mt-1">
            {template.goal}
          </DialogDescription>

          {/* Destaque de Calorias e Macros no Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Valor Energético
              </span>
              <div className="text-xl font-black text-white flex items-baseline gap-1">
                {template.targetKcal}
                <span className="text-xs text-slate-400 font-normal">kcal</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-400 block">
                Proteínas ({protPct}%)
              </span>
              <div className="text-lg font-bold text-white">{template.proteinG}g</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                Carboidratos ({carbPct}%)
              </span>
              <div className="text-lg font-bold text-white">{template.carbsG}g</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-400 block">
                Gorduras ({fatPct}%)
              </span>
              <div className="text-lg font-bold text-white">{template.fatG}g</div>
            </div>
          </div>
        </div>

        {/* Barra de visualização gráfica dos macronutrientes */}
        <div className="h-2 w-full flex bg-slate-200">
          <div style={{ width: `${protPct}%` }} className="bg-sky-500 h-full" title={`Proteína: ${protPct}%`} />
          <div style={{ width: `${carbPct}%` }} className="bg-amber-500 h-full" title={`Carboidratos: ${carbPct}%`} />
          <div style={{ width: `${fatPct}%` }} className="bg-rose-500 h-full" title={`Gorduras: ${fatPct}%`} />
        </div>

        {/* Corpo com a lista detalhada de refeições */}
        <div className="p-6 space-y-6">
          {/* Informações clínicas */}
          {template.notes && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Orientações Clínicas do Modelo:</span>
                <p className="leading-relaxed">{template.notes}</p>
              </div>
            </div>
          )}

          {/* Refeições */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-teal-600" />
                Estrutura das Refeições ({template.meals.length})
              </span>
              <span className="text-xs text-slate-400 font-normal lowercase">
                sugestão de horários inclusa
              </span>
            </h3>

            <div className="space-y-3">
              {template.meals.map((meal, index) => (
                <div
                  key={index}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                >
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-sm text-slate-800">{meal.name}</span>
                    </div>
                    {meal.time && (
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {meal.time}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5">
                    {meal.notes && (
                      <p className="text-xs text-slate-500 italic mb-2.5">
                        Obs: {meal.notes}
                      </p>
                    )}

                    <div className="divide-y divide-slate-100">
                      {meal.items.map((item, itemIdx) => {
                        const foodName = item.name || item.food?.name || "Alimento"
                        return (
                          <div
                            key={itemIdx}
                            className="py-1.5 flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-slate-700">{foodName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {item.quantity} {item.measure}
                              </span>
                              {item.notes && (
                                <span className="text-[10px] text-slate-400 italic">
                                  ({item.notes})
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex sm:justify-between items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyMenuText}
            className="gap-2 text-xs border-slate-300 hover:bg-slate-100 text-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-teal-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                Copiar para WhatsApp
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                onClose()
                onImportClick(template)
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-medium"
            >
              Importar para Cliente
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
